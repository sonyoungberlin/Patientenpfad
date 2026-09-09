/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";

jest.mock("@/components/SelfCheckInQrCode", () => ({
  SelfCheckInQrCode: () => null,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = jest.fn();
global.fetch = fetchMock;

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
  return answers;
}

describe("QuestionnaireFormClient yes_no-Werte", () => {
  beforeEach(() => fetchMock.mockReset());

  it.each(["ja", "nein"])("sendet Standardwert %s unverändert", async (value) => {
    const answers = await submitYesNo({
      id: "STANDARD_YES_NO",
      text: "Standardfrage",
      type: "yes_no",
      required: false,
    }, value);

    expect(answers.STANDARD_YES_NO).toBe(value);
  });

  it.each(["unauffällig", "auffällig"])("sendet klinischen Custom-Wert %s unverändert", async (value) => {
    const answers = await submitYesNo({
      id: "HEALTH_CHECK_GENERAL_STATUS",
      text: "Allgemeinzustand",
      type: "yes_no",
      required: false,
      options: ["unauffällig", "auffällig"],
    }, value);

    expect(answers.HEALTH_CHECK_GENERAL_STATUS).toBe(value);
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