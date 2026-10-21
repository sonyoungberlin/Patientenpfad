/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import CheckpointDetailClient from "@/app/admin/practice-processes/checkpoints/[checkpointId]/CheckpointDetailClient";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, refresh: jest.fn() }) }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const initialDraft = {
  title: "Checkpoint",
  description: "Beschreibung",
  orientationHint: "",
  orientationAnchors: [{ id: "anchor-stable", text: "Anker" }],
};

async function renderEditor(props: Partial<React.ComponentProps<typeof CheckpointDetailClient>> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<CheckpointDetailClient initialDraft={initialDraft} {...props} />));
  return { container, root };
}

function saveButton(container: HTMLElement) {
  return [...container.querySelectorAll("button")].find((button) => button.textContent === "Speichern")!;
}

describe("Labelbearbeitung im Checkpoint-Editor", () => {
  let originalFetch: typeof global.fetch;
  beforeEach(() => { originalFetch = global.fetch; mockPush.mockReset(); });
  afterEach(() => { global.fetch = originalFetch; document.body.replaceChildren(); });

  it("speichert eine reine Labeländerung unabhängig vom Checkpoint-Inhalt", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, labelIds: ["label-a"] }),
    }) as jest.Mock;
    const { container, root } = await renderEditor({
      fixedId: "cp-1",
      initialLabels: [{ id: "label-a", name: "Fachlich prüfen" }],
    });

    await act(async () => { container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(); });
    await act(async () => { saveButton(container).click(); });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("/api/admin/checkpoint-labels/assignments/cp-1", expect.objectContaining({ method: "PUT" }));
    expect(container.textContent).toContain("Erfolgreich gespeichert.");
    await act(async () => root.unmount());
  });

  it("markiert einen fehlgeschlagenen Labelspeicher nicht als vollständigen Erfolg nach Inhaltsänderung", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, checkpoint: { id: "cp-1", ...initialDraft } }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ ok: false, error: "Label nicht verfügbar." }) }) as jest.Mock;
    const { container, root } = await renderEditor({
      fixedId: "cp-1",
      initialLabels: [{ id: "label-a", name: "Fachlich prüfen" }],
    });

    const title = container.querySelector<HTMLInputElement>("input")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(title, "Geänderter Checkpoint");
      title.dispatchEvent(new Event("input", { bubbles: true }));
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    });
    await act(async () => { saveButton(container).click(); });

    expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/admin/checkpoints/cp-1", expect.objectContaining({ method: "PUT" }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/admin/checkpoint-labels/assignments/cp-1", expect.objectContaining({ method: "PUT" }));
    expect(container.textContent).toContain("Checkpoint gespeichert, Labels aber nicht");
    expect(container.textContent).not.toContain("Erfolgreich gespeichert.");
    await act(async () => root.unmount());
  });

  it("erstellt Checkpointinhalte vor den separaten Zuordnungen und wählt ein neues Label aus", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, checkpoint: { id: "neuer-checkpoint", ...initialDraft } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, labelIds: ["label-a"] }) }) as jest.Mock;
    const { container, root } = await renderEditor({
      initialLabels: [{ id: "label-a", name: "Fachlich prüfen" }],
      existingIds: [],
      existingTitles: [],
      returnTo: "/admin/practice-processes/checkpoints?view=labels&open=label-a",
    });

    await act(async () => { container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(); });
    await act(async () => { saveButton(container).click(); });

    expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/admin/checkpoints", expect.objectContaining({ method: "POST" }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/admin/checkpoint-labels/assignments/neuer-checkpoint", expect.objectContaining({ method: "PUT" }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("returnTo="));
    await act(async () => root.unmount());
  });

  it("legt ein Label direkt im Editor an und speichert es anschließend getrennt zu", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, label: { id: "label-new", name: "Neu sortieren" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, checkpoint: { id: "neuer-checkpoint", ...initialDraft } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, labelIds: ["label-new"] }) }) as jest.Mock;
    const { container, root } = await renderEditor({ existingIds: [], existingTitles: [] });
    const labelName = container.querySelector<HTMLInputElement>("#editor-new-label")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(labelName, "Neu sortieren");
      labelName.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      [...container.querySelectorAll("button")].find((button) => button.textContent === "Erstellen und auswählen")?.click();
      await Promise.resolve();
    });

    expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    await act(async () => { saveButton(container).click(); });
    expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/admin/checkpoint-labels", expect.objectContaining({ method: "POST" }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/admin/checkpoints", expect.objectContaining({ method: "POST" }));
    expect(global.fetch).toHaveBeenNthCalledWith(3, "/api/admin/checkpoint-labels/assignments/neuer-checkpoint", expect.objectContaining({ method: "PUT" }));
    await act(async () => root.unmount());
  });
});