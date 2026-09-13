import { PracticeRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requirePracticeRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { isPracticeActive } from "@/lib/practice/lifecycle";

const MANAGE_ROLES = [PracticeRole.OWNER, PracticeRole.ADMIN];
type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { account, error } = await requirePracticeRole(req, MANAGE_ROLES);
  if (error) return error;
  const practice = account.current_practice;
  if (!practice || !isPracticeActive(practice)) {
    return NextResponse.json(
      { ok: false, error: "Praxis nicht aktiv." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => null) as { action?: unknown } | null;
  const device = await prisma.practiceAutoDownloadDevice.findFirst({
    where: { id, practice_id: practice.id },
    select: { id: true, revoked_at: true },
  });
  if (!device) {
    return NextResponse.json(
      { ok: false, error: "Gerät nicht gefunden." },
      { status: 404 },
    );
  }

  if (body?.action === "deactivate") {
    await prisma.practiceAutoDownloadDevice.update({
      where: { id: device.id },
      data: { is_active: false },
    });
  } else if (body?.action === "reactivate") {
    if (device.revoked_at) {
      return NextResponse.json(
        { ok: false, error: "Ein widerrufenes Gerät kann nicht reaktiviert werden." },
        { status: 409 },
      );
    }
    await prisma.practiceAutoDownloadDevice.update({
      where: { id: device.id },
      data: { is_active: true },
    });
  } else if (body?.action === "revoke") {
    await prisma.practiceAutoDownloadDevice.update({
      where: { id: device.id },
      data: {
        is_active: false,
        revoked_at: new Date(),
        enrollment_token_hash: null,
        enrollment_expires_at: null,
      },
    });
  } else {
    return NextResponse.json(
      { ok: false, error: "Ungültige Aktion." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
