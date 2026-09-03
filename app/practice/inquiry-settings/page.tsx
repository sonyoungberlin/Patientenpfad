/**
 * Anfrage-Einstellungen – praxisbezogene Betriebsvariablen für die
 * Patientenkommunikation (M1/M2/M3).
 *
 * Sichtbar für OWNER und ADMIN der aktuellen Practice.
 * USER und Aufrufer ohne Membership sehen 404 (notFound).
 * Kein Plattform-Admin-Bypass.
 *
 * Lädt alle 17 Owner-freigegebenen inq_*-Felder aus der DB und übergibt
 * sie an das Client-Formular InquirySettingsForm.
 */

import { notFound, redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies, type SessionAccount } from "@/lib/auth";
import { requirePracticeRoleFromCookies } from "@/lib/authz";
import InquirySettingsForm, {
  type InquirySettingsInitial,
} from "./InquirySettingsForm";

export default async function PracticeInquirySettingsPage() {
  const account: SessionAccount | null = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }

  const allowed = await requirePracticeRoleFromCookies([
    PracticeRole.OWNER,
    PracticeRole.ADMIN,
  ]);
  if (!allowed) {
    notFound();
  }

  const practice = account.current_practice;
  if (!practice) {
    notFound();
  }

  let initial: InquirySettingsInitial = {
    inqBookingCalendarName: "",
    inqFindingsReviewCode: "",
    inqChronicControlCode: "",
    inqCheckupSecondCode: "",
    inqDoctorOrderCode: "",
    inqDigitalReqTimeMin: "",
    inqDigitalReqTimeMax: "",
    inqDigitalReqTimeUnit: "",
    inqUploadPlatformName: "",
    inqUploadPlatformAccountLabel: "",
    inqOpenConsultationDays: "",
    inqOpenConsultationHours: "",
    inqOpenConsultationCapLimited: false,
    inqVideoSupportContact: "",
    inqInfoText1: "",
    inqInfoText2: "",
    inqInfoText3: "",
    questionnaireConfirmationText1: "",
    questionnaireConfirmationText2: "",
    questionnaireConfirmationText3: "",
    questionnaireConfirmationSendCopy1: false,
    questionnaireConfirmationSendCopy2: false,
    questionnaireConfirmationSendCopy3: false,
  };

  try {
    const data = await prisma.practice.findUnique({
      where: { id: practice.id },
      select: {
        inq_booking_calendar_name: true,
        inq_findings_review_code: true,
        inq_chronic_control_code: true,
        inq_checkup_second_code: true,
        inq_doctor_order_code: true,
        inq_digital_req_time_min: true,
        inq_digital_req_time_max: true,
        inq_digital_req_time_unit: true,
        inq_upload_platform_name: true,
        inq_upload_platform_account_label: true,
        inq_open_consultation_days: true,
        inq_open_consultation_hours: true,
        inq_open_consultation_cap_limited: true,
        inq_video_support_contact: true,
        inq_info_text_1: true,
        inq_info_text_2: true,
        inq_info_text_3: true,
        questionnaire_confirmation_text_1: true,
        questionnaire_confirmation_text_2: true,
        questionnaire_confirmation_text_3: true,
        questionnaire_confirmation_send_copy_1: true,
        questionnaire_confirmation_send_copy_2: true,
        questionnaire_confirmation_send_copy_3: true,
      },
    });

    if (data) {
      initial = {
        inqBookingCalendarName: data.inq_booking_calendar_name ?? "",
        inqFindingsReviewCode: data.inq_findings_review_code ?? "",
        inqChronicControlCode: data.inq_chronic_control_code ?? "",
        inqCheckupSecondCode: data.inq_checkup_second_code ?? "",
        inqDoctorOrderCode: data.inq_doctor_order_code ?? "",
        inqDigitalReqTimeMin:
          data.inq_digital_req_time_min !== null
            ? String(data.inq_digital_req_time_min)
            : "",
        inqDigitalReqTimeMax:
          data.inq_digital_req_time_max !== null
            ? String(data.inq_digital_req_time_max)
            : "",
        inqDigitalReqTimeUnit: data.inq_digital_req_time_unit ?? "",
        inqUploadPlatformName: data.inq_upload_platform_name ?? "",
        inqUploadPlatformAccountLabel:
          data.inq_upload_platform_account_label ?? "",
        inqOpenConsultationDays: data.inq_open_consultation_days ?? "",
        inqOpenConsultationHours: data.inq_open_consultation_hours ?? "",
        inqOpenConsultationCapLimited:
          data.inq_open_consultation_cap_limited ?? false,
        inqVideoSupportContact: data.inq_video_support_contact ?? "",
        inqInfoText1: data.inq_info_text_1 ?? "",
        inqInfoText2: data.inq_info_text_2 ?? "",
        inqInfoText3: data.inq_info_text_3 ?? "",
        questionnaireConfirmationText1:
          data.questionnaire_confirmation_text_1 ?? "",
        questionnaireConfirmationText2:
          data.questionnaire_confirmation_text_2 ?? "",
        questionnaireConfirmationText3:
          data.questionnaire_confirmation_text_3 ?? "",
        questionnaireConfirmationSendCopy1:
          data.questionnaire_confirmation_send_copy_1 ?? false,
        questionnaireConfirmationSendCopy2:
          data.questionnaire_confirmation_send_copy_2 ?? false,
        questionnaireConfirmationSendCopy3:
          data.questionnaire_confirmation_send_copy_3 ?? false,
      };
    }
  } catch {
    // Falls DB-Fehler: leere Werte (Fallback auf Pilot-Defaults im Resolver)
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "56rem" }}>
      <h1>Anfrage-Einstellungen</h1>
      <p style={{ color: "var(--muted, #666)", marginBottom: "2rem" }}>
        Praxisbezogene Variablen für die Patientenkommunikation.
        Leere Felder verwenden den systemweiten Standardwert (als Platzhalter
        angezeigt).
      </p>
      <InquirySettingsForm initial={initial} />
    </main>
  );
}
