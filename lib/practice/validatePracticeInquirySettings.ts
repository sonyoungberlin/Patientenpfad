/**
 * Owner-Validator für /api/practice/inquiry-settings.
 *
 * Validiert einen JSON-Body (Record<string, unknown>) und gibt
 * ein Prisma-kompatibles Partial-Update-Objekt zurück.
 *
 * Verarbeitet nur die 17 Owner-freigegebenen inq_*-Felder.
 * inq_billing_cycle_label ist bewusst NICHT enthalten (admin-only,
 * siehe docs/inquiry-settings-owner.md §3).
 *
 * Semantik:
 *  - Fehlende Body-Schlüssel → Feld nicht im Update-Objekt (Partial-Update)
 *  - Leerer String nach trim() → null  (Resolver fällt auf PILOT_PRACTICE_INQUIRY_CONFIG zurück)
 *  - String-Felder max. 200 Zeichen (nach trim)
 *  - Info-Texte  max. 300 Zeichen (Zeilenumbrüche erlaubt)
 *  - Ganzzahl-Felder: 1–999; Leerstring → null; Nicht-Zahl → Fehler
 *  - inq_digital_req_time_unit: Whitelist ["Stunden", "Werktage"]; "" → null
 *  - inq_open_consultation_cap_limited: boolean, niemals null
 */

const STRING_MAX = 200;
const INFO_TEXT_MAX = 300;
const CONFIRMATION_TEXT_MAX = 300;
const INT_MIN = 1;
const INT_MAX = 999;

const TIME_UNIT_WHITELIST = ["Stunden", "Werktage"] as const;
type TimeUnit = (typeof TIME_UNIT_WHITELIST)[number];

// ---------------------------------------------------------------------------
// Ergebnis-Typ (Prisma-kompatibel, Partial-Update)
// ---------------------------------------------------------------------------

export interface PracticeInquirySettingsData {
  // Buchungskalender
  inq_booking_calendar_name?: string | null;
  inq_findings_review_code?: string | null;
  inq_chronic_control_code?: string | null;
  inq_checkup_second_code?: string | null;
  inq_doctor_order_code?: string | null;

  // Digitale Anfrage / SLA
  inq_digital_req_time_min?: number | null;
  inq_digital_req_time_max?: number | null;
  inq_digital_req_time_unit?: TimeUnit | null;

  // Upload-Plattform
  inq_upload_platform_name?: string | null;
  inq_upload_platform_account_label?: string | null;

  // Offene Sprechstunde
  inq_open_consultation_days?: string | null;
  inq_open_consultation_hours?: string | null;
  inq_open_consultation_cap_limited?: boolean; // niemals null

  // Video-Support
  inq_video_support_contact?: string | null;

  // Praxis-Info-Texte (M3)
  inq_info_text_1?: string | null;
  inq_info_text_2?: string | null;
  inq_info_text_3?: string | null;

  // Vorkonfigurierte Bestätigungen für Patientenfragebögen
  questionnaire_confirmation_text_1?: string | null;
  questionnaire_confirmation_text_2?: string | null;
  questionnaire_confirmation_text_3?: string | null;
}

export interface ValidateSettingsResult {
  data: PracticeInquirySettingsData | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function parseBodyString(
  body: Record<string, unknown>,
  key: string,
  maxLen: number,
): string | null | "ERR" | "MISSING" {
  if (!(key in body)) return "MISSING";
  const raw = body[key];
  if (typeof raw !== "string") return "ERR";
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed.length > maxLen) return "ERR";
  return trimmed;
}

function parseBodyInt(
  body: Record<string, unknown>,
  key: string,
): number | null | "ERR" | "MISSING" {
  if (!(key in body)) return "MISSING";
  const raw = body[key];
  if (raw === null || raw === undefined || raw === "") return null;
  const str = String(raw).trim();
  if (str === "") return null;
  if (!/^\d+$/.test(str)) return "ERR";
  const parsed = parseInt(str, 10);
  if (isNaN(parsed) || parsed < INT_MIN || parsed > INT_MAX) return "ERR";
  return parsed;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export function validatePracticeInquirySettings(
  body: Record<string, unknown>,
): ValidateSettingsResult {
  const data: PracticeInquirySettingsData = {};

  // ---- String-Felder (max. STRING_MAX) -------------------------------------
  const stringFields = [
    ["inqBookingCalendarName", "inq_booking_calendar_name"],
    ["inqFindingsReviewCode", "inq_findings_review_code"],
    ["inqChronicControlCode", "inq_chronic_control_code"],
    ["inqCheckupSecondCode", "inq_checkup_second_code"],
    ["inqDoctorOrderCode", "inq_doctor_order_code"],
    ["inqUploadPlatformName", "inq_upload_platform_name"],
    ["inqUploadPlatformAccountLabel", "inq_upload_platform_account_label"],
    ["inqOpenConsultationDays", "inq_open_consultation_days"],
    ["inqOpenConsultationHours", "inq_open_consultation_hours"],
    ["inqVideoSupportContact", "inq_video_support_contact"],
  ] as const;

  for (const [bodyKey, dbKey] of stringFields) {
    const val = parseBodyString(body, bodyKey, STRING_MAX);
    if (val === "MISSING") continue;
    if (val === "ERR") {
      return {
        data: null,
        error: `Feld "${bodyKey}" muss ein String mit maximal ${STRING_MAX} Zeichen sein.`,
      };
    }
    data[dbKey] = val;
  }

  // ---- Info-Texte (max. INFO_TEXT_MAX) -------------------------------------
  const infoFields = [
    ["inqInfoText1", "inq_info_text_1"],
    ["inqInfoText2", "inq_info_text_2"],
    ["inqInfoText3", "inq_info_text_3"],
  ] as const;

  for (const [bodyKey, dbKey] of infoFields) {
    const val = parseBodyString(body, bodyKey, INFO_TEXT_MAX);
    if (val === "MISSING") continue;
    if (val === "ERR") {
      return {
        data: null,
        error: `Info-Text "${bodyKey}" darf maximal ${INFO_TEXT_MAX} Zeichen enthalten.`,
      };
    }
    data[dbKey] = val;
  }

  const confirmationFields = [
    ["questionnaireConfirmationText1", "questionnaire_confirmation_text_1"],
    ["questionnaireConfirmationText2", "questionnaire_confirmation_text_2"],
    ["questionnaireConfirmationText3", "questionnaire_confirmation_text_3"],
  ] as const;

  for (const [bodyKey, dbKey] of confirmationFields) {
    const val = parseBodyString(body, bodyKey, CONFIRMATION_TEXT_MAX);
    if (val === "MISSING") continue;
    if (val === "ERR") {
      return {
        data: null,
        error: `Bestätigung "${bodyKey}" darf maximal ${CONFIRMATION_TEXT_MAX} Zeichen enthalten.`,
      };
    }
    data[dbKey] = val;
  }

  // ---- Ganzzahl-Felder -----------------------------------------------------
  const timeMin = parseBodyInt(body, "inqDigitalReqTimeMin");
  if (timeMin === "ERR") {
    return {
      data: null,
      error: "Bearbeitungszeit (Min) muss eine ganze Zahl zwischen 1 und 999 sein.",
    };
  }
  if (timeMin !== "MISSING") data.inq_digital_req_time_min = timeMin;

  const timeMax = parseBodyInt(body, "inqDigitalReqTimeMax");
  if (timeMax === "ERR") {
    return {
      data: null,
      error: "Bearbeitungszeit (Max) muss eine ganze Zahl zwischen 1 und 999 sein.",
    };
  }
  if (timeMax !== "MISSING") data.inq_digital_req_time_max = timeMax;

  // Kreuzprüfung nur wenn beide Felder in diesem Request enthalten sind
  if (timeMin !== "MISSING" && timeMax !== "MISSING" &&
      timeMin !== null && timeMax !== null &&
      timeMin > timeMax) {
    return {
      data: null,
      error: "Bearbeitungszeit Min darf nicht größer als Max sein.",
    };
  }

  // ---- Einheit (Whitelist; "" → null) --------------------------------------
  if ("inqDigitalReqTimeUnit" in body) {
    const raw = body["inqDigitalReqTimeUnit"];
    if (typeof raw !== "string") {
      return {
        data: null,
        error: `Bearbeitungszeit-Einheit muss "Stunden" oder "Werktage" sein.`,
      };
    }
    const trimmed = raw.trim();
    if (trimmed === "") {
      data.inq_digital_req_time_unit = null;
    } else if ((TIME_UNIT_WHITELIST as readonly string[]).includes(trimmed)) {
      data.inq_digital_req_time_unit = trimmed as TimeUnit;
    } else {
      return {
        data: null,
        error: `Bearbeitungszeit-Einheit muss "Stunden" oder "Werktage" sein.`,
      };
    }
  }

  // ---- Checkbox (boolean, niemals null) ------------------------------------
  if ("inqOpenConsultationCapLimited" in body) {
    const raw = body["inqOpenConsultationCapLimited"];
    if (typeof raw === "boolean") {
      data.inq_open_consultation_cap_limited = raw;
    } else if (raw === "true") {
      data.inq_open_consultation_cap_limited = true;
    } else if (raw === "false") {
      data.inq_open_consultation_cap_limited = false;
    } else {
      return {
        data: null,
        error: "inqOpenConsultationCapLimited muss ein Boolean sein.",
      };
    }
  }

  return { data, error: null };
}
