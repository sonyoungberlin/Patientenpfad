import { getStatusBadgeStyle } from "@/lib/questionnaire/displayStatus";
import QuestionnaireDeleteButton from "./QuestionnaireDeleteButton";
import QuestionnaireRestoreButton from "./QuestionnaireRestoreButton";
import QuestionnairePatientAssignment from "./QuestionnairePatientAssignment";
import QuestionnaireDetailsDisclosure from "./QuestionnaireDetailsDisclosure";
import { KioskCheckInActions } from "./KioskCheckInActions";
import { PublicCheckInActions } from "./PublicCheckInActions";

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
  /** Technischer Entstehungsweg der Fragebogensession. */
  source?: string | null;
  sessionKind?: string | null;
  kioskHandoffStatus?: string | null;
  publicHandoffStatus?: string | null;
  publicHandoffExpired?: boolean;
  exportFinal?: boolean;
};

export default function QuestionnaireCard({
  id,
  displayedAt,
  patientReference,
  blockLabels,
  displayStatus,
  statusLabel,
  submittedBy,
  pdfDownloadedAt = null,
  deletedAt = null,
  isFromDigitalRequest = false,
  source = null,
  sessionKind = null,
  kioskHandoffStatus = null,
  publicHandoffStatus = null,
  publicHandoffExpired = false,
  exportFinal = displayStatus === "completed",
}: QuestionnaireCardProps) {
  const isDeleted = deletedAt != null;
  const sourceLabel = sessionKind === "internal_documentation"
    ? "Interne Dokumentation"
    : isFromDigitalRequest
    ? "Digitale Anfrage"
    : source === "kiosk_direct"
      ? "Kiosk"
      : source === "public_check_in"
      ? "Smartphone/QR"
      : source === "practice_direct"
      ? "Sofort-Abfrage"
      : null;
  const canAssignWebsitePatient =
    !isDeleted && displayStatus === "completed" && source === "website" && patientReference == null;
  const canAssignKioskCheckIn = !isDeleted &&
    displayStatus === "completed" &&
    source === "kiosk_direct" &&
    kioskHandoffStatus === "waiting" &&
    patientReference == null;
  const canAssignPublicCheckIn = !isDeleted && !publicHandoffExpired &&
    displayStatus === "completed" && source === "public_check_in" &&
    publicHandoffStatus === "waiting" && patientReference == null;
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

      {sourceLabel && (
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
          {sourceLabel}
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

      {/* PDF download + Krankenblatt-Text */}
      {exportFinal && (
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
        </>
      )}

      {canAssignWebsitePatient && <QuestionnairePatientAssignment sessionId={id} />}
      {canAssignKioskCheckIn && (
        <QuestionnairePatientAssignment sessionId={id} downloadArtifacts={false} />
      )}
      {canAssignPublicCheckIn && (
        <QuestionnairePatientAssignment sessionId={id} downloadArtifacts={false} />
      )}
      {!isDeleted &&
        displayStatus === "completed" &&
        kioskHandoffStatus === "waiting" &&
        patientReference !== null && (
          <KioskCheckInActions sessionId={id} />
        )}
      {!isDeleted && !publicHandoffExpired && displayStatus === "completed" &&
        source === "public_check_in" && publicHandoffStatus === "waiting" &&
        patientReference !== null && <PublicCheckInActions sessionId={id} />}

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

      {displayStatus === "completed" && <QuestionnaireDetailsDisclosure sessionId={id} />}

      {/* Delete bzw. Restore — Papierkorb-Einträge bekommen den
          Wiederherstellen-Button statt eines weiteren Lösch-Buttons. */}
      {isDeleted ? (
        <QuestionnaireRestoreButton sessionId={id} />
      ) : displayStatus === "completed" ? (
        <QuestionnaireDeleteButton
          sessionId={id}
          patientReference={patientReference}
        />
      ) : null}
    </div>
  );
}
