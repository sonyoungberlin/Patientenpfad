import { NextRequest, NextResponse } from "next/server";
import { PracticeRole, QuestionnaireAutoExportMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePracticeRole } from "@/lib/authz";

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

export async function GET(req: NextRequest) {
  const auth = await requirePracticeRole(req, ALL_ROLES);
  if (auth.error) return auth.error;
  const practiceId = auth.account.current_practice?.id;
  if (!practiceId) {
    return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  }

  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { questionnaire_auto_export_mode: true },
  });
  if (!practice) {
    return NextResponse.json({ ok: false, error: "Praxis nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ mode: practice.questionnaire_auto_export_mode });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePracticeRole(req, WRITE_ROLES);
  if (auth.error) return auth.error;
  const practiceId = auth.account.current_practice?.id;
  if (!practiceId) {
    return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as { mode?: unknown } | null;
  if (
    body?.mode !== QuestionnaireAutoExportMode.BROWSER &&
    body?.mode !== QuestionnaireAutoExportMode.WINDOWS
  ) {
    return NextResponse.json({ ok: false, error: "Ungültiger Exportmodus." }, { status: 400 });
  }

  const practice = await prisma.practice.update({
    where: { id: practiceId },
    data: { questionnaire_auto_export_mode: body.mode },
    select: { questionnaire_auto_export_mode: true },
  });
  return NextResponse.json({ mode: practice.questionnaire_auto_export_mode });
}