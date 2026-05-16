import type { CheckpointComplianceView } from "@/lib/office/checkpointCompliance";
import { isComplianceEmpty } from "@/lib/office/checkpointCompliance";
import type { EvidenceDateStatus } from "@/lib/office/evidenceDateHints";

type Props = {
  compliance: CheckpointComplianceView;
  checkpointId?: string;
  evidenceDateStatusById?: Record<string, EvidenceDateStatus>;
};

const externalLinkProps = {
  target: "_blank",
  rel: "noreferrer noopener",
} as const;

const sectionStyle: React.CSSProperties = {
  display: "grid",
  gap: "0.2rem",
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: "1.1rem",
  display: "grid",
  gap: "0.15rem",
};

const noteStyle: React.CSSProperties = {
  display: "block",
  marginTop: "0.1rem",
  opacity: 0.85,
};

function formatLegalSourceLabel(entry: CheckpointComplianceView["legalSources"][number]): string {
  const head = entry.paragraph
    ? `${entry.shortName} ${entry.paragraph}`
    : entry.shortName;
  return `${head} — ${entry.title}`;
}

function formatCounts(c: CheckpointComplianceView): string {
  const parts: string[] = [];
  if (c.legalSources.length > 0) {
    parts.push(
      c.legalSources.length === 1
        ? "1 Rechtsgrundlage"
        : `${c.legalSources.length} Rechtsgrundlagen`,
    );
  }
  if (c.authorities.length > 0) {
    parts.push(
      c.authorities.length === 1
        ? "1 zustaendige Stelle"
        : `${c.authorities.length} zustaendige Stellen`,
    );
  }
  if (c.requiredEvidences.length > 0) {
    parts.push(
      c.requiredEvidences.length === 1
        ? "1 Pflichtnachweis"
        : `${c.requiredEvidences.length} Pflichtnachweise`,
    );
  }
  if (c.optionalEvidences.length > 0) {
    parts.push(
      c.optionalEvidences.length === 1
        ? "1 optionaler Nachweis"
        : `${c.optionalEvidences.length} optionale Nachweise`,
    );
  }
  return parts.join(" · ");
}

function formatEvidenceDateStatus(status?: EvidenceDateStatus): string | null {
  if (!status) return null;
  const parts: string[] = [];
  if (status.issuedAt) parts.push(`ausgestellt am ${status.issuedAt}`);
  if (status.receivedAt) parts.push(`eingegangen am ${status.receivedAt}`);
  if (status.performedAt) parts.push(`erbracht am ${status.performedAt}`);
  if (status.detectedAt) parts.push(`festgestellt am ${status.detectedAt}`);
  if (status.validUntil) parts.push(`gültig bis ${status.validUntil}`);
  if (status.nextDueAt) parts.push(`nächste Fälligkeit ${status.nextDueAt}`);
  if (status.deadlineAt) parts.push(`Frist endet am ${status.deadlineAt}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default function OfficeComplianceFooter({
  compliance,
  checkpointId,
  evidenceDateStatusById,
}: Props) {
  if (isComplianceEmpty(compliance)) return null;

  const summaryText = `Compliance · ${formatCounts(compliance)}`;
  const testId = checkpointId
    ? `office-compliance-footer-${checkpointId}`
    : "office-compliance-footer";

  return (
    <details
      data-testid={testId}
      style={{ marginTop: "0.25rem", opacity: 0.92 }}
    >
      <summary
        className="text-small text-muted"
        style={{ cursor: "pointer", fontWeight: 600 }}
      >
        {summaryText}
      </summary>

      <div
        style={{
          display: "grid",
          gap: "0.5rem",
          padding: "0.5rem",
          marginTop: "0.3rem",
          backgroundColor: "#f5f7fa",
          borderRadius: "0.25rem",
        }}
      >
        {compliance.legalSources.length > 0 ? (
          <div style={sectionStyle} data-testid="compliance-legal-sources">
            <div className="text-small text-muted" style={{ fontWeight: 600 }}>
              Rechtsgrundlagen
            </div>
            <ul className="text-small" style={listStyle}>
              {compliance.legalSources.map((entry) => (
                <li key={entry.id}>
                  {entry.sourceUrl ? (
                    <a href={entry.sourceUrl} {...externalLinkProps}>
                      {formatLegalSourceLabel(entry)}
                    </a>
                  ) : (
                    <span>{formatLegalSourceLabel(entry)}</span>
                  )}
                  {entry.note ? (
                    <span className="text-small text-muted" style={noteStyle}>
                      {entry.note}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {compliance.authorities.length > 0 ? (
          <div style={sectionStyle} data-testid="compliance-authorities">
            <div className="text-small text-muted" style={{ fontWeight: 600 }}>
              Zustaendige Stellen
            </div>
            <ul className="text-small" style={listStyle}>
              {compliance.authorities.map((entry) => (
                <li key={entry.id}>
                  {entry.sourceUrl ? (
                    <a href={entry.sourceUrl} {...externalLinkProps}>
                      {entry.name}
                    </a>
                  ) : (
                    <span>{entry.name}</span>
                  )}
                  {entry.note ? (
                    <span className="text-small text-muted" style={noteStyle}>
                      {entry.note}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {compliance.requiredEvidences.length > 0 ? (
          <div style={sectionStyle} data-testid="compliance-required-evidences">
            <div className="text-small text-muted" style={{ fontWeight: 600 }}>
              Pflichtnachweise
            </div>
            <ul className="text-small" style={listStyle}>
              {compliance.requiredEvidences.map((entry) => {
                const statusText = formatEvidenceDateStatus(
                  evidenceDateStatusById?.[entry.id]
                );
                return (
                  <li key={entry.id}>
                    <span>{entry.label}</span>
                    {statusText ? (
                      <span className="text-small text-muted" style={noteStyle}>
                        {statusText}
                      </span>
                    ) : null}
                    {entry.formatHint ? (
                      <span className="text-small text-muted" style={noteStyle}>
                        {entry.formatHint}
                      </span>
                    ) : null}
                    {entry.note ? (
                      <span className="text-small text-muted" style={noteStyle}>
                        {entry.note}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {compliance.optionalEvidences.length > 0 ? (
          <div style={sectionStyle} data-testid="compliance-optional-evidences">
            <div className="text-small text-muted" style={{ fontWeight: 600 }}>
              Optionale Nachweise
            </div>
            <ul className="text-small" style={listStyle}>
              {compliance.optionalEvidences.map((entry) => {
                const statusText = formatEvidenceDateStatus(
                  evidenceDateStatusById?.[entry.id]
                );
                return (
                  <li key={entry.id}>
                    <span>{entry.label}</span>
                    {statusText ? (
                      <span className="text-small text-muted" style={noteStyle}>
                        {statusText}
                      </span>
                    ) : null}
                    {entry.formatHint ? (
                      <span className="text-small text-muted" style={noteStyle}>
                        {entry.formatHint}
                      </span>
                    ) : null}
                    {entry.note ? (
                      <span className="text-small text-muted" style={noteStyle}>
                        {entry.note}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}
