/** @jest-environment jsdom */

import React from "react";
import { createRoot, type Root } from "react-dom/client";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));

jest.mock("@/app/workflow-cases/internal-protocol/draft/_saveDraft", () => ({
  savePracticeWorkflowDraft: jest.fn(),
}));

import PracticeWorkflowM4Client from "@/app/workflow-cases/internal-protocol/draft/m4/PracticeWorkflowM4Client";

const snapshot = {
  processKind: "practice-workflow",
  snapshotVersion: 2,
  caseProfileId: "profile-1",
  caseProfileTitle: "Praxisfall",
  checkpoints: [{
    checkpointId: "patientenzuordnung-pruefen",
    checkpointTitle: "Historischer Titel",
    decision: "PFLICHT",
  }],
};

const definition = {
  id: "definition-1",
  practiceId: "practice-1",
  checkpointId: "patientenzuordnung-pruefen",
  selectedAnchorIds: ["a1", "a2"],
  implementation: "",
  updatedAt: "2026-09-30T10:00:00.000Z",
};

const builderCheckpoint = {
  checkpointId: "patientenzuordnung-pruefen",
  title: "Aktueller DB-Titel",
  description: "Aktuelle DB-Beschreibung",
  orientationHint: "Aktueller DB-Orientierungshinweis",
  orientationAnchors: [
    { id: "a1", text: "Aktueller DB-Anker 1" },
    { id: "a2", text: "Aktueller DB-Anker 2" },
    { id: "a3", text: "Nicht ausgewählter DB-Anker" },
  ],
};

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body });
}

async function renderM4(currentDefinition: typeof definition | null = definition, builderOverrides = {}) {
  const checkpoint = {
    ...builderCheckpoint,
    ...builderOverrides,
    definition: currentDefinition
      ? {
          selectedAnchorIds: currentDefinition.selectedAnchorIds,
          implementation: currentDefinition.implementation,
        }
      : null,
  };
  global.fetch = jest.fn((input: string | URL) => (
    String(input).includes("/protocol/save")
      ? response({ ok: true, snapshot, builderCheckpoints: [checkpoint] })
      : response({ ok: true })
  )) as jest.Mock;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  window.history.replaceState({}, "", "/workflow-cases/internal-protocol/draft/m4?sessionId=session-1");
  root.render(<PracticeWorkflowM4Client />);
  await new Promise((resolve) => setTimeout(resolve, 75));
  return { container, root };
}

afterEach(() => {
  push.mockReset();
  delete (globalThis as { fetch?: unknown }).fetch;
  document.body.replaceChildren();
  jest.restoreAllMocks();
});

describe("M4 zeigt ausgewählte Praxisstandard-Anchors", () => {
  it("löst selectedAnchorIds mit aktuellen DB-first Metadaten auf", async () => {
    const { container, root } = await renderM4();

    expect(container.textContent).toContain("Aktueller DB-Titel");
    expect(container.textContent).not.toContain("Historischer Titel");
    expect(container.textContent).toContain("Aktuelle DB-Beschreibung");
    expect(container.textContent).toContain("Aktueller DB-Orientierungshinweis");
    expect(container.textContent).toContain("Aktueller DB-Anker 1");
    expect(container.textContent).toContain("Aktueller DB-Anker 2");
    expect(container.textContent).not.toContain("Nicht ausgewählter DB-Anker");
    expect((global.fetch as jest.Mock).mock.calls.some(([input]) =>
      String(input) === "/api/practice-checkpoint-definitions",
    )).toBe(false);
    expect(container.textContent).not.toContain("Noch nicht definiert");

    root.unmount();
  });

  it("zeigt die Umsetzung weiterhin zusätzlich an", async () => {
    const { container, root } = await renderM4({
      ...definition,
      implementation: "Digital dokumentieren",
    });

    expect(container.textContent).toContain("Digital dokumentieren");
    expect(container.textContent).toContain("Aktueller DB-Anker 1");

    root.unmount();
  });

  it("zeigt veraltete Anchor-IDs sichtbar und löst sie nicht über statische Anker auf", async () => {
    const { container, root } = await renderM4({
      ...definition,
      selectedAnchorIds: ["old-static-anchor"],
    });

    expect(container.textContent).toContain("old-static-anchor");
    expect(container.textContent).toContain("nicht automatisch ersetzt");
    expect(container.textContent).not.toContain("Name stimmt überein");

    root.unmount();
  });
});