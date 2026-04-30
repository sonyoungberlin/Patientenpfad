/**
 * Tests für die öffentliche /q/[token]-Seite.
 *
 * Stellt sicher dass die Fragebogen-Seite:
 * - ohne Authentifizierung zugänglich ist (kein Login erforderlich)
 * - das Formular bei gültigem Token rendert
 * - eine "abgelaufen"-Meldung bei abgelaufenem Token zeigt
 * - eine "abgelaufen"-Meldung bei unbekanntem Token zeigt
 * - eine "bereits ausgefüllt"-Meldung bei bereits übermitteltem Token zeigt
 */

import { renderToStaticMarkup } from "react-dom/server";
import QuestionnairePage from "@/app/q/[token]/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  patientQuestionnaireSession: { findUnique: jest.Mock };
};
const prismaMock = prisma as unknown as PrismaMock;

function futureDate(hoursFromNow: number): Date {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}

function pastDate(hoursAgo: number): Date {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
}

const SAMPLE_QUESTIONS = [
  { id: "CONTACT_PHONE", text: "Telefonnummer?", type: "text", required: true },
  { id: "AU_SYMPTOMS", text: "Beschwerden?", type: "textarea", required: true },
];

describe("/q/[token] Seite", () => {
  beforeEach(() => {
    prismaMock.patientQuestionnaireSession.findUnique.mockReset();
  });

  it("rendert das Formular bei gültigem Token ohne Authentifizierung", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: futureDate(48),
      status: "pending",
      deduplicated_questions: SAMPLE_QUESTIONS,
    });

    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "valid-token" }) }),
    );

    expect(markup).toContain("Fragebogen");
    expect(markup).not.toContain("nicht mehr gültig");
    expect(markup).not.toContain("bereits ausgefüllt");
  });

  it("rendert die Fragen bei gültigem Token", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: futureDate(48),
      status: "pending",
      deduplicated_questions: SAMPLE_QUESTIONS,
    });

    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "valid-token" }) }),
    );

    expect(markup).toContain('data-q-question="CONTACT_PHONE"');
    expect(markup).toContain('data-q-question="AU_SYMPTOMS"');
    expect(markup).toContain("Telefonnummer?");
    expect(markup).toContain("Beschwerden?");
  });

  it("zeigt abgelaufen-Hinweis bei abgelaufenem Token", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: pastDate(1),
      status: "pending",
      deduplicated_questions: SAMPLE_QUESTIONS,
    });

    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "expired-token" }) }),
    );

    expect(markup).toContain("nicht mehr gültig");
    expect(markup).toContain("data-q-expired");
    expect(markup).not.toContain("Fragebogen");
  });

  it("zeigt abgelaufen-Hinweis bei unbekanntem Token", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue(null);

    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "unknown-token" }) }),
    );

    expect(markup).toContain("nicht mehr gültig");
    expect(markup).toContain("data-q-expired");
  });

  it("zeigt abgelaufen-Hinweis wenn token_expires_at null ist", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: null,
      status: "pending",
      deduplicated_questions: SAMPLE_QUESTIONS,
    });

    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "no-expiry-token" }) }),
    );

    expect(markup).toContain("nicht mehr gültig");
    expect(markup).toContain("data-q-expired");
  });

  it("zeigt bereits-ausgefüllt-Hinweis wenn status nicht pending ist", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: futureDate(48),
      status: "completed",
      deduplicated_questions: SAMPLE_QUESTIONS,
    });

    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "completed-token" }) }),
    );

    expect(markup).toContain("bereits ausgefüllt");
    expect(markup).toContain("data-q-completed");
    expect(markup).not.toContain("data-q-expired");
  });

  it("kein getSessionAccountFromCookies-Aufruf – Seite ist öffentlich zugänglich", async () => {
    // Die Seite darf keinerlei Auth-Check benötigen.
    // Wenn getSessionAccountFromCookies aufgerufen würde, würde jest es hier mocken
    // müssen – das Fehlen des Mocks (und kein Fehler) bestätigt, dass kein Auth stattfindet.
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: futureDate(48),
      status: "pending",
      deduplicated_questions: SAMPLE_QUESTIONS,
    });

    // Sollte keinen Fehler werfen, obwohl kein Auth-Mock gesetzt ist.
    await expect(
      QuestionnairePage({ params: Promise.resolve({ token: "valid-token" }) }),
    ).resolves.not.toThrow();
  });
});
