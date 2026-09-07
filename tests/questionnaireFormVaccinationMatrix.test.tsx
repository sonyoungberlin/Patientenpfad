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

async function clickButton(container: HTMLElement, rowId: string, label: string) {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>(`[data-vaccination-row="${rowId}"] button`))
    .find((candidate) => candidate.textContent === label);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

async function selectAction(container: HTMLElement, rowId: string, value: string) {
  await clickButton(container, rowId, value);
}

function cloneQuestion(question: QuestionDefinition): QuestionDefinition {
  return JSON.parse(JSON.stringify(question)) as QuestionDefinition;
}

describe("QuestionnaireFormClient vaccination matrix", () => {
  it("zeigt Frozen-v2-Kategorien und alle Impfzeilen initial geschlossen", async () => {
    const { container, root } = await renderForm(
      VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS,
      true,
    );

    expect(container.querySelectorAll("[data-vaccination-category]")).toHaveLength(6);
    expect(container.querySelectorAll("[data-vaccination-row]")).toHaveLength(14);
    expect(container.querySelectorAll('[data-vaccination-row] button[aria-expanded="true"]')).toHaveLength(0);
    for (const label of ["Kombinationsschutz", "Saisonal / wiederkehrend", "Weitere häufig relevante Impfungen"]) {
      expect(container.textContent).toContain(label);
    }
    expect(container.textContent).toContain("Tetanus / Diphtherie / Pertussis / Poliomyelitis");
    expect(container.textContent).not.toContain("Eintrag 1");

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("öffnet ohne Antwortänderung genau eine Zeile und verwendet große Status-Gates", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onChange = jest.fn();
    await act(async () => root.render(<VaccinationMatrixField question={VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS} value="" onChange={onChange} disabled={false} />));

    const combinationToggle = container.querySelector<HTMLButtonElement>('[data-vaccination-row="tdap_ipv_group"] button[aria-expanded]')!;
    await act(async () => combinationToggle.click());
    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('[data-vaccination-row="tdap_ipv_group"] select')).toBeNull();
    expect(container.querySelectorAll('[data-vaccination-row="tdap_ipv_group"] [data-vaccination-status-gates] button')).toHaveLength(4);

    const influenzaToggle = container.querySelector<HTMLButtonElement>('[data-vaccination-row="influenza"] button[aria-expanded]')!;
    await act(async () => influenzaToggle.click());
    expect(combinationToggle.getAttribute("aria-expanded")).toBe("false");
    expect(influenzaToggle.getAttribute("aria-expanded")).toBe("true");

    await act(async () => root.unmount());
  });

  it("behält Daten beim Schließen und setzt nur die gewählte Impfung zurück", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onChange = jest.fn();
    await act(async () => root.render(<VaccinationMatrixField question={VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS} value="" onChange={onChange} disabled={false} />));

    const toggle = container.querySelector<HTMLButtonElement>('[data-vaccination-row="zoster"] button[aria-expanded]')!;
    await act(async () => toggle.click());
    const partial = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-vaccination-row="zoster"] [data-vaccination-status-gates] button')).find((button) => button.textContent === "Teilweise vorhanden")!;
    await act(async () => partial.click());
    const doseOne = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-vaccination-row="zoster"] button')).find((button) => button.textContent === "Dosis 1")!;
    await act(async () => doseOne.click());
    await act(async () => toggle.click());
    expect(container.querySelector('[data-vaccination-row="zoster"]')?.textContent).toContain("Dosis 1");
    await act(async () => toggle.click());
    const reset = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-vaccination-row="zoster"] button')).find((button) => button.textContent === "Zurücksetzen")!;
    await act(async () => reset.click());
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(container.querySelector('[data-vaccination-row="zoster"]')?.textContent).toContain("Nicht bearbeitet");

    await act(async () => root.unmount());
  });

  it("zeigt impfungsspezifische v2-Details ohne künstliche Dosisstufen", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<VaccinationMatrixField question={VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS} value="" onChange={jest.fn()} disabled={false} />));

    for (const [id, expected, absent] of [
      ["tdap_ipv_group", "Pertussis", "Dosis 3"],
      ["rsv", "Impfung dokumentiert", "Dosis 2"],
      ["influenza", "Saison, z. B. 2025/26", "Dosis 1"],
      ["covid19", "Saison, z. B. 2025/26", "Dosis 1"],
      ["meningococcal", "ACWY", "Dosis 1"],
      ["hepatitis_a", "2 oder mehr Dosen dokumentiert", "Grunddosis"],
      ["hepatitis_b", "3 oder mehr Dosen dokumentiert", "Grunddosis"],
    ]) {
      const toggle = container.querySelector<HTMLButtonElement>(`[data-vaccination-row="${id}"] button[aria-expanded]`)!;
      await act(async () => toggle.click());
      const partial = Array.from(container.querySelectorAll<HTMLButtonElement>(`[data-vaccination-row="${id}"] [data-vaccination-status-gates] button`)).find((button) => button.textContent === "Teilweise vorhanden")!;
      await act(async () => partial.click());
      const row = container.querySelector(`[data-vaccination-row="${id}"]`)!;
      if (expected.startsWith("Saison")) {
        expect(row.querySelector(`input[placeholder="${expected}"]`)).not.toBeNull();
      } else {
        expect(row.textContent).toContain(expected);
      }
      expect(row.textContent).not.toContain(absent);
      if (id === "meningococcal") {
        expect(row.querySelector('input[type="checkbox"]')).toBeNull();
        expect(Array.from(row.querySelectorAll("button")).find((button) => button.textContent === "ACWY")?.getAttribute("aria-pressed")).toBe("false");
      }
    }

    await act(async () => root.unmount());
  });

  it("steuert v2-Planungsfelder vollständig über das Frozen groupSchema", async () => {
    const frozen = cloneQuestion(VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS);
    frozen.groupSchema!.find((field) => field.key === "note")!.label = "Frozen Notiz";
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<VaccinationMatrixField question={frozen} value="" onChange={jest.fn()} disabled={false} />));
    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="rsv"] button[aria-expanded]')!.click());

    for (const status of ["Teilweise vorhanden", "Nicht vorhanden", "Unklar"]) {
      await clickButton(container, "rsv", status);
      expect(container.querySelector('[data-vaccination-row="rsv"] [data-vaccination-further-action]')).not.toBeNull();
    }

    for (const action of ["Impfung ärztlich empfohlen", "Durchführung geplant / vereinbart"]) {
      await selectAction(container, "rsv", action);
      expect(container.querySelector('textarea[aria-label="RSV Frozen Notiz"]')).not.toBeNull();
      expect(container.querySelector('[data-vaccination-row="rsv"]')?.textContent).toContain("Frozen Notiz");
      expect(container.querySelector('input[aria-label="RSV Bezugsdatum"]')).not.toBeNull();
      expect(container.querySelector('input[aria-label="RSV Nächste Dosis nach"]')).not.toBeNull();
      expect(container.querySelector('select[aria-label="RSV Einheit"]')).not.toBeNull();
    }

    await selectAction(container, "rsv", "Derzeit kein weiteres Vorgehen");
    expect(container.querySelector('textarea[aria-label="RSV Frozen Notiz"]')).toBeNull();
    expect(container.querySelector('input[aria-label="RSV Bezugsdatum"]')).toBeNull();
    expect(container.querySelector('input[aria-label="RSV Nächste Dosis nach"]')).toBeNull();

    await clickButton(container, "rsv", "Vollständig vorhanden");
    expect(container.querySelector('[data-vaccination-row="rsv"] select')).toBeNull();
    expect(container.querySelector('[data-vaccination-row="rsv"] textarea')).toBeNull();
    expect(container.querySelector('[data-vaccination-row="rsv"] input')).toBeNull();
    await act(async () => root.unmount());
  });

  it("verwendet auch bei abweichenden Frozen-Bedingungen keine parallele Planungslogik", async () => {
    const frozen = cloneQuestion(VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS);
    frozen.groupSchema!.find((field) => field.key === "further_action")!.conditionalValues = ["Unklar"];
    frozen.groupSchema!.find((field) => field.key === "note")!.conditionalValues = ["Derzeit kein weiteres Vorgehen"];
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<VaccinationMatrixField question={frozen} value="" onChange={jest.fn()} disabled={false} />));
    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="rsv"] button[aria-expanded]')!.click());

    await clickButton(container, "rsv", "Nicht vorhanden");
    expect(container.querySelector('[data-vaccination-row="rsv"] [data-vaccination-further-action]')).toBeNull();
    await clickButton(container, "rsv", "Unklar");
    expect(container.querySelector('[data-vaccination-row="rsv"] [data-vaccination-further-action]')).not.toBeNull();
    await selectAction(container, "rsv", "Derzeit kein weiteres Vorgehen");
    expect(container.querySelector('textarea[aria-label="RSV Bemerkung"]')).not.toBeNull();
    expect(container.querySelector('input[aria-label="RSV Bezugsdatum"]')).toBeNull();
    await act(async () => root.unmount());
  });

  it("erzeugt für Weitere Impfung durch Öffnen, Schließen oder Kartenwechsel kein Phantom-Unklar", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onChange = jest.fn();
    await act(async () => root.render(<VaccinationMatrixField question={VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS} value="" onChange={onChange} disabled={false} />));

    const otherToggle = container.querySelector<HTMLButtonElement>('[data-vaccination-row="other"] button[aria-expanded]')!;
    const rsvToggle = container.querySelector<HTMLButtonElement>('[data-vaccination-row="rsv"] button[aria-expanded]')!;
    await act(async () => otherToggle.click());
    await act(async () => otherToggle.click());
    await act(async () => otherToggle.click());
    await act(async () => rsvToggle.click());

    expect(onChange).not.toHaveBeenCalled();
    expect(container.querySelector('[data-vaccination-row="other"]')?.textContent).toContain("Nicht bearbeitet");
    expect(container.querySelector('[data-vaccination-row="other"]')?.textContent).not.toContain("Unklar");
    await act(async () => root.unmount());
  });

  it("verwendet für Status und weiteres Vorgehen den bestehenden Auswahlbutton-State", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<VaccinationMatrixField question={VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS} value="" onChange={jest.fn()} disabled={false} />));
    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="rsv"] button[aria-expanded]')!.click());

    const partial = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-vaccination-status-gates] button')).find((button) => button.textContent === "Teilweise vorhanden")!;
    expect(partial.style.background).toBe("var(--background)");
    await act(async () => partial.click());
    expect(partial.style.background).toBe("var(--primary, #2563eb)");
    const action = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-vaccination-further-action] button')).find((button) => button.textContent === "Impfung ärztlich empfohlen")!;
    expect(action.style.background).toBe("var(--background)");
    await act(async () => action.click());
    expect(action.style.background).toBe("var(--primary, #2563eb)");
    await act(async () => root.unmount());
  });

  it("ignoriert technische Impf-IDs, zeigt aber den bestehenden Fehlerzustand für ungültigen Freitext", async () => {
    const { container, root } = await renderForm(
      VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS,
      true,
    );
    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="tdap_ipv_group"] button[aria-expanded]')!.click());
    await clickButton(container, "tdap_ipv_group", "Vollständig vorhanden");
    expect(container.querySelector('[data-q-charerror="VACCINATION_REVIEW_ITEMS"]')).toBeNull();

    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="other"] button[aria-expanded]')!.click());
    await clickButton(container, "other", "Unklar");
    const label = container.querySelector<HTMLInputElement>('[data-vaccination-row="other"] input[placeholder="Bezeichnung"]')!;
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      valueSetter.call(label, "Импфунг");
      label.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector('[data-q-charerror="VACCINATION_REVIEW_ITEMS"]')?.textContent).toContain("lateinische Buchstaben");
    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt bei stale vollständigen Daten keine Planungsfelder", async () => {
    const stale = JSON.stringify([{
      vaccination_id: "rsv",
      documented_status: "Vollständig vorhanden",
      further_action: "Impfung ärztlich empfohlen",
      note: "stale",
      reference_date: "2026-01-01",
      interval_value: "1",
      interval_unit: "Monate",
    }]);
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<VaccinationMatrixField question={VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS} value={stale} onChange={jest.fn()} disabled={false} />));
    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="rsv"] button[aria-expanded]')!.click());
    expect(container.querySelector('[data-vaccination-row="rsv"] select')).toBeNull();
    expect(container.querySelector('[data-vaccination-row="rsv"] textarea')).toBeNull();
    expect(container.querySelector('[data-vaccination-row="rsv"] input')).toBeNull();
    await act(async () => root.unmount());
  });

  it("behält Meningokokken-Mehrfachauswahl und unabhängige Impfzeilen korrekt", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onChange = jest.fn();
    await act(async () => root.render(<VaccinationMatrixField question={VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS} value="" onChange={onChange} disabled={false} />));

    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="meningococcal"] button[aria-expanded]')!.click());
    await clickButton(container, "meningococcal", "Teilweise vorhanden");
    await clickButton(container, "meningococcal", "ACWY");
    await clickButton(container, "meningococcal", "B");
    expect(Array.from(container.querySelectorAll<HTMLButtonElement>('[data-vaccination-row="meningococcal"] button')).find((button) => button.textContent === "ACWY")?.getAttribute("aria-pressed")).toBe("true");
    expect(Array.from(container.querySelectorAll<HTMLButtonElement>('[data-vaccination-row="meningococcal"] button')).find((button) => button.textContent === "B")?.getAttribute("aria-pressed")).toBe("true");
    await clickButton(container, "meningococcal", "ACWY");
    expect(Array.from(container.querySelectorAll<HTMLButtonElement>('[data-vaccination-row="meningococcal"] button')).find((button) => button.textContent === "ACWY")?.getAttribute("aria-pressed")).toBe("false");
    expect(Array.from(container.querySelectorAll<HTMLButtonElement>('[data-vaccination-row="meningococcal"] button')).find((button) => button.textContent === "B")?.getAttribute("aria-pressed")).toBe("true");

    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="zoster"] button[aria-expanded]')!.click());
    await clickButton(container, "zoster", "Teilweise vorhanden");
    await clickButton(container, "zoster", "Dosis 1");
    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="meningococcal"] button[aria-expanded]')!.click());
    expect(container.querySelector('[data-vaccination-row="meningococcal"]')?.textContent).toContain("B");
    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="zoster"] button[aria-expanded]')!.click());
    await clickButton(container, "zoster", "Zurücksetzen");
    const latest = JSON.parse(onChange.mock.calls.at(-1)?.[0] ?? "[]") as Array<Record<string, string>>;
    expect(latest).toEqual([{ vaccination_id: "meningococcal", documented_status: "Teilweise vorhanden", documented_subtypes: "B" }]);
    await act(async () => root.unmount());
  });

  it("lässt Weitere Impfung bis zur Eingabe untouched und normal zurücksetzen", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const onChange = jest.fn();
    await act(async () => root.render(<VaccinationMatrixField question={VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS} value="" onChange={onChange} disabled={false} />));
    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="other"] button[aria-expanded]')!.click());
    expect(onChange).not.toHaveBeenCalled();
    await clickButton(container, "other", "Unklar");
    const label = container.querySelector<HTMLInputElement>('[data-vaccination-row="other"] input[placeholder="Bezeichnung"]')!;
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      valueSetter.call(label, "Japanische Enzephalitis");
      label.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(JSON.parse(onChange.mock.calls.at(-1)?.[0])).toEqual([{
      vaccination_id: "other",
      documented_status: "Unklar",
      custom_label: "Japanische Enzephalitis",
    }]);
    await clickButton(container, "other", "Zurücksetzen");
    expect(onChange).toHaveBeenLastCalledWith("");
    await act(async () => root.unmount());
  });

  it("rendert eine Legacy-v1-Definition weiterhin mit Select und getrennten Zeilen", async () => {
    const legacy = JSON.parse(JSON.stringify(VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS)) as QuestionDefinition;
    delete legacy.vaccinationSchemaVersion;
    legacy.vaccinationItems = [
      { id: "tdap", label: "Tetanus / Diphtherie / Pertussis", doseOptions: ["1. Dosis"] },
      { id: "polio", label: "Poliomyelitis", doseOptions: ["1. Dosis"] },
    ];
    const { container, root } = await renderForm(legacy, true);
    expect(container.querySelector('[data-vaccination-row="tdap"] select')).not.toBeNull();
    expect(container.querySelector('[data-vaccination-row="polio"]')).not.toBeNull();
    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("verwendet für v2 ausschließlich die Statusoptionen des Frozen Snapshots", async () => {
    const frozen = JSON.parse(JSON.stringify(VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS)) as QuestionDefinition;
    frozen.groupSchema!.find((field) => field.key === "documented_status")!.options = ["Archiviert"];
    frozen.vaccinationCategories = [{ id: "indication", label: "Archiv" }];
    frozen.vaccinationItems = frozen.vaccinationItems?.filter((item) => item.id === "rsv");
    const { container, root } = await renderForm(frozen, true);
    await act(async () => container.querySelector<HTMLButtonElement>('[data-vaccination-row="rsv"] button[aria-expanded]')!.click());
    const gates = container.querySelectorAll('[data-vaccination-status-gates] button');
    expect(gates).toHaveLength(1);
    expect(gates[0].textContent).toBe("Archiviert");
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