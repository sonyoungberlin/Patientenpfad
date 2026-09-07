import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUnlockedQuestionnaireKioskDevice, hasQuestionnaireKioskCapability } from "@/lib/questionnaireKiosk/auth";
import { parseFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { validateAnswerCharacters } from "@/lib/questionnaire/validateAnswerCharacters";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { device, error } = await requireUnlockedQuestionnaireKioskDevice(req);
  if (error) return error;
  if (!hasQuestionnaireKioskCapability(device, "internal_documentation")) return NextResponse.json({ ok: false, error: "Interne Dokumentation ist auf diesem Gerät nicht freigeschaltet." }, { status: 403 });
  const { id } = await params;
  const session = await prisma.patientQuestionnaireSession.findUnique({ where: { id }, select: { status: true, session_kind: true, owner_practice_id: true, created_by_kiosk_device_id: true, deduplicated_questions: true, frozen_blocks: true } });
  if (!session || session.status !== "pending" || session.session_kind !== "internal_documentation" || session.owner_practice_id !== device.practiceId || session.created_by_kiosk_device_id !== device.deviceId) return NextResponse.json({ ok: false, error: "Interne Dokumentation nicht gefunden." }, { status: 404 });
  const body = await req.json().catch(() => null) as { answers?: unknown } | null;
  if (!body?.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) return NextResponse.json({ ok: false, error: "answers muss ein Objekt sein." }, { status: 400 });
  const frozenBlocks = parseFrozenBlocks(session.frozen_blocks);
  const questions = frozenBlocks?.flatMap((block) => block.questions) ?? [];
  const frozenQuestionMap = new Map(questions.map((question) => [question.id, question]));
  const charCheck = validateAnswerCharacters(body.answers, questions, frozenQuestionMap);
  if (!charCheck.ok) return NextResponse.json({ ok: false, error: "Bitte verwenden Sie lateinische Buchstaben.", invalidQuestionIds: charCheck.invalidQuestionIds }, { status: 400 });
  const answers = sanitizeAnswers(body.answers, questions, "de", frozenQuestionMap);
  const meaningful = Object.values(answers).some((value) => value.trim() !== "" && value !== "[]");
  if (!meaningful) return NextResponse.json({ ok: false, error: "Ein vollständig leeres Dokument kann nicht abgesendet werden." }, { status: 400 });
  await prisma.patientQuestionnaireSession.update({ where: { id, status: "pending" }, data: { answers: answers as unknown as Prisma.InputJsonValue, status: "completed", submitted_at: new Date() } });
  return NextResponse.json({ ok: true });
}