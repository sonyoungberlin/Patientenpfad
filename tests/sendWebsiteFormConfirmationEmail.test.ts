/**
 * Phase 3d: Tests für lib/mail/sendWebsiteFormConfirmationEmail.ts.
 *
 * Mailfehler dürfen die Session NICHT löschen — siehe Plan-Anpassung 1.
 * Diese Datei testet nur den Mail-Layer selbst (console-Transport).
 */

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
    ).resolves.toBeUndefined();

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const [, payload] = infoSpy.mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        to: "p@example.com",
        confirmationUrl: "https://x.test/p/confirm/abc",
      }),
    );
  });

  it("unbekannter MAIL_TRANSPORT → Warnung, fällt auf console zurück", async () => {
    process.env.MAIL_TRANSPORT = "smtp";
    await sendWebsiteFormConfirmationEmail({
      to: "p@example.com",
      confirmationUrl: "https://x.test/p/confirm/abc",
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
  });

  it("Default (kein env) verhält sich wie console", async () => {
    delete process.env.MAIL_TRANSPORT;
    await sendWebsiteFormConfirmationEmail({
      to: "p@example.com",
      confirmationUrl: "https://x.test/p/confirm/abc",
    });
    expect(infoSpy).toHaveBeenCalled();
  });
});
