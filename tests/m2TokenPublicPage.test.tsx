import { renderToStaticMarkup } from "react-dom/server";
import M2TokenPage from "@/app/m2-link/[token]/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/components/SelfCheckInQrCode", () => ({
  SelfCheckInQrCode: ({ reference }: { reference: string }) => (
    <div data-self-check-in-qr data-reference={reference} />
  ),
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

  it("rendert persönlichen Link-Hinweis bei gültigem Token", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [],
      m2_token_expires_at: futureDate(14),
    });

    const markup = renderToStaticMarkup(
      await M2TokenPage({ params: Promise.resolve({ token: "valid-token" }) }),
    );

    expect(markup).toContain("Patientenbefragung");
    expect(markup).not.toContain("abgelaufen");
    expect(markup).toContain("data-personal-link-notice");
    expect(markup).toContain("Persönlicher Fragebogenlink");
    expect(markup).not.toContain("Geburtsdatum");
  });

  it("zeigt vor dem Öffnen auch bei aktiviertem Versandflag keinen QR", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [],
      patient_reference: "001234",
      m2_token_expires_at: futureDate(14),
    });

    const withoutFlag = renderToStaticMarkup(
      await M2TokenPage({ params: Promise.resolve({ token: "valid-token" }) }),
    );
    const withFlag = renderToStaticMarkup(
      await M2TokenPage({
        params: Promise.resolve({ token: "valid-token" }),
        searchParams: Promise.resolve({ selfCheckInQr: "1" }),
      }),
    );

    expect(withoutFlag).not.toContain("data-self-check-in-qr");
    expect(withFlag).not.toContain("data-self-check-in-qr");
    expect(withFlag).not.toContain("Self-Check-in");
    expect(withFlag).toContain("data-personal-link-notice");
  });

  it("zeigt trotz Flag keinen QR ohne Zuordnungsreferenz", async () => {
    prismaMock.caseSession.findUnique.mockResolvedValue({
      active_checkpoints: [],
      patient_reference: null,
      m2_token_expires_at: futureDate(14),
    });

    const markup = renderToStaticMarkup(
      await M2TokenPage({
        params: Promise.resolve({ token: "valid-token" }),
        searchParams: Promise.resolve({ selfCheckInQr: "1" }),
      }),
    );

    expect(markup).not.toContain("data-self-check-in-qr");
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

  it("rendert Link-Hinweis wenn Checkpoints vorhanden sind", async () => {
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

    expect(markup).toContain("data-personal-link-notice");
    expect(markup).not.toContain('data-m2-checkpoint="K04"');
  });
});
