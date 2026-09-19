import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/authz", () => ({
  canAccessWorkflowCases: jest.fn(() => true),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workflowSession: { findMany: jest.fn() },
  },
}));

jest.mock("@/app/workflow-cases/WorkflowCasesListClient", () => ({
  __esModule: true,
  default: () => <div data-testid="workflow-list" />,
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
    (getSessionAccountFromCookies as jest.Mock).mockResolvedValue(account);
    (prisma.workflowSession.findMany as jest.Mock).mockResolvedValue([]);
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
});