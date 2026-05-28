/**
 * Praxis-eigene Anfrage-Einstellungen (17 Owner-freigegebene inq_*-Felder).
 *
 * Quelle der Wahrheit: Practice-Tabelle (inq_*-Spalten).
 * Die Felder werden an die aktuelle Practice des eingeloggten Aufrufers
 * gebunden — niemals aus dem Request-Body.
 *
 * Berechtigung:
 *   - GET:  OWNER, ADMIN, USER, INBOX_ONLY
 *   - PUT:  nur OWNER und ADMIN
 *
 * PUT-Semantik: Partial-Update (nur gesendete Felder werden geändert).
 * inq_billing_cycle_label ist bewusst NICHT enthalten (admin-only).
 */

import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePracticeRole } from "@/lib/authz";
import { validatePracticeInquirySettings } from "@/lib/practice/validatePracticeInquirySettings";

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

const DB_SELECT = {
  inq_booking_calendar_name:         true,
  inq_findings_review_code:          true,
  inq_chronic_control_code:          true,
  inq_checkup_second_code:           true,
  inq_doctor_order_code:             true,
  inq_digital_req_time_min:          true,
  inq_digital_req_time_max:          true,
  inq_digital_req_time_unit:         true,
  inq_upload_platform_name:          true,
  inq_upload_platform_account_label: true,
  inq_open_consultation_days:        true,
  inq_open_consultation_hours:       true,
  inq_open_consultation_cap_limited: true,
  inq_video_support_contact:         true,
  inq_info_text_1:                   true,
  inq_info_text_2:                   true,
  inq_info_text_3:                   true,
} as const;

/**
 * GET /api/practice/inquiry-settings – aktuelle Einstellungen laden.
 */
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

  const data = await prisma.practice.findUnique({
    where: { id: practice.id },
    select: DB_SELECT,
  });

  return NextResponse.json({
    ok: true,
    inqBookingCalendarName:        data?.inq_booking_calendar_name         ?? "",
    inqFindingsReviewCode:         data?.inq_findings_review_code          ?? "",
    inqChronicControlCode:         data?.inq_chronic_control_code          ?? "",
    inqCheckupSecondCode:          data?.inq_checkup_second_code           ?? "",
    inqDoctorOrderCode:            data?.inq_doctor_order_code             ?? "",
    inqDigitalReqTimeMin:          data?.inq_digital_req_time_min          ?? "",
    inqDigitalReqTimeMax:          data?.inq_digital_req_time_max          ?? "",
    inqDigitalReqTimeUnit:         data?.inq_digital_req_time_unit         ?? "",
    inqUploadPlatformName:         data?.inq_upload_platform_name          ?? "",
    inqUploadPlatformAccountLabel: data?.inq_upload_platform_account_label ?? "",
    inqOpenConsultationDays:       data?.inq_open_consultation_days        ?? "",
    inqOpenConsultationHours:      data?.inq_open_consultation_hours       ?? "",
    inqOpenConsultationCapLimited: data?.inq_open_consultation_cap_limited ?? false,
    inqVideoSupportContact:        data?.inq_video_support_contact         ?? "",
    inqInfoText1:                  data?.inq_info_text_1                   ?? "",
    inqInfoText2:                  data?.inq_info_text_2                   ?? "",
    inqInfoText3:                  data?.inq_info_text_3                   ?? "",
  });
}

/**
 * PUT /api/practice/inquiry-settings – Einstellungen aktualisieren.
 *
 * Body: Partial-Objekt mit camelCase-Schlüsseln (nur geänderte Felder nötig).
 * Validierung via validatePracticeInquirySettings().
 */
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

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "Ungültiger JSON-Body." },
      { status: 400 },
    );
  }

  const { data, error } = validatePracticeInquirySettings(
    body as Record<string, unknown>,
  );

  if (error || !data) {
    return NextResponse.json({ ok: false, error }, { status: 422 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true, updated: false });
  }

  try {
    await prisma.practice.update({
      where: { id: practice.id },
      data,
    });
    return NextResponse.json({ ok: true, updated: true });
  } catch (err) {
    console.error("[PUT /api/practice/inquiry-settings] DB error:", err);
    return NextResponse.json(
      { ok: false, error: "Einstellungen konnten nicht gespeichert werden." },
      { status: 503 },
    );
  }
}
