import type { QuestionDefinition } from "./blockCatalog";
import type { FrozenBlock } from "./frozenBlocks";

export const PRACTICE_CONFIRMATION_IDS = [
  "PRACTICE_CONFIRMATION_1",
  "PRACTICE_CONFIRMATION_2",
  "PRACTICE_CONFIRMATION_3",
] as const;

export type PracticeConfirmationId =
  (typeof PRACTICE_CONFIRMATION_IDS)[number];

export type PracticeConfirmationSlot = {
  id: PracticeConfirmationId;
  text: string;
};

export const PRACTICE_CONFIRMATIONS_BLOCK_ID = "PRACTICE_CONFIRMATIONS";
export const CONFIRMATION_ANSWER_VALUE = "true";

export function isPracticeConfirmationId(
  value: unknown,
): value is PracticeConfirmationId {
  return (
    typeof value === "string" &&
    (PRACTICE_CONFIRMATION_IDS as readonly string[]).includes(value)
  );
}

export function parseSelectedPracticeConfirmationIds(
  value: unknown,
): PracticeConfirmationId[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every(isPracticeConfirmationId)) {
    return null;
  }
  return [...new Set(value)];
}

export function buildPracticeConfirmationSlots(input: {
  questionnaire_confirmation_text_1?: string | null;
  questionnaire_confirmation_text_2?: string | null;
  questionnaire_confirmation_text_3?: string | null;
}): PracticeConfirmationSlot[] {
  const texts = [
    input.questionnaire_confirmation_text_1,
    input.questionnaire_confirmation_text_2,
    input.questionnaire_confirmation_text_3,
  ];
  return PRACTICE_CONFIRMATION_IDS.flatMap((id, index) => {
    const text = texts[index]?.trim() ?? "";
    return text ? [{ id, text }] : [];
  });
}

export function selectPracticeConfirmationSlots(
  available: readonly PracticeConfirmationSlot[],
  selectedIds: readonly PracticeConfirmationId[],
): PracticeConfirmationSlot[] {
  const selected = new Set(selectedIds);
  return available.filter((slot) => selected.has(slot.id));
}

export function buildPracticeConfirmationsFrozenBlock(
  slots: readonly PracticeConfirmationSlot[],
): FrozenBlock | null {
  if (slots.length === 0) return null;

  const questions: QuestionDefinition[] = slots.map(({ id, text }) => ({
    id,
    text,
    type: "confirmation",
    required: true,
  }));

  return {
    id: PRACTICE_CONFIRMATIONS_BLOCK_ID,
    label: "Bestätigungen",
    label_en: "Confirmations",
    displayOrder: 10_000,
    questions,
    conditionalRules: [],
    initiallyVisible: true,
  };
}

export function isConfirmedAnswer(value: unknown): boolean {
  return value === CONFIRMATION_ANSWER_VALUE;
}