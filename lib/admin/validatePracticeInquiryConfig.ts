/**
 * Validiert FormData eines Admin-Formulars für die 15 inq_*-Felder einer Praxis.
 *
 * Rückgabe:
 *  - { data, error: null }  bei Erfolg
 *  - { data: null, error }  bei Validierungsfehler
 *
 * Semantik:
 *  - Leeres Textfeld → null  (Fallback auf PILOT_PRACTICE_INQUIRY_CONFIG greift im Resolver)
 *  - inq_open_consultation_cap_limited: Checkbox vorhanden = true, fehlt = false (niemals null)
 *  - inq_digital_req_time_unit: Pflicht-Whitelist; ungültiger Wert = Fehler (kein stilles Fallback)
 */

const STRING_MAX = 200;
const INT_MIN = 1;
const INT_MAX = 999;

const TIME_UNIT_WHITELIST = ["Stunden", "Werktage"] as const;
type TimeUnit = (typeof TIME_UNIT_WHITELIST)[number];

export interface PracticeInquiryConfigData {
  // Buchungskalender
  inq_booking_calendar_name: string | null;
  inq_findings_review_code: string | null;
  inq_chronic_control_code: string | null;
  inq_checkup_second_code: string | null;
  inq_doctor_order_code: string | null;

  // Digitale Anfrage / SLA
  inq_digital_req_time_min: number | null;
  inq_digital_req_time_max: number | null;
  inq_digital_req_time_unit: TimeUnit | null;

  // Upload-Plattform
  inq_upload_platform_name: string | null;
  inq_upload_platform_account_label: string | null;

  // Offene Sprechstunde
  inq_open_consultation_days: string | null;
  inq_open_consultation_hours: string | null;
  inq_open_consultation_cap_limited: boolean; // niemals null

  // Abrechnung
  inq_billing_cycle_label: string | null;

  // Technik/Video
  inq_video_support_contact: string | null;
}

export interface ValidateResult {
  data: PracticeInquiryConfigData | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function parseNullableString(
  formData: FormData,
  name: string
): string | null | "ERR" {
  const raw = formData.get(name);
  if (raw === null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === "") return null;
  if (trimmed.length > STRING_MAX) return "ERR";
  return trimmed;
}

function parseNullableInt(
  formData: FormData,
  name: string
): number | null | "ERR" {
  const raw = formData.get(name);
  if (raw === null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === "") return null;
  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed) || !/^\d+$/.test(trimmed)) return "ERR";
  if (parsed < INT_MIN || parsed > INT_MAX) return "ERR";
  return parsed;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export function validatePracticeInquiryConfigInput(
  formData: FormData
): ValidateResult {
  // ---- String-Felder -------------------------------------------------------
  const stringFields = [
    "inq_booking_calendar_name",
    "inq_findings_review_code",
    "inq_chronic_control_code",
    "inq_checkup_second_code",
    "inq_doctor_order_code",
    "inq_upload_platform_name",
    "inq_upload_platform_account_label",
    "inq_open_consultation_days",
    "inq_open_consultation_hours",
    "inq_billing_cycle_label",
    "inq_video_support_contact",
  ] as const;

  const strings: Partial<Record<(typeof stringFields)[number], string | null>> =
    {};

  for (const name of stringFields) {
    const val = parseNullableString(formData, name);
    if (val === "ERR") {
      return {
        data: null,
        error: `Feld "${name}" überschreitet die maximale Länge von ${STRING_MAX} Zeichen.`,
      };
    }
    strings[name] = val;
  }

  // ---- Ganzzahl-Felder -----------------------------------------------------
  const timeMin = parseNullableInt(formData, "inq_digital_req_time_min");
  if (timeMin === "ERR") {
    return {
      data: null,
      error:
        "Bearbeitungszeit (Min) muss eine ganze Zahl zwischen 1 und 999 sein.",
    };
  }

  const timeMax = parseNullableInt(formData, "inq_digital_req_time_max");
  if (timeMax === "ERR") {
    return {
      data: null,
      error:
        "Bearbeitungszeit (Max) muss eine ganze Zahl zwischen 1 und 999 sein.",
    };
  }

  if (timeMin !== null && timeMax !== null && timeMin > timeMax) {
    return {
      data: null,
      error: "Bearbeitungszeit Min darf nicht größer als Max sein.",
    };
  }

  // ---- Einheit (Pflicht-Whitelist) -----------------------------------------
  const rawUnit = formData.get("inq_digital_req_time_unit");
  const trimmedUnit = rawUnit !== null ? String(rawUnit).trim() : "";

  let timeUnit: TimeUnit | null;
  if (trimmedUnit === "") {
    timeUnit = null;
  } else if ((TIME_UNIT_WHITELIST as readonly string[]).includes(trimmedUnit)) {
    timeUnit = trimmedUnit as TimeUnit;
  } else {
    return {
      data: null,
      error: `Bearbeitungszeit-Einheit muss "Stunden" oder "Werktage" sein.`,
    };
  }

  // ---- Checkbox (boolean, niemals null) ------------------------------------
  const capLimited = formData.get("inq_open_consultation_cap_limited") === "true";

  // ---- Zusammenbauen -------------------------------------------------------
  return {
    data: {
      inq_booking_calendar_name: strings.inq_booking_calendar_name ?? null,
      inq_findings_review_code: strings.inq_findings_review_code ?? null,
      inq_chronic_control_code: strings.inq_chronic_control_code ?? null,
      inq_checkup_second_code: strings.inq_checkup_second_code ?? null,
      inq_doctor_order_code: strings.inq_doctor_order_code ?? null,
      inq_digital_req_time_min: timeMin,
      inq_digital_req_time_max: timeMax,
      inq_digital_req_time_unit: timeUnit,
      inq_upload_platform_name: strings.inq_upload_platform_name ?? null,
      inq_upload_platform_account_label:
        strings.inq_upload_platform_account_label ?? null,
      inq_open_consultation_days: strings.inq_open_consultation_days ?? null,
      inq_open_consultation_hours: strings.inq_open_consultation_hours ?? null,
      inq_open_consultation_cap_limited: capLimited,
      inq_billing_cycle_label: strings.inq_billing_cycle_label ?? null,
      inq_video_support_contact: strings.inq_video_support_contact ?? null,
    },
    error: null,
  };
}
