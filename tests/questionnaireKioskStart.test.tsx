/** @jest-environment jsdom */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { KioskQuestionnaireStart } from "@/app/questionnaire-kiosk/direct/KioskQuestionnaireStart";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("KioskQuestionnaireStart", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("startet den Check-in ohne Patientenreferenz", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: "Testabbruch vor Navigation" }),
    });
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(<KioskQuestionnaireStart practiceConfirmationSlots={[]} />);
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-kiosk-start-check-in]")!.click();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/questionnaire-kiosk/check-in",
      expect.objectContaining({ body: JSON.stringify({}) }),
    );
    await act(async () => root.unmount());
  });

  it("übergibt die Patientenreferenz an die vorhandene freie Blockauswahl", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(<KioskQuestionnaireStart practiceConfirmationSlots={[]} />);
    });

    await act(async () => {
      setInputValue(
        container.querySelector<HTMLInputElement>("#kiosk-patient-reference")!,
        "PAT-MANUELL",
      );
      container.querySelector<HTMLButtonElement>("[data-kiosk-open-questionnaire]")!.click();
    });

    expect(container.querySelector("#kiosk-patient-reference")).toBeNull();
    expect(container.querySelector("#q-patient-ref")).toBeNull();
    expect(container.querySelector('[data-q-block="KONTAKT"]')).not.toBeNull();

    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, error: "Testabbruch vor Navigation" }),
    });
    await act(async () => {
      container.querySelector<HTMLInputElement>('[data-q-block="KONTAKT"]')!.click();
      container.querySelector<HTMLButtonElement>("[data-q-direct-fill]")!.click();
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.patient_reference).toBe("PAT-MANUELL");
    expect(body.selected_block_ids).toEqual(["KONTAKT"]);
    await act(async () => root.unmount());
  });
});