import { buildFrozenBlocks, type FrozenBlock } from "./frozenBlocks";
import type { QuestionDefinition, QuestionnaireBlock } from "./blockCatalog";
import { INTERNAL_DOCUMENTATION_BLOCK_CATALOG, INTERNAL_DOCUMENTATION_QUESTION_CATALOG } from "./internalDocumentationCatalog";
import { VACCINATION_REVIEW_BLOCK_CATALOG, VACCINATION_REVIEW_QUESTION_CATALOG } from "./vaccinationReviewCatalog";
import { HEALTH_CHECK_BLOCK_CATALOG, HEALTH_CHECK_QUESTION_CATALOG } from "./healthCheckCatalog";

const LEGACY_HEALTH_CHECK_BLOCK_CATALOG: Record<string, QuestionnaireBlock> = {
  ...HEALTH_CHECK_BLOCK_CATALOG,
  HEALTH_CHECK_MEASUREMENTS: {
    ...HEALTH_CHECK_BLOCK_CATALOG.HEALTH_CHECK_MEASUREMENTS,
    questionIds: [
      "HEALTH_CHECK_BP_SYSTOLIC",
      "HEALTH_CHECK_BP_DIASTOLIC",
      "HEALTH_CHECK_HEIGHT_CM",
      "HEALTH_CHECK_WEIGHT_KG",
    ],
    documentationPresentation: undefined,
  },
};

export const INTERNAL_WORKFLOWS = {
  care_plan_v1: {
    id: "care_plan_v1",
    title: "Persönlicher Versorgungsplan",
    filenameLabel: "Persönlicher Versorgungsplan",
    blockIds: [
      "CARE_PLAN_HA",
      "CARE_PLAN_SPECIALIST",
      "CARE_PLAN_SUPPLY_BLOCK",
      "CARE_PLAN_SUPPORT_BLOCK",
      "CARE_PLAN_AGREEMENT_BLOCK",
    ],
    blockCatalog: INTERNAL_DOCUMENTATION_BLOCK_CATALOG,
    questionCatalog: INTERNAL_DOCUMENTATION_QUESTION_CATALOG,
    /** LEGACY ONLY: gilt nur für Snapshots ohne outputSemantics. */
    legacyOutputPolicy: {
      omitUnansweredInPdf: true,
      omitMatchingBlockQuestionLabels: true,
      includeEmptyBlocksInCopyText: true,
      omitEmptyBlocksInPdf: false,
    },
  },
  vaccination_review_v1: {
    id: "vaccination_review_v1",
    title: "Impfpassprüfung und Beratung",
    filenameLabel: "DOKU Impfberatung",
    blockIds: Object.keys(VACCINATION_REVIEW_BLOCK_CATALOG),
    blockCatalog: VACCINATION_REVIEW_BLOCK_CATALOG,
    questionCatalog: VACCINATION_REVIEW_QUESTION_CATALOG,
    /** LEGACY ONLY: gilt nur für Snapshots ohne outputSemantics. */
    legacyOutputPolicy: {
      omitUnansweredInPdf: true,
      omitMatchingBlockQuestionLabels: false,
      includeEmptyBlocksInCopyText: false,
      omitEmptyBlocksInPdf: false,
    },
  },
  health_check_v1: {
    id: "health_check_v1",
    title: "Gesundheitsuntersuchung",
    filenameLabel: "Gesundheitsuntersuchung",
    blockIds: Object.keys(LEGACY_HEALTH_CHECK_BLOCK_CATALOG),
    blockCatalog: LEGACY_HEALTH_CHECK_BLOCK_CATALOG,
    questionCatalog: HEALTH_CHECK_QUESTION_CATALOG,
    /** LEGACY ONLY: gilt nur für Snapshots ohne outputSemantics. */
    legacyOutputPolicy: {
      omitUnansweredInPdf: true,
      omitMatchingBlockQuestionLabels: false,
      includeEmptyBlocksInCopyText: false,
      omitEmptyBlocksInPdf: true,
    },
  },
} as const;

export type InternalWorkflowId = keyof typeof INTERNAL_WORKFLOWS;
export type InternalWorkflow = (typeof INTERNAL_WORKFLOWS)[InternalWorkflowId];

type InternalBlockCatalogEntry = {
  block: QuestionnaireBlock;
  questionCatalog: Record<string, QuestionDefinition>;
};

function mergeInternalCatalogs(
  catalogs: Array<{
    blockCatalog: Record<string, QuestionnaireBlock>;
    questionCatalog: Record<string, QuestionDefinition>;
  }>,
) {
  const blocks: Record<string, QuestionnaireBlock> = {};
  const questions: Record<string, QuestionDefinition> = {};

  for (const { blockCatalog, questionCatalog } of catalogs) {
    for (const [blockId, block] of Object.entries(blockCatalog)) {
      if (blocks[blockId]) {
        throw new Error(`Interne Block-ID mehrfach registriert: ${blockId}`);
      }
      if (block.id !== blockId) {
        throw new Error(`Interne Block-ID stimmt nicht mit Registry überein: ${blockId}`);
      }
      blocks[blockId] = block;
    }

    for (const [questionId, question] of Object.entries(questionCatalog)) {
      if (questions[questionId]) {
        throw new Error(`Interne Question-ID mehrfach registriert: ${questionId}`);
      }
      if (question.id !== questionId) {
        throw new Error(`Interne Question-ID stimmt nicht mit Registry überein: ${questionId}`);
      }
      questions[questionId] = question;
    }
  }

  const questionOwners = new Map<string, string>();
  for (const block of Object.values(blocks)) {
    for (const questionId of block.questionIds) {
      if (!questions[questionId]) {
        throw new Error(`Interner Block referenziert unbekannte Frage: ${questionId}`);
      }
      const previousOwner = questionOwners.get(questionId);
      if (previousOwner && previousOwner !== block.id) {
        throw new Error(
          `Interne Question-ID in mehreren Blocks referenziert: ${questionId}`,
        );
      }
      questionOwners.set(questionId, block.id);
    }
    for (const rule of block.conditionalRules ?? []) {
      if (rule.action === "showBlock" && !blocks[rule.targetId]) {
        throw new Error(`Interne Regel referenziert unbekannten Block: ${rule.targetId}`);
      }
      if (rule.action === "showQuestion" && !questions[rule.targetId]) {
        throw new Error(`Interne Regel referenziert unbekannte Frage: ${rule.targetId}`);
      }
    }
  }

  return { blocks, questions };
}

const INTERNAL_CATALOGS = [
  {
    blockCatalog: INTERNAL_DOCUMENTATION_BLOCK_CATALOG,
    questionCatalog: INTERNAL_DOCUMENTATION_QUESTION_CATALOG,
  },
  {
    blockCatalog: VACCINATION_REVIEW_BLOCK_CATALOG,
    questionCatalog: VACCINATION_REVIEW_QUESTION_CATALOG,
  },
  {
    blockCatalog: HEALTH_CHECK_BLOCK_CATALOG,
    questionCatalog: HEALTH_CHECK_QUESTION_CATALOG,
  },
] as const;

const mergedInternalCatalogs = mergeInternalCatalogs([...INTERNAL_CATALOGS]);

/** Kanonische Reihenfolge; kataloglokale displayOrder-Werte sind hier irrelevant. */
export const INTERNAL_BLOCK_ORDER = [
  ...Object.keys(INTERNAL_DOCUMENTATION_BLOCK_CATALOG),
  ...Object.keys(VACCINATION_REVIEW_BLOCK_CATALOG),
  ...Object.keys(HEALTH_CHECK_BLOCK_CATALOG),
] as const;

export const INTERNAL_BLOCK_CATALOG = mergedInternalCatalogs.blocks;
export const INTERNAL_QUESTION_CATALOG = mergedInternalCatalogs.questions;

const INTERNAL_BLOCK_ENTRIES: Record<string, InternalBlockCatalogEntry> =
  Object.fromEntries(
    INTERNAL_BLOCK_ORDER.map((blockId) => [blockId, {
      block: INTERNAL_BLOCK_CATALOG[blockId],
      questionCatalog: INTERNAL_QUESTION_CATALOG,
    }]),
  );

export function getInternalWorkflow(workflowId: unknown) {
  if (
    typeof workflowId !== "string" ||
    !Object.prototype.hasOwnProperty.call(INTERNAL_WORKFLOWS, workflowId)
  ) return null;
  return INTERNAL_WORKFLOWS[workflowId as InternalWorkflowId];
}

export function buildInternalWorkflowBlocks(workflowId: InternalWorkflowId): FrozenBlock[] {
  const workflow = INTERNAL_WORKFLOWS[workflowId];
  return buildFrozenBlocks(
    Array.from(workflow.blockIds),
    workflow.blockCatalog,
    workflow.questionCatalog,
  ).map((block) => ({ ...block, outputSemantics: "documented-content-v1" as const }));
}

export function resolveInternalBlocks(blockIds: string[]): QuestionnaireBlock[] {
  if (!Array.isArray(blockIds) || blockIds.length === 0) {
    throw new Error("Mindestens ein interner Block ist erforderlich.");
  }

  const seen = new Set<string>();
  for (const blockId of blockIds) {
    if (typeof blockId !== "string" || !INTERNAL_BLOCK_ENTRIES[blockId]) {
      throw new Error(`Unbekannter interner Block: ${String(blockId)}`);
    }
    if (seen.has(blockId)) {
      throw new Error(`Interner Block mehrfach ausgewählt: ${blockId}`);
    }
    seen.add(blockId);
  }

  return [...seen]
    .sort((a, b) => INTERNAL_BLOCK_ORDER.indexOf(a as never) - INTERNAL_BLOCK_ORDER.indexOf(b as never))
    .map((blockId) => INTERNAL_BLOCK_ENTRIES[blockId].block);
}

export function buildInternalDocumentationFrozenBlocks(selectedBlockIds: string[]): FrozenBlock[] {
  const orderedBlocks = resolveInternalBlocks(selectedBlockIds);
  const selectedQuestionIds = new Set<string>();
  for (const block of orderedBlocks) {
    for (const questionId of block.questionIds) {
      if (selectedQuestionIds.has(questionId)) {
        throw new Error(`Interne Question-ID mehrfach referenziert: ${questionId}`);
      }
      selectedQuestionIds.add(questionId);
    }
  }

  return buildFrozenBlocks(
    orderedBlocks.map((block) => block.id),
    INTERNAL_BLOCK_CATALOG,
    INTERNAL_QUESTION_CATALOG,
    INTERNAL_BLOCK_ORDER,
  ).map((block) => ({ ...block, outputSemantics: "documented-content-v1" as const }));
}

export function resolveInternalWorkflow(workflowId: unknown): InternalWorkflow | null {
  if (workflowId === null || workflowId === undefined) {
    return INTERNAL_WORKFLOWS.care_plan_v1;
  }
  return getInternalWorkflow(workflowId);
}
