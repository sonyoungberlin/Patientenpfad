/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

import { QuestionnaireRequestSection } from "@/app/inquiries/[id]/m3/InquiryM3Client";

const fetchMock = jest.fn();
global.fetch = fetchMock;

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("M3 Questionnaire-Confirmation-Auswahl", () => {
  beforeEach(() => fetchMock.mockReset());

  it("zeigt nur konfigurierte read-only Slottexte als unabhängig auswählbare Checkboxen", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QuestionnaireRequestSection
          inquirySessionId="inquiry-1"
          onLinkGenerated={jest.fn()}
          practiceConfirmationSlots={[
            { id: "PRACTICE_CONFIRMATION_1", text: "Erklärung 1" },
            { id: "PRACTICE_CONFIRMATION_2", text: "Erklärung 2" },
          ]}
        />,
      );
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("button")!.click();
    });

    const choices = container.querySelectorAll<HTMLInputElement>(
      "[data-q-confirmation]",
    );
    expect(choices).toHaveLength(2);
    expect(container.textContent).toContain("Erklärung 1");
    expect(container.textContent).toContain("Erklärung 2");
    expect(container.querySelector("textarea")).toBeNull();

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("rendert bei leeren Slots keinen Bestätigungsabschnitt", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QuestionnaireRequestSection
          inquirySessionId="inquiry-1"
          onLinkGenerated={jest.fn()}
          practiceConfirmationSlots={[]}
        />,
      );
    });
    await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
    expect(container.querySelector("[data-q-confirmation]")).toBeNull();
    await act(async () => root.unmount());
  });

  it("sendet beim Erzeugen nur ausgewählte Slot-IDs und keinen Practice-Text", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, link: "https://example.test/q/token" }),
    });
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QuestionnaireRequestSection
          inquirySessionId="inquiry-1"
          onLinkGenerated={jest.fn()}
          practiceConfirmationSlots={[
            { id: "PRACTICE_CONFIRMATION_1", text: "Geheimer Servertext" },
          ]}
        />,
      );
    });
    await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
    await act(async () => {
      setInputValue(
        container.querySelector<HTMLInputElement>("#q-patient-ref")!,
        "PAT-1",
      );
      container.querySelector<HTMLInputElement>('[data-q-block="KONTAKT"]')!.click();
      container.querySelector<HTMLInputElement>("[data-q-confirmation]")!.click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-create-link]")!.click();
    });

    const options = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(options.body));
    expect(body.selected_confirmation_ids).toEqual(["PRACTICE_CONFIRMATION_1"]);
    expect(String(options.body)).not.toContain("Geheimer Servertext");
    await act(async () => root.unmount());
  });
});