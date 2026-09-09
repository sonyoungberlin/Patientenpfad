import { buildFrozenBlocks, type FrozenBlock } from "./frozenBlocks";
import { INTERNAL_DOCUMENTATION_BLOCK_CATALOG, INTERNAL_DOCUMENTATION_QUESTION_CATALOG } from "./internalDocumentationCatalog";
import { VACCINATION_REVIEW_BLOCK_CATALOG, VACCINATION_REVIEW_QUESTION_CATALOG } from "./vaccinationReviewCatalog";
import { HEALTH_CHECK_BLOCK_CATALOG, HEALTH_CHECK_QUESTION_CATALOG } from "./healthCheckCatalog";

export const INTERNAL_WORKFLOWS = {
  care_plan_v1: {
    id: "care_plan_v1",
    title: "Persönlicher Versorgungsplan",
    filenameLabel: "Persönlicher Versorgungsplan",
    blockIds: Object.keys(INTERNAL_DOCUMENTATION_BLOCK_CATALOG),
    blockCatalog: INTERNAL_DOCUMENTATION_BLOCK_CATALOG,
    questionCatalog: INTERNAL_DOCUMENTATION_QUESTION_CATALOG,
    omitUnansweredInPdf: true,
    omitMatchingBlockQuestionLabels: true,
    includeEmptyBlocksInCopyText: true,
    omitEmptyBlocksInPdf: false,
  },
  vaccination_review_v1: {
    id: "vaccination_review_v1",
    title: "Impfpassprüfung und Beratung",
    filenameLabel: "DOKU Impfberatung",
    blockIds: Object.keys(VACCINATION_REVIEW_BLOCK_CATALOG),
    blockCatalog: VACCINATION_REVIEW_BLOCK_CATALOG,
    questionCatalog: VACCINATION_REVIEW_QUESTION_CATALOG,
    omitUnansweredInPdf: true,
    omitMatchingBlockQuestionLabels: false,
    includeEmptyBlocksInCopyText: false,
    omitEmptyBlocksInPdf: false,
  },
  health_check_v1: {
    id: "health_check_v1",
    title: "Gesundheitsuntersuchung",
    filenameLabel: "Gesundheitsuntersuchung",
    blockIds: Object.keys(HEALTH_CHECK_BLOCK_CATALOG),
    blockCatalog: HEALTH_CHECK_BLOCK_CATALOG,
    questionCatalog: HEALTH_CHECK_QUESTION_CATALOG,
    omitUnansweredInPdf: true,
    omitMatchingBlockQuestionLabels: false,
    includeEmptyBlocksInCopyText: false,
    omitEmptyBlocksInPdf: true,
  },
} as const;

export type InternalWorkflowId = keyof typeof INTERNAL_WORKFLOWS;
export type InternalWorkflow = (typeof INTERNAL_WORKFLOWS)[InternalWorkflowId];

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
    workflow.blockIds,
    workflow.blockCatalog,
    workflow.questionCatalog,
  );
}

export function resolveInternalWorkflow(workflowId: unknown): InternalWorkflow | null {
  if (workflowId === null || workflowId === undefined) {
    return INTERNAL_WORKFLOWS.care_plan_v1;
  }
  return getInternalWorkflow(workflowId);
}
