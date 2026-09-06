import { validateSubmitterEmail } from "@/lib/websiteForms/submitValidation";
import type { QuestionDefinition } from "./blockCatalog";

export const CONTACT_QUESTION_IDS = [
  "CONTACT_PHONE",
  "CONTACT_EMAIL",
  "CONTACT_DOCTOLIB",
] as const;

const CONTACT_QUESTION_ID_SET = new Set<string>(CONTACT_QUESTION_IDS);
const PHONE_PATTERN = /^\+?[0-9]+$/;

export type ContactValidationError = {
  questionId: string;
  message: string;
};

export function isContactQuestionId(questionId: string): boolean {
  return CONTACT_QUESTION_ID_SET.has(questionId);
}

export function isValidContactPhone(value: string): boolean {
  return PHONE_PATTERN.test(value);
}

export function validateContactAnswers(
  answers: Record<string, string>,
  questions: ReadonlyArray<Pick<QuestionDefinition, "id">>,
): ContactValidationError[] {
  const errors: ContactValidationError[] = [];

  for (const question of questions) {
    if (!isContactQuestionId(question.id)) continue;
    const value = answers[question.id] ?? "";

    if (value.trim() === "") {
      errors.push({ questionId: question.id, message: "Bitte füllen Sie dieses Feld aus." });
      continue;
    }

    if (question.id === "CONTACT_PHONE" && !isValidContactPhone(value)) {
      errors.push({
        questionId: question.id,
        message: "Bitte geben Sie die Telefonnummer nur mit Ziffern ein. Ein + ist nur am Anfang erlaubt.",
      });
    }

    if (
      question.id === "CONTACT_EMAIL" &&
      (/\s/.test(value) || !validateSubmitterEmail(value).ok)
    ) {
      errors.push({ questionId: question.id, message: "Bitte geben Sie eine gültige E-Mail-Adresse ein." });
    }
  }

  return errors;
}