/**
 * Tests für den „Passwort setzen per Link"-Flow.
 *
 * Gemockt:
 *   - @/lib/prisma   (account.findUnique / account.update)
 *   - @/lib/mail/sendPasswordSetupEmail (kein echter Mail-Versand)
 */

import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/mail/sendPasswordSetupEmail", () => ({
  sendPasswordSetupEmail: jest.fn().mockResolvedValue("console"),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccount: jest.fn().mockResolvedValue(null),
}));

import { prisma } from "@/lib/prisma";
import { sendPasswordSetupEmail } from "@/lib/mail/sendPasswordSetupEmail";
import { getSessionAccount } from "@/lib/auth";
import { POST as requestHandler } from "@/app/api/auth/request-password-setup/route";
import { POST as setPasswordHandler } from "@/app/api/auth/set-password/route";
import { verifyPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

type PrismaMock = {
  account: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};
const pm = prisma as unknown as PrismaMock;
const mailMock = sendPasswordSetupEmail as jest.Mock;
const sessionMock = getSessionAccount as jest.Mock;

function asAdmin() {
  sessionMock.mockResolvedValue({
    id: "admin-1",
    email: "admin@example.com",
    is_admin: true,
    is_approved: true,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: false,
    website_forms_enabled: false,
    current_practice: null,
    memberships: [],
  });
}

function asNonAdmin() {
  sessionMock.mockResolvedValue({
    id: "user-1",
    email: "user@example.com",
    is_admin: false,
    is_approved: true,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: false,
    website_forms_enabled: false,
    current_practice: null,
    memberships: [],
  });
}

function jsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: kein Session-Cookie / nicht-Admin-Caller (Public-Verhalten).
  sessionMock.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// POST /api/auth/request-password-setup
// ---------------------------------------------------------------------------

describe("POST /api/auth/request-password-setup", () => {
  it("antwortet 200 ok auch wenn Account nicht existiert (keine Enumeration)", async () => {
    pm.account.findUnique.mockResolvedValue(null);

    const res = await requestHandler(
      jsonRequest("http://localhost/api/auth/request-password-setup", {
        email: "unknown@example.com",
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(pm.account.update).not.toHaveBeenCalled();
    expect(mailMock).not.toHaveBeenCalled();
  });

  it("antwortet 200 ok auch bei ungültiger E-Mail (keine Enumeration)", async () => {
    const res = await requestHandler(
      jsonRequest("http://localhost/api/auth/request-password-setup", {
        email: "kein-at-zeichen",
      }),
    );

    expect(res.status).toBe(200);
    expect(pm.account.findUnique).not.toHaveBeenCalled();
    expect(pm.account.update).not.toHaveBeenCalled();
    expect(mailMock).not.toHaveBeenCalled();
  });

  it("erzeugt Token + Expiry und versendet Mail wenn Account existiert", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "user@example.com",
    });
    pm.account.update.mockResolvedValue({});

    const before = Date.now();
    const res = await requestHandler(
      jsonRequest("http://localhost/api/auth/request-password-setup", {
        email: "user@example.com",
      }),
    );
    const after = Date.now();

    expect(res.status).toBe(200);

    expect(pm.account.update).toHaveBeenCalledTimes(1);
    const updateArgs = pm.account.update.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: "acc-1" });
    const data = updateArgs.data as {
      password_reset_token: string;
      password_reset_expires: Date;
    };
    // 32 Byte hex → 64 Zeichen
    expect(data.password_reset_token).toMatch(/^[0-9a-f]{64}$/);
    // Expiry-Fenster: zwischen "before+1h" und "after+1h"
    const ttlMs = 60 * 60 * 1000;
    expect(data.password_reset_expires.getTime()).toBeGreaterThanOrEqual(
      before + ttlMs - 1,
    );
    expect(data.password_reset_expires.getTime()).toBeLessThanOrEqual(
      after + ttlMs + 1,
    );

    expect(mailMock).toHaveBeenCalledTimes(1);
    const mailArg = mailMock.mock.calls[0][0];
    expect(mailArg.to).toBe("user@example.com");
    expect(mailArg.setupUrl).toContain("/account/set-password?token=");
    expect(mailArg.setupUrl).toContain(data.password_reset_token);
  });

  it("liefert 200 ok auch wenn Mail-Versand fehlschlägt (kein Leak)", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "user@example.com",
    });
    pm.account.update.mockResolvedValue({});
    mailMock.mockRejectedValueOnce(new Error("smtp boom"));

    const res = await requestHandler(
      jsonRequest("http://localhost/api/auth/request-password-setup", {
        email: "user@example.com",
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // Nicht-Admin-Caller: Antwort enthält weder delivery noch setupUrl.
    expect(json.delivery).toBeUndefined();
    expect(json.setupUrl).toBeUndefined();
    // Token wurde trotzdem persistiert; nächster Aufruf überschreibt ihn.
    expect(pm.account.update).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Admin-Fallback (MAIL_TRANSPORT=practice_only)
  // -------------------------------------------------------------------------

  it("Admin: Mailfehler (z. B. practice_only) → delivery 'manual' inkl. setupUrl", async () => {
    asAdmin();
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "user@example.com",
    });
    pm.account.update.mockResolvedValue({});
    mailMock.mockRejectedValueOnce(
      new Error(
        "MAIL_TRANSPORT=practice_only: Account-Passwort-Setup-Mail nicht möglich.",
      ),
    );

    const res = await requestHandler(
      jsonRequest("http://localhost/api/auth/request-password-setup", {
        email: "user@example.com",
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.delivery).toBe("manual");
    expect(typeof json.setupUrl).toBe("string");
    expect(json.setupUrl).toContain("/account/set-password?token=");

    // Token aus der DB muss in der setupUrl auftauchen — keine Eigen-Generierung
    // im UI / per Magic-String.
    const updateArgs = pm.account.update.mock.calls[0][0];
    const data = updateArgs.data as { password_reset_token: string };
    expect(json.setupUrl).toContain(data.password_reset_token);
  });

  it("Admin: erfolgreicher Mailversand → delivery 'email' ohne setupUrl", async () => {
    asAdmin();
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "user@example.com",
    });
    pm.account.update.mockResolvedValue({});

    const res = await requestHandler(
      jsonRequest("http://localhost/api/auth/request-password-setup", {
        email: "user@example.com",
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, delivery: "email" });
    expect(json.setupUrl).toBeUndefined();
  });

  it("Admin: nicht existierender Account → delivery 'none', kein DB-Write, kein setupUrl", async () => {
    asAdmin();
    pm.account.findUnique.mockResolvedValue(null);

    const res = await requestHandler(
      jsonRequest("http://localhost/api/auth/request-password-setup", {
        email: "ghost@example.com",
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, delivery: "none" });
    expect(json.setupUrl).toBeUndefined();
    expect(pm.account.update).not.toHaveBeenCalled();
    expect(mailMock).not.toHaveBeenCalled();
  });

  it("Nicht-Admin: erhält trotz Mailfehler KEIN setupUrl und KEIN delivery (anti-enumeration)", async () => {
    asNonAdmin();
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      email: "user@example.com",
    });
    pm.account.update.mockResolvedValue({});
    mailMock.mockRejectedValueOnce(
      new Error(
        "MAIL_TRANSPORT=practice_only: Account-Passwort-Setup-Mail nicht möglich.",
      ),
    );

    const res = await requestHandler(
      jsonRequest("http://localhost/api/auth/request-password-setup", {
        email: "user@example.com",
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(json.setupUrl).toBeUndefined();
    expect(json.delivery).toBeUndefined();
  });

  it("Nicht-Admin: nicht existierender Account → generisches { ok: true } (keine Enumeration)", async () => {
    asNonAdmin();
    pm.account.findUnique.mockResolvedValue(null);

    const res = await requestHandler(
      jsonRequest("http://localhost/api/auth/request-password-setup", {
        email: "ghost@example.com",
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    // Nicht-Admin sieht KEIN delivery-Feld — sonst wäre das ein Enumerations-Channel.
    expect(json).toEqual({ ok: true });
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/set-password
// ---------------------------------------------------------------------------

describe("POST /api/auth/set-password", () => {
  it("400 bei fehlendem Token", async () => {
    const res = await setPasswordHandler(
      jsonRequest("http://localhost/api/auth/set-password", {
        password: "neuesPasswort123",
      }),
    );
    expect(res.status).toBe(400);
    expect(pm.account.findUnique).not.toHaveBeenCalled();
  });

  it("400 wenn Passwort zu kurz", async () => {
    const res = await setPasswordHandler(
      jsonRequest("http://localhost/api/auth/set-password", {
        token: "abc",
        password: "x".repeat(MIN_PASSWORD_LENGTH - 1),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain(`${MIN_PASSWORD_LENGTH}`);
    expect(pm.account.findUnique).not.toHaveBeenCalled();
  });

  it("400 wenn Token nicht existiert", async () => {
    pm.account.findUnique.mockResolvedValue(null);

    const res = await setPasswordHandler(
      jsonRequest("http://localhost/api/auth/set-password", {
        token: "unbekannt",
        password: "neuesPasswort123",
      }),
    );

    expect(res.status).toBe(400);
    expect(pm.account.update).not.toHaveBeenCalled();
  });

  it("400 wenn Token abgelaufen ist", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      password_reset_expires: new Date(Date.now() - 1000),
    });

    const res = await setPasswordHandler(
      jsonRequest("http://localhost/api/auth/set-password", {
        token: "abgelaufen",
        password: "neuesPasswort123",
      }),
    );

    expect(res.status).toBe(400);
    expect(pm.account.update).not.toHaveBeenCalled();
  });

  it("setzt Hash und löscht Token bei gültigem Token", async () => {
    pm.account.findUnique.mockResolvedValue({
      id: "acc-1",
      password_reset_expires: new Date(Date.now() + 60_000),
    });
    pm.account.update.mockResolvedValue({});

    const password = "neuesPasswort123";
    const res = await setPasswordHandler(
      jsonRequest("http://localhost/api/auth/set-password", {
        token: "gueltig",
        password,
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    expect(pm.account.update).toHaveBeenCalledTimes(1);
    const updateArgs = pm.account.update.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: "acc-1" });
    const data = updateArgs.data as {
      password_hash: string;
      password_reset_token: null;
      password_reset_expires: null;
    };
    expect(data.password_reset_token).toBeNull();
    expect(data.password_reset_expires).toBeNull();
    expect(data.password_hash).toMatch(/^scrypt\$/);
    // Hash ist mit lib/password.ts kompatibel.
    await expect(verifyPassword(password, data.password_hash)).resolves.toBe(
      true,
    );
  });
});
