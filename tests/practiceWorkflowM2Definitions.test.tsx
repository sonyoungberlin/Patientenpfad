/** @jest-environment jsdom */

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const replace = jest.fn();
const push = jest.fn();
const saveDraft = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
}));

jest.mock("@/app/workflow-cases/internal-protocol/draft/_saveDraft", () => ({
  savePracticeWorkflowDraft: (...args: unknown[]) => saveDraft(...args),
}));

import DraftM2Client from "@/app/workflow-cases/internal-protocol/draft/m2/DraftM2Client";

const snapshot = {
  processKind: "practice-workflow",
  snapshotVersion: 2,
  caseProfileId: "profile-1",
  caseProfileTitle: "Praxisfall",
  checkpoints: [{ checkpointId: "patient-bekannt", checkpointTitle: "Patient bekannt" }],
};

function response(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body });
}

const existingDefinition = {
  id: "definition-1",
  practiceId: "practice-1",
  checkpointId: "patient-bekannt",
  selectedAnchorIds: ["identity"],
  implementation: "Bestehende Umsetzung",
  updatedAt: "2026-09-30T10:00:00.000Z",
};

const builderCheckpoint = {
  checkpointId: "patient-bekannt",
  title: "Aktueller DB-Titel",
  description: "Aktuelle DB-Beschreibung",
  orientationHint: "Aktueller DB-Orientierungshinweis",
  orientationAnchors: [{ id: "identity", text: "Aktueller DB-Anker" }],
  definition: null as null | Pick<typeof existingDefinition, "selectedAnchorIds" | "implementation">,
};

const anchorOnlyDefinition = { ...existingDefinition, implementation: "" };
const textOnlyDefinition = { ...existingDefinition, selectedAnchorIds: [], implementation: "Nur zusätzliche Umsetzung" };
const emptyDefinition = { ...existingDefinition, selectedAnchorIds: [], implementation: "" };

async function renderM2(definition: typeof existingDefinition | null = null, builderOverrides = {}) {
  const checkpoint = {
    ...builderCheckpoint,
    ...builderOverrides,
    definition: definition
      ? { selectedAnchorIds: definition.selectedAnchorIds, implementation: definition.implementation }
      : null,
  };
  global.fetch = jest.fn((input: string | URL | Request, init?: RequestInit) => {
    if (String(input).includes("/protocol/save")) {
      const draftSnapshot = {
        ...snapshot,
        checkpoints: snapshot.checkpoints.map((item) => ({ ...item, checkpointId: checkpoint.checkpointId })),
      };
      return response({ ok: true, snapshot: draftSnapshot, builderCheckpoints: [checkpoint] }) as never;
    }
    if (init?.method === "PUT") {
      const body = JSON.parse(String(init.body)) as { selectedAnchorIds: string[]; implementation: string };
      return response({
        ok: true,
        definition: { ...body, checkpointId: "patient-bekannt" },
      }) as never;
    }
    return response({ ok: true }) as never;
  });
  saveDraft.mockResolvedValue({ ok: true, id: "session-1" });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  window.history.replaceState({}, "", "/workflow-cases/internal-protocol/draft/m2?sessionId=session-1");
  flushSync(() => root.render(<DraftM2Client />));
  await new Promise((resolve) => setTimeout(resolve, 100));
  return { container, root };
}

function getDefinitionButton(container: HTMLElement) {
  return [...container.querySelectorAll("button")]
    .find((button) => button.textContent === "Definition übernehmen" || button.textContent === "Definition ändern") as HTMLButtonElement;
}

function getPutRequest() {
  return (global.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === "PUT") as [string, RequestInit] | undefined;
}

async function clickDefinitionButton(container: HTMLElement) {
  getDefinitionButton(container).click();
  await new Promise((resolve) => setTimeout(resolve, 25));
}

afterEach(() => {
  replace.mockReset();
  push.mockReset();
  saveDraft.mockReset();
  delete (globalThis as { fetch?: unknown }).fetch;
  document.body.replaceChildren();
  jest.restoreAllMocks();
});

describe("M2 zentrale Checkpoint-Definitionen", () => {
  it("zeigt bei fehlender Definition Übernehmen und deaktiviert es ohne Inhalt", async () => {
    const { container, root } = await renderM2();

    expect(container.textContent).toContain("Praxisstandard: Noch nicht definiert");
    const definitionButton = getDefinitionButton(container);
    expect(definitionButton.textContent).toBe("Definition übernehmen");
    expect(definitionButton.disabled).toBe(true);

    root.unmount();
  });

  it("lädt eine bestehende Definition und zeigt Definition ändern", async () => {
    const { container, root } = await renderM2(existingDefinition);

    expect(container.textContent).toContain("Praxisstandard: Definiert");
    expect(container.textContent).toContain(existingDefinition.implementation);
    expect(container.textContent).toContain("Definition ändern");
    expect(container.textContent).not.toContain("Definition übernehmen");

    root.unmount();
  });

  it("zeigt DB-only Metadaten vollständig aus der Builder-Projektion", async () => {
    const { container, root } = await renderM2(null, {
      checkpointId: "checkpoint-db-only",
      title: "DB-only Titel",
      description: "DB-only Beschreibung",
      orientationHint: "DB-only Orientierungshinweis",
      orientationAnchors: [{ id: "db-anchor", text: "DB-only Ankertext" }],
    });

    expect(container.textContent).toContain("DB-only Titel");
    expect(container.textContent).toContain("DB-only Beschreibung");
    expect(container.textContent).toContain("DB-only Orientierungshinweis");
    expect(container.textContent).toContain("DB-only Ankertext");
    expect((global.fetch as jest.Mock).mock.calls.some(([input]) =>
      String(input) === "/api/practice-checkpoint-definitions",
    )).toBe(false);

    root.unmount();
  });

  it("zeigt ausgewählte IDs nur gegen die aktuelle Ankerliste und markiert veraltete IDs", async () => {
    const { container, root } = await renderM2({
      ...existingDefinition,
      selectedAnchorIds: ["identity", "old-static-anchor"],
    }, {
      orientationAnchors: [{ id: "identity", text: "DB-Anker statt statischem Text" }],
    });

    expect(container.textContent).toContain("DB-Anker statt statischem Text");
    expect(container.textContent).toContain("old-static-anchor");
    expect(container.textContent).toContain("Sie werden nicht auf statische Anker abgebildet.");
    expect(container.textContent).not.toContain("Identität geprüft");

    root.unmount();
  });

  it("ändert eine bestehende Definition auf Anchor-only", async () => {
    const { container, root } = await renderM2(anchorOnlyDefinition);
    await clickDefinitionButton(container);

    const request = getPutRequest();
    expect(JSON.parse(String(request?.[1].body))).toEqual({ selectedAnchorIds: ["identity"], implementation: "" });
    expect((global.fetch as jest.Mock).mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1);
    root.unmount();
  });

  it("ändert eine bestehende Definition auf Text-only", async () => {
    const { container, root } = await renderM2(textOnlyDefinition);
    await clickDefinitionButton(container);

    const request = getPutRequest();
    expect(JSON.parse(String(request?.[1].body))).toEqual({
      selectedAnchorIds: [],
      implementation: "Nur zusätzliche Umsetzung",
    });
    root.unmount();
  });

  it("weist eine bestehende Definition beim vollständigen Leeren zurück", async () => {
    const { container, root } = await renderM2(emptyDefinition);

    const definitionButton = getDefinitionButton(container);
    expect(definitionButton.disabled).toBe(true);
    expect(getPutRequest()).toBeUndefined();
    expect(container.textContent).toContain("Praxisstandard: Definiert");
    root.unmount();
  });

  it("speichert beim allgemeinen Zwischenspeichern keine unfertige Definition", async () => {
    const { container, root } = await renderM2();
    const saveButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent === "Zwischenspeichern") as HTMLButtonElement;
    saveButton.click();

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(push).toHaveBeenCalledWith("/workflow-cases/internal-protocol/new?sessionId=session-1");
    root.unmount();
  });

  it("speichert eine geladene Definition beim Zwischenspeichern nur im Working State", async () => {
    const { container, root } = await renderM2(existingDefinition);

    const saveButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent === "Zwischenspeichern") as HTMLButtonElement;
    saveButton.click();

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(getPutRequest()).toBeUndefined();
    root.unmount();
  });
});