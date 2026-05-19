import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActiveCheckpoint } from "@/lib/types";
import type { M2PrefillData } from "@/lib/logic/m2Questions";
import { ensureAlwaysPresentCheckpoints, ensureSelectionConditionalCheckpoints, filterObsoleteCheckpoints, filterUnjustifiedConditionalCheckpoints } from "@/lib/logic/checkpointCatalog";
import { getSessionAccountFromCookies } from "@/lib/auth";
import {
  getFrozenRuns,
  getOpenRun,
  isPrefillRunSource,
  type PrefillRunSource,
} from "@/lib/server/prefillRuns";
import { M3ChecklistClient, type M3FrozenRunView } from "./M3ChecklistClient";

export default async function M3Page({
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
    select: {
      active_checkpoints: true,
      ctx_prefill: true,
      owner_account_id: true,
      m2_status: true,
      preparation_mode: true,
      doctor_confirmed: true,
      clinical_status: true,
    },
  });

  if (!session || session.owner_account_id !== account.id) {
    redirect("/");
  }

  // Signatur praxis-bezogen laden (für „Nachricht kopieren"-Button).
  // Quelle: `Practice.message_signature` der aktuellen Practice des
  // eingeloggten Accounts. Vor dem Account→Practice-Cleanup-Migration
  // (PR 2) bleibt `Account.message_signature` zwar bestehen, wird hier
  // aber nicht mehr gelesen.
  let messageSignature = "";
  const currentPracticeId = account.current_practice?.id;
  if (currentPracticeId) {
    try {
      const pr = await prisma.practice.findUnique({
        where: { id: currentPracticeId },
        select: { message_signature: true },
      });
      messageSignature = pr?.message_signature ?? "";
    } catch {
      // Spalte existiert ggf. noch nicht (Migration nicht angewendet)
      messageSignature = "";
    }
  }

  const checkpoints = ensureSelectionConditionalCheckpoints(
    filterUnjustifiedConditionalCheckpoints(
      ensureAlwaysPresentCheckpoints(
        filterObsoleteCheckpoints(
          Array.isArray(session.active_checkpoints)
            ? (session.active_checkpoints as ActiveCheckpoint[])
            : [],
        ),
      ),
    ),
  );

  // Schritt 3 der PrefillRun-Umstellung: M3 liest die anzuzeigenden
  // Antworten ausschließlich aus den eingefrorenen `PrefillRun`s (in
  // `sequence`-Reihenfolge). `ctx_prefill` bleibt als Cache/Kompatibilitäts-
  // schicht bestehen, wird hier aber **nicht mehr** gerendert – es findet
  // keine Aggregation, kein Merge und kein Fallback statt.
  let frozenRuns: M3FrozenRunView[] = [];
  try {
    const runs = await getFrozenRuns(id);
    frozenRuns = runs
      .filter((r) => isPrefillRunSource(r.source))
      .map((r) => ({
        id: r.id,
        sequence: r.sequence,
        source: r.source as PrefillRunSource,
        answers:
          r.answers && typeof r.answers === "object" && !Array.isArray(r.answers)
            ? (r.answers as unknown as M2PrefillData)
            : {},
      }));
  } catch {
    // Vor der Migration existiert die Tabelle ggf. noch nicht – leere Liste
    // führt zum korrekten Verhalten (keine Prefill-Blöcke angezeigt).
    frozenRuns = [];
  }

  const m2Status = typeof session.m2_status === "string" ? session.m2_status : "none";
  const preparationMode =
    typeof session.preparation_mode === "string" ? session.preparation_mode : "none";
  const clinicalStatus =
    typeof session.clinical_status === "string" ? session.clinical_status : "none";

  // Ergänzungslauf wurde gestartet, wenn clinical_status "prepared" ist und
  // bereits mindestens ein PrefillRun existiert (frozen oder offen).
  // Ein offener Run deutet auf einen laufenden Ergänzungs-M2 hin;
  // ein frozen Run bedeutet der Ergänzungslauf wurde bereits abgeschlossen.
  let ergaenzungGestartet = false;
  if (clinicalStatus === "prepared") {
    if (frozenRuns.length > 0) {
      ergaenzungGestartet = true;
    } else {
      try {
        const openRun = await getOpenRun(id);
        ergaenzungGestartet = openRun !== null;
      } catch {
        ergaenzungGestartet = false;
      }
    }
  }

  return (
    <main className="m3-page">
      <h1>Ärztliche Checkliste</h1>
      <M3ChecklistClient caseId={id} initialCheckpoints={checkpoints} frozenRuns={frozenRuns} m2Status={m2Status} preparationMode={preparationMode} messageSignature={messageSignature} doctorConfirmed={session.doctor_confirmed === true} clinicalStatus={clinicalStatus} ergaenzungGestartet={ergaenzungGestartet} />
    </main>
  );
}
