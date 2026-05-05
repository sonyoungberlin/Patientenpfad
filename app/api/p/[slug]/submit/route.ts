/**
 * Phase 3d: Submit-Endpoint für öffentliche Website-Formulare.
 *
 * Pipeline (in dieser Reihenfolge):
 *   1. Slug-Format validieren (kein DB-Roundtrip bei Müll-Slug).
 *   2. Body parsen (Form-data oder JSON).
 *   3. Honeypot prüfen → Treffer => identische Erfolgs-Antwort, KEINE
 *      DB-Schreibung (Plan-Anpassung 7).
 *   4. E-Mail validieren (Plan-Anpassung 4: nur Format, keine neue
 *      Required-Logik darüber hinaus).
 *   5. Rate-Limit (IP+Slug) prüfen (best-effort, in-memory; Plan-Anpassung 3).
 *   6. Formular + Owner-Flags laden — identische Cascade wie
 *      `app/p/[slug]/page.tsx` → bei Negativ: 404.
 *   7. Rate-Limit (E-Mail-Hash) prüfen (nach Form-Lookup, damit Bots ohne
 *      gültigen Slug das Bucket nicht beeinflussen).
 *   8. Antworten gegen `deduplicated_questions` der Form sanitisieren
 *      (gemeinsamer Helfer, ohne Verhaltensänderung im Token-Flow).
 *   9. Bestätigungs-Token erzeugen (Klartext nur in der Mail, Hash in DB).
 *  10. Session anlegen mit `status = "awaiting_email_confirmation"`.
 *  11. Bestätigungs-Mail versenden. Bei Mailfehler bleibt die Session
 *      bestehen (Plan-Anpassung 1) — Fehler nur loggen, Antwort generisch.
 *  12. Erfolgs-Redirect auf `/p/[slug]/eingereicht`.
 *
 * Antwort-Codes:
 *   - 303 (See Other) → Form-Submit/Browser leitet auf Hinweisseite weiter.
 *   - 400 → ungültige E-Mail. Knappe, generische Meldung.
 *   - 404 → Slug-/Owner-/Form-Cascade negativ. Keine Enumeration.
 *   - 429 → Rate-Limit überschritten. Keine Detail-Antwort.
 *   - 500 → unerwarteter Fehler.
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { validateSlug } from "@/lib/websiteForms/slug";
import { buildQuestionnaireQuestions } from "@/lib/questionnaire/buildQuestionnaireQuestions";
import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { normalizeQuestionnaireLanguage } from "@/lib/questionnaire/i18n";
import {
  answerCharactersErrorMessage,
  validateAnswerCharacters,
} from "@/lib/questionnaire/validateAnswerCharacters";
import {
  HONEYPOT_FIELD_NAME,
  isHoneypotTriggered,
  submitErrorMessage,
  validateSubmitterEmail,
} from "@/lib/websiteForms/submitValidation";
import {
  STATUS_AWAITING_EMAIL_CONFIRMATION,
  WEBSITE_SESSION_SOURCE,
} from "@/lib/websiteForms/constants";
import { generateConfirmToken } from "@/lib/websiteForms/confirmToken";
import { hashSubmitterEmail } from "@/lib/websiteForms/emailHash";
import {
  EMAIL_HASH_RATE_LIMIT,
  IP_SLUG_RATE_LIMIT,
  createRateLimiter,
  getClientIp,
} from "@/lib/websiteForms/submitRateLimit";
import { sendWebsiteFormConfirmationEmail } from "@/lib/mail/sendWebsiteFormConfirmationEmail";
import { getEffectivePracticeFlags } from "@/lib/websiteForms/practiceScope";

export const dynamic = "force-dynamic";

// Modul-scope Limiter — per Prozess geteilt, best-effort (siehe submitRateLimit.ts).
const ipSlugLimiter = createRateLimiter(IP_SLUG_RATE_LIMIT);
const emailHashLimiter = createRateLimiter(EMAIL_HASH_RATE_LIMIT);

// Strukturierte Logs — siehe docs/website-forms-operations.md.
// Bewusst KEINE Tokens, E-Mails, Hashes oder IPs im Payload.
const LOG_MARKER = "[website-form/submit]";

type SubmitOutcome =
  | "success"
  | "mail_failed"
  | "invalid_body"
  | "invalid_email"
  | "invalid_characters"
  | "honeypot"
  | "not_found"
  | "rate_limited_ip"
  | "rate_limited_email"
  | "unexpected_error";

function logSubmit(
  outcome: SubmitOutcome,
  extra: Record<string, unknown> = {},
): void {
  const payload = { event: "submit", outcome, ...extra };
  if (outcome === "mail_failed" || outcome === "unexpected_error") {
    console.error(LOG_MARKER, payload);
  } else {
    console.info(LOG_MARKER, payload);
  }
}

/** Antwort, die der Browser nach erfolgreichem Submit sieht. Auch für Honeypot-Treffer. */
function successRedirect(req: NextRequest, slug: string): NextResponse {
  const url = new URL(`/p/${slug}/eingereicht`, req.url);
  return NextResponse.redirect(url, { status: 303 });
}

/** Generische 404-Antwort (HTML), damit Bots Slug-Existenz nicht enumerieren können. */
function notFoundHtml(): NextResponse {
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

type SubmitFields = {
  email: unknown;
  honeypot: unknown;
  answers: Record<string, unknown>;
};

async function readSubmitFields(req: NextRequest): Promise<SubmitFields | null> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const answers =
        body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
          ? (body.answers as Record<string, unknown>)
          : {};
      return {
        email: body.email,
        honeypot: body[HONEYPOT_FIELD_NAME],
        answers,
      };
    } catch {
      return null;
    }
  }

  // Default: HTML-Form-Submit (`application/x-www-form-urlencoded`
  // oder `multipart/form-data`). `request.formData()` deckt beide ab.
  try {
    const fd = await req.formData();
    const answers: Record<string, unknown> = {};
    let email: unknown = null;
    let honeypot: unknown = null;

    for (const [key, value] of fd.entries()) {
      if (typeof value !== "string") continue;
      if (key === "email") {
        email = value;
        continue;
      }
      if (key === HONEYPOT_FIELD_NAME) {
        honeypot = value;
        continue;
      }
      // Mehrfachfelder (z. B. checkbox-Gruppe für `multi_select`) zu
      // kommaseparierter String zusammenführen — analog zur Phase-2-Praxis,
      // dass `answers` ein flaches `Record<string,string>` ist.
      const existing = answers[key];
      if (typeof existing === "string") {
        answers[key] = `${existing},${value}`;
      } else {
        answers[key] = value;
      }
    }
    return { email, honeypot, answers };
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
    const fields = await readSubmitFields(req);
    if (!fields) {
      logSubmit("invalid_body", { slug: slugValidation.slug });
      return new NextResponse("Bad Request", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // 3. Honeypot zuerst: bei Treffer KEINE DB-Schreibung, identische Antwort.
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

    // 6. Form + Owner-Flags laden — identische Cascade wie `app/p/[slug]/page.tsx`.
    // P3a: Practice-Flags überstimmen Account-Flags.
    const form = await prisma.practiceQuestionnaireForm.findUnique({
      where: { slug: slugValidation.slug },
      select: {
        id: true,
        is_active: true,
        selected_block_ids: true,
        patient_language: true,
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
      !flags.patient_communication_enabled ||
      !flags.website_forms_enabled
    ) {
      logSubmit("not_found", { slug: slugValidation.slug });
      return notFoundHtml();
    }

    // 7. Rate-Limit (E-Mail-Hash) — nach Form-Lookup, damit Bots ohne
    // gültigen Slug das Email-Bucket nicht beeinflussen.
    const submitterEmailHash = hashSubmitterEmail(emailCheck.email);
    if (!emailHashLimiter.check(submitterEmailHash).allowed) {
      logSubmit("rate_limited_email", { slug: slugValidation.slug });
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // 8. Fragen einfrieren + Antworten sanitisieren.
    // Sprache des Formulars bestimmen: bei "en" mappt sanitizeAnswers
    // englische Optionswerte zurück auf das deutsche Originallabel,
    // damit Praxis-/PDF-/Krankenblatt-Output garantiert deutsch bleibt.
    const formLanguage = normalizeQuestionnaireLanguage(form.patient_language);
    const selectedBlockIds = Array.isArray(form.selected_block_ids)
      ? (form.selected_block_ids as string[])
      : [];
    const deduplicatedQuestions = buildQuestionnaireQuestions(selectedBlockIds);

    // Zeichenvalidierung der Freitextantworten (text/textarea). Greift VOR
    // sanitizeAnswers/Speichern und VOR Mail-Versand: nicht-lateinische
    // Eingaben (kyrillisch, arabisch, CJK, Emojis) werden mit 400 abgewiesen.
    // Sprache der Fehlermeldung folgt der Form-/Patientensprache.
    const charCheck = validateAnswerCharacters(
      fields.answers,
      deduplicatedQuestions,
    );
    if (!charCheck.ok) {
      logSubmit("invalid_characters", {
        slug: slugValidation.slug,
        practiceFormId: form.id,
        invalidQuestionIds: charCheck.invalidQuestionIds,
      });
      return new NextResponse(answerCharactersErrorMessage(formLanguage), {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const sanitizedAnswers = sanitizeAnswers(
      fields.answers,
      deduplicatedQuestions,
      formLanguage,
    );

    // 8b. CONTACT_EMAIL aus dem oberen Pflichtfeld spiegeln.
    // Falls der KONTAKT-Block (oder ein anderer Block, der CONTACT_EMAIL
    // enthält) aktiv ist, würde sonst dieselbe E-Mail-Adresse zweimal
    // erfragt. Wir übernehmen serverseitig die bereits validierte
    // Bestätigungs-E-Mail; eine ggf. abweichende oder leere Eingabe im
    // unteren CONTACT_EMAIL-Feld wird damit überschrieben. Single Source
    // of Truth ist `emailCheck.email` (normalisiert/lowercased).
    // Hinweis: Gilt nur für den öffentlichen `/p/[slug]`-Submit; der
    // Token-Flow `/q/[token]` bleibt unberührt.
    if (deduplicatedQuestions.some((q) => q.id === "CONTACT_EMAIL")) {
      sanitizedAnswers["CONTACT_EMAIL"] = emailCheck.email;
    }

    // 9. Bestätigungs-Token erzeugen.
    const token = generateConfirmToken();

    // 10. Session anlegen.
    // P3a: Doppelschreiben — `owner_account_id` bleibt Pflichtfeld,
    // `owner_practice_id` wird zusätzlich gespiegelt, falls die Form sie
    // hat. Forms ohne `owner_practice_id` (Bestand vor P1) erzeugen
    // Sessions ohne `owner_practice_id` — kein stilles Setzen.
    const createdSession = await prisma.patientQuestionnaireSession.create({
      data: {
        owner_account_id: form.owner_account_id,
        ...(form.owner_practice_id
          ? { owner_practice_id: form.owner_practice_id }
          : {}),
        practice_form_id: form.id,
        source: WEBSITE_SESSION_SOURCE,
        submitted_by: "patient",
        selected_block_ids: selectedBlockIds as unknown as Prisma.InputJsonValue,
        deduplicated_questions:
          deduplicatedQuestions as unknown as Prisma.InputJsonValue,
        answers: sanitizedAnswers as unknown as Prisma.InputJsonValue,
        patient_language: formLanguage,
        status: STATUS_AWAITING_EMAIL_CONFIRMATION,
        // submitted_at bleibt absichtlich null bis zur Bestätigung.
        confirm_token: token.hash,
        confirm_token_expires_at: token.expiresAt,
        submitter_email_hash: submitterEmailHash,
        // Kein Patientenlink-Flow: token / token_expires_at bleiben null.
      },
      select: { id: true },
    });

    // 11. Bestätigungs-Mail versenden. Mailfehler darf die Session NICHT
    // löschen (Plan-Anpassung 1).
    const confirmationUrl = new URL(
      `/p/confirm/${token.raw}`,
      req.url,
    ).toString();

    let resolvedTransport: string = "unknown";
    try {
      resolvedTransport = await sendWebsiteFormConfirmationEmail({
        to: emailCheck.email,
        confirmationUrl,
        practiceId: form.owner_practice_id ?? null,
      });
    } catch (mailErr) {
      const detail = mailErr instanceof Error ? mailErr.message : "unknown";
      logSubmit("mail_failed", {
        slug: slugValidation.slug,
        sessionId: createdSession.id,
        practiceFormId: form.id,
        practiceId: form.owner_practice_id ?? null,
        detail,
      });
      // Antwort bleibt generisch (Erfolgs-Redirect), damit der Patient
      // weiß, dass etwas anzukommen versprochen ist; Retry-/Cleanup-
      // Mechanismus folgt später.
      return successRedirect(req, slugValidation.slug);
    }

    logSubmit("success", {
      slug: slugValidation.slug,
      sessionId: createdSession.id,
      practiceFormId: form.id,
      practiceId: form.owner_practice_id ?? null,
      mailTransport: resolvedTransport,
    });

    // 12. Erfolgs-Redirect.
    return successRedirect(req, slugValidation.slug);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown";
    logSubmit("unexpected_error", {
      slug: slugForRedirect ?? null,
      detail,
    });
    if (slugForRedirect) {
      // Generische 500-Antwort, aber kein Detail-Leak.
      return new NextResponse("Internal Server Error", {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return notFoundHtml();
  }
}
