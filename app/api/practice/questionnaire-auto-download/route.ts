import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePracticeRole } from "@/lib/authz";
import {
  hashQuestionnaireAutoDeviceId,
  isValidQuestionnaireAutoDeviceId,
  QUESTIONNAIRE_AUTO_DEVICE_HEADER,
} from "@/lib/questionnaire/autoDownloadDevice";

const ALL_ROLES: PracticeRole[] = [
  PracticeRole.OWNER,
  PracticeRole.ADMIN,
  PracticeRole.USER,
  PracticeRole.INBOX_ONLY,
];

const WRITE_ROLES: PracticeRole[] = [
  PracticeRole.OWNER,
  PracticeRole.ADMIN,
];

function readDeviceHash(req: NextRequest): string | null {
  const deviceId = req.headers.get(QUESTIONNAIRE_AUTO_DEVICE_HEADER);
  if (!isValidQuestionnaireAutoDeviceId(deviceId)) return null;
  return hashQuestionnaireAutoDeviceId(deviceId);
}

function canManage(account: {
  current_practice: { id: string } | null;
  memberships: Array<{ practice_id: string; role: PracticeRole }>;
}): boolean {
  const practiceId = account.current_practice?.id;
  const role = account.memberships.find(
    (membership) => membership.practice_id === practiceId,
  )?.role;
  return role === PracticeRole.OWNER || role === PracticeRole.ADMIN;
}

export async function GET(req: NextRequest) {
  const auth = await requirePracticeRole(req, ALL_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) {
    return NextResponse.json(
      { ok: false, error: "Kein Praxiszugriff." },
      { status: 403 },
    );
  }

  const deviceHash = readDeviceHash(req);
  if (!deviceHash) {
    return NextResponse.json(
      { ok: false, error: "Ungültige Gerätekennung." },
      { status: 400 },
    );
  }

  const settings = await prisma.practice.findUnique({
    where: { id: practice.id },
    select: {
      questionnaire_auto_pdf_device_hash: true,
      questionnaire_auto_pdf_enabled_at: true,
    },
  });
  const enabled =
    settings?.questionnaire_auto_pdf_device_hash != null &&
    settings.questionnaire_auto_pdf_enabled_at != null;

  return NextResponse.json({
    enabled,
    isCurrentDevice:
      enabled &&
      settings.questionnaire_auto_pdf_device_hash === deviceHash,
    canManage: canManage(auth.account),
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePracticeRole(req, WRITE_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) {
    return NextResponse.json(
      { ok: false, error: "Kein Praxiszugriff." },
      { status: 403 },
    );
  }

  const deviceHash = readDeviceHash(req);
  if (!deviceHash) {
    return NextResponse.json(
      { ok: false, error: "Ungültige Gerätekennung." },
      { status: 400 },
    );
  }

  try {
    const activation = await prisma.practice.updateMany({
      where: {
        id: practice.id,
        questionnaire_auto_pdf_enabled_at: null,
      },
      data: {
        questionnaire_auto_pdf_device_hash: deviceHash,
        questionnaire_auto_pdf_enabled_at: new Date(),
      },
    });
    if (activation.count === 0) {
      await prisma.practice.update({
        where: { id: practice.id },
        data: { questionnaire_auto_pdf_device_hash: deviceHash },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[questionnaire-auto-download settings] update_failed", {
      message: error instanceof Error ? error.message : "UnknownError",
    });
    return NextResponse.json(
      { ok: false, error: "Einstellung konnte nicht gespeichert werden." },
      { status: 503 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePracticeRole(req, WRITE_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) {
    return NextResponse.json(
      { ok: false, error: "Kein Praxiszugriff." },
      { status: 403 },
    );
  }

  const deviceHash = readDeviceHash(req);
  if (!deviceHash) {
    return NextResponse.json(
      { ok: false, error: "Ungültige Gerätekennung." },
      { status: 400 },
    );
  }

  const disabled = await prisma.practice.updateMany({
    where: {
      id: practice.id,
      questionnaire_auto_pdf_device_hash: deviceHash,
    },
    data: {
      questionnaire_auto_pdf_device_hash: null,
      questionnaire_auto_pdf_enabled_at: null,
    },
  });
  if (disabled.count === 0) {
    return NextResponse.json(
      { ok: false, error: "Dieser Computer ist nicht das aktive Gerät." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}