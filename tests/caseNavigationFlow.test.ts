import { renderToStaticMarkup } from "react-dom/server";
import {
  buildCaseM2Path,
  buildCaseM3Path,
  getCreateSuccessRedirectPath,
  isGatekeeperResponse,
} from "@/lib/flow/caseNavigation";
import M2Page from "@/app/cases/[id]/m2/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  redirect: jest.fn(),
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
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = { caseSession: { findUnique: jest.Mock } };
const prismaMock = prisma as unknown as PrismaMock;

describe("M1 Startflow Navigation", () => {
  it("erfolgreicher M1-Fall navigiert direkt nach M2", () => {
    expect(getCreateSuccessRedirectPath({ case_id: "case-123" })).toBe(
      "/cases/case-123/m2",
    );
  });

  it("Gatekeeper-Fall navigiert nicht weiter", () => {
    expect(isGatekeeperResponse({ gatekeeper: true })).toBe(true);
    expect(getCreateSuccessRedirectPath({ case_id: undefined })).toBeNull();
  });

  it("ohne case_id erfolgt keine Navigation", () => {
    expect(getCreateSuccessRedirectPath({})).toBeNull();
  });
});

describe("M2 Skip-Option", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
    prismaMock.caseSession.findUnique.mockResolvedValue({
      owner_account_id: "acc-test",
      active_checkpoints: [],
      ctx_prefill: null,
    });
  });

  it("M2-Seite enthält die Skip-Option zur ärztlichen Checkliste", async () => {
    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-123" }) }),
    );
    expect(markup).toContain("data-m2-skip");
    expect(markup).toContain("Vorbereitung überspringen und ärztlich fortfahren");
  });

  it("Skip-Button ist vorhanden; M3-Pfad stimmt", async () => {
    const markup = renderToStaticMarkup(
      await M2Page({ params: Promise.resolve({ id: "case-123" }) }),
    );
    expect(markup).toContain("data-m2-skip");
    expect(buildCaseM3Path("case-123")).toBe("/cases/case-123/m3");
  });

  it("M1-Zielpfad zu M2 bleibt konsistent", () => {
    expect(buildCaseM2Path("case-123")).toBe("/cases/case-123/m2");
  });
});
