import { renderToStaticMarkup } from "react-dom/server";
import M2Page from "@/app/cases/[id]/m2/page";
import { buildMessageText } from "@/app/cases/[id]/m2/M2LinkGeneratorClient";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
  useRouter: jest.fn().mockReturnValue({ push: jest.fn() }),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn().mockResolvedValue({
    id: "acc-test",
    email: "test@example.com",
    is_approved: true,
  }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    caseSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  caseSession: { findUnique: jest.Mock; update: jest.Mock };
};
const prismaMock = prisma as unknown as PrismaMock;

describe("M2-Seite – M2-Link-Generator", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [],
      ctx_prefill: null,
    });
  });

  it("zeigt den M2-Link-erzeugen-Button", async () => {
    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-1" }) }),
    );

    expect(markup).toContain("data-generate-m2-link");
    expect(markup).toContain("Fragebogen-Link für Patient erzeugen");
  });

  it("zeigt die M2-Link-Generator-Sektion", async () => {
    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-1" }) }),
    );

    expect(markup).toContain("data-m2-link-generator");
  });
});

describe("buildMessageText", () => {
  const EXAMPLE_LINK = "https://example.com/m2-link/abc-123";

  it("enthält den generierten Link im Nachrichtentext", () => {
    const result = buildMessageText(EXAMPLE_LINK, "");
    expect(result).toContain(EXAMPLE_LINK);
  });

  it("enthält die Intro-Zeile", () => {
    const result = buildMessageText(EXAMPLE_LINK, "");
    expect(result).toContain("Liebe Patientin, lieber Patient");
  });

  it("fügt die Signatur an wenn vorhanden", () => {
    const sig = "Mit freundlichen Grüßen\nIhre Praxis";
    const result = buildMessageText(EXAMPLE_LINK, sig);
    expect(result).toContain(sig);
  });

  it("lässt die Signatur weg wenn leer", () => {
    const result = buildMessageText(EXAMPLE_LINK, "");
    const lines = result.split("\n");
    // last meaningful content should be the link, not an empty signature block
    expect(result.trimEnd()).toMatch(new RegExp(EXAMPLE_LINK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
  });

  it("lässt die Signatur weg wenn nur Whitespace", () => {
    const result = buildMessageText(EXAMPLE_LINK, "   ");
    expect(result.trimEnd()).toMatch(new RegExp(EXAMPLE_LINK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
  });
});
