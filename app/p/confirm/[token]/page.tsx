/**
 * Phase 3d: Bestätigungs-Route für Website-Form-Submits.
 *
 * Pfad: `/p/confirm/[token]`. Klartext-Token aus der Bestätigungs-E-Mail.
 * Der Token wird hier in den hex-SHA-256-Hash umgerechnet, um die zugehörige
 * `PatientQuestionnaireSession` zu finden (vgl. `confirm_token` in der DB).
 *
 * Prüfreihenfolge (Plan-Anpassung 6):
 *   1. Tokenformat prüfen
 *   2. Token hashen und Session laden
 *   3. Status/Expiry prüfen
 *   4. dann Owner-/Feature-Flags prüfen
 *   5. dann bestätigen
 *
 * UX-Pfade (Phase 3d Hardening):
 *   - Erfolg → SuccessView.
 *   - Session ist bereits `completed` (z. B. zweiter Klick auf den Link) und
 *     die Owner-/Form-Cascade ist weiterhin gültig → AlreadyConfirmedView.
 *     Dieser Zustand verrät keine Information, die der Patient/die Patientin
 *     nicht ohnehin schon hat (er/sie hatte beim ersten Klick die
 *     Erfolgsseite gesehen) und vermeidet Verwirrung beim Doppel-Klick.
 *   - Alle anderen Negativfälle → identische generische ErrorView, damit
 *     weder Token-Existenz noch Account-Status enumerierbar sind.
 *
 * Logging (`[website-form/confirm]`, siehe docs/website-forms-operations.md):
 *   In Negativfällen wird kein `sessionId` geloggt, damit das Log keine
 *   Information durchsickern lässt, die das Markup bewusst verschweigt.
 */

import { prisma } from "@/lib/prisma";
import {
  hashConfirmToken,
  isValidRawConfirmTokenFormat,
} from "@/lib/websiteForms/confirmToken";
import {
  STATUS_AWAITING_EMAIL_CONFIRMATION,
  WEBSITE_SESSION_SOURCE,
} from "@/lib/websiteForms/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LOG_MARKER = "[website-form/confirm]";

type ConfirmOutcome =
  | "success"
  | "already_confirmed"
  | "invalid_token_format"
  | "not_found"
  | "wrong_state"
  | "expired"
  | "owner_disabled"
  | "form_inactive"
  | "update_failed";

function logConfirm(
  outcome: ConfirmOutcome,
  extra: Record<string, unknown> = {},
): void {
  const payload = { event: "confirm", outcome, ...extra };
  if (outcome === "update_failed") {
    console.error(LOG_MARKER, payload);
  } else {
    console.info(LOG_MARKER, payload);
  }
}

const GENERIC_ERROR_TEXT =
  "Bestätigungslink ungültig oder abgelaufen. Bitte senden Sie das Formular bei Bedarf erneut ab.";

function ErrorView() {
  return (
    <main>
      <h1>Bestätigung fehlgeschlagen</h1>
      <p data-public-confirm-error>{GENERIC_ERROR_TEXT}</p>
      <p>
        Wenn Sie den Link gerade frisch erhalten haben, öffnen Sie ihn bitte
        direkt aus der Bestätigungs-E-Mail. Falls das Problem bestehen bleibt,
        füllen Sie das Formular bitte erneut aus.
      </p>
    </main>
  );
}

function SuccessView() {
  return (
    <main>
      <h1>Vielen Dank — Bestätigung erfolgreich</h1>
      <p data-public-confirm-success>
        Ihre Angaben wurden bestätigt und an die Praxis übermittelt.
      </p>
      <p>Sie können dieses Fenster jetzt schließen.</p>
    </main>
  );
}

function AlreadyConfirmedView() {
  return (
    <main>
      <h1>Bereits bestätigt</h1>
      <p data-public-confirm-already-confirmed>
        Ihre Angaben wurden bereits bestätigt und an die Praxis übermittelt.
      </p>
      <p>
        Sie müssen nichts weiter tun. Sie können dieses Fenster schließen.
      </p>
    </main>
  );
}

function isOwnerCascadeValid(
  owner: {
    is_approved: boolean;
    patient_communication_enabled: boolean;
    website_forms_enabled: boolean;
  } | null,
): boolean {
  return Boolean(
    owner &&
      owner.is_approved &&
      owner.patient_communication_enabled &&
      owner.website_forms_enabled,
  );
}

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // 1. Tokenformat prüfen.
  if (!isValidRawConfirmTokenFormat(token)) {
    logConfirm("invalid_token_format");
    return <ErrorView />;
  }

  // 2. Token hashen und Session laden.
  const tokenHash = hashConfirmToken(token);

  const session = await prisma.patientQuestionnaireSession.findUnique({
    where: { confirm_token: tokenHash },
    select: {
      id: true,
      source: true,
      status: true,
      confirm_token_expires_at: true,
      confirmed_at: true,
      practice_form_id: true,
      owner_account: {
        select: {
          is_approved: true,
          patient_communication_enabled: true,
          website_forms_enabled: true,
        },
      },
      practice_form: {
        select: {
          is_active: true,
        },
      },
    },
  });

  if (!session) {
    logConfirm("not_found");
    return <ErrorView />;
  }

  // 3a. Source muss zwingend "website" sein.
  if (session.source !== WEBSITE_SESSION_SOURCE) {
    logConfirm("wrong_state");
    return <ErrorView />;
  }

  // 3b. „Bereits bestätigt"-UX: nur dann anbieten, wenn die Session
  //     tatsächlich in einem konsistenten completed-Zustand ist UND die
  //     Owner-/Form-Cascade weiterhin gültig ist. Sonst generischer Fehler.
  if (
    session.status === "completed" &&
    session.confirmed_at !== null &&
    isOwnerCascadeValid(session.owner_account) &&
    session.practice_form?.is_active === true
  ) {
    logConfirm("already_confirmed", { sessionId: session.id });
    return <AlreadyConfirmedView />;
  }

  // 3c. Status / Expiry prüfen.
  if (
    session.status !== STATUS_AWAITING_EMAIL_CONFIRMATION ||
    session.confirmed_at !== null
  ) {
    logConfirm("wrong_state");
    return <ErrorView />;
  }

  if (
    !session.confirm_token_expires_at ||
    session.confirm_token_expires_at < new Date()
  ) {
    logConfirm("expired");
    return <ErrorView />;
  }

  // 4. Owner-/Feature-Flags prüfen (Praxis kann zwischenzeitlich abgeschaltet
  //    worden sein). Identische Cascade wie `/p/[slug]/page.tsx`.
  if (!isOwnerCascadeValid(session.owner_account)) {
    logConfirm("owner_disabled");
    return <ErrorView />;
  }

  if (!session.practice_form || !session.practice_form.is_active) {
    logConfirm("form_inactive");
    return <ErrorView />;
  }

  // 5. Bestätigen.
  const now = new Date();
  try {
    await prisma.patientQuestionnaireSession.update({
      where: { id: session.id },
      data: {
        status: "completed",
        confirmed_at: now,
        submitted_at: now,
        // Token verbrennen — idempotent unbenutzbar.
        confirm_token: null,
        confirm_token_expires_at: null,
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown";
    logConfirm("update_failed", { detail });
    return <ErrorView />;
  }

  logConfirm("success", {
    sessionId: session.id,
    practiceFormId: session.practice_form_id ?? null,
  });
  return <SuccessView />;
}
