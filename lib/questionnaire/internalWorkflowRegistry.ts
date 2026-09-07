import { buildFrozenBlocks, type FrozenBlock } from "./frozenBlocks";
import { INTERNAL_DOCUMENTATION_BLOCK_CATALOG, INTERNAL_DOCUMENTATION_QUESTION_CATALOG } from "./internalDocumentationCatalog";

export const INTERNAL_WORKFLOWS = {
  care_plan_v1: {
    id: "care_plan_v1",
    title: "Persönlicher Versorgungsplan",
    blockIds: Object.keys(INTERNAL_DOCUMENTATION_BLOCK_CATALOG),
  },
} as const;

export type InternalWorkflowId = keyof typeof INTERNAL_WORKFLOWS;

export function getInternalWorkflow(workflowId: unknown) {
  if (typeof workflowId !== "string" || !(workflowId in INTERNAL_WORKFLOWS)) return null;
  return INTERNAL_WORKFLOWS[workflowId as InternalWorkflowId];
}

export function buildInternalWorkflowBlocks(workflowId: InternalWorkflowId): FrozenBlock[] {
  return buildFrozenBlocks(
    INTERNAL_WORKFLOWS[workflowId].blockIds,
    INTERNAL_DOCUMENTATION_BLOCK_CATALOG,
    INTERNAL_DOCUMENTATION_QUESTION_CATALOG,
  );
}
