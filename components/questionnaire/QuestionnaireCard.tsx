import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import { getStatusBadgeStyle } from "@/lib/questionnaire/displayStatus";
import MedicalRecordNoteCopyButton from "./MedicalRecordNoteCopyButton";
import QuestionnaireDeleteButton from "./QuestionnaireDeleteButton";

/**
 * Reine Präsentations-Komponente (Server Component) für eine einzelne
 * Fragebogen-Karte in der Übersicht.
 *
 * Die in der Kopfzeile gerenderte `displayedAt` ist die vom Aufrufer
 * abgeleitete Anzeigezeit (`submitted_at ?? createdAt`), damit
 * Website-Eingänge die tatsächliche Eingangszeit nach E-Mail-Bestätigung
 * zeigen und interne Sessions weiterhin den Erstellzeitpunkt als
 * Fallback nutzen. Die Formatierung fixiert die Zeitzone explizit auf
 * `Europe/Berlin`, damit die Anzeige unabhängig von der Server-TZ
 * konsistent in lokaler Praxiszeit erfolgt.
 */
export type QuestionnaireCardProps = {
  id: string;
  displayedAt: Date;
  patientReference: string | null;
  blockLabels: string;
  displayStatus: string;
  statusLabel: string;
  submittedBy: string | null;
  identityGateCompletedAt: Date | null;
  questions: QuestionDefinition[];
  answers: Record<string, string> | null;
  /**
   * Vorberechneter Krankenblatt-Text. Wird nur bei `displayStatus === "completed"`
   * angezeigt; in allen anderen Fällen ignoriert. Der Aufrufer kann daher für
   * nicht-completed Sessions einen leeren String übergeben.
   */
  noteText: string;
};

export default function QuestionnaireCard({
  id,
  displayedAt,
  patientReference,
  blockLabels,
  displayStatus,
  statusLabel,
  submittedBy,
  identityGateCompletedAt,
  questions,
  answers,
  noteText,
}: QuestionnaireCardProps) {
  return (
    <div
      className="card"
      data-q-session={id}
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
          <span style={{ fontWeight: 500 }}>{patientReference ?? "–"}</span>
          <span
            className="text-muted text-small"
            style={{ marginLeft: "0.75rem" }}
          >
            {displayedAt.toLocaleString("de-DE", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Europe/Berlin",
            })}
          </span>
        </div>
        <span style={getStatusBadgeStyle(displayStatus)}>{statusLabel}</span>
      </div>

      <div className="text-muted text-small">
        Blöcke: {blockLabels || "–"}
      </div>

      {identityGateCompletedAt && (
        <div
          className="text-small"
          data-q-identity-gate={id}
          style={{ color: "var(--muted-fg, #475569)" }}
        >
          Identitätsabfrage: erfolgt
        </div>
      )}

      {/* PDF download + Krankenblatt-Text */}
      {displayStatus === "completed" && (
        <>
          <a
            href={`/api/questionnaire/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-small"
            data-q-pdf={id}
            style={{ display: "inline-block", marginTop: "0.25rem" }}
          >
            PDF herunterladen
          </a>
          <MedicalRecordNoteCopyButton sessionId={id} noteText={noteText} />
        </>
      )}

      {/* Kontexthinweis bei Einreichung durch Kontaktperson */}
      {submittedBy === "contact_person" && (
        <div
          className="text-small"
          style={{
            padding: "0.35rem 0.6rem",
            background: "var(--muted, #f1f5f9)",
            borderRadius: "var(--radius)",
            color: "var(--muted-fg, #475569)",
          }}
        >
          Die Angaben wurden durch eine Kontaktperson im Namen der Patientin / des Patienten übermittelt.
        </div>
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
                <div className="text-small" style={{ fontWeight: 500 }}>
                  {q.text}
                </div>
                <div
                  className="text-small"
                  style={{ marginLeft: "0.5rem" }}
                >
                  {answers[q.id] !== undefined && answers[q.id] !== "" ? (
                    answers[q.id]
                  ) : (
                    <span className="text-muted">–</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Delete */}
      <QuestionnaireDeleteButton sessionId={id} />
    </div>
  );
}
