/**
 * Tests für lib/mail/smtpTransport.ts.
 *
 * Sicherungen:
 *   - readSmtpConfigFromEnv liefert validierte Config bei vollständigen ENV.
 *   - Fehlende Pflichtvariablen → SmtpConfigError mit Liste der Schlüssel
 *     (NICHT der Werte).
 *   - Ungültiger Port → SmtpConfigError mit invalid=["SMTP_PORT"].
 *   - SMTP_SECURE Default false; "true"/"1"/"yes" → true.
 *   - sendViaSmtp ruft nodemailer.sendMail mit From/To/Subject/Text auf.
 *   - Transporter wird pro Konfig nur einmal gebaut (Caching).
 *   - sendViaSmtp-Fehler enthält keine Empfängeradresse / kein Passwort.
 */

const sendMailMock = jest.fn();
const createTransportMock = jest.fn(() => ({ sendMail: sendMailMock }));

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: { createTransport: createTransportMock },
  createTransport: createTransportMock,
}));

import {
  SmtpConfigError,
  __resetSmtpTransporterCacheForTests,
  readSmtpConfigFromEnv,
  sendViaSmtp,
  type SmtpConfig,
} from "@/lib/mail/smtpTransport";

const FULL_ENV = {
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "user@example.com",
  SMTP_PASS: "s3cr3t",
  SMTP_FROM: "Praxis <noreply@example.com>",
} as unknown as NodeJS.ProcessEnv;

describe("readSmtpConfigFromEnv", () => {
  it("liefert validierte Config bei vollständigen ENV (Default secure=false)", () => {
    const cfg = readSmtpConfigFromEnv({ ...FULL_ENV });
    expect(cfg).toEqual({
      host: "smtp.example.com",
      port: 587,
      user: "user@example.com",
      pass: "s3cr3t",
      from: "Praxis <noreply@example.com>",
      secure: false,
    });
  });

  it.each(["true", "1", "yes", "TRUE"])(
    "SMTP_SECURE=%s → secure=true",
    (val) => {
      const cfg = readSmtpConfigFromEnv({ ...FULL_ENV, SMTP_SECURE: val });
      expect(cfg.secure).toBe(true);
    },
  );

  it.each(["false", "0", "", undefined])(
    "SMTP_SECURE=%s → secure=false",
    (val) => {
      const env = { ...FULL_ENV } as NodeJS.ProcessEnv;
      if (val === undefined) delete env.SMTP_SECURE;
      else env.SMTP_SECURE = val;
      expect(readSmtpConfigFromEnv(env).secure).toBe(false);
    },
  );

  it("wirft SmtpConfigError mit allen fehlenden Schlüsseln, ohne Werte zu leaken", () => {
    expect.assertions(5);
    try {
      readSmtpConfigFromEnv({ SMTP_HOST: "smtp.example.com" } as unknown as NodeJS.ProcessEnv);
    } catch (err) {
      expect(err).toBeInstanceOf(SmtpConfigError);
      const e = err as SmtpConfigError;
      expect(e.missing).toEqual([
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASS",
        "SMTP_FROM",
      ]);
      expect(e.invalid).toEqual([]);
      // Werte dürfen NICHT in der Message landen.
      expect(e.message).not.toMatch(/smtp\.example\.com/);
      expect(e.message).toContain("SMTP_PORT");
    }
  });

  it("behandelt leere/whitespace-Werte als fehlend", () => {
    expect(() =>
      readSmtpConfigFromEnv({ ...FULL_ENV, SMTP_HOST: "   " }),
    ).toThrow(SmtpConfigError);
  });

  it.each(["abc", "0", "-1", "65536", "12.5"])(
    "wirft bei ungültigem SMTP_PORT=%s",
    (port) => {
      expect.assertions(3);
      try {
        readSmtpConfigFromEnv({ ...FULL_ENV, SMTP_PORT: port });
      } catch (err) {
        expect(err).toBeInstanceOf(SmtpConfigError);
        const e = err as SmtpConfigError;
        expect(e.invalid).toEqual(["SMTP_PORT"]);
        // Wert selbst nicht in Message.
        expect(e.message).not.toContain(port.trim());
      }
    },
  );
});

describe("sendViaSmtp", () => {
  beforeEach(() => {
    sendMailMock.mockReset();
    createTransportMock.mockClear();
    createTransportMock.mockImplementation(() => ({ sendMail: sendMailMock }));
    __resetSmtpTransporterCacheForTests();
  });

  const cfg: SmtpConfig = {
    host: "smtp.example.com",
    port: 587,
    user: "user@example.com",
    pass: "s3cr3t",
    from: "Praxis <noreply@example.com>",
    secure: false,
  };

  it("ruft nodemailer.createTransport mit Auth + Timeouts und sendMail mit Mail-Daten", async () => {
    sendMailMock.mockResolvedValue({ messageId: "x" });

    await sendViaSmtp(cfg, {
      to: "patient@example.com",
      subject: "Bitte bestätigen",
      text: "https://app.example.com/p/confirm/abc",
    });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: { user: "user@example.com", pass: "s3cr3t" },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith({
      from: "Praxis <noreply@example.com>",
      to: "patient@example.com",
      subject: "Bitte bestätigen",
      text: "https://app.example.com/p/confirm/abc",
    });
  });

  it("cached Transporter pro Konfig (zweiter Aufruf baut keinen neuen)", async () => {
    sendMailMock.mockResolvedValue({ messageId: "x" });

    await sendViaSmtp(cfg, { to: "a@x.test", subject: "s", text: "t" });
    await sendViaSmtp(cfg, { to: "b@x.test", subject: "s", text: "t" });

    expect(createTransportMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledTimes(2);
  });

  it("baut neuen Transporter bei geänderter Config", async () => {
    sendMailMock.mockResolvedValue({ messageId: "x" });
    await sendViaSmtp(cfg, { to: "a@x.test", subject: "s", text: "t" });
    await sendViaSmtp(
      { ...cfg, host: "other.example.com" },
      { to: "a@x.test", subject: "s", text: "t" },
    );
    expect(createTransportMock).toHaveBeenCalledTimes(2);
  });

  it("wirft bei sendMail-Fehler ohne Empfänger / Passwort in der Message", async () => {
    sendMailMock.mockRejectedValue(new Error("ECONNREFUSED upstream"));

    await expect(
      sendViaSmtp(cfg, {
        to: "patient@example.com",
        subject: "s",
        text: "t",
      }),
    ).rejects.toThrow(/smtp send failed/);

    try {
      await sendViaSmtp(cfg, {
        to: "patient@example.com",
        subject: "s",
        text: "t",
      });
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain("patient@example.com");
      expect(msg).not.toContain("s3cr3t");
    }
  });
});
