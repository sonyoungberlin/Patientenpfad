import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import { getStatusBadgeStyle } from "@/lib/questionnaire/displayStatus";
import MedicalRecordNoteCopyButton from "./MedicalRecordNoteCopyButton";
import QuestionnaireDeleteButton from "./QuestionnaireDeleteButton";
import QuestionnaireRestoreButton from "./QuestionnaireRestoreButton";
import {
  parseFacharztEntries,
  parseRepeatableGroupEntries,
  formatYesNoValue,
  buildDerivedValueLines,
} from "@/lib/questionnaire/formatAnswer";
import type { RepGroupEntry } from "@/lib/questionnaire/formatAnswer";
import type { DerivedValues } from "@/lib/questionnaire/derivedValues";

/**
 * Zeigt eine Liste von repeatable-group-Einträgen strukturiert an.
 */
function RepeatableGroupAnswerDisplay({ entries }: { entries: RepGroupEntry[] }) {
  if (entries.length === 0) return <span className="text-muted">–</span>;
  return (
    <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.25rem" }}>
      {entries.map((entry) => (
        <div
          key={entry.index}
          style={{ paddingLeft: "0.5rem", borderLeft: "2px solid var(--border)" }}
        >
          <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
            {entry.index}. Eintrag
          </div>
          {entry.fields.map((field, fi) => (
            <div key={fi}>
              <span style={{ fontWeight: 500 }}>{field.label}:</span>{" "}
              {field.value}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Formatiert FACHAERZTE-JSON für die Antwortanzeige im Posteingang.
 * @deprecated Verwende RepeatableGroupAnswerDisplay mit parseFacharztEntries.
 */
function FacharztAnswerDisplay({ value }: { value: string }) {
  const entries = parseFacharztEntries(value);
  if (entries.length === 0) return <span className="text-muted">–</span>;
  return <RepeatableGroupAnswerDisplay entries={entries} />;
}

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
  /**
   * Zeitpunkt des ersten erfolgreichen PDF-Downloads (oder `null`, falls noch
   * nie heruntergeladen). Steuert nur die Beschriftung des PDF-Buttons sowie
   * einen dezenten Status-Hinweis und ändert nicht das Verhalten des
   * Downloads selbst.
   */
  pdfDownloadedAt?: Date | null;
  /**
   * Soft-Delete-Marker. `null` = aktiver Eintrag (zeigt Lösch-Button), ein
   * Datum signalisiert, dass die Session im Papierkorb liegt: in diesem Fall
   * wird ein „Gelöscht"-Badge angezeigt und der Lösch-Button durch einen
   * Wiederherstellen-Button ersetzt.
   */
  deletedAt?: Date | null;
  /**
   * Zeigt ein „Digitale Anfrage"-Badge an, wenn die Session aus einer
   * DigitalRequest erzeugt wurde (Phase B Schritt 5).
   */
  isFromDigitalRequest?: boolean;
  /**
   * Berechnete Werte (AGE, BMI, Pack-Years) für die Praxisanzeige.
   * Wird von der übergeordneten Seite vorberechnet und übergeben.
   * Nur im Status "completed" angezeigt.
   */
  derivedValues?: DerivedValues | null;  /**
   * Menge der sichtbaren Fragen-IDs für diese Session.
   * Wenn vorhanden: nicht sichtbare Fragen → „Nicht abgefragt";
   * sichtbar aber unbeantwortet → „–".
   * Wenn nicht vorhanden (Legacy): leere Antworten → „–".
   */
  visibleQuestionIds?: ReadonlySet<string>;};

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
  pdfDownloadedAt = null,
  deletedAt = null,
  isFromDigitalRequest = false,
  derivedValues = null,
  visibleQuestionIds,
}: QuestionnaireCardProps) {
  const isDeleted = deletedAt != null;
  return (
    <div
      className="card"
      data-q-session={id}
      data-q-deleted={isDeleted ? "true" : "false"}
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

      {isFromDigitalRequest && (
        <div
          className="text-small"
          data-q-source-badge={id}
          style={{
            padding: "0.25rem 0.6rem",
            background: "#eff6ff",
            borderRadius: "var(--radius)",
            color: "#1d4ed8",
            fontWeight: 500,
            width: "fit-content",
          }}
        >
          Digitale Anfrage
        </div>
      )}

      {isDeleted && (
        <div
          className="text-small"
          data-q-deleted-badge={id}
          style={{
            padding: "0.35rem 0.6rem",
            background: "var(--muted, #f1f5f9)",
            borderRadius: "var(--radius)",
            color: "var(--danger-fg, #b91c1c)",
            fontWeight: 500,
            width: "fit-content",
          }}
        >
          Gelöscht
        </div>
      )}

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
            data-q-pdf-downloaded={pdfDownloadedAt ? "true" : "false"}
            style={{ display: "inline-block", marginTop: "0.25rem" }}
          >
            {pdfDownloadedAt ? "PDF erneut herunterladen" : "PDF herunterladen"}
          </a>
          {pdfDownloadedAt && (
            <div
              className="text-small"
              data-q-pdf-status={id}
              style={{ color: "var(--muted-fg, #475569)" }}
            >
              ✓ PDF heruntergeladen
            </div>
          )}
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

      {/* Berechnete Werte (nur im completed-Status) */}
      {displayStatus === "completed" && derivedValues && (() => {
        const dvLines = buildDerivedValueLines(derivedValues);
        if (dvLines.length === 0) return null;
        return (
          <div
            data-q-derived-values={id}
            style={{
              padding: "0.4rem 0.6rem",
              background: "var(--muted, #f1f5f9)",
              borderRadius: "var(--radius)",
              fontSize: "0.85rem",
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>Berechnete Werte</div>
            {dvLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        );
      })()}

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
                  {(() => {
                    const isVisible = !visibleQuestionIds || visibleQuestionIds.has(q.id);
                    if (!isVisible) {
                      return <span className="text-muted">Nicht abgefragt</span>;
                    }
                    const val = answers?.[q.id];
                    if (!val || val === "") {
                      return <span className="text-muted">–</span>;
                    }
                    if (q.id === "FACHAERZTE") return <FacharztAnswerDisplay value={val} />;
                    if (q.type === "repeatable_group") {
                      return (
                        <RepeatableGroupAnswerDisplay
                          entries={parseRepeatableGroupEntries(val, q.id, q)}
                        />
                      );
                    }
                    if (q.type === "yes_no") return formatYesNoValue(val);
                    return val;
                  })()}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Delete bzw. Restore — Papierkorb-Einträge bekommen den
          Wiederherstellen-Button statt eines weiteren Lösch-Buttons. */}
      {isDeleted ? (
        <QuestionnaireRestoreButton sessionId={id} />
      ) : (
        <QuestionnaireDeleteButton
          sessionId={id}
          patientReference={patientReference}
        />
      )}
    </div>
  );
}
