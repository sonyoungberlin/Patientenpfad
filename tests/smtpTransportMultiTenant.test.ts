/**
 * Tests für lib/mail/smtpTransport.ts: Multi-Tenant-Transporter-Cache.
 *
 * Pflicht-Anforderung: KEIN globaler Single-Transporter mehr — pro
 * eindeutiger Konfig genau ein Transporter, separat pro Practice.
 */

const createTransportMock = jest.fn();
const sendMailMock = jest.fn();
const closeMock = jest.fn();

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: (...args: unknown[]) => createTransportMock(...args),
  },
  createTransport: (...args: unknown[]) => createTransportMock(...args),
}));

import {
  sendViaSmtp,
  transporterCacheKey,
  __resetSmtpTransporterCacheForTests,
  __smtpTransporterCacheSizeForTests,
  type SmtpConfig,
} from "@/lib/mail/smtpTransport";

function makeCfg(over: Partial<SmtpConfig> = {}): SmtpConfig {
  return {
    host: "smtp.example.com",
    port: 587,
    user: "u@example.com",
    pass: "PASS_DO_NOT_LOG",
    from: "noreply@example.com",
    secure: false,
    ...over,
  };
}

beforeEach(() => {
  __resetSmtpTransporterCacheForTests();
  createTransportMock.mockReset();
  sendMailMock.mockReset();
  closeMock.mockReset();
  createTransportMock.mockImplementation(() => ({
    sendMail: sendMailMock,
    close: closeMock,
  }));
  sendMailMock.mockResolvedValue({ accepted: ["x@y.test"] });
});

describe("transporterCacheKey", () => {
  it("enthält das Passwort NICHT", () => {
    const key = transporterCacheKey(makeCfg());
    expect(key).not.toContain("PASS_DO_NOT_LOG");
  });

  it("unterscheidet sich für unterschiedliche Hosts/Ports/User/From/Secure", () => {
    const a = transporterCacheKey(makeCfg());
    expect(a).not.toBe(transporterCacheKey(makeCfg({ host: "other.test" })));
    expect(a).not.toBe(transporterCacheKey(makeCfg({ port: 465 })));
    expect(a).not.toBe(transporterCacheKey(makeCfg({ user: "v@example.com" })));
    expect(a).not.toBe(transporterCacheKey(makeCfg({ from: "x@example.com" })));
    expect(a).not.toBe(transporterCacheKey(makeCfg({ secure: true })));
  });

  it("identischer Cache-Key, wenn nur das Passwort sich unterscheidet", () => {
    expect(transporterCacheKey(makeCfg({ pass: "a" }))).toBe(
      transporterCacheKey(makeCfg({ pass: "b" })),
    );
  });
});

describe("Multi-Tenant Transporter-Cache", () => {
  it("erzeugt PRO eindeutiger Konfig genau einen Transporter", async () => {
    const a = makeCfg({ host: "tenant-a.smtp.test", user: "a@a.test" });
    const b = makeCfg({ host: "tenant-b.smtp.test", user: "b@b.test" });

    await sendViaSmtp(a, { to: "x@y.test", subject: "s", text: "t" });
    await sendViaSmtp(a, { to: "x@y.test", subject: "s", text: "t" });
    await sendViaSmtp(b, { to: "x@y.test", subject: "s", text: "t" });
    await sendViaSmtp(b, { to: "x@y.test", subject: "s", text: "t" });

    // 2 unterschiedliche Configs → 2 createTransport-Aufrufe.
    expect(createTransportMock).toHaveBeenCalledTimes(2);
    expect(__smtpTransporterCacheSizeForTests()).toBe(2);
    // Aber 4 Mails verschickt.
    expect(sendMailMock).toHaveBeenCalledTimes(4);
  });

  it("hält Practice A und Practice B strikt getrennt (kein Cross-Tenant)", async () => {
    const a = makeCfg({
      host: "a.smtp.test",
      user: "a@a.test",
      pass: "PASS_A",
      from: "a@a.test",
    });
    const b = makeCfg({
      host: "b.smtp.test",
      user: "b@b.test",
      pass: "PASS_B",
      from: "b@b.test",
    });
    await sendViaSmtp(a, { to: "x@y.test", subject: "s", text: "t" });
    await sendViaSmtp(b, { to: "x@y.test", subject: "s", text: "t" });

    const calls = createTransportMock.mock.calls;
    expect(calls[0][0].host).toBe("a.smtp.test");
    expect(calls[0][0].auth).toEqual({ user: "a@a.test", pass: "PASS_A" });
    expect(calls[1][0].host).toBe("b.smtp.test");
    expect(calls[1][0].auth).toEqual({ user: "b@b.test", pass: "PASS_B" });

    // sendMail-Aufrufe verwenden den jeweils richtigen Transporter — also
    // implizit den aus der korrekten createTransport-Antwort.
    const sendCalls = sendMailMock.mock.calls;
    expect(sendCalls[0][0].from).toBe("a@a.test");
    expect(sendCalls[1][0].from).toBe("b@b.test");
  });

  it("Übertragungs-Fehler propagiert, ohne Adresse/Body zu leaken", async () => {
    sendMailMock.mockRejectedValue(new Error("connection refused"));
    await expect(
      sendViaSmtp(makeCfg(), {
        to: "secret@user.test",
        subject: "s",
        text: "URL_https://x.test/p/confirm/abc",
      }),
    ).rejects.toThrow(/smtp send failed/);
    // Der propagierte Error darf weder Adresse noch URL enthalten.
    try {
      await sendViaSmtp(makeCfg(), {
        to: "secret@user.test",
        subject: "s",
        text: "URL_https://x.test/p/confirm/abc",
      });
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).not.toContain("secret@user.test");
      expect(msg).not.toContain("https://x.test/p/confirm/abc");
    }
  });
});
