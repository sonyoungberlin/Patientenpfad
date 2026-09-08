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

describe("questionnaire maxLength rendering", () => {
  it("begrenzt normale Text- und Textarea-Felder auf 200 und zeigt Counter", async () => {
    const questions: QuestionDefinition[] = [
      { id: "TEXT", text: "Text", type: "text", required: false, maxLength: 200 },
      { id: "TEXTAREA", text: "Textarea", type: "textarea", required: false, maxLength: 200 },
    ];
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<QuestionnaireFormClient token="session" questions={questions} frozenBlocks={frozenBlock(questions)} context="office" />));

    const input = container.querySelector<HTMLInputElement>("#TEXT")!;
    const textarea = container.querySelector<HTMLTextAreaElement>("#TEXTAREA")!;
    await setInputValue(input, "a".repeat(201));
    await setInputValue(textarea, "b".repeat(201));

    expect(input.maxLength).toBe(200);
    expect(input.value).toHaveLength(200);
    expect(textarea.maxLength).toBe(200);
    expect(textarea.value).toHaveLength(200);
    expect(Array.from(container.querySelectorAll("[data-text-length-counter]")).map((node) => node.textContent?.trim()))
      .toEqual(["200 / 200", "200 / 200"]);

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

  it("begrenzt Repeatable-Group-Freitext auf 200 und zeigt Counter", async () => {
    const question: QuestionDefinition = {
      id: "GROUP",
      text: "Gruppe",
      type: "repeatable_group",
      required: false,
      maxEntries: 1,
      groupSchema: [{ key: "name", label: "Name", type: "text", required: false, maxLength: 200 }],
    };
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<QuestionnaireFormClient token="session" questions={[question]} frozenBlocks={frozenBlock([question])} context="office" />));
    await act(async () => container.querySelector<HTMLButtonElement>('[data-rg-add="GROUP"]')!.click());

    const input = container.querySelector<HTMLInputElement>('[data-rg-field="0:name"]')!;
    await setInputValue(input, "c".repeat(201));
    expect(input.maxLength).toBe(200);
    expect(input.value).toHaveLength(200);
    expect(container.querySelector("[data-text-length-counter]")?.textContent?.trim()).toBe("200 / 200");

    await act(async () => root.unmount());
  });

  it("begrenzt nutzereditierbaren Impfmatrix-Freitext, aber nicht vaccination_id", async () => {
    const question = VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS;
    expect(question.groupSchema?.find((field) => field.key === "vaccination_id")?.maxLength).toBeUndefined();

    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<VaccinationMatrixField question={question} value="" onChange={jest.fn()} disabled={false} />));
    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="other"] button[aria-expanded]')!.click());

    const input = container.querySelector<HTMLInputElement>('[data-vaccination-row="other"] input[placeholder="Bezeichnung"]')!;
    await setInputValue(input, "d".repeat(201));
    expect(input.maxLength).toBe(200);
    expect(input.value).toHaveLength(200);
    expect(container.querySelector('[data-vaccination-row="other"] [data-text-length-counter]')?.textContent?.trim()).toBe("200 / 200");

    await act(async () => root.unmount());
  });
});
