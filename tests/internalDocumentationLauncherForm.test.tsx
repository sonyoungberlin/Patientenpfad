/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import InternalDocumentationLauncherForm from "@/components/InternalDocumentationLauncherForm";
import type { PracticeDocumentationBlockSummary } from "@/lib/practice/documentationBlocks";
import type { PracticeDocumentationTemplate } from "@/lib/practice/documentationTemplates";

const mockFetch = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, "fetch", { configurable: true, writable: true, value: mockFetch });

const availableBlocks: PracticeDocumentationBlockSummary[] = [
  { id: "practice_block_anamnese", title: "Anamnese", blockType: "text" },
  { id: "practice_block_blutdruck", title: "Blutdruck", blockType: "measurement" },
  { id: "practice_block_hinweis", title: "Hinweis", blockType: "hint" },
];
const practiceTemplate: PracticeDocumentationTemplate = {
  id: "practice-template",
  name: "Praxisvorlage",
  outputFormat: "formell",
  documentTitleOption: "stellungnahme",
  blockLayout: [
    { blockId: "practice_block_anamnese", section: 2, order: 0 },
    { blockId: "practice_block_blutdruck", section: 3, order: 0 },
  ],
};

function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

async function renderLauncher() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <InternalDocumentationLauncherForm
      endpoint="/api/internal-documentation"
      availableBlocks={availableBlocks}
      practiceTemplates={[practiceTemplate]}
    />,
  ));
  return { container, root };
}

async function completeReference(container: HTMLElement) {
  const reference = container.querySelector<HTMLInputElement>('input[required]:not([type="checkbox"])')!;
  await act(async () => change(reference, "81426"));
}

async function submit(container: HTMLElement) {
  await act(async () => {
    container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe("InternalDocumentationLauncherForm", () => {
  beforeEach(() => {
    mockFetch.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({ link: "https://example.test/internal/session-1" }),
    } as Response);
  });

  it("kopiert Ausgabe, Titel und Abschnittsanordnung einer Praxisvorlage in den Lauf", async () => {
    const { container, root } = await renderLauncher();
    await completeReference(container);
    const selects = container.querySelectorAll<HTMLSelectElement>("select");
    await act(async () => change(selects[2], "practice-template"));
    await submit(container);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      selectedBlockIds: ["practice_block_anamnese", "practice_block_blutdruck"],
      blockLayout: practiceTemplate.blockLayout,
      patientReference: "81426",
      outputFormat: "formell",
      documentTitleOption: "stellungnahme",
    });

    await act(async () => root.unmount());
    container.remove();
  });

  it("ändert die kopierte Anordnung für einen Lauf, ohne die Vorlage zu verändern", async () => {
    const originalLayout = practiceTemplate.blockLayout.map((placement) => ({ ...placement }));
    const { container, root } = await renderLauncher();
    await completeReference(container);
    const templateSelect = container.querySelectorAll<HTMLSelectElement>("select")[2];
    await act(async () => change(templateSelect, "practice-template"));
    await act(async () => {
      container.querySelector<HTMLInputElement>('[data-selected-internal-block="practice_block_anamnese"]')!.click();
    });
    await submit(container);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.selectedBlockIds).toEqual(["practice_block_blutdruck"]);
    expect(body.blockLayout).toEqual([{ blockId: "practice_block_blutdruck", section: 3, order: 0 }]);
    expect(practiceTemplate.blockLayout).toEqual(originalLayout);

    await act(async () => root.unmount());
    container.remove();
  });

  it("ermöglicht eine freie Zusammenstellung aus aktiven Bibliotheksblöcken", async () => {
    const { container, root } = await renderLauncher();
    await completeReference(container);
    const selects = container.querySelectorAll<HTMLSelectElement>("select");
    await act(async () => change(selects[1], "arztbrief"));
    const addButton = [...container.querySelectorAll<HTMLButtonElement>('button[type="button"]')]
      .find((button) => button.textContent?.includes("Baustein hinzufügen"))!;
    await act(async () => addButton.click());
    await act(async () => {
      container.querySelector<HTMLInputElement>('[data-available-internal-block="practice_block_hinweis"]')!.click();
    });
    await submit(container);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual(expect.objectContaining({
      selectedBlockIds: ["practice_block_hinweis"],
      blockLayout: [{ blockId: "practice_block_hinweis", section: 1, order: 0 }],
      outputFormat: "informell",
      documentTitleOption: "arztbrief",
    }));

    await act(async () => root.unmount());
    container.remove();
  });

  it("meldet fehlende Voraussetzungen einzeln und sendet nicht", async () => {
    const { container, root } = await renderLauncher();
    await submit(container);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Bitte Patientenreferenz angeben.");

    await completeReference(container);
    await submit(container);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Bitte Dokumenttitel angeben.");

    const titleSelect = container.querySelectorAll<HTMLSelectElement>("select")[1];
    await act(async () => change(titleSelect, "arztbrief"));
    await submit(container);
    expect(container.querySelector('[role="alert"]')?.textContent)
      .toBe("Bitte mindestens einen Dokumentationsbaustein auswählen.");
    expect(mockFetch).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    container.remove();
  });
});