import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    account: { findUnique: jest.fn(), update: jest.fn() },
    passwordResetRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    passwordResetRateLimit: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    session: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("@/lib/mail/sendPasswordSetupEmail", () => ({
  sendPasswordSetupEmail: jest.fn().mockResolvedValue("smtp_env"),
}));

jest.mock("@/lib/auth", () => ({ getSessionAccount: jest.fn().mockResolvedValue(null) }));

import { prisma } from "@/lib/prisma";
import { sendPasswordSetupEmail } from "@/lib/mail/sendPasswordSetupEmail";
import { getSessionAccount } from "@/lib/auth";
import { POST as requestHandler } from "@/app/api/auth/request-password-setup/route";
import { POST as setPasswordHandler } from "@/app/api/auth/set-password/route";
import { hashPasswordResetToken, PASSWORD_RESET_GENERIC_MESSAGE } from "@/lib/auth/passwordReset";
import { verifyPassword } from "@/lib/password";

type PrismaMock = {
  account: { findUnique: jest.Mock; update: jest.Mock };
  passwordResetRequest: { create: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock; deleteMany: jest.Mock };
  passwordResetRateLimit: { findUnique: jest.Mock; upsert: jest.Mock; update: jest.Mock; deleteMany: jest.Mock };
  session: { deleteMany: jest.Mock };
  $transaction: jest.Mock;
};
const pm = prisma as unknown as PrismaMock;
const mailMock = sendPasswordSetupEmail as jest.Mock;
const sessionMock = getSessionAccount as jest.Mock;

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/request-password-setup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.10" },
  });
}

function configureTransaction() {
  pm.$transaction.mockImplementation((callback: (tx: typeof pm) => unknown) => callback(pm));
  pm.passwordResetRateLimit.findUnique.mockResolvedValue(null);
  pm.passwordResetRateLimit.upsert.mockResolvedValue({});
  pm.passwordResetRateLimit.update.mockResolvedValue({});
  pm.passwordResetRateLimit.deleteMany.mockResolvedValue({ count: 0 });
  pm.passwordResetRequest.deleteMany.mockResolvedValue({ count: 0 });
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionMock.mockResolvedValue(null);
  configureTransaction();
});

describe("POST /api/auth/request-password-setup", () => {
  it.each(["user@example.com", "unknown@example.com"])("liefert neutralen Erfolg für %s", async (email) => {
    pm.account.findUnique.mockResolvedValue(email.startsWith("user") ? { id: "acc-1", email } : null);
    pm.passwordResetRequest.create.mockResolvedValue({});
    const response = await requestHandler(jsonRequest({ email }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
  });

  it("speichert nur den Hash und legt keinen Reset-Request für unbekannte E-Mails an", async () => {
    pm.account.findUnique.mockResolvedValue({ id: "acc-1", email: "user@example.com" });
    pm.passwordResetRequest.create.mockResolvedValue({});
    const response = await requestHandler(jsonRequest({ email: "USER@example.com" }));
    expect(response.status).toBe(200);
    const data = pm.passwordResetRequest.create.mock.calls[0][0].data;
    expect(data.account_id).toBe("acc-1");
    expect(data.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.token_hash).not.toContain("token");
    expect(mailMock).toHaveBeenCalledWith(expect.objectContaining({ setupUrl: expect.stringContaining("token=") }));

    pm.account.findUnique.mockResolvedValue(null);
    pm.passwordResetRequest.create.mockClear();
    await requestHandler(jsonRequest({ email: "unknown@example.com" }));
    expect(pm.passwordResetRequest.create).not.toHaveBeenCalled();
  });

  it("meldet Admins delivery=email nur nach erfolgreichem Mailhelper-Aufruf", async () => {
    sessionMock.mockResolvedValue({ is_admin: true });
    pm.account.findUnique.mockResolvedValue({ id: "acc-1", email: "user@example.com" });
    pm.passwordResetRequest.create.mockResolvedValue({});
    mailMock.mockResolvedValueOnce("smtp_env");

    const response = await requestHandler(jsonRequest({ email: "user@example.com" }));

    expect(await response.json()).toEqual({ ok: true, delivery: "email" });
    expect(mailMock).toHaveBeenCalledWith(expect.objectContaining({ to: "user@example.com" }));
  });

  it("meldet Admins ohne realen Mailtransport manual statt delivery=email", async () => {
    sessionMock.mockResolvedValue({ is_admin: true });
    pm.account.findUnique.mockResolvedValue({ id: "acc-1", email: "user@example.com" });
    pm.passwordResetRequest.create.mockResolvedValue({});
    mailMock.mockRejectedValueOnce(new Error("platform smtp unavailable"));

    const response = await requestHandler(jsonRequest({ email: "user@example.com" }));
    const body = await response.json();

    expect(body.delivery).toBe("manual");
    expect(body.delivery).not.toBe("email");
    expect(body.setupUrl).toContain("/account/set-password?token=");
  });

  it("begrenzt Rate-Limit-Anfragen weiterhin neutral", async () => {
    pm.passwordResetRateLimit.findUnique.mockImplementation(async ({ where }: { where: { key_hash_key_type: { key_type: string } } }) =>
      where.key_hash_key_type.key_type === "email"
        ? { id: "limit-1", window_started_at: new Date(), request_count: 3 }
        : null,
    );
    pm.account.findUnique.mockResolvedValue({ id: "acc-1", email: "user@example.com" });
    const response = await requestHandler(jsonRequest({ email: "user@example.com" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
    expect(pm.passwordResetRequest.create).not.toHaveBeenCalled();
  });

  it("gibt Admins bei Mailfehlern den manuellen Link, aber keinen Link an öffentliche Nutzer", async () => {
    pm.account.findUnique.mockResolvedValue({ id: "acc-1", email: "user@example.com" });
    pm.passwordResetRequest.create.mockResolvedValue({});
    mailMock.mockRejectedValueOnce(new Error("smtp down"));
    const publicResponse = await requestHandler(jsonRequest({ email: "user@example.com" }));
    const publicBody = await publicResponse.json();
    expect(publicBody).toEqual({ ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
    expect(publicBody).not.toHaveProperty("setupUrl");
    expect(publicBody).not.toHaveProperty("delivery");

    sessionMock.mockResolvedValue({ is_admin: true });
    mailMock.mockRejectedValueOnce(new Error("smtp down"));
    const adminResponse = await requestHandler(jsonRequest({ email: "user@example.com" }));
    expect((await adminResponse.json()).delivery).toBe("manual");
  });
});

describe("POST /api/auth/set-password", () => {
  it("lehnt unbekannte, abgelaufene und verbrauchte Tokens ab", async () => {
    for (const request of [
      null,
      { id: "r-1", account_id: "acc-1", expires_at: new Date(Date.now() - 1), used_at: null },
      { id: "r-1", account_id: "acc-1", expires_at: new Date(Date.now() + 60_000), used_at: new Date() },
    ]) {
      pm.passwordResetRequest.findUnique.mockResolvedValue(request);
      const response = await setPasswordHandler(jsonRequest({ token: "raw-token", password: "neuesPasswort123" }));
      expect(response.status).toBe(400);
      pm.passwordResetRequest.findUnique.mockClear();
    }
  });

  it("setzt Passwort, verbraucht den Request und invalidiert nur die Account-Sessions", async () => {
    pm.passwordResetRequest.findUnique.mockResolvedValue({
      id: "r-1", account_id: "acc-1", expires_at: new Date(Date.now() + 60_000), used_at: null,
    });
    pm.passwordResetRequest.updateMany.mockResolvedValue({ count: 1 });
    pm.account.update.mockResolvedValue({});
    pm.session.deleteMany.mockResolvedValue({ count: 2 });

    const password = "neuesPasswort123";
    const response = await setPasswordHandler(jsonRequest({ token: "raw-token", password }));
    expect(response.status).toBe(200);
    expect(pm.passwordResetRequest.findUnique).toHaveBeenCalledWith({
      where: { token_hash: hashPasswordResetToken("raw-token") },
      select: { id: true, account_id: true, expires_at: true, used_at: true },
    });
    expect(pm.account.update.mock.calls[0][0].data.password_hash).toMatch(/^scrypt\$/);
    await expect(verifyPassword(password, pm.account.update.mock.calls[0][0].data.password_hash)).resolves.toBe(true);
    expect(pm.session.deleteMany).toHaveBeenCalledWith({ where: { account_id: "acc-1" } });
  });

  it("verhindert parallelen zweiten Verbrauch", async () => {
    pm.passwordResetRequest.findUnique.mockResolvedValue({
      id: "r-1", account_id: "acc-1", expires_at: new Date(Date.now() + 60_000), used_at: null,
    });
    pm.passwordResetRequest.updateMany.mockResolvedValue({ count: 0 });
    const response = await setPasswordHandler(jsonRequest({ token: "raw-token", password: "neuesPasswort123" }));
    expect(response.status).toBe(400);
    expect(pm.account.update).not.toHaveBeenCalled();
  });
});
