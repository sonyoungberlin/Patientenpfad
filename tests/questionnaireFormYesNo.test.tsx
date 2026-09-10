/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import {
  buildInternalDocumentationFrozenBlocks,
  getInternalWorkflow,
  INTERNAL_QUESTION_CATALOG,
} from "@/lib/questionnaire/internalWorkflowRegistry";

jest.mock("@/components/SelfCheckInQrCode", () => ({
  SelfCheckInQrCode: () => null,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { structuredClone: <T>(value: T) => T }).structuredClone ??=
  <T,>(value: T) => JSON.parse(JSON.stringify(value)) as T;

const fetchMock = jest.fn();
global.fetch = fetchMock;

it("rendert interne Blöcke in der gespeicherten Layoutreihenfolge", async () => {
  const frozenBlocks = buildInternalDocumentationFrozenBlocks(
    ["CARE_PLAN_HA", "VACCINATION_REVIEW"],
    [
      { blockId: "VACCINATION_REVIEW", section: 1, order: 0 },
      { blockId: "CARE_PLAN_HA", section: 2, order: 0 },
    ],
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QuestionnaireFormClient
        token="token-layout"
        questions={frozenBlocks.flatMap((block) => block.questions)}
        frozenBlocks={frozenBlocks}
        source="practice_direct"
        context="office"
        internalWorkflowId={null}
      />,
    );
  });

  expect([...container.querySelectorAll("[data-q-block]")].map(
    (section) => section.getAttribute("data-q-block"),
  )).toEqual(["VACCINATION_REVIEW", "CARE_PLAN_HA"]);

  await act(async () => root.unmount());
  document.body.removeChild(container);
});

async function submitYesNo(question: QuestionDefinition, value: string) {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QuestionnaireFormClient
        token="token-1"
        questions={[question]}
        source="practice_direct"
        context="office"
      />,
    );
  });
  const renderedText = container.textContent ?? "";
  await act(async () => {
    container.querySelector<HTMLButtonElement>(`[data-q-yesno="${question.id}:${value}"]`)!.click();
  });
  await act(async () => {
    container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
    await Promise.resolve();
    await Promise.resolve();
  });
  const request = fetchMock.mock.calls[0][1] as RequestInit;
  const answers = JSON.parse(request.body as string).answers as Record<string, string>;
  await act(async () => root.unmount());
  document.body.removeChild(container);
  return { answers, renderedText };
}

describe("QuestionnaireFormClient yes_no-Werte", () => {
  beforeEach(() => fetchMock.mockReset());

  it.each(["ja", "nein"])("sendet Standardwert %s unverändert", async (value) => {
    const { answers } = await submitYesNo({
      id: "STANDARD_YES_NO",
      text: "Standardfrage",
      type: "yes_no",
      required: false,
    }, value);

    expect(answers.STANDARD_YES_NO).toBe(value);
  });

  it.each(["unauffällig", "auffällig"])("sendet klinischen Custom-Wert %s unverändert", async (value) => {
    const question = getInternalWorkflow("health_check_v1")!.questionCatalog.HEALTH_CHECK_GENERAL_STATUS;
    const { answers, renderedText } = await submitYesNo(question, value);

    expect(renderedText).toContain("unauffällig");
    expect(renderedText).toContain("auffällig");
    expect(renderedText).not.toContain("Allgemeinzustand unauffällig.");
    expect(answers.HEALTH_CHECK_GENERAL_STATUS).toBe(value);
  });

  it("zeigt bei strukturierten custom yes_no-Optionen nur das Label", async () => {
    const question: QuestionDefinition = {
      id: "STRUCTURED_YES_NO",
      text: "Dokumentationsstatus",
      type: "yes_no",
      required: false,
      options: [
        { value: "ja", label: "Ja, bestätigt", documentationText: "Der Status wurde bestätigt." },
        { value: "nein", label: "Nein, offen", documentationText: "Der Status ist noch offen." },
      ],
    };
    const { answers, renderedText } = await submitYesNo(question, "ja");

    expect(renderedText).toContain("Ja, bestätigt");
    expect(renderedText).not.toContain("Der Status wurde bestätigt.");
    expect(answers.STRUCTURED_YES_NO).toBe("ja");
  });

  it("zeigt bei strukturierten select-Optionen nur das kurze Label", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QuestionnaireFormClient
          token="token-1"
          questions={[{
            id: "STRUCTURED_SELECT",
            text: "Anforderung",
            type: "select",
            required: false,
            options: [{
              value: "patient",
              label: "Patientin / Patient",
              documentationText: "Die Anforderung erfolgt durch die Patientin bzw. den Patienten.",
            }],
          }]}
          source="kiosk_direct"
          context="office"
        />,
      );
    });

    expect(container.textContent).toContain("Patientin / Patient");
    expect(container.textContent).not.toContain("Die Anforderung erfolgt durch");
    expect(container.querySelector<HTMLOptionElement>('option[value="patient"]')?.textContent)
      .toBe("Patientin / Patient");

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("bricht lange Multi-Select-Texte innerhalb des Containers um", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QuestionnaireFormClient
          token="token-1"
          questions={[{
            id: "HEALTH_CHECK_NEXT_STEPS",
            text: "Maßnahmen",
            type: "multi_select",
            required: false,
            options: ["Weitere Abklärung beim zuständigen Hausarzt empfohlen", "Kurzer Eintrag"],
          }]}
          source="kiosk_direct"
          context="office"
        />,
      );
    });

    const button = container.querySelector<HTMLButtonElement>(
      '[data-q-multiselect="HEALTH_CHECK_NEXT_STEPS:Weitere Abklärung beim zuständigen Hausarzt empfohlen"]',
    );
    expect(button?.style.maxWidth).toBe("100%");
    expect(button?.style.whiteSpace).toBe("normal");
    expect(button?.style.overflowWrap).toBe("anywhere");
    expect(button?.parentElement?.style.minWidth).toBe("0");

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt beim Dokumentblock nur Kurzlabels und sendet technische Multi-Select-Werte", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    const question = INTERNAL_QUESTION_CATALOG.DOCUMENT_HANDLING_ACTIONS;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QuestionnaireFormClient
          token="token-1"
          questions={[question]}
          source="practice_direct"
          context="office"
        />,
      );
    });

    expect(container.textContent).toContain("sind beigefügt");
    expect(container.textContent).toContain("wurden angefordert");
    expect(container.textContent).not.toContain("Dokumente / Befunde sind beigefügt.");
    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[data-q-multiselect="DOCUMENT_HANDLING_ACTIONS:attached"]',
      )!.click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[data-q-multiselect="DOCUMENT_HANDLING_ACTIONS:requested"]',
      )!.click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string).answers).toEqual({
      DOCUMENT_HANDLING_ACTIONS: "attached, requested",
    });

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("verwendet für Stellungnahme bestehende Auswahlbuttons und sendet nur technische Values", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    const questions = [
      INTERNAL_QUESTION_CATALOG.MEDICAL_STATEMENT_IMPAIRMENT_TYPE,
      INTERNAL_QUESTION_CATALOG.MEDICAL_STATEMENT_TIME_ASSESSMENT,
      INTERNAL_QUESTION_CATALOG.MEDICAL_STATEMENT_RECOMMENDATIONS,
    ];
    const frozenBlocks = [{
      id: "MEDICAL_STATEMENT",
      label: "Stellungnahme",
      displayOrder: 80,
      questions,
      conditionalRules: [],
      initiallyVisible: true,
      outputSemantics: "documented-content-v1" as const,
    }];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QuestionnaireFormClient
          token="token-1"
          questions={questions}
          frozenBlocks={frozenBlocks}
          source="practice_direct"
          context="office"
          internalWorkflowId={null}
        />,
      );
    });

    expect(container.textContent).toContain("Körperlich");
    expect(container.textContent).toContain("Verlauf unklar");
    expect(container.textContent).toContain("Alternative Maßnahmen prüfen");
    expect(container.textContent).not.toContain("Es liegen körperliche Beschwerden vor");
    expect(container.textContent).not.toContain("Eine erneute ärztliche Beurteilung im weiteren Verlauf");

    const physical = container.querySelector<HTMLButtonElement>(
      '[data-q-select="MEDICAL_STATEMENT_IMPAIRMENT_TYPE:physical"]',
    )!;
    const psychological = container.querySelector<HTMLButtonElement>(
      '[data-q-select="MEDICAL_STATEMENT_IMPAIRMENT_TYPE:psychological"]',
    )!;
    await act(async () => physical.click());
    expect(physical.getAttribute("aria-checked")).toBe("true");
    await act(async () => psychological.click());
    expect(physical.getAttribute("aria-checked")).toBe("false");
    expect(psychological.getAttribute("aria-checked")).toBe("true");

    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[data-q-select="MEDICAL_STATEMENT_TIME_ASSESSMENT:uncertain_course"]',
      )!.click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[data-q-multiselect="MEDICAL_STATEMENT_RECOMMENDATIONS:social_medical_assessment"]',
      )!.click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[data-q-multiselect="MEDICAL_STATEMENT_RECOMMENDATIONS:alternative_measures"]',
      )!.click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string).answers).toEqual({
      MEDICAL_STATEMENT_IMPAIRMENT_TYPE: "psychological",
      MEDICAL_STATEMENT_TIME_ASSESSMENT: "uncertain_course",
      MEDICAL_STATEMENT_RECOMMENDATIONS: "social_medical_assessment, alternative_measures",
    });

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("verwendet intern die bestehende FACHAERZTE-UI mit Hinzufügen, Entfernen und maximal zehn Einträgen", async () => {
    const question = INTERNAL_QUESTION_CATALOG.FACHAERZTE;
    const frozenBlocks = [{
      id: "SPECIALISTS",
      label: "Fachärzte",
      displayOrder: 90,
      questions: [question],
      conditionalRules: [],
      initiallyVisible: true,
      outputSemantics: "documented-content-v1" as const,
    }];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QuestionnaireFormClient
          token="session-1"
          questions={[question]}
          frozenBlocks={frozenBlocks}
          source="practice_direct"
          context="office"
          internalWorkflowId={null}
        />,
      );
    });

    const section = container.querySelector<HTMLElement>('[data-q-block="SPECIALISTS"]')!;
    for (let index = 0; index < 10; index += 1) {
      await act(async () => {
        [...section.querySelectorAll("button")]
          .find((button) => button.textContent === "+ Weiteren Facharzt hinzufügen")!
          .click();
      });
    }
    expect(section.textContent).toContain("Erkrankung / Grund der fachärztlichen Behandlung");
    expect(section.textContent).toContain("Facharztbereich");
    expect(section.textContent).toContain("Name des Facharztes oder der Praxis");
    expect(section.textContent).toContain("Adresse der Praxis");
    expect([...section.querySelectorAll("strong")].filter((node) => node.textContent?.startsWith("Eintrag ")))
      .toHaveLength(10);
    expect([...section.querySelectorAll("button")].some((button) => button.textContent === "+ Weiteren Facharzt hinzufügen"))
      .toBe(false);

    await act(async () => {
      [...section.querySelectorAll("button")]
        .find((button) => button.textContent === "Entfernen")!
        .click();
    });
    expect([...section.querySelectorAll("strong")].filter((node) => node.textContent?.startsWith("Eintrag ")))
      .toHaveLength(9);
    expect([...section.querySelectorAll("button")].some((button) => button.textContent === "+ Weiteren Facharzt hinzufügen"))
      .toBe(true);

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("sendet Einwilligung nur als technischen Aufnahme-Wert ohne Confirmation-Checkbox", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    const question = INTERNAL_QUESTION_CATALOG.INTERNAL_CONSENT_INCLUDE;
    const frozenBlocks = [{
      id: "INTERNAL_CONSENT",
      label: "Einwilligungserklärung",
      displayOrder: 100,
      questions: [question],
      conditionalRules: [],
      initiallyVisible: true,
      outputSemantics: "documented-content-v1" as const,
      paperSignature: { label: "Datum / Unterschrift Patient/in" },
    }];
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QuestionnaireFormClient
          token="session-1"
          questions={[question]}
          frozenBlocks={frozenBlocks}
          source="practice_direct"
          context="office"
          internalWorkflowId={null}
        />,
      );
    });

    expect(container.textContent).toContain("Einwilligungserklärung aufnehmen");
    expect(container.textContent).not.toContain("Ich willige ein, dass");
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[data-q-multiselect="INTERNAL_CONSENT_INCLUDE:include_in_print"]',
      )!.click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string).answers).toEqual({
      INTERNAL_CONSENT_INCLUDE: "include_in_print",
    });

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("aktualisiert den Health-Check-BMI unmittelbar aus Größe und Gewicht", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QuestionnaireFormClient
          token="token-1"
          questions={[
            { id: "HEALTH_CHECK_HEIGHT_CM", text: "Größe", type: "number", required: false, unit: "cm" },
            { id: "HEALTH_CHECK_WEIGHT_KG", text: "Gewicht", type: "number", required: false, unit: "kg" },
          ]}
          source="kiosk_direct"
          context="office"
        />,
      );
    });

    expect(container.querySelector('[data-q-derived="BMI"]')).toBeNull();
    const height = container.querySelector<HTMLInputElement>("#HEALTH_CHECK_HEIGHT_CM")!;
    const weight = container.querySelector<HTMLInputElement>("#HEALTH_CHECK_WEIGHT_KG")!;
    await act(async () => {
      const setInputValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      setInputValue.call(height, "175");
      height.dispatchEvent(new Event("change", { bubbles: true }));
      setInputValue.call(weight, "70");
      weight.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(container.querySelector('[data-q-derived="BMI"]')?.textContent).toBe("BMI: 22,9 kg/m²");

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });
});