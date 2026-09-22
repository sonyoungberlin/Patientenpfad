/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";
import {
  buildPracticeDocumentationBlockDefinition,
  resolvePracticeDocumentationBlocks,
  validatePracticeDocumentationBlock,
  type PracticeDocumentationBlockInput,
} from "@/lib/practice/documentationBlocks";

jest.mock("@/components/SelfCheckInQrCode", () => ({ SelfCheckInQrCode: () => null }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { structuredClone: <T>(value: T) => T }).structuredClone ??=
  <T,>(value: T) => JSON.parse(JSON.stringify(value)) as T;
const fetchMock = jest.fn();
global.fetch = fetchMock;

function buildRuntime(input: PracticeDocumentationBlockInput) {
  const validation = validatePracticeDocumentationBlock(input);
  if (!validation.ok) throw new Error(validation.error);
  const definition = buildPracticeDocumentationBlockDefinition(validation.value);
  const frozenBlocks = resolvePracticeDocumentationBlocks([{ definition }]);
  return {
    definition,
    frozenBlocks,
    conditionalRules: frozenBlocks.flatMap((block) => block.conditionalRules),
  };
}

async function renderInternalForm(input: PracticeDocumentationBlockInput) {
  const runtime = buildRuntime(input);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <QuestionnaireFormClient
      token="internal-session"
      submitEndpoint="/api/internal-documentation/internal-session"
      questions={runtime.frozenBlocks.flatMap((block) => block.questions)}
      conditionalRules={runtime.conditionalRules}
      frozenBlocks={runtime.frozenBlocks}
      context="patient"
      source="practice_direct"
      internalWorkflowId={null}
    />,
  ));
  await act(async () => {
    container.querySelector<HTMLButtonElement>("[data-open-questionnaire]")?.click();
  });
  return { ...runtime, container, root };
}

async function select(container: HTMLElement, label: string) {
  await act(async () => {
    const button = [...container.querySelectorAll<HTMLButtonElement>("button[role=radio]")]
      .find((candidate) => candidate.textContent === label);
    if (!button) throw new Error(`Auswahl fehlt: ${label}`);
    button.click();
  });
}

async function cleanup(root: ReturnType<typeof createRoot>, container: HTMLElement) {
  await act(async () => root.unmount());
  container.remove();
}

describe("produktives internes Dokumentationsformular – Conditional Rules", () => {
  beforeEach(() => fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));

  it("zeigt das Enddatum nur für 'bis Datum' und validiert es nur dann als Pflichtfeld", async () => {
    const view = await renderInternalForm({
      title: "Reise(un)fähigkeit",
      blockType: "selection",
      required: true,
      options: [{ value: "unfit", label: "Reiseunfähig", documentationText: "Reiseunfähig" }],
      additionalFields: [
        { id: "endMode", label: "Ende", type: "select", options: [{ value: "date", label: "bis Datum" }, { value: "open", label: "bis auf Weiteres" }], required: true, showForOptionValues: ["unfit"] },
        { id: "endDate", label: "Enddatum", type: "date", required: true, showForFieldId: "endMode", showForOptionValues: ["date"] },
      ],
    });
    const endDate = view.definition.questions[2];

    await select(view.container, "Reiseunfähig");
    await select(view.container, "bis Datum");
    expect(view.container.querySelector(`[data-q-question="${endDate.id}"] input[required]`)).not.toBeNull();
    await act(async () => view.container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(view.container.querySelector(`[data-q-requirederror="${endDate.id}"]`)).not.toBeNull();

    await select(view.container, "bis auf Weiteres");
    expect(view.container.querySelector(`[data-q-question="${endDate.id}"]`)).toBeNull();
    await act(async () => {
      view.container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).answers).not.toHaveProperty(endDate.id);
    await cleanup(view.root, view.container);
  });

  it("zeigt konkrete Belastungen bei Körperlich, aber nicht bei Psychisch", async () => {
    const view = await renderInternalForm({
      title: "Ärztliche Stellungnahme",
      blockType: "selection",
      required: true,
      options: [
        { value: "physical", label: "Körperlich", documentationText: "Körperlich" },
        { value: "psychological", label: "Psychisch", documentationText: "Psychisch" },
      ],
      additionalFields: [{ id: "limitations", label: "Konkrete nicht mögliche Belastungen", type: "textarea", required: true, showForOptionValues: ["physical"] }],
    });
    const limitations = view.definition.questions[1];

    await select(view.container, "Körperlich");
    expect(view.container.querySelector(`[data-q-question="${limitations.id}"] textarea[required]`)).not.toBeNull();
    await select(view.container, "Psychisch");
    expect(view.container.querySelector(`[data-q-question="${limitations.id}"]`)).toBeNull();
    await cleanup(view.root, view.container);
  });

  it("verbirgt bei 'Bis auf Weiteres' alle Datumsfelder anderer Gültigkeitsmodi", async () => {
    const view = await renderInternalForm({
      title: "Gültigkeitszeitraum",
      blockType: "selection",
      required: true,
      options: [
        { value: "day", label: "An einem Tag", documentationText: "An einem Tag" },
        { value: "range", label: "Von bis", documentationText: "Von bis" },
        { value: "open", label: "Bis auf Weiteres", documentationText: "Bis auf Weiteres" },
      ],
      additionalFields: [
        { id: "day", label: "Datum", type: "date", required: true, showForOptionValues: ["day"] },
        { id: "from", label: "Gültig von", type: "date", required: true, showForOptionValues: ["range"] },
        { id: "to", label: "Gültig bis", type: "date", required: true, showForOptionValues: ["range"] },
      ],
    });
    const [, day, from, to] = view.definition.questions;

    await select(view.container, "Bis auf Weiteres");
    for (const question of [day, from, to]) {
      expect(view.container.querySelector(`[data-q-question="${question.id}"]`)).toBeNull();
    }
    await cleanup(view.root, view.container);
  });
});