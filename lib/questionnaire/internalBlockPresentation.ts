import { INTERNAL_BLOCK_CATALOG, INTERNAL_BLOCK_ORDER } from "./internalWorkflowRegistry";

export type InternalBlockGroup = {
  id: string;
  label: string;
  blockIds: string[];
};

export const INTERNAL_BLOCK_GROUPS: readonly InternalBlockGroup[] = [
  {
    id: "health_check",
    label: "Gesundheitsuntersuchung",
    blockIds: [
      "HEALTH_CHECK_CLINICAL_STATUS",
      "HEALTH_CHECK_MEASUREMENTS",
      "HEALTH_CHECK_LAB",
      "HEALTH_CHECK_URINE",
      "HEALTH_CHECK_PREVENTION",
      "HEALTH_CHECK_NEXT_STEPS",
      "EKG",
    ],
  },
  {
    id: "care_plan",
    label: "Persönlicher Versorgungsplan",
    blockIds: [
      "CARE_PLAN_HA",
      "CARE_PLAN_SPECIALIST",
      "CARE_PLAN_SUPPLY_BLOCK",
      "CARE_PLAN_SUPPORT_BLOCK",
      "CARE_PLAN_AGREEMENT_BLOCK",
    ],
  },
  {
    id: "vaccination",
    label: "Impfberatung",
    blockIds: ["VACCINATION_REVIEW"],
  },
  {
    id: "additional_documentation",
    label: "Weitere Dokumentation",
    blockIds: ["DOCUMENT_HANDLING"],
  },
  {
    id: "medical_statement",
    label: "Stellungnahme",
    blockIds: ["MEDICAL_STATEMENT"],
  },
  {
    id: "specialists",
    label: "Fachärzte",
    blockIds: ["SPECIALISTS"],
  },
  {
    id: "consent",
    label: "Einwilligungserklärung",
    blockIds: ["INTERNAL_CONSENT"],
  },
] as const;

/** Reihenfolge, in der die Block-Checkboxen tatsächlich angezeigt werden. */
export const INTERNAL_BLOCK_UI_ORDER = INTERNAL_BLOCK_GROUPS.flatMap(
  (group) => group.blockIds,
);

const registeredBlockIds = new Set(INTERNAL_BLOCK_ORDER);
for (const group of INTERNAL_BLOCK_GROUPS) {
  for (const blockId of group.blockIds) {
    if (!registeredBlockIds.has(blockId) || !INTERNAL_BLOCK_CATALOG[blockId]) {
      throw new Error(`Interner UI-Block ist nicht registriert: ${blockId}`);
    }
  }
}

export function getInternalBlockLabel(blockId: string): string {
  return INTERNAL_BLOCK_CATALOG[blockId]?.label ?? blockId;
}
