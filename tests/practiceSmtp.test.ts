/**
 * Tests für lib/mail/practiceSmtp.ts.
 *
 * Sicherungen:
 *   - Vollständige Practice-Konfig → korrekt gemappte SmtpConfig (inkl.
 *     From-Header-Komposition mit/ohne Display-Name).
 *   - Teilkonfig → null (keine Schwindel-Config).
 *   - Decrypt-Fehler → null + anonymer Log-Eintrag, KEIN Klartext im Log.
 *   - Ungültiger Port → null.
 *   - Status-Helper meldet fehlende Felder.
 */

import { randomBytes } from "crypto";

const VALID_KEY = randomBytes(32).toString("base64");
process.env.MAIL_SECRET_KEY = VALID_KEY;

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: { findUnique: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  loadPracticeSmtpConfig,
  mapRowToSmtpConfig,
  describePracticeSmtpStatus,
} from "@/lib/mail/practiceSmtp";
import { encryptSmtpPassword } from "@/lib/mail/smtpSecret";

type PrismaMock = {
  practice: { findUnique: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;

const COMPLETE_PASS = "tenant-pass-PROBE_xyz";

function fullRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "p1",
    smtp_host: "smtp.example.com",
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: "u@example.com",
    smtp_pass_encrypted: encryptSmtpPassword(COMPLETE_PASS),
    smtp_from_email: "noreply@example.com",
    smtp_from_name: "Praxis Beispiel",
    ...over,
  };
}

describe("describePracticeSmtpStatus", () => {
  it("ohne Row: nicht konfiguriert, alle Pflichtfelder fehlen", () => {
    const s = describePracticeSmtpStatus(null);
    expect(s.configured).toBe(false);
    expect(s.passwordSet).toBe(false);
    expect(s.missing).toEqual(
      expect.arrayContaining([
        "smtp_host",
        "smtp_port",
        "smtp_user",
        "smtp_pass_encrypted",
        "smtp_from_email",
      ]),
    );
  });

  it("mit voller Row: konfiguriert, passwordSet=true", () => {
    const s = describePracticeSmtpStatus(fullRow());
    expect(s.configured).toBe(true);
    expect(s.passwordSet).toBe(true);
    expect(s.missing).toEqual([]);
  });

  it("teilweise Konfig (kein Pass): nicht konfiguriert, passwordSet=false", () => {
    const s = describePracticeSmtpStatus(fullRow({ smtp_pass_encrypted: null }));
    expect(s.configured).toBe(false);
    expect(s.passwordSet).toBe(false);
    expect(s.missing).toContain("smtp_pass_encrypted");
  });

  it("ungültiger Port: konfiguriert=false", () => {
    expect(describePracticeSmtpStatus(fullRow({ smtp_port: 0 })).configured).toBe(false);
    expect(describePracticeSmtpStatus(fullRow({ smtp_port: 70000 })).configured).toBe(false);
    expect(describePracticeSmtpStatus(fullRow({ smtp_port: 1.5 })).configured).toBe(false);
  });
});

describe("mapRowToSmtpConfig", () => {
  it("liefert From als Objekt {name,address}, wenn Display-Name vorhanden", () => {
    const cfg = mapRowToSmtpConfig(fullRow(), "p1");
    expect(cfg).not.toBeNull();
    expect(cfg!.from).toEqual({
      name: "Praxis Beispiel",
      address: "noreply@example.com",
    });
    expect(cfg!.host).toBe("smtp.example.com");
    expect(cfg!.port).toBe(587);
    expect(cfg!.secure).toBe(false);
    expect(cfg!.pass).toBe(COMPLETE_PASS);
  });

  it("liefert From als String, wenn kein Display-Name", () => {
    const cfg = mapRowToSmtpConfig(fullRow({ smtp_from_name: null }), "p1");
    expect(cfg!.from).toBe("noreply@example.com");
  });

  it("Teilkonfig → null", () => {
    expect(mapRowToSmtpConfig(fullRow({ smtp_host: null }), "p1")).toBeNull();
    expect(mapRowToSmtpConfig(fullRow({ smtp_user: "" }), "p1")).toBeNull();
  });

  it("Decrypt-Fehler → null + anonymer Log-Eintrag, KEIN Cipher/Klartext", () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const broken = "v1:" + Buffer.alloc(12).toString("base64") +
      ":" + Buffer.alloc(8).toString("base64") +
      ":" + Buffer.alloc(16).toString("base64");
    const cfg = mapRowToSmtpConfig(fullRow({ smtp_pass_encrypted: broken }), "p1");
    expect(cfg).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    const allCalls = JSON.stringify(errSpy.mock.calls);
    expect(allCalls).not.toContain(broken);
    expect(allCalls).not.toContain(COMPLETE_PASS);
    expect(allCalls).toContain("smtp_pass_decrypt_failed");
    expect(allCalls).toContain("p1");
    errSpy.mockRestore();
  });
});

describe("loadPracticeSmtpConfig", () => {
  beforeEach(() => {
    pm.practice.findUnique.mockReset();
    process.env.MAIL_SECRET_KEY = VALID_KEY;
  });

  it("leere/falsche practiceId → null, keine DB-Query", async () => {
    expect(await loadPracticeSmtpConfig("")).toBeNull();
    expect(pm.practice.findUnique).not.toHaveBeenCalled();
  });

  it("ohne MAIL_SECRET_KEY → null, keine DB-Query", async () => {
    delete process.env.MAIL_SECRET_KEY;
    expect(await loadPracticeSmtpConfig("p1")).toBeNull();
    expect(pm.practice.findUnique).not.toHaveBeenCalled();
  });

  it("vollständige Konfig → SmtpConfig", async () => {
    pm.practice.findUnique.mockResolvedValue(fullRow());
    const cfg = await loadPracticeSmtpConfig("p1");
    expect(cfg).not.toBeNull();
    expect(cfg!.host).toBe("smtp.example.com");
    expect(cfg!.pass).toBe(COMPLETE_PASS);
  });

  it("DB-Fehler → null, anonymer Log-Eintrag", async () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    pm.practice.findUnique.mockRejectedValue(new Error("db down"));
    expect(await loadPracticeSmtpConfig("p1")).toBeNull();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
