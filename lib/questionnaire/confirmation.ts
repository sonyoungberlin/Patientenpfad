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
  send_patient_copy?: boolean;
};

export const PATIENT_COPY_EMAIL_ID = "PATIENT_COPY_EMAIL";

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
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || !value.every(isPracticeConfirmationId)) {
    return null;
  }
  return [...new Set(value)];
}

export function validateSelectedPracticeConfirmationIds(
  value: unknown,
  available: readonly PracticeConfirmationSlot[],
): PracticeConfirmationId[] | null {
  const selected = parseSelectedPracticeConfirmationIds(value);
  if (selected === null) return null;
  const availableIds = new Set(available.map((slot) => slot.id));
  return selected.every((id) => availableIds.has(id)) ? selected : null;
}

export function buildPracticeConfirmationSlots(input: {
  questionnaire_confirmation_text_1?: string | null;
  questionnaire_confirmation_text_2?: string | null;
  questionnaire_confirmation_text_3?: string | null;
  questionnaire_confirmation_send_copy_1?: boolean | null;
  questionnaire_confirmation_send_copy_2?: boolean | null;
  questionnaire_confirmation_send_copy_3?: boolean | null;
}): PracticeConfirmationSlot[] {
  const texts = [
    input.questionnaire_confirmation_text_1,
    input.questionnaire_confirmation_text_2,
    input.questionnaire_confirmation_text_3,
  ];
  const sendCopies = [
    input.questionnaire_confirmation_send_copy_1,
    input.questionnaire_confirmation_send_copy_2,
    input.questionnaire_confirmation_send_copy_3,
  ];
  return PRACTICE_CONFIRMATION_IDS.flatMap((id, index) => {
    const text = texts[index]?.trim() ?? "";
    return text
      ? {
          id,
          text,
          ...(sendCopies[index] === true ? { send_patient_copy: true } : {}),
        }
      : [];
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

  const questions: QuestionDefinition[] = slots.map(({ id, text, send_patient_copy }) => ({
    id,
    text,
    type: "confirmation",
    required: true,
    ...(send_patient_copy ? { send_patient_copy: true } : {}),
  }));
  if (slots.some((slot) => slot.send_patient_copy)) {
    questions.push({
      id: PATIENT_COPY_EMAIL_ID,
      text: "E-Mail-Adresse für Ihre Kopie",
      type: "text",
      required: true,
    });
  }

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