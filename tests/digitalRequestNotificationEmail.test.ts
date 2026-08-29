/**
 * Tests für lib/mail/sendDigitalRequestNotificationEmail.ts
 *
 * Prüft:
 * - buildNotificationBody: Betreff + Text für beide Varianten
 * - Kein personenbezogener Daten im Body (nur neutrale Texte)
 * - console-Transport: loggt, wirft nicht, gibt "console" zurück
 * - smtp-Transport: ruft sendViaSmtp mit richtiger Config auf
 * - practice-Transport (Priorität): nutzt Practice-Config
 * - practice_only ohne Practice-Config: wirft
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
  buildNotificationBody,
  sendDigitalRequestNotificationEmail,
} from "@/lib/mail/sendDigitalRequestNotificationEmail";

const SMTP_CFG = {
  host: "smtp.example.com",
  port: 587,
  user: "user@example.com",
  pass: "secret",
  from: "noreply@example.com",
  secure: false,
};

const TO = "praxis@example.com";
const PRACTICE_ID = "practice-uuid-1";

// ---------------------------------------------------------------------------
// buildNotificationBody
// ---------------------------------------------------------------------------

describe("buildNotificationBody", () => {
  describe("variant=patient", () => {
    it("hat Betreff 'Neue digitale Anfrage eingegangen'", () => {
      const { subject } = buildNotificationBody("patient");
      expect(subject).toBe("Neue digitale Anfrage eingegangen");
    });

    it("enthält Hinweis auf Patientenpfad im Text", () => {
      const { text } = buildNotificationBody("patient");
      expect(text).toContain("Patientenpfad");
    });

    it("enthält keine personenbezogenen Daten im Text", () => {
      const { text } = buildNotificationBody("patient");
      // Kein Name, keine E-Mail, kein Geburtsdatum, keine Anliegen
      expect(text).not.toMatch(/@/);
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe("variant=office", () => {
    it("hat Betreff 'Neue Bewerbungsanfrage eingegangen'", () => {
      const { subject } = buildNotificationBody("office");
      expect(subject).toBe("Neue Bewerbungsanfrage eingegangen");
    });

    it("enthält Hinweis auf Bewerbungsanfrage im Text", () => {
      const { text } = buildNotificationBody("office");
      expect(text).toContain("Bewerbungsanfrage");
    });

    it("enthält keine personenbezogenen Daten im Text", () => {
      const { text } = buildNotificationBody("office");
      expect(text).not.toMatch(/@/);
    });
  });

  it("patient und office haben unterschiedliche Betreffs", () => {
    const patient = buildNotificationBody("patient");
    const office = buildNotificationBody("office");
    expect(patient.subject).not.toBe(office.subject);
  });
});

// ---------------------------------------------------------------------------
// sendDigitalRequestNotificationEmail – Transporte
// ---------------------------------------------------------------------------

describe("sendDigitalRequestNotificationEmail", () => {
  beforeEach(() => {
    sendViaSmtpMock.mockReset();
    readSmtpConfigFromEnvMock.mockReset();
    loadPracticeSmtpConfigMock.mockReset();
    delete process.env.MAIL_TRANSPORT;
  });

  it("nutzt console-Transport und gibt 'console' zurück", async () => {
    process.env.MAIL_TRANSPORT = "console";
    const spy = jest.spyOn(console, "info").mockImplementation(() => {});
    const result = await sendDigitalRequestNotificationEmail({
      to: TO,
      variant: "patient",
    });
    expect(result).toBe("console");
    spy.mockRestore();
  });

  it("console-Transport loggt NICHT die E-Mail-Adresse des Empfängers", async () => {
    process.env.MAIL_TRANSPORT = "console";
    const loggedArgs: unknown[] = [];
    const spy = jest.spyOn(console, "info").mockImplementation((...args) => {
      loggedArgs.push(...args);
    });
    await sendDigitalRequestNotificationEmail({
      to: TO,
      variant: "patient",
    });
    // Die Empfängeradresse selbst darf nicht geloggt werden
    const logStr = JSON.stringify(loggedArgs);
    expect(logStr).not.toContain(TO);
    spy.mockRestore();
  });

  it("nutzt SMTP-ENV-Transport und gibt 'smtp_env' zurück", async () => {
    process.env.MAIL_TRANSPORT = "smtp";
    readSmtpConfigFromEnvMock.mockReturnValue(SMTP_CFG);
    sendViaSmtpMock.mockResolvedValue(undefined);
    loadPracticeSmtpConfigMock.mockResolvedValue(null);

    const result = await sendDigitalRequestNotificationEmail({
      to: TO,
      variant: "office",
    });
    expect(result).toBe("smtp_env");
    expect(sendViaSmtpMock).toHaveBeenCalledTimes(1);
    const [cfg, msg] = sendViaSmtpMock.mock.calls[0];
    expect(cfg).toEqual(SMTP_CFG);
    expect(msg.to).toBe(TO);
    expect(msg.subject).toBe("Neue Bewerbungsanfrage eingegangen");
  });

  it("nutzt Practice-SMTP wenn practiceId gesetzt und Konfig vorhanden", async () => {
    process.env.MAIL_TRANSPORT = "smtp";
    loadPracticeSmtpConfigMock.mockResolvedValue(SMTP_CFG);
    sendViaSmtpMock.mockResolvedValue(undefined);

    const result = await sendDigitalRequestNotificationEmail({
      to: TO,
      variant: "patient",
      practiceId: PRACTICE_ID,
    });
    expect(result).toBe("practice");
    expect(loadPracticeSmtpConfigMock).toHaveBeenCalledWith(PRACTICE_ID);
    expect(sendViaSmtpMock).toHaveBeenCalledTimes(1);
    // Globaler SMTP soll nicht genutzt werden
    expect(readSmtpConfigFromEnvMock).not.toHaveBeenCalled();
  });

  it("fällt auf ENV-Fallback zurück wenn Practice keine SMTP-Konfig hat", async () => {
    process.env.MAIL_TRANSPORT = "smtp";
    loadPracticeSmtpConfigMock.mockResolvedValue(null);
    readSmtpConfigFromEnvMock.mockReturnValue(SMTP_CFG);
    sendViaSmtpMock.mockResolvedValue(undefined);

    const result = await sendDigitalRequestNotificationEmail({
      to: TO,
      variant: "patient",
      practiceId: PRACTICE_ID,
    });
    expect(result).toBe("smtp_env");
    expect(readSmtpConfigFromEnvMock).toHaveBeenCalled();
  });

  it("wirft bei practice_only ohne Practice-SMTP-Konfig", async () => {
    process.env.MAIL_TRANSPORT = "practice_only";
    loadPracticeSmtpConfigMock.mockResolvedValue(null);

    await expect(
      sendDigitalRequestNotificationEmail({ to: TO, variant: "patient" }),
    ).rejects.toThrow("practice_only");
  });

  it("wirft bei SMTP-Fehler (keine Schluckung im Mail-Layer)", async () => {
    process.env.MAIL_TRANSPORT = "smtp";
    loadPracticeSmtpConfigMock.mockResolvedValue(null);
    readSmtpConfigFromEnvMock.mockReturnValue(SMTP_CFG);
    sendViaSmtpMock.mockRejectedValue(new Error("SMTP connection refused"));

    await expect(
      sendDigitalRequestNotificationEmail({ to: TO, variant: "patient" }),
    ).rejects.toThrow("SMTP connection refused");
  });
});
