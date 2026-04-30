import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import MedicalRecordNoteCopyButton from "./MedicalRecordNoteCopyButton";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ausstehend",
  completed: "Eingegangen",
  expired: "Abgelaufen",
};

function deriveDisplayStatus(session: {
  status: string;
  token_expires_at: Date | null;
}): string {
  // A pending session whose token has expired is shown as "Abgelaufen"
  if (
    session.status === "pending" &&
    session.token_expires_at !== null &&
    session.token_expires_at < new Date()
  ) {
    return "expired";
  }
  return session.status;
}

export default async function QuestionnairesPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
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
      deduplicated_questions: true,
      answers: true,
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

            return (
              <div
                key={s.id}
                className="card"
                data-q-session={s.id}
                style={{ display: "grid", gap: "0.5rem" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>
                      {s.patient_reference ?? "–"}
                    </span>
                    <span
                      className="text-muted text-small"
                      style={{ marginLeft: "0.75rem" }}
                    >
                      {s.createdAt.toLocaleString("de-DE", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: "0.15rem 0.5rem",
                      borderRadius: "var(--radius)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      background:
                        displayStatus === "completed"
                          ? "var(--success-bg, #dcfce7)"
                          : displayStatus === "expired"
                            ? "var(--muted, #f1f5f9)"
                            : "var(--warning-bg, #fef9c3)",
                      color:
                        displayStatus === "completed"
                          ? "var(--success-fg, #166534)"
                          : displayStatus === "expired"
                            ? "var(--muted-fg, #64748b)"
                            : "var(--warning-fg, #854d0e)",
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="text-muted text-small">
                  Blöcke: {blockLabels || "–"}
                </div>

                {s.submitted_at && (
                  <div className="text-small">
                    Eingegangen:{" "}
                    {s.submitted_at.toLocaleString("de-DE", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                )}

                {/* PDF download + Krankenblatt-Text */}
                {displayStatus === "completed" && (
                  <>
                    <a
                      href={`/api/questionnaire/${s.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-small"
                      data-q-pdf={s.id}
                      style={{ display: "inline-block", marginTop: "0.25rem" }}
                    >
                      PDF herunterladen
                    </a>
                    <MedicalRecordNoteCopyButton
                      sessionId={s.id}
                      noteText={buildMedicalRecordNote({
                        answers,
                        selected_block_ids: blockIds,
                      })}
                    />
                  </>
                )}

                {/* Answers */}
                {answers && questions.length > 0 && (
                  <details style={{ marginTop: "0.5rem" }}>
                    <summary
                      style={{ cursor: "pointer", fontWeight: 500, fontSize: "0.9rem" }}
                    >
                      Antworten anzeigen
                    </summary>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: "0.5rem 0 0",
                        display: "grid",
                        gap: "0.4rem",
                      }}
                    >
                      {questions.map((q) => (
                        <li key={q.id} data-q-answer={q.id}>
                          <div
                            className="text-small"
                            style={{ fontWeight: 500 }}
                          >
                            {q.text}
                          </div>
                          <div
                            className="text-small"
                            style={{ marginLeft: "0.5rem" }}
                          >
                            {answers[q.id] !== undefined && answers[q.id] !== ""
                              ? answers[q.id]
                              : <span className="text-muted">–</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
