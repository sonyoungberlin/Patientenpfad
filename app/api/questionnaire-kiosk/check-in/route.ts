import { NextRequest, NextResponse } from "next/server";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { KIOSK_CHECK_IN_BLOCK_IDS } from "@/lib/questionnaire/kioskCheckIn";
import {
  hasQuestionnaireKioskCapability,
  requireQuestionnaireKioskAccess,
} from "@/lib/questionnaireKiosk/auth";

const FORBIDDEN_FIELDS = [
  "patient_reference",
  "selected_block_ids",
  "selected_confirmation_ids",
  "practice_id",
  "owner_account_id",
  "created_by_kiosk_device_id",
  "inquiry_session_id",
  "mode",
  "message",
  "link",
];

export async function POST(req: NextRequest) {
  const { access, error } = await requireQuestionnaireKioskAccess(req, true);
  if (error) return error;
  if (!hasQuestionnaireKioskCapability(access, "questionnaires")) {
    return NextResponse.json({ ok: false, error: "Patientenfragebögen sind für diesen Kiosk-Zugang nicht freigeschaltet." }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
  }
  if (FORBIDDEN_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(body, field))) {
    return NextResponse.json(
      { ok: false, error: "Diese Anfrage enthält nicht erlaubte Felder." },
      { status: 400 },
    );
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const protocol = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : req.nextUrl.origin;
  const { sessionId, tokenLink } = await createQuestionnaireSession({
    selectedBlockIds: [...KIOSK_CHECK_IN_BLOCK_IDS],
    patientReference: null,
    allowUnassignedKioskCheckIn: true,
    patientLanguage: "de",
    ownerPracticeId: access.practiceId,
    ...(access.kind === "device"
      ? { createdByKioskDeviceId: access.deviceId }
      : { ownerAccountId: access.accountId }),
    source: "kiosk_direct",
    origin,
  });

  const response = NextResponse.json({
    ok: true,
    sessionId,
    link: tokenLink,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}