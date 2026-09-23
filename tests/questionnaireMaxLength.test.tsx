/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";
import { VaccinationMatrixField } from "@/components/questionnaire/QuestionField";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import type { FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import { VACCINATION_REVIEW_QUESTION_CATALOG } from "@/lib/questionnaire/vaccinationReviewCatalog";
import { INTERNAL_DOCUMENTATION_QUESTION_CATALOG } from "@/lib/questionnaire/internalDocumentationCatalog";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

async function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function frozenBlock(questions: QuestionDefinition[]): FrozenBlock[] {
  return [{
    id: "INTERNAL",
    label: "Interne Dokumentation",
    displayOrder: 10,
    questions,
    conditionalRules: [],
    initiallyVisible: true,
  }];
}

const legacyVaccinationQuestion = JSON.parse(JSON.stringify(
  VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS,
)) as QuestionDefinition;
delete legacyVaccinationQuestion.structuredVaccinationUiVersion;
legacyVaccinationQuestion.vaccinationItems = [
  ...(legacyVaccinationQuestion.vaccinationItems ?? []),
  { id: "other", label: "Weitere Impfung", categoryId: "other", documentationMode: "free_text" },
];
legacyVaccinationQuestion.vaccinationCategories = [
  ...(legacyVaccinationQuestion.vaccinationCategories ?? []),
  { id: "other", label: "Weitere Impfung" },
];

describe("questionnaire maxLength rendering", () => {
  it("begrenzt normale Text- und Textarea-Felder auf 120 und zeigt Counter", async () => {
    const questions: QuestionDefinition[] = [
      { id: "TEXT", text: "Text", type: "text", required: false, maxLength: 120 },
      { id: "TEXTAREA", text: "Textarea", type: "textarea", required: false, maxLength: 120 },
    ];
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<QuestionnaireFormClient token="session" questions={questions} frozenBlocks={frozenBlock(questions)} context="office" />));

    const input = container.querySelector<HTMLInputElement>("#TEXT")!;
    const textarea = container.querySelector<HTMLTextAreaElement>("#TEXTAREA")!;
    await setInputValue(input, "a".repeat(121));
    await setInputValue(textarea, "b".repeat(121));

    expect(input.maxLength).toBe(120);
    expect(input.value).toHaveLength(120);
    expect(textarea.maxLength).toBe(120);
    expect(textarea.value).toHaveLength(120);
    expect(Array.from(container.querySelectorAll("[data-text-length-counter]")).map((node) => node.textContent?.trim()))
      .toEqual(["120 / 120", "120 / 120"]);

    await act(async () => root.unmount());
  });

  it("führt ohne maxLength weder Limit noch Counter ein", async () => {
    const question: QuestionDefinition = {
      id: "LEGACY_TEXT",
      text: "Legacy Text",
      type: "text",
      required: false,
    };
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<QuestionnaireFormClient token="session" questions={[question]} frozenBlocks={frozenBlock([question])} context="office" />));

    const input = container.querySelector<HTMLInputElement>("#LEGACY_TEXT")!;
    await setInputValue(input, "a".repeat(201));
    expect(input.getAttribute("maxlength")).toBeNull();
    expect(input.value).toHaveLength(201);
    expect(container.querySelector("[data-text-length-counter]")).toBeNull();

    await act(async () => root.unmount());
  });

  it("begrenzt den optionalen Facharzt-Hinweis auf 120 und zeigt Counter", async () => {
    const question = INTERNAL_DOCUMENTATION_QUESTION_CATALOG.CARE_PLAN_SPECIALISTS;
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<QuestionnaireFormClient token="session" questions={[question]} frozenBlocks={frozenBlock([question])} context="office" />));
    await act(async () => container.querySelector<HTMLButtonElement>('[data-rg-add="CARE_PLAN_SPECIALISTS"]')!.click());

    const input = container.querySelector<HTMLInputElement>('[data-rg-field="0:note"]')!;
    await setInputValue(input, "c".repeat(121));
    expect(input.maxLength).toBe(120);
    expect(input.value).toHaveLength(120);
    expect(input.parentElement?.querySelector("[data-text-length-counter]")?.textContent?.trim()).toBe("120 / 120");

    await act(async () => root.unmount());
  });

  it("begrenzt nutzereditierbaren Impfmatrix-Freitext, aber nicht vaccination_id", async () => {
    const question = legacyVaccinationQuestion;
    expect(question.groupSchema?.find((field) => field.key === "vaccination_id")?.maxLength).toBeUndefined();

    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<VaccinationMatrixField question={question} value="" onChange={jest.fn()} disabled={false} />));
    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="other"] button[aria-expanded]')!.click());

    const input = container.querySelector<HTMLInputElement>('[data-vaccination-row="other"] input[placeholder="Bezeichnung"]')!;
    await setInputValue(input, "d".repeat(121));
    expect(input.maxLength).toBe(120);
    expect(input.value).toHaveLength(120);
    expect(container.querySelector('[data-vaccination-row="other"] [data-text-length-counter]')?.textContent?.trim()).toBe("120 / 120");

    await act(async () => root.unmount());
  });

  it("begrenzt die strukturierte ergänzende Bemerkung auf 2000 Zeichen", async () => {
    const question = VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS;
    const onChange = jest.fn();
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<VaccinationMatrixField question={question} value={JSON.stringify({ schema_version: 1, entries: [] })} onChange={onChange} disabled={false} />));

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea[aria-label="Ergänzende Bemerkung"]')!;
    await setInputValue(textarea, "e".repeat(2001));

    expect(textarea.value).toHaveLength(2000);
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining(`"supplemental_note":"${"e".repeat(2000)}"`));

    await act(async () => root.unmount());
  });
});
