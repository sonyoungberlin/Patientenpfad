import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePatientCommunicationAccessFromCookies } from "@/lib/authz";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import {
  STATUS_LABELS,
  deriveDisplayStatus,
} from "@/lib/questionnaire/displayStatus";
import QuestionnaireCard from "./QuestionnaireCard";

export default async function QuestionnairesPage() {
  const account = await requirePatientCommunicationAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  const sessions = await prisma.patientQuestionnaireSession.findMany({
    where: { owner_account_id: account.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      patient_reference: true,
      selected_block_ids: true,
      status: true,
      token_expires_at: true,
      submitted_at: true,
      submitted_by: true,
      deduplicated_questions: true,
      answers: true,
      identity_gate_completed_at: true,
    },
  });

  return (
    <main>
      <h1>Fragebogen-Übersicht</h1>
      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
        {sessions.length} Fragebogen{sessions.length !== 1 ? "" : ""}
      </p>

      {sessions.length === 0 ? (
        <p className="text-muted">Noch keine Fragebögen erstellt.</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {sessions.map((s) => {
            const blockIds = Array.isArray(s.selected_block_ids)
              ? (s.selected_block_ids as string[])
              : [];
            const blockLabels = blockIds
              .map((id) => BLOCK_CATALOG[id]?.label ?? id)
              .join(", ");

            const displayStatus = deriveDisplayStatus(s);
            const statusLabel = STATUS_LABELS[displayStatus] ?? displayStatus;

            const questions = Array.isArray(s.deduplicated_questions)
              ? (s.deduplicated_questions as QuestionDefinition[])
              : [];
            const answers =
              s.answers !== null &&
              typeof s.answers === "object" &&
              !Array.isArray(s.answers)
                ? (s.answers as Record<string, string>)
                : null;

            const noteText = buildMedicalRecordNote({
              answers,
              selected_block_ids: blockIds,
              identity_gate_completed_at: s.identity_gate_completed_at,
            });

            return (
              <QuestionnaireCard
                key={s.id}
                id={s.id}
                createdAt={s.createdAt}
                patientReference={s.patient_reference}
                blockLabels={blockLabels}
                displayStatus={displayStatus}
                statusLabel={statusLabel}
                submittedAt={s.submitted_at}
                submittedBy={s.submitted_by}
                identityGateCompletedAt={s.identity_gate_completed_at}
                questions={questions}
                answers={answers}
                noteText={noteText}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
