/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import type { FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import { VACCINATION_REVIEW_QUESTION_CATALOG } from "@/lib/questionnaire/vaccinationReviewCatalog";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

async function renderForm(question: QuestionDefinition, frozen = false) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const frozenBlocks: FrozenBlock[] | undefined = frozen
    ? [{
        id: "VACCINATION_REVIEW",
        label: "Impfpassprüfung und Beratung",
        displayOrder: 10,
        questions: [question],
        conditionalRules: [],
        initiallyVisible: true,
      }]
    : undefined;

  await act(async () => {
    root.render(
      <QuestionnaireFormClient
        token="session-1"
        questions={[question]}
        frozenBlocks={frozenBlocks}
        context="office"
      />,
    );
  });
  return { container, root };
}

describe("QuestionnaireFormClient vaccination matrix", () => {
  it("rendert aus einer Frozen Definition acht Kernimpfungen und keine generische Gruppe", async () => {
    const { container, root } = await renderForm(
      VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS,
      true,
    );

    expect(container.querySelectorAll("[data-vaccination-row]")).toHaveLength(8);
    for (const label of [
      "Tetanus / Diphtherie / Pertussis",
      "Poliomyelitis",
      "Masern / MMR",
      "Influenza",
      "COVID-19",
      "Pneumokokken",
      "Herpes zoster",
      "RSV",
    ]) {
      expect(container.textContent).toContain(label);
    }
    expect(container.textContent).toContain("Weitere Impfungen");
    expect(container.textContent).not.toContain("Eintrag 1");
    expect(
      Array.from(container.querySelectorAll("button")).some(
        (button) => button.textContent?.trim() === "Weitere Impfung",
      ),
    ).toBe(false);
    expect(container.querySelector('[data-vaccination-row="tdap"] input[type="text"]')).toBeNull();

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt optionale Impfungen und nur für Weitere Impfung eine freie Bezeichnung", async () => {
    const { container, root } = await renderForm(
      VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS,
    );

    for (const label of ["HPV", "Hepatitis A", "Hepatitis B", "FSME", "Varizellen", "Meningokokken", "Weitere Impfung"]) {
      expect(container.textContent).toContain(label);
    }
    expect(container.querySelector('input[placeholder="Bezeichnung"]')).toBeNull();

    const otherCheckbox = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
      .find((input) => input.parentElement?.textContent?.includes("Weitere Impfung"));
    expect(otherCheckbox).toBeDefined();
    await act(async () => otherCheckbox!.click());

    expect(container.querySelector('[data-vaccination-row="other"] input[placeholder="Bezeichnung"]')).not.toBeNull();
    expect(container.querySelector('[data-vaccination-row="tdap"] input[placeholder="Bezeichnung"]')).toBeNull();

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("rendert normale repeatable groups weiterhin generisch", async () => {
    const { container, root } = await renderForm({
      id: "GENERIC_GROUP",
      text: "Einträge",
      type: "repeatable_group",
      required: false,
      addEntryLabel: "Weiteren Eintrag hinzufügen",
      groupSchema: [{ key: "name", label: "Name", type: "text", required: true }],
    });

    expect(container.textContent).toContain("Weiteren Eintrag hinzufügen");
    expect(container.querySelector("[data-vaccination-row]")).toBeNull();

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });
});