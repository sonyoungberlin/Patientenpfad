import { NextRequest, NextResponse } from "next/server";
import {
  KIOSK_DEVICE_COOKIE,
  KIOSK_UNLOCK_COOKIE,
  kioskCookieOptions,
  requireQuestionnaireKioskDevice,
} from "@/lib/questionnaireKiosk/auth";

export async function GET(req: NextRequest) {
  const { device } = await requireQuestionnaireKioskDevice(req);
  if (device) {
    return NextResponse.redirect(new URL("/questionnaire-kiosk/lock", req.url));
  }

  const response = NextResponse.redirect(new URL("/", req.url));
  response.cookies.set(KIOSK_DEVICE_COOKIE, "", kioskCookieOptions(0));
  response.cookies.set(KIOSK_UNLOCK_COOKIE, "", kioskCookieOptions(0));
  return response;
}