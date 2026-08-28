import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOfficeQuestionnaireAccessFromCookies } from "@/lib/authz";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { OFFICE_BLOCK_CATALOG } from "@/lib/questionnaire/officeBlockCatalog";
import {
  deriveDisplayStatus,
  getStatusBadgeStyle,
  STATUS_LABELS,
} from "@/lib/questionnaire/displayStatus";
import OfficeQuestionnaireDeleteButton from "@/components/office/OfficeQuestionnaireDeleteButton";

export default async function OfficeQuestionnairePage() {
  const account = await requireOfficeQuestionnaireAccessFromCookies();
  if (!account) redirect("/");

  const sessions = await prisma.patientQuestionnaireSession.findMany({
    where: {
      AND: [
        getOfficeOwnershipFilter(account),
        { context: "office" },
        { deleted_at: null },
      ],
    },
    orderBy: [
      { submitted_at: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: 100,
    select: {
      id: true,
      createdAt: true,
      patient_reference: true,
      selected_block_ids: true,
      status: true,
      token_expires_at: true,
      submitted_at: true,
      pdf_downloaded_at: true,
    },
  });

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <h1>Bewerber-Fragebögen</h1>
        <Link href="/office-cases/questionnaire/new" className="btn">
          + Neuer Fragebogen
        </Link>
      </section>

      <p className="text-muted" style={{ marginBottom: "0.5rem" }}>
        {sessions.length} Eintr{sessions.length !== 1 ? "äge" : "ag"}
      </p>

      {sessions.length === 0 ? (
        <p className="text-muted">Noch keine Bewerber-Fragebögen erstellt.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {sessions.map((s) => {
            const blockIds = Array.isArray(s.selected_block_ids)
              ? (s.selected_block_ids as string[])
              : [];
            const blockLabels = blockIds
              .map((id) => OFFICE_BLOCK_CATALOG[id]?.label ?? id)
              .join(", ");

            const displayStatus = deriveDisplayStatus(s);
            const statusLabel = STATUS_LABELS[displayStatus] ?? displayStatus;
            const badgeStyle = getStatusBadgeStyle(displayStatus);
            const displayedAt = s.submitted_at ?? s.createdAt;

            return (
              <div
                key={s.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "1rem",
                  display: "grid",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <strong>{s.patient_reference ?? "–"}</strong>
                  <span style={badgeStyle}>{statusLabel}</span>
                  <span className="text-muted text-small">
                    {displayedAt.toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  {s.pdf_downloaded_at && (
                    <span className="text-muted text-small">
                      PDF bereits heruntergeladen
                    </span>
                  )}
                </div>
                {blockLabels && (
                  <div className="text-small text-muted">
                    Abschnitte: {blockLabels}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    marginTop: "0.25rem",
                  }}
                >
                  {displayStatus === "completed" && (
                    <a
                      href={`/api/office-cases/questionnaire/${s.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn text-small"
                      data-office-q-pdf={s.id}
                    >
                      PDF herunterladen
                    </a>
                  )}
                  <OfficeQuestionnaireDeleteButton
                    sessionId={s.id}
                    recipientReference={s.patient_reference}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
