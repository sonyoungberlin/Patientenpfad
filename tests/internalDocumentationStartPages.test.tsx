/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import InternalDocumentationLauncher from "@/app/cases/internal-documentation/InternalDocumentationLauncher";
import InternalDocumentationStartPage from "@/app/questionnaire-kiosk/internal/page";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe.each([
  ["Praxisstart", InternalDocumentationLauncher],
  ["Kioskstart", InternalDocumentationStartPage],
])("interne Dokumenttitel-Auswahl im %s", (_label, StartComponent) => {
  it("ordnet Patient, Titel und Inhaltsblöcke getrennt und ohne Vorauswahl an", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(<StartComponent />));

    const referenceInput = container.querySelector<HTMLInputElement>('input[required]:not([type="checkbox"])')!;
    const titleSelect = container.querySelector<HTMLSelectElement>("select")!;
    const blockCheckbox = container.querySelector<HTMLInputElement>('[data-internal-block="CARE_PLAN_HA"]')!;
    expect(referenceInput).not.toBeNull();
    expect(titleSelect.value).toBe("");
    expect(referenceInput.compareDocumentPosition(titleSelect) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(titleSelect.compareDocumentPosition(blockCheckbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll("[data-document-section]")).toHaveLength(3);

    await act(async () => blockCheckbox.click());
    expect(blockCheckbox.checked).toBe(true);
    expect(container.querySelector('[data-organized-block="CARE_PLAN_HA"]')).not.toBeNull();

    await act(async () => {
      titleSelect.value = "patienteninformation";
      titleSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(blockCheckbox.checked).toBe(true);
    expect(titleSelect.value).toBe("patienteninformation");

    await act(async () => root.unmount());
    container.remove();
  });
});