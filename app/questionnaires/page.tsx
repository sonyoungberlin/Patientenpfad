import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePatientCommunicationAccessFromCookies } from "@/lib/authz";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import {
  STATUS_LABELS,
  deriveDisplayStatus,
} from "@/lib/questionnaire/displayStatus";
import { PRACTICE_VISIBLE_SESSION_FILTER } from "@/lib/websiteForms/practiceVisibility";
import { getOwnershipFilter } from "@/lib/questionnaire/practiceScope";
import QuestionnaireCard from "@/components/questionnaire/QuestionnaireCard";

type SearchParams = Promise<{ view?: string | string[] }>;

type PageProps = {
  searchParams?: SearchParams;
};

export default async function QuestionnairesPage({
  searchParams,
}: PageProps) {
  const account = await requirePatientCommunicationAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  // View-Toggle: Default ist „aktiv". Nur der explizite Wert „trash" schaltet
  // auf den Papierkorb um, damit fremde/zukünftige Werte nicht versehentlich
  // gelöschte Einträge zeigen.
  const sp = (await searchParams) ?? {};
  const rawView = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  const view: "active" | "trash" = rawView === "trash" ? "trash" : "active";

  const sessions = await prisma.patientQuestionnaireSession.findMany({
    where: {
      AND: [
        // Phase P3b: Filter über `owner_practice_id` (mit Fallback auf
        // `owner_account_id`, wenn der Account keine `current_practice`
        // hat). Mehrere Accounts derselben Praxis sehen damit dieselbe
        // Liste.
        getOwnershipFilter(account),
        // Phase 3d: Website-Sessions erst sichtbar, wenn bestätigt.
        // Interne Sessions bleiben unverändert sichtbar.
        PRACTICE_VISIBLE_SESSION_FILTER,
        // Soft-Delete: aktive Liste blendet archivierte Sessions aus,
        // Papierkorb zeigt ausschließlich archivierte.
        view === "trash"
          ? { deleted_at: { not: null } }
          : { deleted_at: null },
      ],
    },
    orderBy: [
      // Eingegangene/eingereichte Sessions oben, sortiert nach tatsächlichem
      // Eingang. Übrige (z. B. interne, noch ausstehende) danach nach
      // Erstellzeit. Spiegelt die in der Karte angezeigte `displayedAt`-Zeit
      // (`submitted_at ?? createdAt`) konsistent in der Reihenfolge wider.
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
      submitted_by: true,
      deduplicated_questions: true,
      answers: true,
      identity_gate_completed_at: true,
      pdf_downloaded_at: true,
      deleted_at: true,
    },
  });

  const tabBase: React.CSSProperties = {
    padding: "0.35rem 0.75rem",
    borderRadius: "var(--radius)",
    textDecoration: "none",
    fontSize: "0.9rem",
  };
  const tabActive: React.CSSProperties = {
    ...tabBase,
    background: "var(--accent, #1e293b)",
    color: "var(--accent-fg, #ffffff)",
    fontWeight: 500,
  };
  const tabInactive: React.CSSProperties = {
    ...tabBase,
    background: "var(--muted, #f1f5f9)",
    color: "var(--muted-fg, #475569)",
  };

  const emptyMessage =
    view === "trash"
      ? "Papierkorb ist leer."
      : "Noch keine Fragebögen erstellt.";

  return (
    <main>
      <h1>Fragebogen-Übersicht</h1>

      <div
        role="tablist"
        aria-label="Ansicht"
        data-q-view-toggle={view}
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/questionnaires"
          role="tab"
          aria-selected={view === "active"}
          data-q-view-tab="active"
          style={view === "active" ? tabActive : tabInactive}
        >
          Aktiv
        </Link>
        <Link
          href="/questionnaires?view=trash"
          role="tab"
          aria-selected={view === "trash"}
          data-q-view-tab="trash"
          style={view === "trash" ? tabActive : tabInactive}
        >
          Papierkorb
        </Link>
      </div>

      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
        {sessions.length} Fragebogen{sessions.length !== 1 ? "" : ""}
      </p>

      {sessions.length === 0 ? (
        <p className="text-muted">{emptyMessage}</p>
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
                displayedAt={s.submitted_at ?? s.createdAt}
                patientReference={s.patient_reference}
                blockLabels={blockLabels}
                displayStatus={displayStatus}
                statusLabel={statusLabel}
                submittedBy={s.submitted_by}
                identityGateCompletedAt={s.identity_gate_completed_at}
                questions={questions}
                answers={answers}
                noteText={noteText}
                pdfDownloadedAt={s.pdf_downloaded_at}
                deletedAt={s.deleted_at}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
