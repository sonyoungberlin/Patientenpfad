import { createHash, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/websiteForms/submitRateLimit";
import { hashPassword } from "@/lib/password";
import { sendPasswordSetupEmail } from "@/lib/mail/sendPasswordSetupEmail";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_EMAIL_LIMIT = 3;
export const PASSWORD_RESET_EMAIL_WINDOW_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_IP_LIMIT = 10;
export const PASSWORD_RESET_IP_WINDOW_MS = 15 * 60 * 1000;

export const PASSWORD_RESET_GENERIC_MESSAGE =
  "Wenn für diese E-Mail-Adresse ein Konto existiert, wurde ein Link zum Zurücksetzen des Passworts versendet.";

export type PasswordResetIssueResult =
  | { kind: "accepted"; delivery: "email" | "manual"; setupUrl?: string }
  | { kind: "limited" }
  | { kind: "none" };

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashPasswordResetToken(token: string): string {
  return hashValue(token);
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function incrementRateLimit(
  tx: Prisma.TransactionClient,
  keyHash: string,
  keyType: "email" | "ip",
  limit: number,
  windowMs: number,
  now: Date,
): Promise<boolean> {
  const current = await tx.passwordResetRateLimit.findUnique({
    where: { key_hash_key_type: { key_hash: keyHash, key_type: keyType } },
  });
  if (!current || now.getTime() - current.window_started_at.getTime() >= windowMs) {
    await tx.passwordResetRateLimit.upsert({
      where: { key_hash_key_type: { key_hash: keyHash, key_type: keyType } },
      create: {
        key_hash: keyHash,
        key_type: keyType,
        window_started_at: now,
        request_count: 1,
      },
      update: { window_started_at: now, request_count: 1 },
    });
    return false;
  }
  if (current.request_count >= limit) return true;
  await tx.passwordResetRateLimit.update({
    where: { id: current.id },
    data: { request_count: { increment: 1 } },
  });
  return false;
}

export async function issuePasswordReset(
  emailInput: string,
  headers: Headers,
  origin: string,
): Promise<PasswordResetIssueResult> {
  const email = normalizedEmail(emailInput);
  const emailHash = hashValue(`email:${email}`);
  const ipHash = hashValue(`ip:${getClientIp(headers)}`);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    await tx.passwordResetRateLimit.deleteMany({
      where: { updated_at: { lt: new Date(now.getTime() - PASSWORD_RESET_EMAIL_WINDOW_MS) } },
    });
    const emailLimited = await incrementRateLimit(
      tx,
      emailHash,
      "email",
      PASSWORD_RESET_EMAIL_LIMIT,
      PASSWORD_RESET_EMAIL_WINDOW_MS,
      now,
    );
    const ipLimited = await incrementRateLimit(
      tx,
      ipHash,
      "ip",
      PASSWORD_RESET_IP_LIMIT,
      PASSWORD_RESET_IP_WINDOW_MS,
      now,
    );
    if (emailLimited || ipLimited) return { kind: "limited" as const };

    const account = await tx.account.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!account) return { kind: "none" as const };

    const token = randomBytes(32).toString("hex");
    await tx.passwordResetRequest.updateMany({
      where: { account_id: account.id, used_at: null },
      data: { used_at: now },
    });
    await tx.passwordResetRequest.create({
      data: {
        account_id: account.id,
        token_hash: hashPasswordResetToken(token),
        expires_at: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
      },
    });
    await tx.passwordResetRequest.deleteMany({
      where: { account_id: account.id, expires_at: { lt: now } },
    });
    return { kind: "accepted" as const, account, token };
  });

  if (result.kind !== "accepted") return result;
  const setupUrl = `${origin}/account/set-password?token=${result.token}`;
  try {
    await sendPasswordSetupEmail({ to: result.account.email, setupUrl });
    return { kind: "accepted", delivery: "email" };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error("[auth/password-reset] mail_failed:", detail);
    return { kind: "accepted", delivery: "manual", setupUrl };
  }
}

export async function consumePasswordReset(
  token: string,
  password: string,
): Promise<{ ok: true } | { ok: false }> {
  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();
  const passwordHash = await hashPassword(password);

  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.passwordResetRequest.findUnique({
        where: { token_hash: tokenHash },
        select: { id: true, account_id: true, expires_at: true, used_at: true },
      });
      if (!request || request.used_at || request.expires_at <= now) throw new Error("invalid_reset");

      const consumed = await tx.passwordResetRequest.updateMany({
        where: { id: request.id, used_at: null, expires_at: { gt: now } },
        data: { used_at: now },
      });
      if (consumed.count !== 1) throw new Error("invalid_reset");

      await tx.account.update({
        where: { id: request.account_id },
        data: { password_hash: passwordHash },
      });
      await tx.session.deleteMany({ where: { account_id: request.account_id } });
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_reset") return { ok: false };
    throw error;
  }
}
