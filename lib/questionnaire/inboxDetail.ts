import { BLOCK_CATALOG, QUESTION_CATALOG } from "./blockCatalog";
import type { QuestionDefinition } from "./blockCatalog";
import { computeQuestionnaireAttentionHints } from "./attentionHints";
import { buildMedicalRecordOutput } from "./buildMedicalRecordNote";
import type { SemanticDocument } from "./appTextXml";
import { computeVisibleBlockIds, computeVisibleQuestionIds } from "./conditionalLogic";
import { computeAllDerivedValues } from "./derivedValues";
import type { DerivedValues } from "./derivedValues";
import { parseFrozenBlocks } from "./frozenBlocks";
import { getInternalDocumentTitle, getInternalPatientSignatureMetadata } from "./frozenBlocks";
import type { FrozenBlock } from "./frozenBlocks";
import { isNewBlockBasedInternalSession } from "./documentedContent";
import { buildOptionsByQuestionId } from "./multiSelect";
import {
  INTERNAL_BLOCK_CATALOG,
  resolveInternalWorkflow,
} from "./internalWorkflowRegistry";
import { buildQuestionnaireExportFilename } from "./questionnaireExportFilename";
import {
  parseDigitalRequestInboxContext,
  type DigitalRequestInboxContext,
} from "./digitalRequestSnapshot";

export type QuestionnaireInboxDetailSource = {
  patient_reference: string | null;
  submitted_at: Date | null;
  selected_block_ids: unknown;
  deduplicated_questions: unknown;
  answers: unknown;
  frozen_blocks: unknown;
  digital_request_snapshot?: unknown;
  source: string;
  session_kind: string;
  internal_workflow_id: string | null;
};

export type QuestionnaireInboxDetail = {
  questions: QuestionDefinition[];
  answers: Record<string, string>;
  noteText: string;
  semanticDocument: SemanticDocument | null;
  xmlFilename: string | null;
  derivedValues: DerivedValues;
  attentionHints: ReturnType<typeof computeQuestionnaireAttentionHints>;
  visibleQuestionIds: string[];
  digitalRequestContext: DigitalRequestInboxContext | null;
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
  const isNewBlockBased = isNewBlockBasedInternalSession({
    sessionKind: session.session_kind,
    internalWorkflowId: session.internal_workflow_id,
    frozenBlocks,
  });
  const internalWorkflow = session.session_kind === "internal_documentation" && !isNewBlockBased
    ? resolveInternalWorkflow(session.internal_workflow_id)
    : null;
  const derivedValues = computeAllDerivedValues(answers);
  const visibleQuestionIds = buildVisibleQuestionIds(
    blockIds,
    answers,
    derivedValues,
    frozenBlocks,
  );
  const medicalRecordOutput = buildMedicalRecordOutput({
    answers,
    selected_block_ids: blockIds,
    frozenBlocks,
    internalWorkflowId: isNewBlockBased
      ? null
      : session.session_kind === "internal_documentation"
        ? session.internal_workflow_id
        : null,
    digitalRequestSnapshot: session.digital_request_snapshot,
    submittedAt: session.submitted_at,
    ...(() => {
      const signature = getInternalPatientSignatureMetadata(session.frozen_blocks);
      return {
        patientSignatureRequired: signature.required,
        patientSignatureCity: signature.city,
      };
    })(),
  });

  return {
    questions,
    answers,
    noteText: medicalRecordOutput.noteText,
    semanticDocument: session.session_kind === "internal_documentation"
      ? {
          ...medicalRecordOutput.semanticDocument,
          documentTitle: getInternalDocumentTitle(session.frozen_blocks),
        }
      : null,
    derivedValues,
    attentionHints: computeQuestionnaireAttentionHints(answers, visibleQuestionIds),
    visibleQuestionIds: [...visibleQuestionIds],
    digitalRequestContext: parseDigitalRequestInboxContext(session.digital_request_snapshot),
    xmlFilename: session.session_kind === "internal_documentation" && (isNewBlockBased || internalWorkflow)
      ? buildQuestionnaireExportFilename(
          {
            patient_reference: session.patient_reference,
            submitted_at: session.submitted_at,
            selected_block_ids: blockIds,
            answers,
            source: session.source,
            practice_form: null,
          },
          {
            blockCatalog: isNewBlockBased
              ? INTERNAL_BLOCK_CATALOG
              : internalWorkflow!.blockCatalog,
            filenameLabel: isNewBlockBased
              ? "Interne Dokumentation"
              : internalWorkflow!.filenameLabel,
            extension: "xml",
          },
        )
      : null,
  };
}
