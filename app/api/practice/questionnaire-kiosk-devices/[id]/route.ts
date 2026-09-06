import { PracticeRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requirePracticeRole } from "@/lib/authz";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const PIN_PATTERN = /^\d{6}$/;
type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { account, error } = await requirePracticeRole(req, [PracticeRole.OWNER]);
  if (error) return error;
  const { id } = await params;
  const body = await req.json().catch(() => null) as { action?: unknown; pin?: unknown } | null;
  const device = await prisma.questionnaireKioskDevice.findFirst({ where: { id, practice_id: account.current_practice!.id } });
  if (!device) return NextResponse.json({ ok: false, error: "Gerät nicht gefunden." }, { status: 404 });

  if (body?.action === "change_pin") {
    if (typeof body.pin !== "string" || !PIN_PATTERN.test(body.pin)) {
      return NextResponse.json({ ok: false, error: "Die PIN muss aus genau sechs Ziffern bestehen." }, { status: 400 });
    }
    await prisma.questionnaireKioskDevice.update({ where: { id }, data: { pin_hash: await hashPassword(body.pin), failed_pin_attempts: 0, locked_until: null, unlock_token_hash: null, unlock_expires_at: null } });
  } else if (body?.action === "lock") {
    await prisma.questionnaireKioskDevice.update({ where: { id }, data: { unlock_token_hash: null, unlock_expires_at: null } });
  } else if (body?.action === "deactivate" || body?.action === "reactivate") {
    await prisma.questionnaireKioskDevice.update({ where: { id }, data: { is_active: body.action === "reactivate", unlock_token_hash: null, unlock_expires_at: null } });
  } else if (body?.action === "revoke") {
    await prisma.questionnaireKioskDevice.update({ where: { id }, data: { is_active: false, revoked_at: new Date(), unlock_token_hash: null, unlock_expires_at: null } });
  } else {
    return NextResponse.json({ ok: false, error: "Ungültige Aktion." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}