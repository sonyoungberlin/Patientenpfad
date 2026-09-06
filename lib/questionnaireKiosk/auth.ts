import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const KIOSK_DEVICE_COOKIE = "pp_questionnaire_kiosk_device";
export const KIOSK_UNLOCK_COOKIE = "pp_questionnaire_kiosk_unlock";
export const KIOSK_UNLOCK_DURATION_MS = 15 * 60 * 1000;

export type QuestionnaireKioskIdentity = {
  deviceId: string;
  practiceId: string;
  deviceName: string;
};

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
  return { deviceId: device.id, practiceId: device.practice_id, deviceName: device.name };
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

export async function invalidateKioskUnlock(deviceId: string) {
  await prisma.questionnaireKioskDevice.update({
    where: { id: deviceId },
    data: { unlock_token_hash: null, unlock_expires_at: null },
  });
}