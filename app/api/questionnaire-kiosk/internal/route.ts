import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUnlockedQuestionnaireKioskDevice, hasQuestionnaireKioskCapability } from "@/lib/questionnaireKiosk/auth";
import { getInternalWorkflow } from "@/lib/questionnaire/internalWorkflowRegistry";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";

export async function POST(req: NextRequest) {
  const { device, error } = await requireUnlockedQuestionnaireKioskDevice(req);
  if (error) return error;
  if (!hasQuestionnaireKioskCapability(device, "internal_documentation")) return NextResponse.json({ ok: false, error: "Interne Dokumentation ist auf diesem Gerät nicht freigeschaltet." }, { status: 403 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const workflow = getInternalWorkflow(body?.workflow_id);
  const patientReference = typeof body?.patient_reference === "string" ? body.patient_reference.trim() : "";
  if (!workflow || !patientReference) return NextResponse.json({ ok: false, error: "Workflow und Patientenreferenz sind erforderlich." }, { status: 400 });
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const protocol = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : req.nextUrl.origin;
  const result = await createQuestionnaireSession({
    selectedBlockIds: workflow.blockIds,
    patientReference,
    patientLanguage: "de",
    ownerPracticeId: device.practiceId,
    createdByKioskDeviceId: device.deviceId,
    source: "kiosk_direct",
    sessionKind: "internal_documentation",
    internalWorkflowId: workflow.id,
    origin,
  });
  return NextResponse.json({ ok: true, sessionId: result.sessionId, link: result.tokenLink });
}