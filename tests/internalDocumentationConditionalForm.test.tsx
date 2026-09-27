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
import { formatDocumentationSegmentAnswer } from "@/lib/questionnaire/formatAnswer";

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

  it("zeigt für Fax = Ja die realen Fax-Folgefelder", async () => {
    const input = {
      title: "Kontaktmöglichkeiten",
      blockType: "repeatable" as const,
      additionalFields: [
        { id: "field_4d461eff-e6e4-4771-a886-1795c0127e1d", label: "Telefonisch erreichbar?", type: "yes_no" as const, required: false },
        { id: "field_2ccd80c2-7509-4988-b1f0-1ec05690c674", label: "Telefonnummer", type: "text" as const, required: true, showForFieldId: "field_4d461eff-e6e4-4771-a886-1795c0127e1d", showForOptionValues: [] },
        { id: "field_3ab918db-c9e8-45c8-8f2a-03cff8612557", label: "Per E-Mail erreichbar?", type: "yes_no" as const, required: false },
        { id: "field_96cc1c15-d665-4617-88ea-ab414de9cbcf", label: "E-Mail-Adresse", type: "text" as const, required: true, showForFieldId: "field_3ab918db-c9e8-45c8-8f2a-03cff8612557", showForOptionValues: [] },
        { id: "field_e834bec0-5e36-4e60-851f-2d053128e265", label: "Online-Portal vorhanden?", type: "yes_no" as const, required: false },
        { id: "field_52bb1fcc-bb1f-4e0c-a658-37f1632fef24", label: "Portal / URL", type: "text" as const, required: true, showForFieldId: "field_e834bec0-5e36-4e60-851f-2d053128e265", showForOptionValues: [] },
        { id: "field_b621784e-56fd-441c-942c-cce91a99ff9d", label: "Fax vorhanden?", type: "yes_no" as const, required: false },
        { id: "field_4609e3d2-a90f-48bf-8b40-80bf2c8d4466", label: "Faxnummer", type: "text" as const, required: true, showForFieldId: "field_b621784e-56fd-441c-942c-cce91a99ff9d", showForOptionValues: [] },
        { id: "field_d883dc6a-ea9b-45f0-844e-ced21caa8f64", label: "Fax – Hinweise", type: "textarea" as const, required: false, showForFieldId: "field_b621784e-56fd-441c-942c-cce91a99ff9d", showForOptionValues: [] },
      ],
    };
    const runtime = buildRuntime(input);
    const schema = runtime.definition.questions[0].groupSchema ?? [];
    const source = schema.find((field) => field.key === "field_b621784e-56fd-441c-942c-cce91a99ff9d");
    const dependent = schema.find((field) => field.key === "field_4609e3d2-a90f-48bf-8b40-80bf2c8d4466");
    const secondDependent = schema.find((field) => field.key === "field_d883dc6a-ea9b-45f0-844e-ced21caa8f64");
    expect(dependent).toEqual(expect.objectContaining({ conditionalOn: source?.key, conditionalValue: "ja" }));
    expect(secondDependent).toEqual(expect.objectContaining({ conditionalOn: source?.key, conditionalValue: "ja" }));
    const legacyDefinition = structuredClone(runtime.definition);
    for (const field of legacyDefinition.questions[0].groupSchema ?? []) {
      if (field.conditionalOn) delete field.conditionalValue;
    }
    const resolvedLegacy = resolvePracticeDocumentationBlocks([{ definition: legacyDefinition }]);
    expect(resolvedLegacy[0].questions[0].groupSchema?.find((field) => field.key === dependent?.key)?.conditionalValue).toBe("ja");

    const view = await renderInternalForm(input);
    await act(async () => view.container.querySelector<HTMLButtonElement>("[data-rg-add]")!.click());
    for (const sourceId of [
      "field_4d461eff-e6e4-4771-a886-1795c0127e1d",
      "field_3ab918db-c9e8-45c8-8f2a-03cff8612557",
      "field_e834bec0-5e36-4e60-851f-2d053128e265",
    ]) {
      await act(async () => view.container.querySelector<HTMLButtonElement>(`[data-rg-yesno="0:${sourceId}:ja"]`)!.click());
    }
    expect(view.container.querySelector(`[data-rg-yesno="0:${source?.key}:ja"]`)).not.toBeNull();
    expect(view.container.querySelector(`[data-rg-yesno="0:${source?.key}:nein"]`)).not.toBeNull();
    expect(view.container.querySelector(`[data-rg-field="0:${dependent?.key}"]`)).toBeNull();

    await act(async () => view.container.querySelector<HTMLButtonElement>(`[data-rg-yesno="0:${source?.key}:ja"]`)!.click());
    expect(view.container.querySelector(`[data-rg-field="0:${dependent?.key}"]`)).not.toBeNull();
    expect(view.container.querySelector(`[data-rg-field="0:${secondDependent?.key}"]`)).not.toBeNull();

    await act(async () => view.container.querySelector<HTMLButtonElement>(`[data-rg-yesno="0:${source?.key}:nein"]`)!.click());
    expect(view.container.querySelector(`[data-rg-field="0:${dependent?.key}"]`)).toBeNull();
    expect(view.container.querySelector(`[data-rg-field="0:${secondDependent?.key}"]`)).toBeNull();
    await cleanup(view.root, view.container);
  });

  it("zeigt bei den realen Klinik-yes_no-Feldern jeweils Ja und Nein", async () => {
    const view = await renderInternalForm({
      title: "KLINIK / OP / SPEZIALAMBULANZ",
      blockType: "repeatable",
      additionalFields: [
        { id: "field_2c012e7b-7fab-4616-99ea-b8d34e070955", label: "Muss vorher eine bestimmte Untersuchung erfolgt sein?", type: "yes_no", required: false },
        { id: "field_6e0e57c7-18e4-46cf-a206-0884029ef9b8", label: "Muss Bildgebung vorliegen?", type: "yes_no", required: false },
      ],
    });

    await act(async () => view.container.querySelector<HTMLButtonElement>("[data-rg-add]")!.click());
    for (const fieldId of [
      "field_2c012e7b-7fab-4616-99ea-b8d34e070955",
      "field_6e0e57c7-18e4-46cf-a206-0884029ef9b8",
    ]) {
      expect(view.container.querySelector(`[data-rg-yesno="0:${fieldId}:ja"]`)).not.toBeNull();
      expect(view.container.querySelector(`[data-rg-yesno="0:${fieldId}:nein"]`)).not.toBeNull();
    }
    await cleanup(view.root, view.container);
  });

  it("rendert einen Month-Baustein im internen Formular, speichert YYYY-MM und gibt MM/YYYY aus", async () => {
    const view = await renderInternalForm({
      title: "Behandlungsbeginn hausärztlich",
      blockType: "month",
      required: true,
    });
    const question = view.definition.questions[0];
    const input = view.container.querySelector<HTMLInputElement>(`[data-q-question="${question.id}"] input`);

    expect(input).not.toBeNull();
    expect(input?.type).toBe("month");

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "2024-05");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      view.container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).answers[question.id]).toBe("2024-05");
    expect(formatDocumentationSegmentAnswer(question, "2024-05")).toBe("05/2024");
    await cleanup(view.root, view.container);
  });

  it("behält Versorgungsform- und Kostenträgerwerte im produktiven Formular", async () => {
    const view = await renderInternalForm({
      title: "Versorgungssetting / Kostenträger",
      blockType: "repeatable",
      additionalFields: [
        {
          id: "field_bcab3ba2-62d6-4f6b-891f-2fea4b1ede87",
          label: "Versorgungsform",
          type: "multi_select",
          required: false,
          options: [{ value: "option_15ccc50e-f8a9-4b67-8884-140ded3316b5", label: "ambulant" }],
        },
        {
          id: "field_2f526729-b7fa-408d-9da0-e8265ce2b48a",
          label: "Kostenträger",
          type: "multi_select",
          required: false,
          options: [{ value: "option_5ecb9456-c66c-4588-9d9e-1a0a17c3e007", label: "GKV" }],
        },
      ],
    });

    await act(async () => view.container.querySelector<HTMLButtonElement>("[data-rg-add]")!.click());
    expect(view.container.querySelector('[data-rg-multiselect="0:field_bcab3ba2-62d6-4f6b-891f-2fea4b1ede87:option_15ccc50e-f8a9-4b67-8884-140ded3316b5"]')?.textContent).toBe("ambulant");
    expect(view.container.querySelector('[data-rg-multiselect="0:field_2f526729-b7fa-408d-9da0-e8265ce2b48a:option_5ecb9456-c66c-4588-9d9e-1a0a17c3e007"]')?.textContent).toBe("GKV");
    await cleanup(view.root, view.container);
  });
});