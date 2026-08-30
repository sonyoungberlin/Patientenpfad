/**
 * Tests für lib/practice/validatePracticeInquirySettings.ts.
 *
 * Prüft den Owner-Validator für alle 17 freigegebenen inq_*-Felder:
 * - Akzeptiert valide vollständige und partielle Inputs
 * - Leerstring → null für jeden Feldtyp
 * - String > 200 Zeichen → Fehler
 * - Info-Text > 300 Zeichen → Fehler
 * - time_unit ungültig → Fehler
 * - timeMin > timeMax → Fehler
 * - Int außerhalb 1–999 → Fehler
 * - inq_billing_cycle_label darf NICHT im Ergebnis-Typ erscheinen
 * - Boolean cap_limited: Checkbox-Semantik
 * - Fehlende Keys: Partial-Update (nicht im data-Objekt)
 */

import {
  validatePracticeInquirySettings,
  type PracticeInquirySettingsData,
} from "@/lib/practice/validatePracticeInquirySettings";

// ---------------------------------------------------------------------------
// Hilfsfunktion: valides vollständiges Body-Objekt
// ---------------------------------------------------------------------------

function validFullBody(): Record<string, unknown> {
  return {
    inqBookingCalendarName:        "Online-Buchungskalender",
    inqFindingsReviewCode:         "BFSP25",
    inqChronicControlCode:         "CHKT25",
    inqCheckupSecondCode:          "CHECK25",
    inqDoctorOrderCode:            "LKBP25",
    inqDigitalReqTimeMin:          "8",
    inqDigitalReqTimeMax:          "12",
    inqDigitalReqTimeUnit:         "Stunden",
    inqUploadPlatformName:         "Doctolib",
    inqUploadPlatformAccountLabel: "Doctolib-Account",
    inqOpenConsultationDays:       "täglich",
    inqOpenConsultationHours:      "9–10 Uhr",
    inqOpenConsultationCapLimited: true,
    inqVideoSupportContact:        "Doctolib Support",
    inqInfoText1:                  "Hinweis 1",
    inqInfoText2:                  "Hinweis 2",
    inqInfoText3:                  "Hinweis 3",
    questionnaireConfirmationText1: "Bestätigung 1",
    questionnaireConfirmationText2: "Bestätigung 2",
    questionnaireConfirmationText3: "Bestätigung 3",
  };
}

// ---------------------------------------------------------------------------
// Gültige Eingaben
// ---------------------------------------------------------------------------

describe("validatePracticeInquirySettings – gültige Eingaben", () => {
  it("akzeptiert vollständigen validen Body", () => {
    const result = validatePracticeInquirySettings(validFullBody());
    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    const d = result.data!;
    expect(d.inq_booking_calendar_name).toBe("Online-Buchungskalender");
    expect(d.inq_findings_review_code).toBe("BFSP25");
    expect(d.inq_chronic_control_code).toBe("CHKT25");
    expect(d.inq_checkup_second_code).toBe("CHECK25");
    expect(d.inq_doctor_order_code).toBe("LKBP25");
    expect(d.inq_digital_req_time_min).toBe(8);
    expect(d.inq_digital_req_time_max).toBe(12);
    expect(d.inq_digital_req_time_unit).toBe("Stunden");
    expect(d.inq_upload_platform_name).toBe("Doctolib");
    expect(d.inq_upload_platform_account_label).toBe("Doctolib-Account");
    expect(d.inq_open_consultation_days).toBe("täglich");
    expect(d.inq_open_consultation_hours).toBe("9–10 Uhr");
    expect(d.inq_open_consultation_cap_limited).toBe(true);
    expect(d.inq_video_support_contact).toBe("Doctolib Support");
    expect(d.inq_info_text_1).toBe("Hinweis 1");
    expect(d.inq_info_text_2).toBe("Hinweis 2");
    expect(d.inq_info_text_3).toBe("Hinweis 3");
    expect(d.questionnaire_confirmation_text_1).toBe("Bestätigung 1");
    expect(d.questionnaire_confirmation_text_2).toBe("Bestätigung 2");
    expect(d.questionnaire_confirmation_text_3).toBe("Bestätigung 3");
  });

  it("akzeptiert time_unit = Werktage", () => {
    const body = { ...validFullBody(), inqDigitalReqTimeUnit: "Werktage" };
    const result = validatePracticeInquirySettings(body);
    expect(result.error).toBeNull();
    expect(result.data?.inq_digital_req_time_unit).toBe("Werktage");
  });

  it("akzeptiert partiellen Body (nur Buchungskalender)", () => {
    const result = validatePracticeInquirySettings({
      inqBookingCalendarName: "MeinKalender",
    });
    expect(result.error).toBeNull();
    const d = result.data!;
    expect(d.inq_booking_calendar_name).toBe("MeinKalender");
    // Andere Felder sollen NICHT im Objekt sein (Partial-Update)
    expect("inq_findings_review_code" in d).toBe(false);
    expect("inq_digital_req_time_min" in d).toBe(false);
  });

  it("akzeptiert leeres Body (kein Update)", () => {
    const result = validatePracticeInquirySettings({});
    expect(result.error).toBeNull();
    expect(result.data).toEqual({});
  });

  it("trimmt führende/nachgestellte Leerzeichen", () => {
    const result = validatePracticeInquirySettings({
      inqBookingCalendarName: "  Kalender  ",
    });
    expect(result.data?.inq_booking_calendar_name).toBe("Kalender");
  });

  it("akzeptiert Integer als Zahl (nicht nur String)", () => {
    const result = validatePracticeInquirySettings({
      inqDigitalReqTimeMin: 5,
      inqDigitalReqTimeMax: 10,
    });
    expect(result.error).toBeNull();
    expect(result.data?.inq_digital_req_time_min).toBe(5);
    expect(result.data?.inq_digital_req_time_max).toBe(10);
  });

  it("akzeptiert min === max", () => {
    const result = validatePracticeInquirySettings({
      inqDigitalReqTimeMin: "8",
      inqDigitalReqTimeMax: "8",
    });
    expect(result.error).toBeNull();
  });

  it("akzeptiert cap_limited als false", () => {
    const result = validatePracticeInquirySettings({
      inqOpenConsultationCapLimited: false,
    });
    expect(result.error).toBeNull();
    expect(result.data?.inq_open_consultation_cap_limited).toBe(false);
  });

  it("akzeptiert Info-Text mit Zeilenumbrüchen", () => {
    const text = "Zeile 1\n- Punkt A\n- Punkt B";
    const result = validatePracticeInquirySettings({ inqInfoText1: text });
    expect(result.error).toBeNull();
    expect(result.data?.inq_info_text_1).toBe(text);
  });
});

// ---------------------------------------------------------------------------
// Leerstring → null
// ---------------------------------------------------------------------------

describe("validatePracticeInquirySettings – Leerstring → null", () => {
  const emptyStringFields = [
    "inqBookingCalendarName",
    "inqFindingsReviewCode",
    "inqChronicControlCode",
    "inqCheckupSecondCode",
    "inqDoctorOrderCode",
    "inqUploadPlatformName",
    "inqUploadPlatformAccountLabel",
    "inqOpenConsultationDays",
    "inqOpenConsultationHours",
    "inqVideoSupportContact",
    "inqInfoText1",
    "inqInfoText2",
    "inqInfoText3",
    "questionnaireConfirmationText1",
    "questionnaireConfirmationText2",
    "questionnaireConfirmationText3",
  ] as const;

  const dbFieldMap: Record<string, keyof PracticeInquirySettingsData> = {
    inqBookingCalendarName:        "inq_booking_calendar_name",
    inqFindingsReviewCode:         "inq_findings_review_code",
    inqChronicControlCode:         "inq_chronic_control_code",
    inqCheckupSecondCode:          "inq_checkup_second_code",
    inqDoctorOrderCode:            "inq_doctor_order_code",
    inqUploadPlatformName:         "inq_upload_platform_name",
    inqUploadPlatformAccountLabel: "inq_upload_platform_account_label",
    inqOpenConsultationDays:       "inq_open_consultation_days",
    inqOpenConsultationHours:      "inq_open_consultation_hours",
    inqVideoSupportContact:        "inq_video_support_contact",
    inqInfoText1:                  "inq_info_text_1",
    inqInfoText2:                  "inq_info_text_2",
    inqInfoText3:                  "inq_info_text_3",
    questionnaireConfirmationText1: "questionnaire_confirmation_text_1",
    questionnaireConfirmationText2: "questionnaire_confirmation_text_2",
    questionnaireConfirmationText3: "questionnaire_confirmation_text_3",
  };

  for (const bodyKey of emptyStringFields) {
    it(`"${bodyKey}" Leerstring → null`, () => {
      const result = validatePracticeInquirySettings({ [bodyKey]: "" });
      expect(result.error).toBeNull();
      const dbKey = dbFieldMap[bodyKey];
      expect(result.data?.[dbKey]).toBeNull();
    });

    it(`"${bodyKey}" Whitespace-only → null`, () => {
      const result = validatePracticeInquirySettings({ [bodyKey]: "   " });
      expect(result.error).toBeNull();
      const dbKey = dbFieldMap[bodyKey];
      expect(result.data?.[dbKey]).toBeNull();
    });
  }

  it("inqDigitalReqTimeMin Leerstring → null", () => {
    const result = validatePracticeInquirySettings({ inqDigitalReqTimeMin: "" });
    expect(result.error).toBeNull();
    expect(result.data?.inq_digital_req_time_min).toBeNull();
  });

  it("inqDigitalReqTimeMax Leerstring → null", () => {
    const result = validatePracticeInquirySettings({ inqDigitalReqTimeMax: "" });
    expect(result.error).toBeNull();
    expect(result.data?.inq_digital_req_time_max).toBeNull();
  });

  it("inqDigitalReqTimeUnit Leerstring → null", () => {
    const result = validatePracticeInquirySettings({ inqDigitalReqTimeUnit: "" });
    expect(result.error).toBeNull();
    expect(result.data?.inq_digital_req_time_unit).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fehlerhafte Eingaben
// ---------------------------------------------------------------------------

describe("validatePracticeInquirySettings – Validierungsfehler", () => {
  it("Bestätigung mit genau 300 Zeichen wird akzeptiert", () => {
    const result = validatePracticeInquirySettings({
      questionnaireConfirmationText1: "x".repeat(300),
    });
    expect(result.error).toBeNull();
  });

  it("Bestätigung mit 301 Zeichen wird abgelehnt", () => {
    const result = validatePracticeInquirySettings({
      questionnaireConfirmationText1: "x".repeat(301),
    });
    expect(result.data).toBeNull();
    expect(result.error).toContain("300");
  });

  it("Bestätigung wird getrimmt und als Plaintext erhalten", () => {
    const result = validatePracticeInquirySettings({
      questionnaireConfirmationText1: "  <b>Text</b>\nZeile 2  ",
    });
    expect(result.data?.questionnaire_confirmation_text_1).toBe(
      "<b>Text</b>\nZeile 2",
    );
  });
  it("String > 200 Zeichen → Fehler", () => {
    const result = validatePracticeInquirySettings({
      inqBookingCalendarName: "x".repeat(201),
    });
    expect(result.data).toBeNull();
    expect(result.error).toContain("inqBookingCalendarName");
  });

  it("Buchungscode > 200 Zeichen → Fehler", () => {
    const result = validatePracticeInquirySettings({
      inqFindingsReviewCode: "A".repeat(201),
    });
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it("Info-Text > 300 Zeichen → Fehler", () => {
    const result = validatePracticeInquirySettings({
      inqInfoText1: "x".repeat(301),
    });
    expect(result.data).toBeNull();
    expect(result.error).toContain("inqInfoText1");
  });

  it("Info-Text 2 > 300 Zeichen → Fehler", () => {
    const result = validatePracticeInquirySettings({
      inqInfoText2: "x".repeat(301),
    });
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it("Info-Text genau 300 Zeichen → OK", () => {
    const result = validatePracticeInquirySettings({
      inqInfoText3: "x".repeat(300),
    });
    expect(result.error).toBeNull();
    expect(result.data?.inq_info_text_3?.length).toBe(300);
  });

  it("String genau 200 Zeichen → OK", () => {
    const result = validatePracticeInquirySettings({
      inqVideoSupportContact: "x".repeat(200),
    });
    expect(result.error).toBeNull();
    expect(result.data?.inq_video_support_contact?.length).toBe(200);
  });

  it("time_unit ungültig → Fehler", () => {
    const result = validatePracticeInquirySettings({
      inqDigitalReqTimeUnit: "Minuten",
    });
    expect(result.data).toBeNull();
    expect(result.error).toContain("Stunden");
  });

  it("time_unit nicht-String → Fehler", () => {
    const result = validatePracticeInquirySettings({
      inqDigitalReqTimeUnit: 42,
    });
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it("timeMin > timeMax → Fehler", () => {
    const result = validatePracticeInquirySettings({
      inqDigitalReqTimeMin: "15",
      inqDigitalReqTimeMax: "10",
    });
    expect(result.data).toBeNull();
    expect(result.error).toContain("Min");
  });

  it("timeMin = 0 → Fehler (unterhalb von 1)", () => {
    const result = validatePracticeInquirySettings({
      inqDigitalReqTimeMin: "0",
    });
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it("timeMax = 1000 → Fehler (oberhalb von 999)", () => {
    const result = validatePracticeInquirySettings({
      inqDigitalReqTimeMax: "1000",
    });
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it("timeMin nicht-numerisch → Fehler", () => {
    const result = validatePracticeInquirySettings({
      inqDigitalReqTimeMin: "abc",
    });
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it("timeMax Dezimalzahl → Fehler", () => {
    const result = validatePracticeInquirySettings({
      inqDigitalReqTimeMax: "3.5",
    });
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it("cap_limited ungültiger Wert → Fehler", () => {
    const result = validatePracticeInquirySettings({
      inqOpenConsultationCapLimited: "ja",
    });
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// inq_billing_cycle_label niemals im Ergebnis-Typ
// ---------------------------------------------------------------------------

describe("validatePracticeInquirySettings – kein billing_cycle_label", () => {
  it("PracticeInquirySettingsData enthält kein inq_billing_cycle_label", () => {
    const result = validatePracticeInquirySettings(validFullBody());
    expect(result.data).not.toBeNull();
    // Prüfung auf Typ-Ebene via keyof
    const keys = Object.keys(result.data!);
    expect(keys).not.toContain("inq_billing_cycle_label");
  });

  it("gesendetes inq_billing_cycle_label-Feld wird ignoriert (kein Fehler, kein Output)", () => {
    const body = {
      ...validFullBody(),
      inqBillingCycleLabel: "quartalsweise",
    };
    const result = validatePracticeInquirySettings(body);
    // Kein Fehler (unbekannte Felder werden ignoriert)
    expect(result.error).toBeNull();
    // Nicht im Output-Objekt
    expect(Object.keys(result.data!)).not.toContain("inq_billing_cycle_label");
    expect(Object.keys(result.data!)).not.toContain("inqBillingCycleLabel");
  });
});

// ---------------------------------------------------------------------------
// Boolean cap_limited: verschiedene Eingangsformate
// ---------------------------------------------------------------------------

describe("validatePracticeInquirySettings – Boolean cap_limited", () => {
  it("true (boolean) → true", () => {
    const result = validatePracticeInquirySettings({
      inqOpenConsultationCapLimited: true,
    });
    expect(result.data?.inq_open_consultation_cap_limited).toBe(true);
  });

  it("false (boolean) → false", () => {
    const result = validatePracticeInquirySettings({
      inqOpenConsultationCapLimited: false,
    });
    expect(result.data?.inq_open_consultation_cap_limited).toBe(false);
  });

  it('"true" (string) → true', () => {
    const result = validatePracticeInquirySettings({
      inqOpenConsultationCapLimited: "true",
    });
    expect(result.data?.inq_open_consultation_cap_limited).toBe(true);
  });

  it('"false" (string) → false', () => {
    const result = validatePracticeInquirySettings({
      inqOpenConsultationCapLimited: "false",
    });
    expect(result.data?.inq_open_consultation_cap_limited).toBe(false);
  });

  it("cap_limited fehlt im Body → nicht im data-Objekt (Partial-Update)", () => {
    const result = validatePracticeInquirySettings({});
    expect(result.error).toBeNull();
    expect("inq_open_consultation_cap_limited" in (result.data ?? {})).toBe(false);
  });
});
