import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mockManagerAccess = jest.fn();
const mockRunnerAccess = jest.fn();
const mockListPracticeChains = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/authz", () => ({
  getCurrentPracticeRole: jest.fn(),
  requirePracticeCatalogAccessFromCookies: (...args: unknown[]) => mockManagerAccess(...args),
  requirePracticeChainRunnerAccessFromCookies: (...args: unknown[]) => mockRunnerAccess(...args),
}));

jest.mock("@/lib/practiceChains/service", () => ({
  listPracticeChains: (...args: unknown[]) => mockListPracticeChains(...args),
}));

jest.mock("@/app/practice/chains/ChainCreateForm", () => ({
  __esModule: true,
  default: () => <div>Management: Kette anlegen</div>,
}));

import PracticeChainsPage from "@/app/practice/chains/page";

const managerAccount = { current_practice: { id: "practice-1" } };
const userAccount = { current_practice: { id: "practice-1" } };
const chains = [
  { id: "ready-chain", name: "Freigegebener Ablauf", status: "READY", definition: { steps: [{ id: "step-1" }] } },
  { id: "draft-chain", name: "Interner Entwurf", status: "DRAFT", definition: { steps: [{ id: "step-1" }] } },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockListPracticeChains.mockResolvedValue(chains);
});

describe("Praxisfall-Ketten-Seite nach Rolle", () => {
  it("zeigt USERn nur freigegebene Ketten und konsumorientierte Navigation", async () => {
    mockManagerAccess.mockResolvedValue(null);
    mockRunnerAccess.mockResolvedValue(userAccount);

    const html = renderToStaticMarkup(await PracticeChainsPage());

    expect(html).toContain("Praxisbibliothek");
    expect(html).toContain('href="/practice/library"');
    expect(html).toContain("Nutzen Sie die für Ihre Praxis freigegebenen Ketten");
    expect(html).toContain("Freigegeben");
    expect(html).toContain('href="/practice/chains/ready-chain/run"');
    expect(html).not.toContain("Praxiskatalog");
    expect(html).not.toContain("Management: Kette anlegen");
    expect(html).not.toContain("Entwurf");
    expect(html).not.toContain("draft-chain");
  });

  it.each(["OWNER", "ADMIN"]) ("behält für %s die bestehende Managementansicht", async () => {
    mockManagerAccess.mockResolvedValue(managerAccount);

    const html = renderToStaticMarkup(await PracticeChainsPage());

    expect(html).toContain("Praxiskatalog");
    expect(html).toContain("Management: Kette anlegen");
    expect(html).toContain("Entwürfe dürfen offene Stellen enthalten.");
    expect(html).toContain("Interner Entwurf");
    expect(html).toContain('href="/practice/chains/draft-chain"');
    expect(html).not.toContain("Praxisbibliothek");
  });
});