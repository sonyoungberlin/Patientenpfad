/**
 * Phase A: Submit-Endpoint für Digitale Anfragen (POST `/api/anfrage/[slug]`).
 *
 * Pipeline:
 *   1. Slug-Format validieren.
 *   2. Body parsen (FormData oder JSON).
 *   3. Honeypot prüfen → Treffer: identische Erfolgs-Antwort, KEINE DB-Schreibung.
 *   4. E-Mail validieren (Format).
 *   5. Rate-Limit (IP + Slug, best-effort in-memory).
 *   6. Formular + Owner-Flags laden (Cascade: slug ungültig/inaktiv/deaktiviert → 404).
 *      Prüft nur `patient_communication_enabled`, NICHT `website_forms_enabled`.
 *   7. Rate-Limit (E-Mail-Hash, nach Form-Lookup).
 *   8. Name validieren (min 1, max 100 Zeichen).
 *   9. E-Mail hashen (SHA-256).
 *  10. Geburtsdatum hashen, falls angegeben (SHA-256, kein Klartext).
 *  11. Anliegen kürzen (max 500 Zeichen).
 *  12. DigitalRequest anlegen (status = "new").
 *  13. 303-Redirect auf `/anfrage/[slug]/eingegangen`.
 *
 * Antwort-Codes:
 *   - 303 → Erfolg (und Honeypot-Treffer).
 *   - 400 → Validierungsfehler (E-Mail oder Name).
 *   - 404 → Slug-/Owner-Cascade negativ.
 *   - 429 → Rate-Limit überschritten.
 */

import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateSlug } from "@/lib/websiteForms/slug";
import {
  HONEYPOT_FIELD_NAME,
  isHoneypotTriggered,
  submitErrorMessage,
  validateSubmitterEmail,
} from "@/lib/websiteForms/submitValidation";
import { hashSubmitterEmail } from "@/lib/websiteForms/emailHash";
import {
  EMAIL_HASH_RATE_LIMIT,
  IP_SLUG_RATE_LIMIT,
  createRateLimiter,
  getClientIp,
} from "@/lib/websiteForms/submitRateLimit";
import { getEffectivePracticeFlags } from "@/lib/websiteForms/practiceScope";

export const dynamic = "force-dynamic";

const ipSlugLimiter = createRateLimiter(IP_SLUG_RATE_LIMIT);
const emailHashLimiter = createRateLimiter(EMAIL_HASH_RATE_LIMIT);

const LOG_MARKER = "[anfrage/submit]";

type SubmitOutcome =
  | "success"
  | "invalid_body"
  | "invalid_email"
  | "invalid_name"
  | "honeypot"
  | "not_found"
  | "rate_limited_ip"
  | "rate_limited_email"
  | "unexpected_error";

function logSubmit(
  outcome: SubmitOutcome,
  extra: Record<string, unknown> = {},
): void {
  const payload = { event: "anfrage_submit", outcome, ...extra };
  if (outcome === "unexpected_error") {
    console.error(LOG_MARKER, payload);
  } else {
    console.info(LOG_MARKER, payload);
  }
}

function successRedirect(req: NextRequest, slug: string): NextResponse {
  const url = new URL(`/anfrage/${slug}/eingegangen`, req.url);
  return NextResponse.redirect(url, { status: 303 });
}

function notFoundHtml(): NextResponse {
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

type SubmitFields = {
  email: unknown;
  name: unknown;
  birth_date: unknown;
  concern_text: unknown;
  honeypot: unknown;
};

async function parseFields(
  req: NextRequest,
): Promise<SubmitFields | null> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      return {
        email: body.email,
        name: body.submitter_name,
        birth_date: body.birth_date,
        concern_text: body.concern_text,
        honeypot: body[HONEYPOT_FIELD_NAME],
      };
    } catch {
      return null;
    }
  }

  try {
    const fd = await req.formData();
    return {
      email: fd.get("email"),
      name: fd.get("submitter_name"),
      birth_date: fd.get("birth_date"),
      concern_text: fd.get("concern_text"),
      honeypot: fd.get(HONEYPOT_FIELD_NAME),
    };
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  let slugForRedirect: string | null = null;
  try {
    const { slug } = await params;

    // 1. Slug-Format prüfen.
    const slugValidation = validateSlug(slug);
    if (!slugValidation.ok) {
      return notFoundHtml();
    }
    slugForRedirect = slugValidation.slug;

    // 2. Body parsen.
    const fields = await parseFields(req);
    if (!fields) {
      logSubmit("invalid_body", { slug: slugValidation.slug });
      return new NextResponse("Bad Request", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // 3. Honeypot.
    if (isHoneypotTriggered(fields.honeypot)) {
      logSubmit("honeypot", { slug: slugValidation.slug });
      return successRedirect(req, slugValidation.slug);
    }

    // 4. E-Mail validieren.
    const emailCheck = validateSubmitterEmail(fields.email);
    if (!emailCheck.ok) {
      logSubmit("invalid_email", { slug: slugValidation.slug });
      return new NextResponse(submitErrorMessage(emailCheck.error), {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // 5. Rate-Limit (IP + Slug).
    const ip = getClientIp(req.headers);
    if (!ipSlugLimiter.check(`${ip}::${slugValidation.slug}`).allowed) {
      logSubmit("rate_limited_ip", { slug: slugValidation.slug });
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // 6. Formular + Owner-Flags laden.
    // Cascade: inaktiv / nicht freigegeben / patient_communication_enabled=false → 404.
    // website_forms_enabled wird hier bewusst NICHT geprüft.
    const form = await prisma.practiceQuestionnaireForm.findUnique({
      where: { slug: slugValidation.slug },
      select: {
        id: true,
        is_active: true,
        owner_account_id: true,
        owner_practice_id: true,
        owner_practice: {
          select: {
            is_approved: true,
            patient_communication_enabled: true,
            website_forms_enabled: true,
          },
        },
        owner_account: {
          select: {
            is_approved: true,
            patient_communication_enabled: true,
            website_forms_enabled: true,
          },
        },
      },
    });

    const flags = form ? getEffectivePracticeFlags(form) : null;
    if (
      !form ||
      !form.is_active ||
      !flags ||
      !flags.is_approved ||
      !flags.patient_communication_enabled
    ) {
      logSubmit("not_found", { slug: slugValidation.slug });
      return notFoundHtml();
    }

    // 7. Rate-Limit (E-Mail-Hash) — nach Form-Lookup.
    const submitterEmailHash = hashSubmitterEmail(emailCheck.email);
    if (!emailHashLimiter.check(submitterEmailHash).allowed) {
      logSubmit("rate_limited_email", { slug: slugValidation.slug });
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // 8. Name validieren.
    const rawName =
      typeof fields.name === "string" ? fields.name.trim() : "";
    if (rawName.length === 0 || rawName.length > 100) {
      logSubmit("invalid_name", { slug: slugValidation.slug });
      return new NextResponse(
        "Bitte geben Sie Ihren Namen ein (max. 100 Zeichen).",
        {
          status: 400,
          headers: { "content-type": "text/plain; charset=utf-8" },
        },
      );
    }

    // 9. E-Mail-Hash bereits in Schritt 7 berechnet (submitterEmailHash).

    // 10. Geburtsdatum hashen, falls angegeben. Kein Klartext.
    let birthDateHash: string | null = null;
    if (
      typeof fields.birth_date === "string" &&
      fields.birth_date.trim().length > 0
    ) {
      birthDateHash = createHash("sha256")
        .update(fields.birth_date.trim())
        .digest("hex");
    }

    // 11. Anliegen kürzen.
    let concernText: string | null = null;
    if (
      typeof fields.concern_text === "string" &&
      fields.concern_text.trim().length > 0
    ) {
      concernText = fields.concern_text.trim().slice(0, 500);
    }

    // 12. DigitalRequest anlegen.
    await prisma.digitalRequest.create({
      data: {
        owner_account_id: form.owner_account_id,
        ...(form.owner_practice_id
          ? { owner_practice_id: form.owner_practice_id }
          : {}),
        practice_form_id: form.id,
        submitter_name: rawName,
        submitter_email: emailCheck.email,
        submitter_email_hash: submitterEmailHash,
        ...(birthDateHash !== null ? { birth_date_hash: birthDateHash } : {}),
        ...(concernText !== null ? { concern_text: concernText } : {}),
        status: "new",
      },
      select: { id: true },
    });

    logSubmit("success", { slug: slugValidation.slug });

    // 13. Redirect.
    return successRedirect(req, slugValidation.slug);
  } catch (err) {
    console.error(LOG_MARKER, {
      event: "anfrage_submit",
      outcome: "unexpected_error",
      err,
    });
    return new NextResponse("Internal Server Error", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
