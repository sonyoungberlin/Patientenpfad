import { renderToStaticMarkup } from "react-dom/server";
import M2TokenPage from "@/app/m2-link/[token]/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
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

function futureDate(daysFromNow: number): Date {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}

function pastDate(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

describe("/m2-link/[token] Seite", () => {
  beforeEach(() => {
    prismaMock.caseSession.findUnique.mockReset();
  });

  it("rendert das Formular bei gültigem Token", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [],
      m2_token_expires_at: futureDate(14),
    });

    const markup = renderToStaticMarkup(
      await M2TokenPage({ params: Promise.resolve({ token: "valid-token" }) }),
    );

    expect(markup).toContain("Patientenbefragung");
    expect(markup).not.toContain("abgelaufen");
  });

  it("zeigt Abgelaufen-Hinweis bei abgelaufenem Token", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [],
      m2_token_expires_at: pastDate(1),
    });

    const markup = renderToStaticMarkup(
      await M2TokenPage({ params: Promise.resolve({ token: "expired-token" }) }),
    );

    expect(markup).toContain("abgelaufen");
    expect(markup).toContain("data-m2-expired");
    expect(markup).not.toContain("Patientenbefragung");
  });

  it("zeigt Abgelaufen-Hinweis bei unbekanntem Token", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue(null);

    const markup = renderToStaticMarkup(
      await M2TokenPage({ params: Promise.resolve({ token: "unknown-token" }) }),
    );

    expect(markup).toContain("abgelaufen");
    expect(markup).toContain("data-m2-expired");
    expect(markup).not.toContain("Patientenbefragung");
  });

  it("zeigt Abgelaufen-Hinweis wenn m2_token_expires_at null ist", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [],
      m2_token_expires_at: null,
    });

    const markup = renderToStaticMarkup(
      await M2TokenPage({ params: Promise.resolve({ token: "no-expiry-token" }) }),
    );

    expect(markup).toContain("abgelaufen");
    expect(markup).toContain("data-m2-expired");
  });

  it("rendert M2-Checkpoints wenn Checkpoints vorhanden sind", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [
        {
          id: "K04",
          block_id: "medizinische_lage",
          title: "Medikation",
          category: "M",
          status: "TO_DO",
          type: "VERIFIKATION",
          perspectives: ["MFA", "PATIENT"],
          m4: { type: "ACTION", text: "M4" },
        },
      ],
      m2_token_expires_at: futureDate(14),
    });

    const markup = renderToStaticMarkup(
      await M2TokenPage({ params: Promise.resolve({ token: "valid-token" }) }),
    );

    expect(markup).toContain('data-m2-checkpoint="K04"');
    expect(markup).toContain(
      "Haben Sie einen aktuellen Medikamentenplan oder eine Übersicht?",
    );
  });
});
