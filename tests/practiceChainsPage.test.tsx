import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mockManagerAccess = jest.fn();
const mockRunnerAccess = jest.fn();
const mockListPracticeChains = jest.fn();

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
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
import ChainEditor from "@/app/practice/chains/ChainEditor";

const managerAccount = { current_practice: { id: "practice-1" } };
const userAccount = { current_practice: { id: "practice-1" } };
const chains = [
  { id: "ready-chain", name: "Freigegebener Ablauf", status: "READY", definition: { steps: [{ id: "step-1" }] } },
  { id: "draft-chain", name: "Interner Entwurf", status: "DRAFT", definition: { steps: [{ id: "step-1" }] } },
  { id: "inactive-chain", name: "Historischer Ablauf", status: "DEACTIVATED", definition: { steps: [{ id: "step-1" }] } },
];

const readyChain = {
  id: "ready-chain",
  practice_id: "practice-1",
  name: "Freigegebener Ablauf",
  status: "READY" as const,
  version: 1,
  source_chain_id: null,
  definition: { startStepId: "step-1", steps: [{ id: "step-1", catalogEntryId: "entry-1" }], transitions: [] },
  created_at: new Date("2026-09-01"),
  updated_at: new Date("2026-09-01"),
};
const editorProps = {
  chain: readyChain,
  entries: [],
  discovery: { segments: [], attachmentCandidates: [] },
  approvals: { entries: [], connections: [] },
};

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
    expect(html).not.toContain("Historischer Ablauf");
    expect(html).not.toContain("inactive-chain");
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
    expect(html).toContain("Historischer Ablauf");
    expect(html).toContain("Deaktiviert");
    expect(html).not.toContain("Praxisbibliothek");
  });

  it("bietet für READY eine bestätigte Deaktivierungsaktion und hält deaktivierte Details read-only", () => {
    const readyHtml = renderToStaticMarkup(<ChainEditor {...editorProps} />);
    expect(readyHtml).toContain("Deaktivieren");
    expect(readyHtml).toContain("Neue Entwurfsversion erstellen");

    const deactivatedHtml = renderToStaticMarkup(<ChainEditor {...editorProps} chain={{ ...readyChain, status: "DEACTIVATED" }} />);
    expect(deactivatedHtml).toContain("Status: Deaktiviert");
    expect(deactivatedHtml).not.toContain("Deaktivieren</button>");
    expect(deactivatedHtml).not.toContain("Neue Entwurfsversion erstellen");
  });
});