import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOfficeQuestionnaireAccessFromCookies } from "@/lib/authz";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import {
  OFFICE_BLOCK_CATALOG,
  OFFICE_QUESTION_CATALOG,
} from "@/lib/questionnaire/officeBlockCatalog";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import {
  deriveDisplayStatus,
  getStatusBadgeStyle,
  STATUS_LABELS,
} from "@/lib/questionnaire/displayStatus";
import { parseFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import type { FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import { computeVisibleQuestionIds } from "@/lib/questionnaire/conditionalLogic";
import OfficeQuestionnaireDeleteButton from "@/components/office/OfficeQuestionnaireDeleteButton";
import AnswersDisclosure from "@/components/questionnaire/AnswersDisclosure";
import QuestionnaireRestoreButton from "@/components/questionnaire/QuestionnaireRestoreButton";
import {
  activeQuestionnaireLifecycleFilter,
  trashQuestionnaireLifecycleFilter,
} from "@/lib/questionnaire/lifecycle";

function buildOfficeQuestions(
  blockIds: string[],
  frozenBlocks: FrozenBlock[] | null,
): QuestionDefinition[] {
  if (frozenBlocks && frozenBlocks.length > 0) {
    return frozenBlocks.flatMap((b) => b.questions);
  }
  // Fallback für ältere Sessions ohne frozen_blocks
  const seen = new Set<string>();
  const questions: QuestionDefinition[] = [];
  for (const blockId of blockIds) {
    const block = OFFICE_BLOCK_CATALOG[blockId];
    if (!block) continue;
    for (const qId of block.questionIds) {
      if (seen.has(qId)) continue;
      seen.add(qId);
      const q = OFFICE_QUESTION_CATALOG[qId];
      if (q) questions.push(q);
    }
  }
  return questions;
}

function buildOfficeVisibleQIds(
  blockIds: string[],
  answers: Record<string, string>,
  frozenBlocks: FrozenBlock[] | null,
): Set<string> {
  const visible = new Set<string>();
  if (frozenBlocks && frozenBlocks.length > 0) {
    for (const block of frozenBlocks) {
      computeVisibleQuestionIds(
        block.conditionalRules,
        block.questions.map((q) => q.id),
        answers,
        {},
      ).forEach((id) => visible.add(id));
    }
    return visible;
  }
  for (const blockId of blockIds) {
    const block = OFFICE_BLOCK_CATALOG[blockId];
    if (!block) continue;
    computeVisibleQuestionIds(
      block.conditionalRules ?? [],
      block.questionIds,
      answers,
      {},
    ).forEach((id) => visible.add(id));
  }
  return visible;
}

type SearchParams = Promise<{ view?: string | string[] }>;

export default async function OfficeQuestionnairePage({
  searchParams,
}: { searchParams?: SearchParams }) {
  const account = await requireOfficeQuestionnaireAccessFromCookies();
  if (!account) redirect("/");

  const sp = (await searchParams) ?? {};
  const rawView = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  const view: "active" | "trash" = rawView === "trash" ? "trash" : "active";
  const now = new Date();

  const sessions = await prisma.patientQuestionnaireSession.findMany({
    where: {
      AND: [
        getOfficeOwnershipFilter(account),
        { context: "office" },
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
      answers: true,
      frozen_blocks: true,
      deleted_at: true,
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

      <nav aria-label="Fragebogenansicht" style={{ display: "flex", gap: "0.5rem" }}>
        <Link
          href="/office-cases/questionnaire"
          className={view === "active" ? "btn" : "btn-secondary"}
          data-office-q-view="active"
        >
          Aktiv
        </Link>
        <Link
          href="/office-cases/questionnaire?view=trash"
          className={view === "trash" ? "btn" : "btn-secondary"}
          data-office-q-view="trash"
        >
          Papierkorb
        </Link>
      </nav>

      <p className="text-muted" style={{ marginBottom: "0.5rem" }}>
        {sessions.length} Eintr{sessions.length !== 1 ? "äge" : "ag"}
      </p>

      {sessions.length === 0 ? (
        <p className="text-muted">
          {view === "trash" ? "Papierkorb ist leer." : "Noch keine Bewerber-Fragebögen erstellt."}
        </p>
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

            const answers =
              typeof s.answers === "object" && s.answers !== null
                ? (s.answers as Record<string, string>)
                : null;
            const frozenBlocks = parseFrozenBlocks(s.frozen_blocks);
            const questions = buildOfficeQuestions(blockIds, frozenBlocks);
            const visibleQIds = answers
              ? buildOfficeVisibleQIds(blockIds, answers, frozenBlocks)
              : undefined;

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
                  {s.deleted_at && (
                    <span className="text-muted text-small" data-office-q-deleted={s.id}>
                      Gelöscht
                    </span>
                  )}
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
                  {s.deleted_at ? (
                    <QuestionnaireRestoreButton
                      sessionId={s.id}
                      restoreUrl={`/api/office-cases/questionnaire/${s.id}/restore`}
                    />
                  ) : displayStatus === "completed" ? (
                    <OfficeQuestionnaireDeleteButton
                      sessionId={s.id}
                      recipientReference={s.patient_reference}
                    />
                  ) : null}
                </div>
                {answers && (
                  <AnswersDisclosure
                    questions={questions}
                    answers={answers}
                    visibleQuestionIds={visibleQIds}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
