/**
 * Tests für lib/mail/sendWebsiteFormConfirmationEmail.ts.
 *
 * Mailfehler dürfen die Session NICHT löschen — diese Datei testet nur den
 * Mail-Layer selbst (Transport-Auswahl + Rendering). Der Submit-Endpoint hat
 * eigene Tests in tests/publicFormSubmitRoute.test.ts.
 */

const sendViaSmtpMock = jest.fn();
const readSmtpConfigFromEnvMock = jest.fn();

jest.mock("@/lib/mail/smtpTransport", () => ({
  __esModule: true,
  sendViaSmtp: (...args: unknown[]) => sendViaSmtpMock(...args),
  readSmtpConfigFromEnv: () => readSmtpConfigFromEnvMock(),
}));

import {
  buildConfirmationEmailBody,
  sendWebsiteFormConfirmationEmail,
} from "@/lib/mail/sendWebsiteFormConfirmationEmail";

describe("buildConfirmationEmailBody", () => {
  it("enthält 48-h-Hinweis und Bestätigungs-URL", () => {
    const body = buildConfirmationEmailBody("https://x.test/p/confirm/abc");
    expect(body.subject).toMatch(/bestätigen/i);
    expect(body.text).toContain("https://x.test/p/confirm/abc");
    expect(body.text).toContain("48");
  });
});

describe("sendWebsiteFormConfirmationEmail (console transport)", () => {
  const ORIG_ENV = process.env.MAIL_TRANSPORT;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    sendViaSmtpMock.mockReset();
    readSmtpConfigFromEnvMock.mockReset();
  });
  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    process.env.MAIL_TRANSPORT = ORIG_ENV;
  });

  it("loggt Empfänger und URL als console.info, wirft nicht", async () => {
    process.env.MAIL_TRANSPORT = "console";
    await expect(
      sendWebsiteFormConfirmationEmail({
        to: "p@example.com",
        confirmationUrl: "https://x.test/p/confirm/abc",
      }),
    ).resolves.toBe("console");

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [, payload] = infoSpy.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        to: "p@example.com",
        confirmationUrl: "https://x.test/p/confirm/abc",
      }),
    );
    expect(sendViaSmtpMock).not.toHaveBeenCalled();
  });

  it("unbekannter MAIL_TRANSPORT → Warnung, fällt auf console zurück", async () => {
    process.env.MAIL_TRANSPORT = "fooBar";
    await sendWebsiteFormConfirmationEmail({
      to: "p@example.com",
      confirmationUrl: "https://x.test/p/confirm/abc",
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(sendViaSmtpMock).not.toHaveBeenCalled();
  });

  it("Default (kein env) verhält sich wie console", async () => {
    delete process.env.MAIL_TRANSPORT;
    await sendWebsiteFormConfirmationEmail({
      to: "p@example.com",
      confirmationUrl: "https://x.test/p/confirm/abc",
    });
    expect(infoSpy).toHaveBeenCalled();
    expect(sendViaSmtpMock).not.toHaveBeenCalled();
  });
});

describe("sendWebsiteFormConfirmationEmail (smtp transport)", () => {
  const ORIG_ENV = process.env.MAIL_TRANSPORT;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.MAIL_TRANSPORT = "smtp";
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    sendViaSmtpMock.mockReset();
    readSmtpConfigFromEnvMock.mockReset();
  });
  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    process.env.MAIL_TRANSPORT = ORIG_ENV;
  });

  it("ruft sendViaSmtp mit aus ENV gelesener Config + gerendertem Body auf", async () => {
    const cfg = {
      host: "smtp.example.com",
      port: 587,
      user: "u",
      pass: "p",
      from: "noreply@example.com",
      secure: false,
    };
    readSmtpConfigFromEnvMock.mockReturnValue(cfg);
    sendViaSmtpMock.mockResolvedValue(undefined);

    await sendWebsiteFormConfirmationEmail({
      to: "patient@example.com",
      confirmationUrl: "https://app.example.com/p/confirm/abc",
    });

    expect(sendViaSmtpMock).toHaveBeenCalledTimes(1);
    const [calledCfg, calledInput] = sendViaSmtpMock.mock.calls[0];
    expect(calledCfg).toBe(cfg);
    expect(calledInput.to).toBe("patient@example.com");
    expect(calledInput.subject).toMatch(/bestätigen/i);
    expect(calledInput.text).toContain(
      "https://app.example.com/p/confirm/abc",
    );

    // Im SMTP-Pfad darf NICHTS in console.info landen (kein Klartext-Leak).
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("wirft, wenn ENV-Konfiguration fehlt — KEIN Fallback auf console", async () => {
    readSmtpConfigFromEnvMock.mockImplementation(() => {
      throw new Error(
        "SMTP misconfigured: missing=[SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASS,SMTP_FROM]",
      );
    });

    await expect(
      sendWebsiteFormConfirmationEmail({
        to: "patient@example.com",
        confirmationUrl: "https://app.example.com/p/confirm/abc",
      }),
    ).rejects.toThrow(/SMTP misconfigured/);

    expect(sendViaSmtpMock).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("propagiert sendViaSmtp-Fehler an den Aufrufer (kein stiller Erfolg)", async () => {
    readSmtpConfigFromEnvMock.mockReturnValue({
      host: "smtp.example.com",
      port: 587,
      user: "u",
      pass: "p",
      from: "noreply@example.com",
      secure: false,
    });
    sendViaSmtpMock.mockRejectedValue(new Error("smtp send failed: nope"));

    await expect(
      sendWebsiteFormConfirmationEmail({
        to: "patient@example.com",
        confirmationUrl: "https://app.example.com/p/confirm/abc",
      }),
    ).rejects.toThrow(/smtp send failed/);

    expect(infoSpy).not.toHaveBeenCalled();
  });
});
