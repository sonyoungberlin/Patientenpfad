import { BLOCK_CATALOG, QUESTION_CATALOG } from "./blockCatalog";
import type { QuestionDefinition } from "./blockCatalog";
import { computeQuestionnaireAttentionHints } from "./attentionHints";
import { buildMedicalRecordNote } from "./buildMedicalRecordNote";
import { computeVisibleBlockIds, computeVisibleQuestionIds } from "./conditionalLogic";
import { computeAllDerivedValues } from "./derivedValues";
import type { DerivedValues } from "./derivedValues";
import { parseFrozenBlocks } from "./frozenBlocks";
import type { FrozenBlock } from "./frozenBlocks";
import { resolveInternalWorkflow } from "./internalWorkflowRegistry";
import { buildOptionsByQuestionId } from "./multiSelect";

export type QuestionnaireInboxDetailSource = {
  selected_block_ids: unknown;
  deduplicated_questions: unknown;
  answers: unknown;
  frozen_blocks: unknown;
  session_kind: string;
  internal_workflow_id: string | null;
};

export type QuestionnaireInboxDetail = {
  questions: QuestionDefinition[];
  answers: Record<string, string>;
  noteText: string;
  derivedValues: DerivedValues;
  attentionHints: ReturnType<typeof computeQuestionnaireAttentionHints>;
  visibleQuestionIds: string[];
};

function buildVisibleQuestionIds(
  blockIds: string[],
  answers: Record<string, string>,
  derivedValues: DerivedValues,
  frozenBlocks: FrozenBlock[] | null,
): Set<string> {
  const visible = new Set<string>();
  if (frozenBlocks && frozenBlocks.length > 0) {
    const allRules = frozenBlocks.flatMap((block) => block.conditionalRules);
    const visibleBlockIds = computeVisibleBlockIds(
      allRules,
      frozenBlocks,
      answers,
      derivedValues,
    );
    for (const block of frozenBlocks) {
      if (!visibleBlockIds.has(block.id)) continue;
      computeVisibleQuestionIds(
        block.conditionalRules,
        block.questions.map((question) => question.id),
        answers,
        derivedValues as Record<string, number>,
        buildOptionsByQuestionId(block.questions),
      ).forEach((id) => visible.add(id));
    }
    return visible;
  }

  for (const blockId of blockIds) {
    const block = BLOCK_CATALOG[blockId];
    if (!block) continue;
    const questions = block.questionIds
      .map((id) => QUESTION_CATALOG[id])
      .filter((question): question is QuestionDefinition => Boolean(question));
    computeVisibleQuestionIds(
      block.conditionalRules ?? [],
      block.questionIds,
      answers,
      derivedValues as Record<string, number>,
      buildOptionsByQuestionId(questions),
    ).forEach((id) => visible.add(id));
  }
  return visible;
}

export function buildQuestionnaireInboxDetail(
  session: QuestionnaireInboxDetailSource,
): QuestionnaireInboxDetail {
  const blockIds = Array.isArray(session.selected_block_ids)
    ? session.selected_block_ids.filter((id): id is string => typeof id === "string")
    : [];
  const questions = Array.isArray(session.deduplicated_questions)
    ? session.deduplicated_questions as QuestionDefinition[]
    : [];
  const answers = session.answers !== null &&
    typeof session.answers === "object" &&
    !Array.isArray(session.answers)
      ? session.answers as Record<string, string>
      : {};
  const frozenBlocks = parseFrozenBlocks(session.frozen_blocks);
  const derivedValues = computeAllDerivedValues(answers);
  const visibleQuestionIds = buildVisibleQuestionIds(
    blockIds,
    answers,
    derivedValues,
    frozenBlocks,
  );

  return {
    questions,
    answers,
    noteText: buildMedicalRecordNote({
      answers,
      selected_block_ids: blockIds,
      frozenBlocks,
      internalWorkflowId: session.session_kind === "internal_documentation"
        ? resolveInternalWorkflow(session.internal_workflow_id)?.id ?? null
        : null,
    }),
    derivedValues,
    attentionHints: computeQuestionnaireAttentionHints(answers, visibleQuestionIds),
    visibleQuestionIds: [...visibleQuestionIds],
  };
}
