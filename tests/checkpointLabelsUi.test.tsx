/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import CheckpointsListClient from "@/app/admin/practice-processes/checkpoints/CheckpointsListClient";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", {
      href,
      ...props,
      onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onClick?.(event);
      },
    }, children),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const checkpoints = [
  { id: "cp-a", title: "Aufnahme", description: "Erstgespräch planen", orientationAnchors: [{ id: "anchor-a", text: "Frage" }] },
  { id: "cp-b", title: "Medikation", description: "Medikationsplan prüfen", orientationAnchors: [] },
];
const labels = [
  { id: "label-a", name: "Aufnahme", checkpointIds: ["cp-a"] },
  { id: "label-b", name: "Medizin", checkpointIds: ["cp-a", "cp-b"] },
];

describe("Checkpoint-Bibliotheksnavigation", () => {
  afterEach(() => document.body.replaceChildren());

  it("zeigt mehrfach gelabelte Checkpoints in mehreren Akkordeons, aber im Datenbestand nur einmal", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(<CheckpointsListClient
      checkpoints={checkpoints}
      initialLabels={labels}
      initialView="labels"
      initialQuery=""
      initialOpenLabelIds={[]}
    />));

    const first = container.querySelector<HTMLButtonElement>('[aria-controls="checkpoint-label-panel-label-a"]')!;
    const second = container.querySelector<HTMLButtonElement>('[aria-controls="checkpoint-label-panel-label-b"]')!;
    await act(async () => { first.click(); second.click(); });
    expect(first.getAttribute("aria-expanded")).toBe("true");
    expect(second.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelectorAll('[data-checkpoint-id="cp-a"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-checkpoint-id="cp-b"]')).toHaveLength(1);
    expect(container.textContent).toContain("1 Orientierungsanker");
    await act(async () => root.unmount());
  });

  it("wendet die Suche in der gewählten Labelansicht auf Titel und Beschreibung an", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(<CheckpointsListClient
      checkpoints={checkpoints}
      initialLabels={labels}
      initialView="labels"
      initialQuery="Medikationsplan"
      initialOpenLabelIds={["label-b"]}
    />));

    expect(container.querySelector('[data-checkpoint-id="cp-a"]')).toBeNull();
    expect(container.querySelector('[data-checkpoint-id="cp-b"]')).not.toBeNull();
    await act(async () => root.unmount());
  });

  it("gibt mit einer Labelnavigation eine sichere Rücksprungadresse und merkt den Checkpoint", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    window.history.replaceState(null, "", "/admin/practice-processes/checkpoints?view=labels&open=label-a");
    const root = createRoot(container);
    await act(async () => root.render(<CheckpointsListClient
      checkpoints={checkpoints}
      initialLabels={labels}
      initialView="labels"
      initialQuery=""
      initialOpenLabelIds={["label-a"]}
    />));

    const card = container.querySelector<HTMLAnchorElement>('[data-checkpoint-id="cp-a"]')!;
    await act(async () => card.click());
    expect(card.href).toContain("returnTo=");
    expect(sessionStorage.getItem("checkpoint-library-position:/admin/practice-processes/checkpoints?view=labels&open=label-a"))
      .toContain('"checkpointId":"cp-a"');
    await act(async () => root.unmount());
  });

  it("stellt nach der Rückkehr die gespeicherte Checkpoint-Position wieder her", async () => {
    const location = "/admin/practice-processes/checkpoints?view=labels&open=label-a";
    window.history.replaceState(null, "", location);
    sessionStorage.setItem(`checkpoint-library-position:${location}`, JSON.stringify({ scrollY: 180, checkpointId: "cp-a" }));
    const originalAnimationFrame = window.requestAnimationFrame;
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = jest.fn();
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => { callback(0); return 1; }) as typeof window.requestAnimationFrame;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(<CheckpointsListClient
      checkpoints={checkpoints}
      initialLabels={labels}
      initialView="labels"
      initialQuery=""
      initialOpenLabelIds={["label-a"]}
    />));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });
    expect(sessionStorage.getItem(`checkpoint-library-position:${location}`)).toBeNull();
    await act(async () => root.unmount());
    window.requestAnimationFrame = originalAnimationFrame;
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });
});