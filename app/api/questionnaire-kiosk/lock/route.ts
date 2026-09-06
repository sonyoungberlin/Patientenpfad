import { NextRequest, NextResponse } from "next/server";
import { invalidateKioskUnlock, KIOSK_UNLOCK_COOKIE, kioskCookieOptions, requireQuestionnaireKioskDevice } from "@/lib/questionnaireKiosk/auth";

export async function POST(req: NextRequest) {
  const { device, error } = await requireQuestionnaireKioskDevice(req);
  if (error) return error;
  await invalidateKioskUnlock(device.deviceId);
  const response = NextResponse.json({ ok: true, redirect: "/questionnaire-kiosk/lock" });
  response.cookies.set(KIOSK_UNLOCK_COOKIE, "", kioskCookieOptions(0));
  return response;
}