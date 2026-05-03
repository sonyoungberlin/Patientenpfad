/**
 * Integrations-Tests für den Practice-First-Pfad in
 * sendWebsiteFormConfirmationEmail + smtpTransport.
 *
 * Sicherungen:
 *   - Practice A versendet über SMTP A.
 *   - Practice B versendet über SMTP B.
 *   - Cross-Tenant ausgeschlossen (Cache-Key + auth pro Practice).
 *   - practice_only ohne Practice-Konfig → wirft (mail_failed-Pfad im Aufrufer).
 *   - console-Fallback ohne Practice-Konfig.
 *   - Klartext-Passwort taucht NIRGENDS in Logs auf.
 */

import { randomBytes } from "crypto";

const VALID_KEY = randomBytes(32).toString("base64");
process.env.MAIL_SECRET_KEY = VALID_KEY;

const createTransportMock = jest.fn();
const sendMailMock = jest.fn();

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: (...args: unknown[]) => createTransportMock(...args),
  },
  createTransport: (...args: unknown[]) => createTransportMock(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: { findUnique: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { sendWebsiteFormConfirmationEmail } from "@/lib/mail/sendWebsiteFormConfirmationEmail";
import {
  __resetSmtpTransporterCacheForTests,
} from "@/lib/mail/smtpTransport";
import { encryptSmtpPassword } from "@/lib/mail/smtpSecret";

type PrismaMock = { practice: { findUnique: jest.Mock } };
const pm = prisma as unknown as PrismaMock;

const PASS_A = "PROBE_PASS_TENANT_A_xyz";
const PASS_B = "PROBE_PASS_TENANT_B_xyz";

function rowFor(host: string, pass: string, fromName: string | null) {
  return {
    id: host,
    smtp_host: host,
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: `user@${host}`,
    smtp_pass_encrypted: encryptSmtpPassword(pass),
    smtp_from_email: `noreply@${host}`,
    smtp_from_name: fromName,
  };
}

const ORIG_TRANSPORT = process.env.MAIL_TRANSPORT;

beforeEach(() => {
  __resetSmtpTransporterCacheForTests();
  createTransportMock.mockReset();
  sendMailMock.mockReset();
  createTransportMock.mockImplementation(() => ({
    sendMail: sendMailMock,
    close: jest.fn(),
  }));
  sendMailMock.mockResolvedValue({ accepted: ["x@y.test"] });
  pm.practice.findUnique.mockReset();
  process.env.MAIL_SECRET_KEY = VALID_KEY;
});

afterEach(() => {
  if (ORIG_TRANSPORT === undefined) delete process.env.MAIL_TRANSPORT;
  else process.env.MAIL_TRANSPORT = ORIG_TRANSPORT;
});

describe("Practice-spezifischer Mailversand: Cross-Tenant", () => {
  it("Practice A versendet über SMTP A, Practice B über SMTP B", async () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    process.env.MAIL_TRANSPORT = "practice_only";

    pm.practice.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === "practice-a") return rowFor("a.smtp.test", PASS_A, "Praxis A");
      if (where.id === "practice-b") return rowFor("b.smtp.test", PASS_B, "Praxis B");
      return null;
    });

    const tA = await sendWebsiteFormConfirmationEmail({
      to: "patient@a.test",
      confirmationUrl: "https://x.test/p/confirm/AAA",
      practiceId: "practice-a",
    });
    const tB = await sendWebsiteFormConfirmationEmail({
      to: "patient@b.test",
      confirmationUrl: "https://x.test/p/confirm/BBB",
      practiceId: "practice-b",
    });

    expect(tA).toBe("practice");
    expect(tB).toBe("practice");

    // 2 unterschiedliche Transporter erzeugt.
    expect(createTransportMock).toHaveBeenCalledTimes(2);
    const transportArgs = createTransportMock.mock.calls.map((c) => c[0]);
    const aArg = transportArgs.find((c) => c.host === "a.smtp.test");
    const bArg = transportArgs.find((c) => c.host === "b.smtp.test");
    expect(aArg).toBeDefined();
    expect(bArg).toBeDefined();
    expect(aArg.auth).toEqual({ user: "user@a.smtp.test", pass: PASS_A });
    expect(bArg.auth).toEqual({ user: "user@b.smtp.test", pass: PASS_B });

    // sendMail: erste Call ging über A (from a.smtp.test), zweite über B.
    const sendCalls = sendMailMock.mock.calls;
    expect(sendCalls[0][0].from).toEqual({
      name: "Praxis A",
      address: "noreply@a.smtp.test",
    });
    expect(sendCalls[0][0].to).toBe("patient@a.test");
    expect(sendCalls[1][0].from).toEqual({
      name: "Praxis B",
      address: "noreply@b.smtp.test",
    });
    expect(sendCalls[1][0].to).toBe("patient@b.test");

    // Klartext-Passwörter dürfen nirgends in console.* auftauchen.
    const allLogs = JSON.stringify([
      ...errSpy.mock.calls,
      ...infoSpy.mock.calls,
    ]);
    expect(allLogs).not.toContain(PASS_A);
    expect(allLogs).not.toContain(PASS_B);

    errSpy.mockRestore();
    infoSpy.mockRestore();
  });

  it("practice_only ohne Practice-Konfig → wirft (Aufrufer loggt mail_failed)", async () => {
    process.env.MAIL_TRANSPORT = "practice_only";
    pm.practice.findUnique.mockResolvedValue(null);

    await expect(
      sendWebsiteFormConfirmationEmail({
        to: "p@x.test",
        confirmationUrl: "https://x.test/p/confirm/XXX",
        practiceId: "missing",
      }),
    ).rejects.toThrow(/practice_only/);
    expect(sendMailMock).not.toHaveBeenCalled();
  });

  it("console-Fallback, wenn keine Practice-Konfig + MAIL_TRANSPORT=console", async () => {
    process.env.MAIL_TRANSPORT = "console";
    pm.practice.findUnique.mockResolvedValue(null);
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});

    const t = await sendWebsiteFormConfirmationEmail({
      to: "p@x.test",
      confirmationUrl: "https://x.test/p/confirm/AAA",
      practiceId: "p1",
    });
    expect(t).toBe("console");
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it("ohne practiceId wird nicht in der DB gesucht (kein DB-Roundtrip)", async () => {
    process.env.MAIL_TRANSPORT = "console";
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});

    await sendWebsiteFormConfirmationEmail({
      to: "p@x.test",
      confirmationUrl: "https://x.test/p/confirm/AAA",
    });
    expect(pm.practice.findUnique).not.toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it("Practice-Konfig mit Decrypt-Fehler → fallback gemäß ENV (hier console)", async () => {
    process.env.MAIL_TRANSPORT = "console";
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});

    // Cipher mit falschem Format → Decrypt schlägt fehl.
    pm.practice.findUnique.mockResolvedValue({
      id: "p1",
      smtp_host: "x.smtp.test",
      smtp_port: 587,
      smtp_secure: false,
      smtp_user: "u@x.test",
      smtp_pass_encrypted: "v1:" + Buffer.alloc(12).toString("base64") +
        ":" + Buffer.alloc(8).toString("base64") +
        ":" + Buffer.alloc(16).toString("base64"),
      smtp_from_email: "n@x.test",
      smtp_from_name: null,
    });

    const t = await sendWebsiteFormConfirmationEmail({
      to: "p@x.test",
      confirmationUrl: "https://x.test/p/confirm/AAA",
      practiceId: "p1",
    });
    expect(t).toBe("console");
    expect(errSpy).toHaveBeenCalled();
    expect(sendMailMock).not.toHaveBeenCalled();

    errSpy.mockRestore();
    infoSpy.mockRestore();
  });
});
