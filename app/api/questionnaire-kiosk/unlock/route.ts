import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  createKioskSecret,
  hashKioskSecret,
  KIOSK_UNLOCK_COOKIE,
  KIOSK_UNLOCK_DURATION_MS,
  kioskCookieOptions,
  requireQuestionnaireKioskDevice,
} from "@/lib/questionnaireKiosk/auth";

const LOCKOUT_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const { device, error } = await requireQuestionnaireKioskDevice(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as { pin?: unknown } | null;
  const record = await prisma.questionnaireKioskDevice.findUnique({ where: { id: device.deviceId }, select: { pin_hash: true, failed_pin_attempts: true, locked_until: true } });
  if (!record) return NextResponse.json({ ok: false, error: "Kioskgerät nicht autorisiert." }, { status: 401 });
  if (record.locked_until && record.locked_until > new Date()) {
    return NextResponse.json({ ok: false, error: "Zu viele Fehlversuche. Bitte später erneut versuchen." }, { status: 429 });
  }
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!/^\d{6}$/.test(pin) || !(await verifyPassword(pin, record.pin_hash))) {
    const failed = await prisma.questionnaireKioskDevice.update({
      where: { id: device.deviceId },
      data: {
        failed_pin_attempts: { increment: 1 },
        locked_until: null,
        unlock_token_hash: null,
        unlock_expires_at: null,
      },
      select: { failed_pin_attempts: true },
    });
    const locked = failed.failed_pin_attempts >= 5;
    if (locked) {
      await prisma.questionnaireKioskDevice.update({
        where: { id: device.deviceId },
        data: {
          failed_pin_attempts: 0,
          locked_until: new Date(Date.now() + LOCKOUT_MS),
          unlock_token_hash: null,
          unlock_expires_at: null,
        },
      });
    }
    return NextResponse.json({ ok: false, error: locked ? "Zu viele Fehlversuche. Kiosk wurde 15 Minuten gesperrt." : "PIN ist nicht korrekt." }, { status: locked ? 429 : 401 });
  }
  const unlockToken = createKioskSecret();
  await prisma.questionnaireKioskDevice.update({ where: { id: device.deviceId }, data: { failed_pin_attempts: 0, locked_until: null, unlock_token_hash: hashKioskSecret(unlockToken), unlock_expires_at: new Date(Date.now() + KIOSK_UNLOCK_DURATION_MS) } });
  const response = NextResponse.json({ ok: true, redirect: "/questionnaire-kiosk" });
  response.cookies.set(KIOSK_UNLOCK_COOKIE, unlockToken, kioskCookieOptions(KIOSK_UNLOCK_DURATION_MS / 1000));
  return response;
}