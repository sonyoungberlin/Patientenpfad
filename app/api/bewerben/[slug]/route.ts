/**
 * POST /api/bewerben/[slug]
 *
 * Submit-Endpoint für öffentliche Bewerbungsanfragen.
 *
 * Pipeline:
 *   1. Slug-Format validieren.
 *   2. Body parsen (FormData oder JSON).
 *   3. Honeypot prüfen → Treffer: identische Erfolgsantwort, keine DB-Schreibung.
 *   4. E-Mail validieren.
 *   5. Rate-Limit (IP + Slug).
 *   6. Practice laden (slug, is_approved, office_cases_enabled, OWNER).
 *   7. Rate-Limit (E-Mail-Hash).
 *   8. Name validieren (min 1, max 100).
 *   9. Rollen validieren (VALID_APPLICATION_ROLES, min 1).
 *  10. E-Mail hashen.
 *  11. Freitext bereinigen (optional, max 500).
 *  12. DigitalRequest anlegen (request_type = "office").
 *  13. 303-Redirect auf /bewerben/[slug]/eingegangen.
 */

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
import { PracticeRole } from "@prisma/client";
import { VALID_APPLICATION_ROLES } from "@/lib/digitalRequests/applicationRoles";
import { sendDigitalRequestNotificationEmail } from "@/lib/mail/sendDigitalRequestNotificationEmail";
import { resolvePracticeByPublicOrLegacySlug } from "@/lib/practice/publicProfile";
import { PRACTICE_SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/practice/lifecycle";

export const dynamic = "force-dynamic";

const ipSlugLimiter = createRateLimiter(IP_SLUG_RATE_LIMIT);
const emailHashLimiter = createRateLimiter(EMAIL_HASH_RATE_LIMIT);

const LOG_MARKER = "[bewerben/submit]";

type SubmitOutcome =
  | "success"
  | "invalid_body"
  | "invalid_email"
  | "invalid_name"
  | "invalid_roles"
  | "honeypot"
  | "not_found"
  | "rate_limited_ip"
  | "rate_limited_email"
  | "notification_mail_failed"
  | "unexpected_error";

function logSubmit(
  outcome: SubmitOutcome,
  extra: Record<string, unknown> = {},
): void {
  const payload = { event: "bewerben_submit", outcome, ...extra };
  if (outcome === "unexpected_error") {
    console.error(LOG_MARKER, payload);
  } else {
    console.info(LOG_MARKER, payload);
  }
}

function successRedirect(req: NextRequest, slug: string): NextResponse {
  const url = new URL(`/bewerben/${slug}/eingegangen`, req.url);
  return NextResponse.redirect(url, { status: 303 });
}

function notFoundHtml(): NextResponse {
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function unavailableHtml(): NextResponse {
  return new NextResponse(PRACTICE_SERVICE_UNAVAILABLE_MESSAGE, {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

type SubmitFields = {
  email: unknown;
  name: unknown;
  requested_roles: unknown;
  concern_text: unknown;
  honeypot: unknown;
};

async function parseFields(req: NextRequest): Promise<SubmitFields | null> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      return {
        email: body.email,
        name: body.submitter_name,
        requested_roles: body.requested_roles,
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
      // Mehrere Checkboxen mit name="requested_role"
      requested_roles: fd.getAll("requested_role"),
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

    // 6. Practice + OWNER-Membership laden.
    const practice = await resolvePracticeByPublicOrLegacySlug(
      slugValidation.slug,
      (where) =>
        prisma.practice.findUnique({
          where,
          select: {
            id: true,
            is_approved: true,
            disabled_at: true,
            office_cases_enabled: true,
            office_application_notification_email: true,
            memberships: {
              where: { role: PracticeRole.OWNER },
              select: { account_id: true },
              take: 1,
            },
          },
        }),
    );

    if (practice?.disabled_at != null) {
      return unavailableHtml();
    }
    if (
      !practice ||
      !practice.is_approved ||
      practice.disabled_at != null ||
      !practice.office_cases_enabled ||
      practice.memberships.length === 0
    ) {
      logSubmit("not_found", { slug: slugValidation.slug });
      return notFoundHtml();
    }

    const ownerAccountId = practice.memberships[0].account_id;

    // 7. Rate-Limit (E-Mail-Hash).
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

    // 9. Rollen validieren — ausschließlich gegen VALID_APPLICATION_ROLES.
    const rawRoles: unknown[] = Array.isArray(fields.requested_roles)
      ? fields.requested_roles
      : [];
    const validRoles = rawRoles.filter(
      (r): r is string =>
        typeof r === "string" && VALID_APPLICATION_ROLES.has(r),
    );
    if (validRoles.length === 0) {
      logSubmit("invalid_roles", { slug: slugValidation.slug });
      return new NextResponse(
        "Bitte wählen Sie mindestens eine Rolle aus.",
        {
          status: 400,
          headers: { "content-type": "text/plain; charset=utf-8" },
        },
      );
    }
    const roles = [...new Set(validRoles)].sort();

    // 11. Freitext bereinigen.
    const rawConcernText =
      typeof fields.concern_text === "string"
        ? fields.concern_text.trim().slice(0, 500)
        : null;

    // 12. DigitalRequest anlegen.
    await prisma.digitalRequest.create({
      data: {
        owner_account_id: ownerAccountId,
        owner_practice_id: practice.id,
        submitter_name: rawName,
        submitter_email: emailCheck.email,
        submitter_email_hash: submitterEmailHash,
        requested_topics: roles,
        concern_text: rawConcernText || null,
        request_type: "office",
        status: "new",
      },
      select: { id: true },
    });

    logSubmit("success", { slug: slugValidation.slug });

    // 13b. Benachrichtigungs-E-Mail (best-effort).
    if (practice.office_application_notification_email) {
      try {
        await sendDigitalRequestNotificationEmail({
          to: practice.office_application_notification_email,
          variant: "office",
          practiceId: practice.id,
        });
      } catch (mailErr) {
        logSubmit("notification_mail_failed", {
          slug: slugValidation.slug,
          detail: mailErr instanceof Error ? mailErr.message : "unknown",
        });
      }
    }

    // 13. Redirect.
    return successRedirect(req, slugValidation.slug);
  } catch (err) {
    console.error(LOG_MARKER, {
      event: "bewerben_submit",
      outcome: "unexpected_error",
      err,
    });
    return new NextResponse("Internal Server Error", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
