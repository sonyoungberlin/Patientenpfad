import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActiveCheckpoint } from "@/lib/types";
import type { M2PrefillData } from "@/lib/logic/m2Questions";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { getOpenRun, getFrozenRuns } from "@/lib/server/prefillRuns";
import { backfillPerspectives, ensureSelectionConditionalCheckpoints, filterUnjustifiedConditionalCheckpoints } from "@/lib/logic/checkpointCatalog";
import { M2PrefillClient } from "./M2PrefillClient";
import { M2LinkGeneratorClient } from "./M2LinkGeneratorClient";
import { M2SkipButtonClient } from "./M2SkipButtonClient";
import { M2PatientConversationClient } from "./M2PatientConversationClient";
import { M2MfaModeClient } from "./M2MfaModeClient";

export default async function M2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }

  const { id } = await params;

  const session = await prisma.caseSession.findUnique({
    where: { id },
    select: { active_checkpoints: true, ctx_prefill: true, owner_account_id: true, doctor_confirmed: true, preparation_mode: true },
  });

  if (!session || session.owner_account_id !== account.id) {
    redirect("/");
  }

  // Bei bereits ärztlich bestätigtem (eingefrorenem) Fall niemals zurück
  // in M2 routen – immer direkt auf M3 umleiten.
  if (session.doctor_confirmed) {
    redirect(`/cases/${id}/m3`);
  }

  // Offenen Run und eingefrorene Runs parallel laden.
  const [openRun, frozenRuns] = await Promise.all([
    getOpenRun(id).catch(() => null),
    getFrozenRuns(id).catch(() => []),
  ]);

  // Per-Source-Filter: Für jede Quelle wird ermittelt, welche Checkpoint-IDs
  // bereits in einem eingefrorenen Run mit dieser Quelle beantwortet wurden.
  // M2PrefillClient filtert die sichtbaren Checkpoints anhand dieser Listen:
  // Ein Checkpoint wird nur angezeigt, wenn er für die aktuelle Quelle noch
  // nicht in einem eingefrorenen Run vorhanden ist.
  const answeredCheckpointIdsBySource: {
    mfa: string[];
    conversation: string[];
    patient: string[];
  } = { mfa: [], conversation: [], patient: [] };

  for (const run of frozenRuns) {
    const src = run.source as keyof typeof answeredCheckpointIdsBySource;
    if (!(src in answeredCheckpointIdsBySource)) continue;
    const answers =
      run.answers && typeof run.answers === "object" && !Array.isArray(run.answers)
        ? (run.answers as Record<string, unknown>)
        : {};
    for (const cpId of Object.keys(answers)) {
      if (!answeredCheckpointIdsBySource[src].includes(cpId)) {
        answeredCheckpointIdsBySource[src].push(cpId);
      }
    }
  }

  // Alle aktiven Checkpoints des Falls – perspectives für Altfälle aus dem
  // Katalog ergänzen (Rückwärtskompatibilität vor Schritt 4).
  // filterUnjustifiedConditionalCheckpoints entfernt K18 ohne gültigen Trigger
  // (Alt-DB-Schutz). ensureSelectionConditionalCheckpoints ergänzt Trigger-
  // basierte Checkpoints (K14/K15 für Reha, K16/K17 für Pflege, K18 für
  // Attest/Jobcenter/Versicherung/Sonstiger) wenn K11 entsprechende
  // Selektionen enthält.
  const checkpoints = backfillPerspectives(
    ensureSelectionConditionalCheckpoints(
      filterUnjustifiedConditionalCheckpoints(
        Array.isArray(session.active_checkpoints)
          ? (session.active_checkpoints as ActiveCheckpoint[])
          : [],
      ),
    ),
  );

  // Vorbelegung: Wenn ein offener PrefillRun existiert (z. B. nach einer
  // Fallergänzung oder einer angefangenen, aber noch nicht eingefrorenen
  // M2-Bearbeitung), ist **dieser** Run die einzige aktive
  // Bearbeitungsgrundlage. Eingefrorene Runs und der `ctx_prefill`-Cache
  // dürfen dann nicht erneut als editierbarer Prefill übernommen werden.
  // Nur wenn kein offener Run existiert, fällt die Vorbelegung auf
  // `ctx_prefill` zurück (rückwärtskompatibel für den Standardfall).
  let prefill: M2PrefillData = {};
  if (openRun) {
    if (
      openRun.answers &&
      typeof openRun.answers === "object" &&
      !Array.isArray(openRun.answers)
    ) {
      prefill = openRun.answers as unknown as M2PrefillData;
    }
  } else if (
    session.ctx_prefill &&
    typeof session.ctx_prefill === "object" &&
    !Array.isArray(session.ctx_prefill)
  ) {
    prefill = session.ctx_prefill as M2PrefillData;
  }

  return (
    <main>
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
          <M2LinkGeneratorClient caseId={id} />
          <M2PatientConversationClient />
          <M2MfaModeClient />
        </div>
      </section>

      {/* Formularbereich – beginnt klar als neuer Abschnitt */}
      <M2PrefillClient
        caseId={id}
        checkpoints={checkpoints}
        initialPrefill={prefill}
        initialPreparationMode={
          typeof session.preparation_mode === "string"
            ? session.preparation_mode
            : "none"
        }
        answeredCheckpointIdsBySource={answeredCheckpointIdsBySource}
      />
    </main>
  );
}
