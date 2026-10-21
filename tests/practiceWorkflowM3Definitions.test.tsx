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

const builderCheckpoint = {
  checkpointId: "patient-bekannt",
  title: "Aktueller DB-Titel",
  description: "Aktuelle DB-Beschreibung",
  orientationHint: "Aktueller DB-Orientierungshinweis",
  orientationAnchors: [{ id: "identity", text: "Aktueller DB-Anker" }],
};

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body });
}

async function renderM3(currentDefinition: typeof definition | null, builderOverrides = {}) {
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
  global.fetch = jest.fn((input: string | URL | Request) => {
    if (String(input).includes("/protocol/save")) {
      const draftSnapshot = {
        ...snapshot,
        checkpoints: snapshot.checkpoints.map((item) => ({ ...item, checkpointId: checkpoint.checkpointId })),
      };
      return response({ ok: true, snapshot: draftSnapshot, builderCheckpoints: [checkpoint] }) as never;
    }
    return response({ ok: true }) as never;
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

describe("M3 verwendet die aktuelle Builder-Projektion", () => {
  it("zeigt die vorhandene zentrale Definition statt 'Noch nicht definiert'", async () => {
    const { container, root } = await renderM3(definition);

    expect(container.textContent).toContain("Aktueller Praxisstandard");
    expect(container.textContent).toContain("Aktueller DB-Titel");
    expect(container.textContent).toContain("Aktuelle DB-Beschreibung");
    expect(container.textContent).toContain("Aktueller DB-Orientierungshinweis");
    expect(container.textContent).toContain("Aktueller DB-Anker");
    expect(container.textContent).toContain(definition.implementation);
    expect(container.textContent).not.toContain("Noch nicht definiert.");
    expect((global.fetch as jest.Mock).mock.calls.some(([input]) =>
      String(input) === "/api/practice-checkpoint-definitions",
    )).toBe(false);

    root.unmount();
  });

  it("zeigt 'Noch nicht definiert', wenn keine zentrale Definition existiert", async () => {
    const { container, root } = await renderM3(null);

    expect(container.textContent).toContain("Aktueller Praxisstandard");
    expect(container.textContent).toContain("Noch nicht definiert.");

    root.unmount();
  });

  it("behandelt eine Anchor-only-Definition als definierten Praxisstandard", async () => {
    const { container, root } = await renderM3({
      ...definition,
      selectedAnchorIds: ["identity"],
      implementation: "",
    });

    expect(container.textContent).toContain("Aktueller DB-Anker");
    expect(container.textContent).toContain("Nur ausgewählte Kriterien");
    expect(container.textContent).not.toContain("Noch nicht definiert.");

    root.unmount();
  });

  it("markiert veraltete Anchor-IDs statt einen statischen Anchor zuzuordnen", async () => {
    const { container, root } = await renderM3({
      ...definition,
      selectedAnchorIds: ["old-static-anchor"],
    });

    expect(container.textContent).toContain("old-static-anchor");
    expect(container.textContent).toContain("nicht durch statische Anker ersetzt");
    expect(container.textContent).not.toContain("Identität geprüft");

    root.unmount();
  });
});
