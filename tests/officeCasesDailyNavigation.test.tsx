import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/lib/authz", () => ({
  requireOfficeCasesManagementAccessFromCookies: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { officeCaseSession: { findMany: jest.fn() } },
}));
jest.mock("@/app/office-cases/OfficeCasesClient", () => ({
  __esModule: true,
  default: () => <div data-testid="office-case-list" />,
}));

import { requireOfficeCasesManagementAccessFromCookies } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import OfficeCasesPage from "@/app/office-cases/page";

describe("Officefall-Liste ohne redundanten Erstellungs-Shortcut", () => {
  it("behält die Liste, entfernt aber den Inhalts-Shortcut", async () => {
    (requireOfficeCasesManagementAccessFromCookies as jest.Mock).mockResolvedValue({
      id: "account-1",
      current_practice: { id: "practice-1" },
    });
    (prisma.officeCaseSession.findMany as jest.Mock).mockResolvedValue([]);

    const html = renderToStaticMarkup(await OfficeCasesPage());

    expect(html).toContain("Officefälle");
    expect(html).toContain('data-testid="office-case-list"');
    expect(html).not.toContain("Neuen Officefall erstellen");
  });
});