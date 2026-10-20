import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { ActiveCheckpoint } from "@/lib/types";
import type { M2PrefillData } from "@/lib/logic/m2Questions";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessCaseSession } from "@/lib/cases/practiceScope";
import { getCurrentRunAnswers } from "@/lib/server/prefillRuns";
import { backfillPerspectives, ensureSelectionConditionalCheckpoints } from "@/lib/logic/checkpointCatalog";
import { M2PrefillClient } from "./M2PrefillClient";
import { M2LinkGeneratorClient } from "./M2LinkGeneratorClient";
import { M2SkipButtonClient } from "./M2SkipButtonClient";
import { M2PatientConversationClient } from "./M2PatientConversationClient";
import { M2MfaModeClient } from "./M2MfaModeClient";

export default async function M2Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ selfCheckInQr?: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }

  const { id } = await params;
  const { selfCheckInQr } = (await searchParams) ?? {};

  const session = await prisma.caseSession.findUnique({
    where: { id },
    select: { active_checkpoints: true, ctx_prefill: true, patient_reference: true, owner_account_id: true, owner_practice_id: true, doctor_confirmed: true, clinical_status: true, preparation_mode: true, m1_snapshot_initial: true },
  });

  if (!session || !canAccessCaseSession(account, session)) {
    redirect("/");
  }

  // Bei bereits ärztlich bestätigtem (eingefrorenem) Fall niemals zurück
  // in M2 routen – immer direkt auf M3 umleiten.
  if (session.doctor_confirmed || session.clinical_status === "confirmed") {
    redirect(`/cases/${id}/m3`);
  }

  // Jeder Praxisweg bekommt ausschließlich seine eigenen, über alle alten
  // Delta-Runs zusammengeführten Antworten. Der Ein-Quellen-Cache bleibt nur
  // Rückfall für Altfälle ohne PrefillRun.
  const [mfaRunAnswers, conversationRunAnswers] = await Promise.all([
    getCurrentRunAnswers(id, "mfa").catch(() => null),
    getCurrentRunAnswers(id, "conversation").catch(() => null),
  ]);
  const legacyPrefill =
    session.ctx_prefill &&
    typeof session.ctx_prefill === "object" &&
    !Array.isArray(session.ctx_prefill)
      ? (session.ctx_prefill as M2PrefillData)
      : {};
  const legacySource =
    session.preparation_mode === "conversation"
      ? "conversation"
      : session.preparation_mode === "mfa" || session.preparation_mode === "none"
        ? "mfa"
        : null;
  const initialPrefillBySource = {
    mfa:
      (mfaRunAnswers as M2PrefillData | null) ??
      (legacySource === "mfa" ? legacyPrefill : {}),
    conversation:
      (conversationRunAnswers as M2PrefillData | null) ??
      (legacySource === "conversation" ? legacyPrefill : {}),
  };

  // Alle aktiven Checkpoints des Falls – perspectives für Altfälle aus dem
  // Katalog ergänzen (Rückwärtskompatibilität vor Schritt 4).
  // ensureSelectionConditionalCheckpoints ergänzt Trigger-basierte Checkpoints
  // (K14/K15 für Reha, K16/K17 für Pflege, K15 für Jobcenter)
  // wenn K11 entsprechende Selektionen enthält.
  const checkpoints = backfillPerspectives(
    ensureSelectionConditionalCheckpoints(
      Array.isArray(session.active_checkpoints)
        ? (session.active_checkpoints as ActiveCheckpoint[])
        : [],
    ),
  );

  return (
    <main>
      <nav
        data-m2-navigation
        aria-label="Fallnavigation"
        style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}
      >
        <Link href="/cases" data-m2-case-list-link>
          Zur Fallliste
        </Link>
        <Link href={`/cases/${id}/m3`} data-m2-m3-link>
          Zur ärztlichen Checkliste
        </Link>
      </nav>
      <h1 style={{ marginBottom: "1.5rem" }}>Vorbereitung durch MFA / Praxis</h1>

      {/* Aktionsbereich oben: ruhige vertikale Rhythmik, klare Gruppen */}
      <section
        data-m2-actions
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginBottom: "2.5rem",
          paddingBottom: "1.5rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Erste Zeile: Skip-Aktion als dezente Textaktion */}
        <M2SkipButtonClient caseId={id} />

        {/* Zweite Zeile: Fragebogen-Link, Patientengespräch und MFA-Vorbereitung als stabile Gruppe */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "flex-start",
          }}
        >
          <M2LinkGeneratorClient
            caseId={id}
            patientReference={session.patient_reference}
            initialSelfCheckInQrEnabled={selfCheckInQr === "1"}
          />
          <M2PatientConversationClient />
          <M2MfaModeClient />
        </div>
      </section>

      {/* Formularbereich – beginnt klar als neuer Abschnitt */}
      <M2PrefillClient
        caseId={id}
        checkpoints={checkpoints}
        m1SnapshotInitial={session.m1_snapshot_initial}
        initialPrefillBySource={initialPrefillBySource}
        initialPreparationMode={
          typeof session.preparation_mode === "string"
            ? session.preparation_mode
            : "none"
        }
      />
    </main>
  );
}
