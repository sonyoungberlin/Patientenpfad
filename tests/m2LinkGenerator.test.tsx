import { renderToStaticMarkup } from "react-dom/server";
import M3Page from "@/app/cases/[id]/m3/page";

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

describe("M3-Seite – M2-Link-Generator", () => {
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
      await M3Page({ params: Promise.resolve({ id: "case-1" }) }),
    );

    expect(markup).toContain("data-generate-m2-link");
    expect(markup).toContain("M2-Link erzeugen");
  });

  it("zeigt die M2-Link-Generator-Sektion", async () => {
    const markup = renderToStaticMarkup(
      await M3Page({ params: Promise.resolve({ id: "case-1" }) }),
    );

    expect(markup).toContain("data-m2-link-generator");
    expect(markup).toContain("M2-Link für Patient");
  });
});
