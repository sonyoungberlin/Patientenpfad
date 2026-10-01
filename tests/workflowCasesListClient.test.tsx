/** @jest-environment jsdom */

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";

const push = jest.fn();
const refresh = jest.fn();

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
});

describe("WorkflowCasesListClient synchronisiert Server-Props", () => {
  it("entfernt einen nicht mehr gelieferten Working-State-Eintrag", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);

    flushSync(() => root.render(<WorkflowCasesListClient items={[workingItem]} />));
    expect(container.textContent).toContain("In Bearbeitung");

    flushSync(() => root.render(<WorkflowCasesListClient items={[]} />));
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(container.textContent).not.toContain("In Bearbeitung");
    expect(container.textContent).toContain("Noch keine Sitzungen gespeichert.");
    root.unmount();
  });

  it("zeigt einen neuen Server-Working-State nach Props-Update", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root: Root = createRoot(container);

    flushSync(() => root.render(<WorkflowCasesListClient items={[]} />));
    flushSync(() => root.render(<WorkflowCasesListClient items={[publishedItem]} />));
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(container.textContent).toContain("Veröffentlicht");
    expect(container.textContent).toContain("Krankenhausbrief eingegangen");
    root.unmount();
  });
});