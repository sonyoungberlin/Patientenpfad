/**
 * Tests für lib/mail/sendDigitalRequestRejectionEmail.ts
 *
 * Prüft:
 * - buildDigitalRequestRejectionEmailBody: Betreff, Standardtext, Signatur
 * - Kein AU/Rezept/Überweisung-Wording im Body
 * - Keine Leistungszusage
 * - console-Transport: loggt korrekt, wirft nicht
 * - smtp-Transport: ruft sendViaSmtp mit richtiger Config auf
 * - practice-Transport (Priorität): ruft sendViaSmtp über Practice-Config auf
 * - practice_only ohne Practice-Config: wirft
 * - Fehlerweiterleitung bei SMTP-Fehler
 */

const sendViaSmtpMock = jest.fn();
const readSmtpConfigFromEnvMock = jest.fn();
const loadPracticeSmtpConfigMock = jest.fn();

jest.mock("@/lib/mail/smtpTransport", () => ({
  __esModule: true,
  sendViaSmtp: (...args: unknown[]) => sendViaSmtpMock(...args),
  readSmtpConfigFromEnv: () => readSmtpConfigFromEnvMock(),
}));

jest.mock("@/lib/mail/practiceSmtp", () => ({
  __esModule: true,
  loadPracticeSmtpConfig: (...args: unknown[]) =>
    loadPracticeSmtpConfigMock(...args),
}));

import {
  buildDigitalRequestRejectionEmailBody,
  sendDigitalRequestRejectionEmail,
} from "@/lib/mail/sendDigitalRequestRejectionEmail";

// ---------------------------------------------------------------------------
// Hilfswerte
// ---------------------------------------------------------------------------

const SAMPLE_PRACTICE = "Hausarztpraxis Muster";
const SAMPLE_SIGNATURE = "Dr. med. Muster · Musterstraße 1 · 12345 Berlin";

const SMTP_CFG = {
  host: "smtp.example.com",
  port: 587,
  user: "user@example.com",
  pass: "secret",
  from: "noreply@example.com",
  secure: false,
};

// ---------------------------------------------------------------------------
// buildDigitalRequestRejectionEmailBody
// ---------------------------------------------------------------------------

describe("buildDigitalRequestRejectionEmailBody", () => {
  it("enthält practiceName im Betreff", () => {
    const { subject } = buildDigitalRequestRejectionEmailBody({
      practiceName: SAMPLE_PRACTICE,
    });
    expect(subject).toContain(SAMPLE_PRACTICE);
  });

  it("enthält den Standardtext im Body", () => {
    const { text } = buildDigitalRequestRejectionEmailBody({
      practiceName: SAMPLE_PRACTICE,
    });
    expect(text).toContain("Ihre digitale Anfrage konnte nicht weiter bearbeitet werden");
    expect(text).toContain("Bitte wenden Sie sich mit Ihrem Anliegen direkt an die Praxis");
    expect(text).toContain("Vielen Dank");
  });

  it("enthält Signatur wenn übergeben", () => {
    const { text } = buildDigitalRequestRejectionEmailBody({
      practiceName: SAMPLE_PRACTICE,
      practiceSignature: SAMPLE_SIGNATURE,
    });
    expect(text).toContain(SAMPLE_SIGNATURE);
  });

  it("enthält keine Signatur wenn nicht übergeben", () => {
    const { text } = buildDigitalRequestRejectionEmailBody({
      practiceName: SAMPLE_PRACTICE,
    });
    expect(text).not.toContain("Dr. med.");
  });

  it("enthält keine Signatur wenn Signatur nur Whitespace ist", () => {
    const { text } = buildDigitalRequestRejectionEmailBody({
      practiceName: SAMPLE_PRACTICE,
      practiceSignature: "   ",
    });
    expect(text).not.toContain("Dr. med.");
  });

  it.each([
    ["AU", /\bAU\b/],
    ["Arbeitsunfähigkeit", /Arbeitsunfähigkeit/i],
    ["Rezept", /\bRezept\b/i],
    ["Überweisung", /\bÜberweisung\b/i],
    ["Krankenschein", /Krankenschein/i],
    ["Heilmittelverordnung", /Heilmittelverordnung/i],
  ])("enthält KEIN %s im Body", (_label, pattern) => {
    const { text, subject } = buildDigitalRequestRejectionEmailBody({
      practiceName: SAMPLE_PRACTICE,
    });
    expect(text + subject).not.toMatch(pattern);
  });

  it("enthält keine Leistungszusage", () => {
    const { text } = buildDigitalRequestRejectionEmailBody({
      practiceName: SAMPLE_PRACTICE,
    });
    expect(text).not.toMatch(/garantier|zusag|bewillig/i);
  });
});

// ---------------------------------------------------------------------------
// console-Transport
// ---------------------------------------------------------------------------

describe("sendDigitalRequestRejectionEmail (console transport)", () => {
  const ORIG_ENV = process.env.MAIL_TRANSPORT;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    sendViaSmtpMock.mockReset();
    readSmtpConfigFromEnvMock.mockReset();
    loadPracticeSmtpConfigMock.mockReset();
  });
  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    process.env.MAIL_TRANSPORT = ORIG_ENV;
  });

  it("gibt 'console' zurück und loggt Empfänger", async () => {
    process.env.MAIL_TRANSPORT = "console";
    const result = await sendDigitalRequestRejectionEmail({
      to: "patient@example.com",
      practiceName: SAMPLE_PRACTICE,
    });

    expect(result).toBe("console");
    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [, payload] = infoSpy.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        to: "patient@example.com",
      }),
    );
    expect(sendViaSmtpMock).not.toHaveBeenCalled();
  });

  it("Default (kein env) verhält sich wie console", async () => {
    delete process.env.MAIL_TRANSPORT;
    await expect(
      sendDigitalRequestRejectionEmail({
        to: "patient@example.com",
        practiceName: SAMPLE_PRACTICE,
      }),
    ).resolves.toBe("console");
    expect(infoSpy).toHaveBeenCalled();
  });

  it("unbekannter MAIL_TRANSPORT → Warnung + console-Fallback", async () => {
    process.env.MAIL_TRANSPORT = "unknownXyz";
    await sendDigitalRequestRejectionEmail({
      to: "patient@example.com",
      practiceName: SAMPLE_PRACTICE,
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(sendViaSmtpMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// smtp-Transport
// ---------------------------------------------------------------------------

describe("sendDigitalRequestRejectionEmail (smtp transport)", () => {
  const ORIG_ENV = process.env.MAIL_TRANSPORT;
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.MAIL_TRANSPORT = "smtp";
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    sendViaSmtpMock.mockReset();
    readSmtpConfigFromEnvMock.mockReset();
    loadPracticeSmtpConfigMock.mockReset().mockResolvedValue(null);
  });
  afterEach(() => {
    infoSpy.mockRestore();
    process.env.MAIL_TRANSPORT = ORIG_ENV;
  });

  it("ruft sendViaSmtp mit aus ENV gelesener Config und korrektem Empfänger auf", async () => {
    readSmtpConfigFromEnvMock.mockReturnValue(SMTP_CFG);
    sendViaSmtpMock.mockResolvedValue(undefined);

    const result = await sendDigitalRequestRejectionEmail({
      to: "patient@example.com",
      practiceName: SAMPLE_PRACTICE,
    });

    expect(result).toBe("smtp_env");
    expect(sendViaSmtpMock).toHaveBeenCalledTimes(1);
    const [, mailOpts] = sendViaSmtpMock.mock.calls[0];
    expect(mailOpts.to).toBe("patient@example.com");
    expect(mailOpts.text).toContain("Ihre digitale Anfrage");
  });

  it("gibt SMTP-Fehler an den Aufrufer weiter", async () => {
    readSmtpConfigFromEnvMock.mockReturnValue(SMTP_CFG);
    sendViaSmtpMock.mockRejectedValue(new Error("SMTP connection refused"));

    await expect(
      sendDigitalRequestRejectionEmail({
        to: "patient@example.com",
        practiceName: SAMPLE_PRACTICE,
      }),
    ).rejects.toThrow("SMTP connection refused");
  });
});

// ---------------------------------------------------------------------------
// practice-Transport (Priorität)
// ---------------------------------------------------------------------------

describe("sendDigitalRequestRejectionEmail (practice-first transport)", () => {
  const ORIG_ENV = process.env.MAIL_TRANSPORT;

  beforeEach(() => {
    process.env.MAIL_TRANSPORT = "practice_only";
    sendViaSmtpMock.mockReset();
    loadPracticeSmtpConfigMock.mockReset();
  });
  afterEach(() => {
    process.env.MAIL_TRANSPORT = ORIG_ENV;
  });

  it("verwendet Practice-SMTP wenn vorhanden", async () => {
    loadPracticeSmtpConfigMock.mockResolvedValue(SMTP_CFG);
    sendViaSmtpMock.mockResolvedValue(undefined);

    const result = await sendDigitalRequestRejectionEmail({
      to: "patient@example.com",
      practiceName: SAMPLE_PRACTICE,
      practiceId: "p-1",
    });

    expect(result).toBe("practice");
    expect(loadPracticeSmtpConfigMock).toHaveBeenCalledWith("p-1");
    expect(sendViaSmtpMock).toHaveBeenCalledTimes(1);
    const [cfg, mailOpts] = sendViaSmtpMock.mock.calls[0];
    expect(cfg).toBe(SMTP_CFG);
    expect(mailOpts.to).toBe("patient@example.com");
  });

  it("sendet Signatur in der Mail wenn übergeben", async () => {
    loadPracticeSmtpConfigMock.mockResolvedValue(SMTP_CFG);
    sendViaSmtpMock.mockResolvedValue(undefined);

    await sendDigitalRequestRejectionEmail({
      to: "patient@example.com",
      practiceName: SAMPLE_PRACTICE,
      practiceSignature: SAMPLE_SIGNATURE,
      practiceId: "p-1",
    });

    const [, mailOpts] = sendViaSmtpMock.mock.calls[0];
    expect(mailOpts.text).toContain(SAMPLE_SIGNATURE);
  });

  it("wirft wenn practice_only und keine Practice-SMTP-Konfig", async () => {
    loadPracticeSmtpConfigMock.mockResolvedValue(null);

    await expect(
      sendDigitalRequestRejectionEmail({
        to: "patient@example.com",
        practiceName: SAMPLE_PRACTICE,
        practiceId: "p-1",
      }),
    ).rejects.toThrow("practice_only");
  });

  it("wirft wenn practice_only und kein practiceId übergeben", async () => {
    await expect(
      sendDigitalRequestRejectionEmail({
        to: "patient@example.com",
        practiceName: SAMPLE_PRACTICE,
      }),
    ).rejects.toThrow("practice_only");
  });
});
