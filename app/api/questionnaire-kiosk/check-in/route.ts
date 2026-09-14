import { NextRequest, NextResponse } from "next/server";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { requireUnlockedQuestionnaireKioskDevice } from "@/lib/questionnaireKiosk/auth";
import { appendSelfCheckInQrFlag } from "@/lib/selfCheckInQr";

const CHECK_IN_BLOCK_IDS = ["KONTAKT", "CHECK_IN"];
const FORBIDDEN_FIELDS = [
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
  const { device, error } = await requireUnlockedQuestionnaireKioskDevice(req);
  if (error) return error;

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

  const patientReference = typeof body.patient_reference === "string"
    ? body.patient_reference.trim()
    : "";
  if (!patientReference) {
    return NextResponse.json(
      { ok: false, error: "Patientennummer / Referenz ist erforderlich." },
      { status: 400 },
    );
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const protocol = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : req.nextUrl.origin;
  const { tokenLink } = await createQuestionnaireSession({
    selectedBlockIds: CHECK_IN_BLOCK_IDS,
    patientReference,
    patientLanguage: "de",
    ownerPracticeId: device.practiceId,
    createdByKioskDeviceId: device.deviceId,
    source: "kiosk_direct",
    origin,
  });

  const response = NextResponse.json({
    ok: true,
    link: appendSelfCheckInQrFlag(
      tokenLink,
      patientReference,
      true,
    ),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}