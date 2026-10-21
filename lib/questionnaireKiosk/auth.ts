import { createHash, randomBytes } from "crypto";
import { KioskMode } from "@prisma/client";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentKioskMode,
  getKioskSessionAccount,
  getKioskSessionAccountFromCookies,
  getSessionAccount,
  getSessionAccountFromCookies,
} from "@/lib/auth";

export const KIOSK_DEVICE_COOKIE = "pp_questionnaire_kiosk_device";
export const KIOSK_UNLOCK_COOKIE = "pp_questionnaire_kiosk_unlock";
export const KIOSK_UNLOCK_DURATION_MS = 15 * 60 * 1000;

export type QuestionnaireKioskIdentity = {
  deviceId: string;
  practiceId: string;
  deviceName: string;
  capabilities?: QuestionnaireKioskCapability[];
};

export type QuestionnaireKioskCapability = "questionnaires" | "internal_documentation";

export type QuestionnaireKioskAccess =
  | (QuestionnaireKioskIdentity & { kind: "device" })
  | {
      kind: "account";
      accountId: string;
      practiceId: string;
      kioskMode: KioskMode;
    };

export function hasQuestionnaireKioskCapability(
  identity: QuestionnaireKioskIdentity | QuestionnaireKioskAccess,
  capability: QuestionnaireKioskCapability,
): boolean {
  if ("kind" in identity && identity.kind === "account") {
    return (
      (capability === "questionnaires" && identity.kioskMode === KioskMode.QUESTIONNAIRES) ||
      (capability === "internal_documentation" &&
        identity.kioskMode === KioskMode.INTERNAL_DOCUMENTATION)
    );
  }
  return identity.capabilities?.includes(capability) ?? false;
}

function parseCapabilities(raw: unknown): QuestionnaireKioskCapability[] {
  if (!Array.isArray(raw)) return ["questionnaires"];
  const capabilities = raw.filter(
    (value): value is QuestionnaireKioskCapability =>
      value === "questionnaires" || value === "internal_documentation",
  );
  return capabilities.length > 0 ? [...new Set(capabilities)] : ["questionnaires"];
}

export function createKioskSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashKioskSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function kioskCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

function unauthorized(message = "Kioskgerät nicht autorisiert.") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

async function resolveDevice(
  credential: string | undefined,
  unlockToken?: string,
): Promise<QuestionnaireKioskIdentity | null> {
  if (!credential) return null;
  const device = await prisma.questionnaireKioskDevice.findUnique({
    where: { credential_hash: hashKioskSecret(credential) },
    select: {
      id: true,
      practice_id: true,
      name: true,
      is_active: true,
      revoked_at: true,
      unlock_token_hash: true,
      unlock_expires_at: true,
        capabilities: true,
      practice: { select: { is_approved: true, disabled_at: true } },
    },
  });
  if (
    !device ||
    !device.is_active ||
    device.revoked_at ||
    !device.practice.is_approved ||
    device.practice.disabled_at
  ) {
    return null;
  }
  if (
    unlockToken !== undefined &&
    (!device.unlock_token_hash ||
      device.unlock_token_hash !== hashKioskSecret(unlockToken) ||
      !device.unlock_expires_at ||
      device.unlock_expires_at <= new Date())
  ) {
    return null;
  }
  await prisma.questionnaireKioskDevice.update({
    where: { id: device.id },
    data: { last_seen_at: new Date() },
  });
  const identity: QuestionnaireKioskIdentity = {
    deviceId: device.id,
    practiceId: device.practice_id,
    deviceName: device.name,
  };
  if (Array.isArray(device.capabilities)) identity.capabilities = parseCapabilities(device.capabilities);
  return identity;
}

export async function requireQuestionnaireKioskDevice(req: NextRequest) {
  const identity = await resolveDevice(req.cookies.get(KIOSK_DEVICE_COOKIE)?.value);
  return identity
    ? { device: identity, error: null }
    : { device: null, error: unauthorized() };
}

export async function requireUnlockedQuestionnaireKioskDevice(req: NextRequest) {
  const identity = await resolveDevice(
    req.cookies.get(KIOSK_DEVICE_COOKIE)?.value,
    req.cookies.get(KIOSK_UNLOCK_COOKIE)?.value ?? "",
  );
  return identity
    ? { device: identity, error: null }
    : { device: null, error: unauthorized("Kiosk ist gesperrt.") };
}

export async function getQuestionnaireKioskDeviceFromCookies(requireUnlock = false) {
  const cookieStore = await cookies();
  return resolveDevice(
    cookieStore.get(KIOSK_DEVICE_COOKIE)?.value,
    requireUnlock ? cookieStore.get(KIOSK_UNLOCK_COOKIE)?.value ?? "" : undefined,
  );
}

async function resolveAccountAccess(
  account: Awaited<ReturnType<typeof getKioskSessionAccount>>,
): Promise<QuestionnaireKioskAccess | null> {
  if (!account?.current_practice) return null;
  const kioskMode = getCurrentKioskMode(account);
  if (!kioskMode) return null;
  return {
    kind: "account",
    accountId: account.id,
    practiceId: account.current_practice.id,
    kioskMode,
  };
}

export async function requireQuestionnaireKioskAccess(
  req: NextRequest,
  requireUnlock = false,
) {
  const account = await getKioskSessionAccount(req);
  if (account) {
    const access = await resolveAccountAccess(account);
    return access
      ? { access, error: null }
      : { access: null, error: unauthorized("Kiosk-Startbereich ist nicht konfiguriert.") };
  }
  if (await getSessionAccount(req)) {
    return { access: null, error: unauthorized("Ein angemeldetes Benutzerkonto hat Vorrang vor dem Geräte-Kiosk.") };
  }

  const device = await resolveDevice(
    req.cookies.get(KIOSK_DEVICE_COOKIE)?.value,
    requireUnlock ? req.cookies.get(KIOSK_UNLOCK_COOKIE)?.value ?? "" : undefined,
  );
  if (device) return { access: { kind: "device" as const, ...device }, error: null };
  return {
    access: null,
    error: unauthorized(requireUnlock ? "Kiosk ist gesperrt." : undefined),
  };
}

export async function getQuestionnaireKioskAccessFromCookies(
  requireUnlock = false,
): Promise<QuestionnaireKioskAccess | null> {
  const account = await getKioskSessionAccountFromCookies();
  if (account) return resolveAccountAccess(account);
  if (await getSessionAccountFromCookies()) return null;

  const cookieStore = await cookies();
  const device = await resolveDevice(
    cookieStore.get(KIOSK_DEVICE_COOKIE)?.value,
    requireUnlock ? cookieStore.get(KIOSK_UNLOCK_COOKIE)?.value ?? "" : undefined,
  );
  return device ? { kind: "device", ...device } : null;
}

export async function invalidateKioskUnlock(deviceId: string) {
  await prisma.questionnaireKioskDevice.update({
    where: { id: deviceId },
    data: { unlock_token_hash: null, unlock_expires_at: null },
  });
}