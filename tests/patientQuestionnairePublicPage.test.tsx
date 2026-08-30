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
      owner_practice: null,
    });

    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "valid-token" }) }),
    );

    expect(markup).toContain("Fragebogen");
    expect(markup).not.toContain("nicht mehr gültig");
    expect(markup).not.toContain("bereits ausgefüllt");
    // Patienten-Einleitungstext oberhalb der Fragen
    expect(markup).toContain("data-patient-intro");
    expect(markup).toContain(
      "Bitte füllen Sie die folgenden Angaben vollständig aus. Vielen Dank für Ihre Unterstützung.",
    );
    // Ohne Practice keine Signatur
    expect(markup).not.toContain("data-practice-signature");
  });

  it("rendert die Praxis-Signatur unverändert zwischen Überschrift und Formular, wenn vorhanden", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: futureDate(48),
      status: "pending",
      deduplicated_questions: SAMPLE_QUESTIONS,
      owner_practice: {
        message_signature:
          "Mit freundlichen Grüßen\nDr. Muster\nPraxis am Park",
      },
    });

    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "valid-token" }) }),
    );

    expect(markup).toContain("data-practice-signature");
    expect(markup).toContain("Mit freundlichen Grüßen");
    expect(markup).toContain("Dr. Muster");
    expect(markup).toContain("Praxis am Park");
    expect(markup).toContain("white-space:pre-wrap");
  });

  it("zeigt ausschließlich die über die Token-Session zugeordnete Praxis im Footer", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: futureDate(48),
      status: "pending",
      deduplicated_questions: SAMPLE_QUESTIONS,
      owner_practice: {
        id: "practice-a",
        slug: "technical-a",
        public_slug: "praxis-a",
        name: "Intern A",
        public_name: "Praxis A",
        is_approved: true,
        message_signature: null,
        legal_profile: {
          official_practice_name: "Hausarztpraxis A",
          street: "A-Straße",
          house_number: "1",
          postal_code: "11111",
          city: "A-Stadt",
          country: "Deutschland",
          official_email: "a@example.test",
          phone: "030 111",
          official_imprint_url: "https://praxis-a.example/impressum",
          official_privacy_url: "https://praxis-a.example/datenschutz",
        },
      },
    });

    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "token-for-a" }) }),
    );
    expect(markup).toContain('data-public-practice-footer="practice-a"');
    expect(markup).toContain("Hausarztpraxis A");
    expect(markup).toContain("https://praxis-a.example/impressum");
    expect(markup).not.toContain("Praxis B");
  });

  it("Session-select fragt owner_practice.message_signature mit ab", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: futureDate(48),
      status: "pending",
      deduplicated_questions: SAMPLE_QUESTIONS,
      owner_practice: null,
    });

    await QuestionnairePage({ params: Promise.resolve({ token: "valid-token" }) });

    const call = prismaMock.patientQuestionnaireSession.findUnique.mock.calls[0][0];
    expect(call.select.owner_practice.select).toEqual(
      expect.objectContaining({
        id: true,
        message_signature: true,
        legal_profile: true,
      }),
    );
  });

  it("zeigt persönlichen Link-Hinweis bei gültigem Token statt direkter Fragen", async () => {
    prismaMock.patientQuestionnaireSession.findUnique.mockResolvedValue({
      token_expires_at: futureDate(48),
      status: "pending",
      deduplicated_questions: SAMPLE_QUESTIONS,
    });

    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "valid-token" }) }),
    );

    expect(markup).toContain("data-personal-link-notice");
    expect(markup).toContain("Persönlicher Fragebogenlink");
    expect(markup).not.toContain("Geburtsdatum");
    // Fragen sind initial hinter dem Gate versteckt
    expect(markup).not.toContain('data-q-question="CONTACT_PHONE"');
    expect(markup).not.toContain('data-q-question="AU_SYMPTOMS"');
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
    // Bei abgelaufenem Token darf weder Intro noch Praxis-Signatur erscheinen.
    expect(markup).not.toContain("data-patient-intro");
    expect(markup).not.toContain("data-practice-signature");
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
      owner_practice: {
        message_signature: "Mit freundlichen Grüßen\nDr. Muster",
      },
    });

    const markup = renderToStaticMarkup(
      await QuestionnairePage({ params: Promise.resolve({ token: "completed-token" }) }),
    );

    expect(markup).toContain("bereits ausgefüllt");
    expect(markup).toContain("data-q-completed");
    expect(markup).not.toContain("data-q-expired");
    // Bei completed darf weder Intro noch Praxis-Signatur erscheinen –
    // unabhängig davon ob die Praxis eine Signatur hinterlegt hat.
    expect(markup).not.toContain("data-patient-intro");
    expect(markup).not.toContain("data-practice-signature");
    expect(markup).not.toContain("Bitte füllen Sie die folgenden Angaben");
    expect(markup).not.toContain("Mit freundlichen Grüßen");
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
