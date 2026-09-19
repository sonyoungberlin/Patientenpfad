/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import InternalDocumentationLauncher from "@/app/cases/internal-documentation/InternalDocumentationLauncher";
import KioskInternalDocumentationStartPage from "@/app/questionnaire-kiosk/internal/page";
import type { PracticeDocumentationBlockSummary } from "@/lib/practice/documentationBlocks";
import type { PracticeDocumentationTemplate } from "@/lib/practice/documentationTemplates";

const mockPush = jest.fn();
const mockFetch = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, "fetch", { configurable: true, writable: true, value: mockFetch });

const blocks: PracticeDocumentationBlockSummary[] = [
  { id: "practice_block_anamnese", title: "Anamnese", blockType: "text" },
  { id: "practice_block_blutdruck", title: "Blutdruck", blockType: "measurement" },
];
const templates: PracticeDocumentationTemplate[] = [{
  id: "template-1",
  name: "Praxisvorlage",
  outputFormat: "formell",
  documentTitleOption: "stellungnahme",
  blockLayout: [{ blockId: "practice_block_blutdruck", section: 2, order: 0 }],
}];

function PracticeStart() {
  return <InternalDocumentationLauncher practiceTemplates={templates} availableBlocks={blocks} />;
}

const starts = [
  ["Praxisstart", PracticeStart, "/api/internal-documentation"],
  ["Kioskstart", KioskInternalDocumentationStartPage, "/api/questionnaire-kiosk/internal"],
] as const;

function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

describe.each(starts)("interner Dokumentationslauncher: %s", (_label, StartComponent, endpoint) => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetch.mockReset().mockImplementation(async (input) => {
      if (String(input) === "/api/questionnaire-kiosk/internal/templates") {
        return { json: async () => ({ ok: true, templates, blocks }) } as Response;
      }
      return {
        ok: true,
        json: async () => ({ link: "https://example.test/internal/session-1" }),
      } as Response;
    });
  });

  it("zeigt ausschließlich Praxisvorlagen und aktive Bibliotheksblöcke", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(<StartComponent />));
    await act(async () => Promise.resolve());

    const selects = container.querySelectorAll<HTMLSelectElement>("select");
    expect(selects).toHaveLength(3);
    expect([...selects[2].options].map(({ text }) => text)).toEqual([
      "Keine Vorlage ausgewählt",
      "Praxisvorlage",
    ]);
    expect(container.textContent).not.toContain("Systemvorlagen");
    expect(container.querySelectorAll("[data-selected-internal-block]")).toHaveLength(0);

    await act(async () => change(selects[2], "template-1"));
    expect(container.querySelector('[data-selected-internal-block="practice_block_blutdruck"]')).not.toBeNull();

    const addButton = [...container.querySelectorAll<HTMLButtonElement>('button[type="button"]')]
      .find((button) => button.textContent?.includes("Baustein hinzufügen"))!;
    await act(async () => addButton.click());
    expect(container.querySelector('[data-available-internal-block="practice_block_anamnese"]')).not.toBeNull();

    await act(async () => root.unmount());
    container.remove();
  });

  it("sendet für Praxis und Kiosk denselben fachlichen Payload", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(<StartComponent />));
    await act(async () => Promise.resolve());

    const reference = container.querySelector<HTMLInputElement>('input[required]:not([type="checkbox"])')!;
    const selects = container.querySelectorAll<HTMLSelectElement>("select");
    await act(async () => {
      change(reference, "81426");
      change(selects[2], "template-1");
    });
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const postCall = mockFetch.mock.calls.find(
      ([input, init]) => String(input) === endpoint && init?.method === "POST",
    );
    expect(postCall).toBeDefined();
    expect(JSON.parse(postCall![1].body)).toEqual({
      selectedBlockIds: ["practice_block_blutdruck"],
      blockLayout: [{ blockId: "practice_block_blutdruck", section: 2, order: 0 }],
      patientReference: "81426",
      outputFormat: "formell",
      documentTitleOption: "stellungnahme",
    });

    await act(async () => root.unmount());
    container.remove();
  });
});