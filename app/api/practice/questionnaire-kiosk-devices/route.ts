import { PracticeRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { requirePracticeRole } from "@/lib/authz";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  createKioskSecret,
  hashKioskSecret,
  KIOSK_DEVICE_COOKIE,
  KIOSK_UNLOCK_COOKIE,
  kioskCookieOptions,
} from "@/lib/questionnaireKiosk/auth";

const PIN_PATTERN = /^\d{6}$/;

export async function GET(req: NextRequest) {
  const { account, error } = await requirePracticeRole(req, [PracticeRole.OWNER]);
  if (error) return error;
  const devices = await prisma.questionnaireKioskDevice.findMany({
    where: { practice_id: account.current_practice!.id },
    select: { id: true, name: true, is_active: true, created_at: true, last_seen_at: true, revoked_at: true, locked_until: true },
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json({ ok: true, devices });
}

export async function POST(req: NextRequest) {
  const { account, error } = await requirePracticeRole(req, [PracticeRole.OWNER]);
  if (error) return error;
  const body = await req.json().catch(() => null) as { name?: unknown; pin?: unknown; pin_confirmation?: unknown; capabilities?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!name || name.length > 100 || !PIN_PATTERN.test(pin) || pin !== body?.pin_confirmation) {
    return NextResponse.json({ ok: false, error: "Name und übereinstimmende sechsstellige PIN sind erforderlich." }, { status: 400 });
  }
  const capabilities = Array.isArray(body?.capabilities)
    ? [...new Set(body.capabilities.filter((value): value is "questionnaires" | "internal_documentation" => value === "questionnaires" || value === "internal_documentation"))]
    : ["questionnaires"];
  const credential = createKioskSecret();
  const device = await prisma.questionnaireKioskDevice.create({
    data: {
      practice_id: account.current_practice!.id,
      name,
      credential_hash: hashKioskSecret(credential),
      pin_hash: await hashPassword(pin),
      created_by_account_id: account.id,
      capabilities,
    },
    select: { id: true, name: true },
  });
  const accountToken = req.cookies.get(SESSION_COOKIE)?.value;
  if (accountToken) await prisma.session.deleteMany({ where: { token: accountToken } });
  const response = NextResponse.json({ ok: true, device, redirect: "/questionnaire-kiosk/lock" }, { status: 201 });
  response.cookies.set(KIOSK_DEVICE_COOKIE, credential, kioskCookieOptions(365 * 24 * 60 * 60));
  response.cookies.set(KIOSK_UNLOCK_COOKIE, "", kioskCookieOptions(0));
  response.cookies.set(SESSION_COOKIE, "", kioskCookieOptions(0));
  return response;
}