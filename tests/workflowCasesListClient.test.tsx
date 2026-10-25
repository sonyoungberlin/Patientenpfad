/** @jest-environment jsdom */

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });

const push = jest.fn();
const refresh = jest.fn();
const originalFetch = globalThis.fetch;
const originalCreateObjectURL = window.URL.createObjectURL;
const originalRevokeObjectURL = window.URL.revokeObjectURL;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import WorkflowCasesListClient from "@/app/workflow-cases/WorkflowCasesListClient";

const workingItem = {
  id: "session-1",
  createdAt: "2026-09-30",
  title: "Krankenhausbrief eingegangen",
  topicTitle: "Krankenhausbrief eingegangen",
  role: null,
  pointCount: 3,
  kind: "practice-case",
  sessionStatus: "In Bearbeitung",
  profileId: "profile-1",
  workingSessionId: "session-1",
  exportRef: { type: "practice-case-session" as const, id: "session-1", profileId: "profile-1" },
};

const publishedItem = {
  ...workingItem,
  sessionStatus: "Veröffentlicht",
  workingSessionId: null,
};

afterEach(() => {
  push.mockReset();
  refresh.mockReset();
  document.body.replaceChildren();
  jest.restoreAllMocks();
  if (originalFetch) Object.defineProperty(globalThis, "fetch", { configurable: true, value: originalFetch });
  else Reflect.deleteProperty(globalThis, "fetch");
  if (originalCreateObjectURL) Object.defineProperty(window.URL, "createObjectURL", { configurable: true, value: originalCreateObjectURL });
  else Reflect.deleteProperty(window.URL, "createObjectURL");
  if (originalRevokeObjectURL) Object.defineProperty(window.URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectURL });
  else Reflect.deleteProperty(window.URL, "revokeObjectURL");
});

describe("WorkflowCasesListClient synchronisiert Server-Props", () => {
  it("entfernt einen nicht mehr gelieferten Working-State-Eintrag", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);

    await act(async () => { root.render(<WorkflowCasesListClient items={[workingItem]} />); });
    expect(container.textContent).toContain("In Bearbeitung");

    await act(async () => { root.render(<WorkflowCasesListClient items={[]} />); });

    expect(container.textContent).not.toContain("In Bearbeitung");
    expect(container.textContent).toContain("Noch keine Sitzungen gespeichert.");
    act(() => root.unmount());
  });

  it("zeigt einen neuen Server-Working-State nach Props-Update", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);

    await act(async () => {
      root.render(<WorkflowCasesListClient items={[]} />);
      root.render(<WorkflowCasesListClient items={[publishedItem]} />);
    });

    expect(container.textContent).toContain("Veröffentlicht");
    expect(container.textContent).toContain("Krankenhausbrief eingegangen");
    act(() => root.unmount());
  });
});

describe("WorkflowCasesListClient PDF-Auswahl", () => {
  const clinicalItem = {
    id: "clinical-1",
    createdAt: "2026-10-20",
    title: "Klinischer Prozess",
    topicTitle: "AU-Musterprozess",
    role: "MFA",
    pointCount: 2,
    kind: "clinical",
    clinicalPointStatuses: ["UNKLAR" as const],
    exportRef: { type: "session" as const, id: "clinical-1", kind: "clinical" as const },
  };

  it("wählt mit Select-all nur sichtbare Zeilen des aktiven Statusfilters aus", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);
    act(() => root.render(<WorkflowCasesListClient items={[workingItem, clinicalItem]} />));

    const statusFilter = container.querySelector("select[multiple]") as HTMLSelectElement;
    const uncertainOption = Array.from(statusFilter.options).find((option) => option.value === "clinical:UNKLAR")!;
    uncertainOption.selected = true;
    act(() => statusFilter.dispatchEvent(new Event("change", { bubbles: true })));
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);

    const selectVisible = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent === "Alle sichtbaren auswählen",
    )!;
    act(() => selectVisible.click());
    expect(container.querySelectorAll('tbody input[type="checkbox"]:checked')).toHaveLength(1);
    expect(container.textContent).toContain("Auswahl als PDF (1)");
    act(() => root.unmount());
  });

  it("sendet nur die Auswahl und den gewählten PDF-Modus an den Server", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);
    act(() => root.render(<WorkflowCasesListClient items={[workingItem, clinicalItem]} />));
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["pdf"]) });
    Object.defineProperty(globalThis, "fetch", { configurable: true, writable: true, value: fetchMock });
    Object.defineProperty(window.URL, "createObjectURL", { configurable: true, value: jest.fn(() => "blob:pdf") });
    Object.defineProperty(window.URL, "revokeObjectURL", { configurable: true, value: jest.fn() });
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    const checkbox = container.querySelector('input[aria-label="Krankenhausbrief eingegangen auswählen"]')! as HTMLInputElement;
    act(() => checkbox.click());
    const detailRadio = Array.from(container.querySelectorAll('input[type="radio"]')).find((radio) =>
      (radio as HTMLInputElement).checked === false && radio.parentElement?.textContent?.includes("Ausführliche Übersicht"),
    ) as HTMLInputElement;
    act(() => detailRadio.click());
    const exportButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.startsWith("Auswahl als PDF"),
    )!;
    await act(async () => { exportButton.click(); });

    expect(fetchMock).toHaveBeenCalledWith("/api/workflow-cases/pdf", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        entries: [{ type: "practice-case-session", id: "session-1", profileId: "profile-1" }],
        mode: "detail",
      }),
    }));
    act(() => root.unmount());
  });

  it("deaktiviert den PDF-Button bei leerer Auswahl", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);
    act(() => root.render(<WorkflowCasesListClient items={[workingItem]} />));
    const exportButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.startsWith("Auswahl als PDF"),
    );
    expect(exportButton?.hasAttribute("disabled")).toBe(true);
    act(() => root.unmount());
  });
});