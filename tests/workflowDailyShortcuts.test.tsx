import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mockRole = { value: "OWNER" as "OWNER" | "ADMIN" | "USER" };
const mockListCaseProfiles = jest.fn();
const mockListActiveCatalogEntries = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/authz", () => ({
  canAccessWorkflowCases: jest.fn(() => true),
  getCurrentPracticeRole: jest.fn(() => mockRole.value),
}));

jest.mock("@/lib/practiceProcesses/caseProfileLibrary", () => ({
  listCaseProfilesFromLib: (...args: unknown[]) => mockListCaseProfiles(...args),
}));

jest.mock("@/lib/practiceCatalog/query", () => ({
  listActiveCatalogEntries: (...args: unknown[]) => mockListActiveCatalogEntries(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: { findMany: jest.fn() },
  },
}));

jest.mock("@/app/workflow-cases/WorkflowCasesListClient", () => ({
  __esModule: true,
  default: ({ items }: { items: Array<{ title: string | null }> }) => (
    <div data-testid="workflow-list">{items.map((item) => item.title).join(",")}</div>
  ),
}));

jest.mock("@/app/workflow-cases/new/WorkflowNewClient", () => ({
  __esModule: true,
  default: () => <div data-testid="workflow-new-form" />,
}));

import { getSessionAccountFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WorkflowCasesPage from "@/app/workflow-cases/page";
import WorkflowNewPage from "@/app/workflow-cases/new/page";

const account = {
  id: "account-1",
  is_approved: true,
  arbeitsprozesse_enabled: true,
};

describe("Workflowpfad ohne doppelte Alltags-Shortcuts", () => {
  beforeEach(() => {
    mockRole.value = "OWNER";
    (getSessionAccountFromCookies as jest.Mock).mockResolvedValue(account);
    (prisma.workflowSession.findMany as jest.Mock).mockResolvedValue([]);
    mockListCaseProfiles.mockResolvedValue([]);
    mockListActiveCatalogEntries.mockResolvedValue([]);
  });

  it("entfernt den Shortcut für Neue Sitzung, behält die Arbeitsprozessliste", async () => {
    const html = renderToStaticMarkup(await WorkflowCasesPage());

    expect(html).toContain("Arbeitsprozesse");
    expect(html).not.toContain("Neue Sitzung starten");
    expect(html).toContain("Noch keine Sitzungen gespeichert.");
  });

  it("entfernt den Shortcut für Praxisprozesse, behält den fachlichen Startinhalt", async () => {
    const html = renderToStaticMarkup(await WorkflowNewPage());

    expect(html).toContain("Neue Sitzung starten");
    expect(html).toContain('data-testid="workflow-new-form"');
    expect(html).not.toContain("Praxisprozesse bearbeiten");
  });

  it("zeigt USER weiterhin normale Musterprozesse, aber keine Praxisfall-Working-States", async () => {
    mockRole.value = "USER";
    (getSessionAccountFromCookies as jest.Mock).mockResolvedValue({
      ...account,
      current_practice: { id: "practice-1" },
      memberships: [{ practice_id: "practice-1", role: "USER" }],
    });
    mockListCaseProfiles.mockResolvedValue([{
      id: "profile-1",
      title: "Praxisfall nur für die Verwaltung",
      description: null,
      checkpointRefs: [],
    }]);
    (prisma.workflowSession.findMany as jest.Mock).mockResolvedValue([
      {
        id: "practice-session",
        createdAt: new Date("2026-09-30"),
        updatedAt: new Date("2026-10-01"),
        title: "Praxisfall-Entwurf",
        process_snapshot: {
          processKind: "practice-workflow",
          snapshotVersion: 2,
          caseProfileId: "profile-1",
          caseProfileTitle: "Praxisfall nur für die Verwaltung",
          checkpoints: [],
        },
        case_profile_id: "profile-1",
        owner_practice_id: "practice-1",
      },
      {
        id: "workflow-session",
        createdAt: new Date("2026-09-30"),
        updatedAt: new Date("2026-10-01"),
        title: "Musterprozess-Sitzung",
        process_snapshot: {},
        case_profile_id: null,
        owner_practice_id: null,
      },
    ]);

    const html = renderToStaticMarkup(await WorkflowCasesPage());

    expect(html).toContain("Musterprozess-Sitzung");
    expect(html).not.toContain("Praxisfall nur für die Verwaltung");
    expect(html).not.toContain("Praxisfall-Entwurf");
    expect(html).not.toContain("Weiterbearbeiten");
    expect(html).not.toContain("Verwerfen");
  });
});