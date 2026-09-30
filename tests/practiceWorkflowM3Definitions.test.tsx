/** @jest-environment jsdom */

import React from "react";
import { createRoot, type Root } from "react-dom/client";

const replace = jest.fn();
const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
}));

jest.mock("@/lib/workflow/internalProtocol/sessionStatus", () => ({
  allDecided: () => false,
}));

jest.mock("@/lib/workflow/internalProtocol/workflowSnapshotUpdater", () => ({
  setCheckpointDecision: (snapshot: unknown) => snapshot,
}));

jest.mock("@/lib/practiceProcesses", () => ({
  getCheckpoint: () => ({
    id: "patient-bekannt",
    title: "Patient bekannt",
    description: "Bekannter Patient",
    orientationAnchors: [{ id: "identity", text: "Identität geprüft" }],
  }),
}));

jest.mock("@/app/workflow-cases/internal-protocol/draft/_saveDraft", () => ({
  savePracticeWorkflowDraft: jest.fn(),
}));

import DraftM3Client from "@/app/workflow-cases/internal-protocol/draft/m3/DraftM3Client";

const snapshot = {
  processKind: "practice-workflow",
  snapshotVersion: 2,
  caseProfileId: "profile-1",
  caseProfileTitle: "Praxisfall",
  checkpoints: [{ checkpointId: "patient-bekannt", checkpointTitle: "Patient bekannt" }],
};

const definition = {
  id: "definition-1",
  practiceId: "practice-1",
  checkpointId: "patient-bekannt",
  selectedAnchorIds: ["identity"],
  implementation: "Patientenstammdaten und Identität vor dem Termin prüfen.",
  updatedAt: "2026-09-30T10:00:00.000Z",
};

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body });
}

async function renderM3(definitions: unknown[]) {
  global.fetch = jest.fn((input: string | URL | Request) => {
    if (String(input).includes("/protocol/save")) {
      return response({ ok: true, snapshot }) as never;
    }
    return response({ ok: true, definitions }) as never;
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  window.history.replaceState({}, "", "/workflow-cases/internal-protocol/draft/m3?sessionId=session-1");

  root.render(<DraftM3Client />);
  await new Promise((resolve) => setTimeout(resolve, 50));

  return { container, root };
}

afterEach(() => {
  replace.mockReset();
  push.mockReset();
  delete (globalThis as { fetch?: unknown }).fetch;
  document.body.replaceChildren();
  jest.restoreAllMocks();
});

describe("M3 löst aktuelle PracticeCheckpointDefinition live auf", () => {
  it("zeigt die vorhandene zentrale Definition statt 'Noch nicht definiert'", async () => {
    const { container, root } = await renderM3([definition]);

    expect(container.textContent).toContain("Aktueller Praxisstandard");
    expect(container.textContent).toContain(definition.implementation);
    expect(container.textContent).not.toContain("Noch nicht definiert.");

    root.unmount();
  });

  it("zeigt 'Noch nicht definiert', wenn keine zentrale Definition existiert", async () => {
    const { container, root } = await renderM3([]);

    expect(container.textContent).toContain("Aktueller Praxisstandard");
    expect(container.textContent).toContain("Noch nicht definiert.");

    root.unmount();
  });
});
