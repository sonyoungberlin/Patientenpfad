import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccessFromCookies } from "@/lib/authz";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { INTERNAL_BLOCK_CATALOG, resolveInternalWorkflow } from "@/lib/questionnaire/internalWorkflowRegistry";
import { isNewBlockBasedInternalSession } from "@/lib/questionnaire/documentedContent";
import { parseFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import {
  STATUS_LABELS,
  deriveDisplayStatus,
} from "@/lib/questionnaire/displayStatus";
import { PRACTICE_VISIBLE_SESSION_FILTER } from "@/lib/websiteForms/practiceVisibility";
import { PATIENT_CONTEXT_FILTER } from "@/lib/questionnaire/contextFilter";
import { getOwnershipFilter } from "@/lib/questionnaire/practiceScope";
import QuestionnaireCard from "@/components/questionnaire/QuestionnaireCard";
import QuestionnaireAutoDownloadController from "@/components/questionnaire/QuestionnaireAutoDownloadController";
import {
  activeQuestionnaireLifecycleFilter,
  trashQuestionnaireLifecycleFilter,
} from "@/lib/questionnaire/lifecycle";

type SearchParams = Promise<{ view?: string | string[] }>;

type PageProps = {
  searchParams?: SearchParams;
};

export default async function QuestionnairesPage({
  searchParams,
}: PageProps) {
  const account = await requireQuestionnaireInboxAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  // View-Toggle: Default ist „aktiv". Nur der explizite Wert „trash" schaltet
  // auf den Papierkorb um, damit fremde/zukünftige Werte nicht versehentlich
  // gelöschte Einträge zeigen.
  const sp = (await searchParams) ?? {};
  const rawView = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  const view: "active" | "trash" = rawView === "trash" ? "trash" : "active";
  const now = new Date();

  const sessions = await prisma.patientQuestionnaireSession.findMany({
    where: {
      AND: [
        // Phase P3b: Filter über `owner_practice_id` (mit Fallback auf
        // `owner_account_id`, wenn der Account keine `current_practice`
        // hat). Mehrere Accounts derselben Praxis sehen damit dieselbe
        // Liste.
        getOwnershipFilter(account),
        // Nur Patient-Sessions anzeigen (positiver Kontextfilter).
        PATIENT_CONTEXT_FILTER,
        // Phase 3d: Website-Sessions erst sichtbar, wenn bestätigt.
        // Interne Sessions bleiben unverändert sichtbar.
        PRACTICE_VISIBLE_SESSION_FILTER,
        // Soft-Delete: aktive Liste blendet archivierte Sessions aus,
        // Papierkorb zeigt ausschließlich archivierte.
        view === "trash"
          ? trashQuestionnaireLifecycleFilter(now)
          : {
              AND: [
                { deleted_at: null },
                activeQuestionnaireLifecycleFilter(now),
              ],
            },
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
      pdf_downloaded_at: true,
      deleted_at: true,
      source: true,
      session_kind: true,
      internal_workflow_id: true,
      frozen_blocks: true,
    },
  });

  // Phase B: Herkunftsbadge — prüfen, welche Sessions aus einer DigitalRequest stammen.
  const sessionIds = sessions.map((s) => s.id);
  const digitalRequestSessionIds = new Set<string>();
  if (sessionIds.length > 0) {
    const linkedRequests = await prisma.digitalRequest.findMany({
      where: {
        questionnaire_session_id: { in: sessionIds },
        deleted_at: null,
      },
      select: { questionnaire_session_id: true },
    });
    for (const r of linkedRequests) {
      if (r.questionnaire_session_id) {
        digitalRequestSessionIds.add(r.questionnaire_session_id);
      }
    }
  }

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

      {view === "active" && <QuestionnaireAutoDownloadController />}

      {sessions.length === 0 ? (
        <p className="text-muted">{emptyMessage}</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {sessions.map((s) => {
            const blockIds = Array.isArray(s.selected_block_ids)
              ? (s.selected_block_ids as string[])
              : [];
            const frozenBlocks = parseFrozenBlocks(s.frozen_blocks);
            const isNewBlockBased = isNewBlockBasedInternalSession({
              sessionKind: s.session_kind,
              internalWorkflowId: s.internal_workflow_id,
              frozenBlocks,
            });
            const workflow = s.session_kind === "internal_documentation" && !isNewBlockBased
              ? resolveInternalWorkflow(s.internal_workflow_id)
              : null;
            const blockCatalog = isNewBlockBased
              ? INTERNAL_BLOCK_CATALOG
              : workflow?.blockCatalog ?? BLOCK_CATALOG;
            const blockLabels = blockIds
              .map((id) => frozenBlocks?.find((block) => block.id === id)?.label ?? blockCatalog[id]?.label ?? id)
              .join(", ");

            const displayStatus = deriveDisplayStatus(s);
            const statusLabel = STATUS_LABELS[displayStatus] ?? displayStatus;

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
                pdfDownloadedAt={s.pdf_downloaded_at}
                deletedAt={s.deleted_at}
                isFromDigitalRequest={digitalRequestSessionIds.has(s.id)}
                source={s.source}
                sessionKind={s.session_kind}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
