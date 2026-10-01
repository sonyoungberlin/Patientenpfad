/** @jest-environment jsdom */

import React from "react";
import { createRoot, type Root } from "react-dom/client";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
}));

jest.mock("@/lib/practiceProcesses", () => ({
  getCheckpoint: () => ({
    id: "patientenzuordnung-pruefen",
    title: "Patientenzuordnung prüfen",
    description: "Zuordnung prüfen",
    orientationAnchors: [
      { id: "a1", text: "Name stimmt überein" },
      { id: "a2", text: "Geburtsdatum stimmt überein" },
      { id: "a3", text: "Weitere Patientenkennung stimmt überein" },
    ],
  }),
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
    checkpointTitle: "Patientenzuordnung prüfen",
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

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body });
}

async function renderM4(currentDefinition = definition) {
  global.fetch = jest.fn((input: string | URL) => (
    String(input).includes("/protocol/save")
      ? response({ ok: true, snapshot })
      : response({ ok: true, definitions: [currentDefinition] })
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
  it("löst selectedAnchorIds mit aktuellen Anchor-Metadaten auf", async () => {
    const { container, root } = await renderM4();

    expect(container.textContent).toContain("Name stimmt überein");
    expect(container.textContent).toContain("Geburtsdatum stimmt überein");
    expect(container.textContent).not.toContain("Weitere Patientenkennung stimmt überein");
    expect(container.textContent).not.toContain("Noch nicht definiert");

    root.unmount();
  });

  it("zeigt die Umsetzung weiterhin zusätzlich an", async () => {
    const { container, root } = await renderM4({
      ...definition,
      implementation: "Digital dokumentieren",
    });

    expect(container.textContent).toContain("Digital dokumentieren");
    expect(container.textContent).toContain("Name stimmt überein");

    root.unmount();
  });
});