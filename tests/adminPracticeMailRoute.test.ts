/**
 * Tests für POST /api/admin/practices/[id]/mail.
 *
 * Sicherungen:
 *   - Nicht-Admin → 401/403, kein DB-Zugriff.
 *   - save: Pflichtfelder, Port-Range, E-Mail-Format.
 *   - save mit Passwort verschlüsselt → DB-Wert ≠ Klartext, decryptbar.
 *   - save ohne Passwort + bestehender Cipher → unverändert übernommen.
 *   - save ohne Passwort + ohne Cipher → Fehler.
 *   - delete → alle SMTP-Felder null gesetzt.
 *   - Klartext-Passwort taucht NIRGENDS in Logs/Antworten auf.
 */

import { NextRequest } from "next/server";
import { randomBytes } from "crypto";

const VALID_KEY = randomBytes(32).toString("base64");
process.env.MAIL_SECRET_KEY = VALID_KEY;

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn(),
  getSessionAccountFromCookies: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { POST } from "@/app/api/admin/practices/[id]/mail/route";
import { decryptSmtpPassword } from "@/lib/mail/smtpSecret";

type PrismaMock = {
  practice: { update: jest.Mock; findUnique: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const getSessionAccountMock = getSessionAccount as jest.Mock;

function adminAccount() {
  return {
    id: "acc-admin",
    email: "admin@example.com",
    is_approved: true,
    is_admin: true,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: false,
    website_forms_enabled: false,
    current_practice: null,
    memberships: [],
  };
}

function formReq(id: string, fields: Record<string, string>) {
  const body = new URLSearchParams(fields).toString();
  return new NextRequest(`http://localhost/api/admin/practices/${id}/mail`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

beforeEach(() => {
  pm.practice.update.mockReset();
  pm.practice.findUnique.mockReset();
  getSessionAccountMock.mockReset();
  process.env.MAIL_SECRET_KEY = VALID_KEY;
});

describe("POST /api/admin/practices/[id]/mail", () => {
  it("blockt Nicht-Admin (kein Account)", async () => {
    getSessionAccountMock.mockResolvedValue(null);
    const res = await POST(formReq("p1", { action: "delete" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(401);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("blockt Nicht-Admin (eingeloggt, aber kein is_admin)", async () => {
    getSessionAccountMock.mockResolvedValue({ ...adminAccount(), is_admin: false });
    const res = await POST(formReq("p1", { action: "delete" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(403);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("save: Pflichtfelder werden geprüft", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    const res = await POST(formReq("p1", { action: "save" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/mailError=/);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("save: Port außerhalb Range wird abgelehnt", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    const res = await POST(
      formReq("p1", {
        action: "save",
        smtp_host: "smtp.example.com",
        smtp_port: "70000",
        smtp_user: "u@e.test",
        smtp_from_email: "n@e.test",
        smtp_pass: "PROBE_PW",
      }),
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/mailError=/);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("save: ungültige From-E-Mail wird abgelehnt", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    const res = await POST(
      formReq("p1", {
        action: "save",
        smtp_host: "smtp.example.com",
        smtp_port: "587",
        smtp_user: "u@e.test",
        smtp_from_email: "not-an-email",
        smtp_pass: "PROBE_PW",
      }),
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/mailError=/);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("save: vollständig + Passwort → schreibt verschlüsselt, kein Klartext in DB", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.practice.update.mockResolvedValue({});
    const PW = "PROBE_PW_xyz_123";
    const res = await POST(
      formReq("p1", {
        action: "save",
        smtp_host: "smtp.example.com",
        smtp_port: "587",
        smtp_user: "u@e.test",
        smtp_from_email: "n@e.test",
        smtp_from_name: "Praxis Test",
        smtp_secure: "true",
        smtp_pass: PW,
      }),
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/mailSaved=1/);
    expect(pm.practice.update).toHaveBeenCalledTimes(1);
    const data = pm.practice.update.mock.calls[0][0].data;
    expect(data.smtp_host).toBe("smtp.example.com");
    expect(data.smtp_port).toBe(587);
    expect(data.smtp_secure).toBe(true);
    expect(data.smtp_user).toBe("u@e.test");
    expect(data.smtp_from_email).toBe("n@e.test");
    expect(data.smtp_from_name).toBe("Praxis Test");
    expect(data.smtp_pass_encrypted).toBeDefined();
    // Klartext-Passwort darf NICHT als Klartext im persistierten Feld sein.
    expect(data.smtp_pass_encrypted).not.toBe(PW);
    expect(data.smtp_pass_encrypted).not.toContain(PW);
    // Aber decryptbar zum Original.
    expect(decryptSmtpPassword(data.smtp_pass_encrypted as string)).toBe(PW);
    // smtp_updated_at gesetzt.
    expect(data.smtp_updated_at).toBeInstanceOf(Date);
  });

  it("save: leeres Passwort + bestehender Cipher → nicht überschrieben", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.practice.findUnique.mockResolvedValue({
      smtp_pass_encrypted: "v1:existing-cipher",
    });
    pm.practice.update.mockResolvedValue({});
    const res = await POST(
      formReq("p1", {
        action: "save",
        smtp_host: "smtp.example.com",
        smtp_port: "587",
        smtp_user: "u@e.test",
        smtp_from_email: "n@e.test",
        // kein smtp_pass
      }),
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/mailSaved=1/);
    const data = pm.practice.update.mock.calls[0][0].data;
    expect("smtp_pass_encrypted" in data).toBe(false);
  });

  it("save: leeres Passwort + KEIN bestehender Cipher → Fehler, kein Update", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.practice.findUnique.mockResolvedValue({ smtp_pass_encrypted: null });
    const res = await POST(
      formReq("p1", {
        action: "save",
        smtp_host: "smtp.example.com",
        smtp_port: "587",
        smtp_user: "u@e.test",
        smtp_from_email: "n@e.test",
      }),
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/mailError=/);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("delete: setzt alle SMTP-Felder auf null", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.practice.update.mockResolvedValue({});
    const res = await POST(formReq("p1", { action: "delete" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/mailDeleted=1/);
    const data = pm.practice.update.mock.calls[0][0].data;
    expect(data.smtp_host).toBeNull();
    expect(data.smtp_port).toBeNull();
    expect(data.smtp_secure).toBeNull();
    expect(data.smtp_user).toBeNull();
    expect(data.smtp_pass_encrypted).toBeNull();
    expect(data.smtp_from_email).toBeNull();
    expect(data.smtp_from_name).toBeNull();
  });

  it("save: Klartext-Passwort taucht NICHT in Logs auf", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    pm.practice.update.mockRejectedValue(new Error("DB down"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const PW = "LEAK_CANDIDATE_pw_QQQ";
    await POST(
      formReq("p1", {
        action: "save",
        smtp_host: "smtp.example.com",
        smtp_port: "587",
        smtp_user: "u@e.test",
        smtp_from_email: "n@e.test",
        smtp_pass: PW,
      }),
      { params: Promise.resolve({ id: "p1" }) },
    );
    const allLogs = JSON.stringify(errSpy.mock.calls);
    expect(allLogs).not.toContain(PW);
    errSpy.mockRestore();
  });

  it("save: ohne MAIL_SECRET_KEY und gesetztem Passwort → Fehler", async () => {
    delete process.env.MAIL_SECRET_KEY;
    getSessionAccountMock.mockResolvedValue(adminAccount());
    const res = await POST(
      formReq("p1", {
        action: "save",
        smtp_host: "smtp.example.com",
        smtp_port: "587",
        smtp_user: "u@e.test",
        smtp_from_email: "n@e.test",
        smtp_pass: "x",
      }),
      { params: Promise.resolve({ id: "p1" }) },
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/mailError=/);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });

  it("ungültige Aktion → Fehler-Redirect", async () => {
    getSessionAccountMock.mockResolvedValue(adminAccount());
    const res = await POST(formReq("p1", { action: "weird" }), {
      params: Promise.resolve({ id: "p1" }),
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toMatch(/mailError=/);
    expect(pm.practice.update).not.toHaveBeenCalled();
  });
});
