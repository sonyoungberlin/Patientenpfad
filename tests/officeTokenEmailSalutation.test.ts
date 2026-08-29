/**
 * Tests für buildDigitalRequestTokenEmailBody – Du/Sie-Ansprache
 *
 * Prüft:
 * - Office-Mail mit salutation='sie': Betreff + Inhalt auf Sie-Ansprache
 * - Office-Mail mit salutation='du': Betreff + Inhalt auf Du-Ansprache
 * - Office-Mail ohne salutation (undefined/null): bisheriger Sie-Betreff
 * - Patienten-Mail unverändert (variant nicht "office")
 * - Keine verbotenen Wörter (AU, Rezept, Überweisung) in Office-Varianten
 */

import { buildDigitalRequestTokenEmailBody } from "@/lib/mail/sendDigitalRequestTokenEmail";

const SAMPLE_URL = "https://praxis.example.com/q/token-abc";
const SAMPLE_PRACTICE = "Praxis am Park";

// ---------------------------------------------------------------------------
// Office-Mail – Sie (Default)
// ---------------------------------------------------------------------------

describe("buildDigitalRequestTokenEmailBody – Office + Sie", () => {
  it("Betreff enthält 'vervollständigen Sie Ihre Bewerbung'", () => {
    const { subject } = buildDigitalRequestTokenEmailBody({
      questionnaireUrl: SAMPLE_URL,
      practiceName: SAMPLE_PRACTICE,
      variant: "office",
      salutation: "sie",
    });
    expect(subject).toContain("vervollständigen Sie Ihre Bewerbung");
    expect(subject).toContain(SAMPLE_PRACTICE);
  });

  it("Body enthält 'Ihr Interesse' und 'Sie kennenzulernen'", () => {
    const { text } = buildDigitalRequestTokenEmailBody({
      questionnaireUrl: SAMPLE_URL,
      practiceName: SAMPLE_PRACTICE,
      variant: "office",
      salutation: "sie",
    });
    expect(text).toContain("Ihr Interesse");
    expect(text).toContain("Sie kennenzulernen");
    expect(text).toContain(SAMPLE_URL);
  });

  it("Body enthält NICHT 'dein Interesse' oder 'dich kennenzulernen'", () => {
    const { text } = buildDigitalRequestTokenEmailBody({
      questionnaireUrl: SAMPLE_URL,
      practiceName: SAMPLE_PRACTICE,
      variant: "office",
      salutation: "sie",
    });
    expect(text).not.toMatch(/dein\s+Interesse/i);
    expect(text).not.toMatch(/dich\s+kennenzulernen/i);
  });

  it("ohne explizite salutation (undefined) → Sie-Version", () => {
    const { subject, text } = buildDigitalRequestTokenEmailBody({
      questionnaireUrl: SAMPLE_URL,
      practiceName: SAMPLE_PRACTICE,
      variant: "office",
    });
    expect(subject).toContain("vervollständigen Sie");
    expect(text).toContain("Sie kennenzulernen");
  });
});

// ---------------------------------------------------------------------------
// Office-Mail – Du
// ---------------------------------------------------------------------------

describe("buildDigitalRequestTokenEmailBody – Office + Du", () => {
  it("Betreff enthält 'vervollständige deine Bewerbung'", () => {
    const { subject } = buildDigitalRequestTokenEmailBody({
      questionnaireUrl: SAMPLE_URL,
      practiceName: SAMPLE_PRACTICE,
      variant: "office",
      salutation: "du",
    });
    expect(subject).toContain("vervollständige deine Bewerbung");
    expect(subject).toContain(SAMPLE_PRACTICE);
  });

  it("Body enthält 'dein Interesse' und 'dich kennenzulernen'", () => {
    const { text } = buildDigitalRequestTokenEmailBody({
      questionnaireUrl: SAMPLE_URL,
      practiceName: SAMPLE_PRACTICE,
      variant: "office",
      salutation: "du",
    });
    expect(text).toContain("dein Interesse");
    expect(text).toContain("dich kennenzulernen");
    expect(text).toContain(SAMPLE_URL);
  });

  it("Body enthält NICHT 'Ihr Interesse' oder 'Sie kennenzulernen'", () => {
    const { text } = buildDigitalRequestTokenEmailBody({
      questionnaireUrl: SAMPLE_URL,
      practiceName: SAMPLE_PRACTICE,
      variant: "office",
      salutation: "du",
    });
    expect(text).not.toMatch(/Ihr\s+Interesse/);
    expect(text).not.toMatch(/Sie\s+kennenzulernen/);
  });

  it("Du-Betreff beginnt nicht mit 'Bitte vervollständigen Sie'", () => {
    const { subject } = buildDigitalRequestTokenEmailBody({
      questionnaireUrl: SAMPLE_URL,
      practiceName: SAMPLE_PRACTICE,
      variant: "office",
      salutation: "du",
    });
    expect(subject).not.toContain("vervollständigen Sie");
  });
});

// ---------------------------------------------------------------------------
// Patienten-Mail bleibt unverändert
// ---------------------------------------------------------------------------

describe("buildDigitalRequestTokenEmailBody – Patient (unverändert)", () => {
  it("Patienten-Betreff beginnt mit 'Ihr Fragebogen der Praxis'", () => {
    const { subject } = buildDigitalRequestTokenEmailBody({
      questionnaireUrl: SAMPLE_URL,
      practiceName: SAMPLE_PRACTICE,
    });
    expect(subject).toMatch(/^Ihr Fragebogen der Praxis/);
  });

  it("Patienten-Mail ignoriert salutation='du'", () => {
    const { subject } = buildDigitalRequestTokenEmailBody({
      questionnaireUrl: SAMPLE_URL,
      practiceName: SAMPLE_PRACTICE,
      salutation: "du",
    });
    expect(subject).toMatch(/^Ihr Fragebogen der Praxis/);
    expect(subject).not.toContain("Bewerbung");
  });

  it("Patienten-Mail enthält questionnaire-URL", () => {
    const { text } = buildDigitalRequestTokenEmailBody({
      questionnaireUrl: SAMPLE_URL,
      practiceName: SAMPLE_PRACTICE,
    });
    expect(text).toContain(SAMPLE_URL);
  });
});

// ---------------------------------------------------------------------------
// Keine verbotenen Wörter
// ---------------------------------------------------------------------------

describe("buildDigitalRequestTokenEmailBody – keine verbotenen Wörter", () => {
  it.each(["du", "sie"] as const)(
    "Office-Mail (%s) enthält kein AU/Rezept/Überweisung-Wording",
    (sal) => {
      const { text, subject } = buildDigitalRequestTokenEmailBody({
        questionnaireUrl: SAMPLE_URL,
        practiceName: SAMPLE_PRACTICE,
        variant: "office",
        salutation: sal,
      });
      const combined = text + subject;
      expect(combined).not.toMatch(/\bAU\b/);
      expect(combined).not.toMatch(/Rezept/i);
      expect(combined).not.toMatch(/Überweisung/i);
    },
  );
});
