import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";
import {
  buildPracticeConfirmationSlots,
  parseSelectedPracticeConfirmationIds,
  selectPracticeConfirmationSlots,
} from "@/lib/questionnaire/confirmation";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { isBlockEnReady, normalizeQuestionnaireLanguage } from "@/lib/questionnaire/i18n";
import { requireUnlockedQuestionnaireKioskDevice } from "@/lib/questionnaireKiosk/auth";
import { appendSelfCheckInQrFlag } from "@/lib/selfCheckInQr";

const FORBIDDEN_FIELDS = ["practice_id", "owner_account_id", "created_by_kiosk_device_id", "inquiry_session_id", "mode", "message", "link"];

export async function POST(req: NextRequest) {
  const { device, error } = await requireUnlockedQuestionnaireKioskDevice(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
  if (FORBIDDEN_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(body, field))) {
    return NextResponse.json({ ok: false, error: "Diese Anfrage enthält nicht erlaubte Felder." }, { status: 400 });
  }
  const rawBlockIds = body.selected_block_ids;
  if (!Array.isArray(rawBlockIds) || rawBlockIds.length === 0 || !rawBlockIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ ok: false, error: "Keine gültigen Fragebogen-Blöcke angegeben." }, { status: 400 });
  }
  const selectedBlockIds = rawBlockIds.filter((id) => id in BLOCK_CATALOG && BLOCK_CATALOG[id].selectable !== false);
  if (selectedBlockIds.length === 0) return NextResponse.json({ ok: false, error: "Keine gültigen Fragebogen-Blöcke angegeben." }, { status: 400 });
  const patientReference = typeof body.patient_reference === "string" ? body.patient_reference.trim() : "";
  if (!patientReference) return NextResponse.json({ ok: false, error: "Patientennummer / Referenz ist erforderlich." }, { status: 400 });
  const patientLanguage = normalizeQuestionnaireLanguage(body.language);
  if (patientLanguage === "en" && selectedBlockIds.some((id) => !isBlockEnReady(id))) {
    return NextResponse.json({ ok: false, error: "Einige Blöcke sind nicht vollständig auf Englisch verfügbar." }, { status: 400 });
  }
  const selectedConfirmationIds = parseSelectedPracticeConfirmationIds(body.selected_confirmation_ids);
  if (!selectedConfirmationIds) return NextResponse.json({ ok: false, error: "Ungültige Bestätigungs-Auswahl." }, { status: 400 });
  const practice = await prisma.practice.findUnique({
    where: { id: device.practiceId },
    select: {
      questionnaire_confirmation_text_1: true,
      questionnaire_confirmation_text_2: true,
      questionnaire_confirmation_text_3: true,
      questionnaire_confirmation_send_copy_1: true,
      questionnaire_confirmation_send_copy_2: true,
      questionnaire_confirmation_send_copy_3: true,
      legal_profile: { select: { official_email: true } },
    },
  });
  if (!practice) return NextResponse.json({ ok: false, error: "Praxis nicht verfügbar." }, { status: 403 });
  const confirmations = selectPracticeConfirmationSlots(buildPracticeConfirmationSlots(practice), selectedConfirmationIds);
  if (confirmations.length !== selectedConfirmationIds.length) return NextResponse.json({ ok: false, error: "Eine ausgewählte Bestätigung ist nicht verfügbar." }, { status: 400 });
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const protocol = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : req.nextUrl.origin;
  const { tokenLink } = await createQuestionnaireSession({
    selectedBlockIds,
    patientReference,
    patientLanguage,
    ownerPracticeId: device.practiceId,
    createdByKioskDeviceId: device.deviceId,
    source: "kiosk_direct",
    practiceConfirmations: confirmations,
    patientCopyReturnEmail: confirmations.some((slot) => slot.send_patient_copy) ? practice.legal_profile?.official_email ?? null : null,
    origin,
  });
  const response = NextResponse.json({ ok: true, link: appendSelfCheckInQrFlag(tokenLink, patientReference, body.self_check_in_qr === true) });
  response.headers.set("Cache-Control", "no-store");
  return response;
}