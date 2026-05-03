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
 * In allen Negativfällen wird dieselbe generische Fehlermeldung gerendert,
 * damit weder Token-Existenz noch Account-Status enumerierbar sind.
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

const GENERIC_ERROR_TEXT =
  "Bestätigungslink ungültig oder abgelaufen. Bitte senden Sie das Formular bei Bedarf erneut ab.";

function ErrorView() {
  return (
    <main>
      <h1>Bestätigung fehlgeschlagen</h1>
      <p data-public-confirm-error>{GENERIC_ERROR_TEXT}</p>
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
    </main>
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
    return <ErrorView />;
  }

  // 3. Status / Expiry / Source prüfen.
  if (
    session.source !== WEBSITE_SESSION_SOURCE ||
    session.status !== STATUS_AWAITING_EMAIL_CONFIRMATION ||
    session.confirmed_at !== null ||
    !session.confirm_token_expires_at ||
    session.confirm_token_expires_at < new Date()
  ) {
    return <ErrorView />;
  }

  // 4. Owner-/Feature-Flags prüfen (Praxis kann zwischenzeitlich abgeschaltet
  //    worden sein). Identische Cascade wie `/p/[slug]/page.tsx`.
  const owner = session.owner_account;
  if (
    !owner ||
    !owner.is_approved ||
    !owner.patient_communication_enabled ||
    !owner.website_forms_enabled
  ) {
    return <ErrorView />;
  }

  if (!session.practice_form || !session.practice_form.is_active) {
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
    console.error("[/p/confirm/[token]] update failed", { detail });
    return <ErrorView />;
  }

  return <SuccessView />;
}
