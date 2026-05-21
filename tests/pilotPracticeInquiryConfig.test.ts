/**
 * Tests für lib/inquiries/practiceConfig.ts.
 *
 * Prüft ausschließlich die statische Konfigurationskonstante –
 * keine App-Logik, keine Runtime-Komponenten.
 */

import {
  PILOT_PRACTICE_INQUIRY_CONFIG,
  type PracticeInquiryConfig,
} from "@/lib/inquiries/practiceConfig";

describe("PILOT_PRACTICE_INQUIRY_CONFIG", () => {
  const cfg = PILOT_PRACTICE_INQUIRY_CONFIG;

  // ---- Typ-Vollständigkeit -----------------------------------------------

  it("erfüllt den PracticeInquiryConfig-Typ vollständig", () => {
    // satisfies-Check zur Compile-Zeit; dieser Test bestätigt die Laufzeit-Existenz.
    const typed: PracticeInquiryConfig = cfg;
    expect(typed).toBeDefined();
  });

  // ---- Buchungskalender --------------------------------------------------

  it("bookingCalendarName ist ein nicht-leerer String", () => {
    expect(typeof cfg.bookingCalendarName).toBe("string");
    expect(cfg.bookingCalendarName.length).toBeGreaterThan(0);
  });

  it("bookingCalendarUrl und digitalRequestUrl sind als Platzhalter bewusst leer", () => {
    // Leere URLs sind in Phase 1 gewollt – dokumentierter Platzhalter.
    expect(cfg.bookingCalendarUrl).toBe("");
    expect(cfg.digitalRequestUrl).toBe("");
  });

  // ---- Offene Sprechstunde -----------------------------------------------

  it("openConsultationDays ist ein nicht-leerer String", () => {
    expect(typeof cfg.openConsultationDays).toBe("string");
    expect(cfg.openConsultationDays.length).toBeGreaterThan(0);
  });

  it("openConsultationHours ist ein nicht-leerer String", () => {
    expect(typeof cfg.openConsultationHours).toBe("string");
    expect(cfg.openConsultationHours.length).toBeGreaterThan(0);
  });

  // ---- Digitale Anfrage / SLA --------------------------------------------

  it("processingTimeMin ist kleiner als processingTimeMax", () => {
    expect(cfg.digitalRequestProcessingTimeMin).toBeLessThan(
      cfg.digitalRequestProcessingTimeMax
    );
  });

  it("processingTimeUnit ist 'Stunden' oder 'Werktage'", () => {
    expect(["Stunden", "Werktage"]).toContain(cfg.digitalRequestProcessingTimeUnit);
  });

  it("processingTimeMin und processingTimeMax sind positive Zahlen", () => {
    expect(cfg.digitalRequestProcessingTimeMin).toBeGreaterThan(0);
    expect(cfg.digitalRequestProcessingTimeMax).toBeGreaterThan(0);
  });

  // ---- Labor -------------------------------------------------------------

  it("fastingHours liegt in medizinisch plausiblem Bereich (6–24)", () => {
    expect(cfg.fastingHours).toBeGreaterThanOrEqual(6);
    expect(cfg.fastingHours).toBeLessThanOrEqual(24);
  });

  it("labResultDaysTypical ist ein nicht-leerer String", () => {
    expect(typeof cfg.labResultDaysTypical).toBe("string");
    expect(cfg.labResultDaysTypical.length).toBeGreaterThan(0);
  });

  it("labBillingNote ist ein nicht-leerer String", () => {
    expect(typeof cfg.labBillingNote).toBe("string");
    expect(cfg.labBillingNote.length).toBeGreaterThan(0);
  });

  // ---- Plattform ---------------------------------------------------------

  it("uploadPlatformName ist ein nicht-leerer String", () => {
    expect(typeof cfg.uploadPlatformName).toBe("string");
    expect(cfg.uploadPlatformName.length).toBeGreaterThan(0);
  });

  it("uploadPlatformAccountLabel ist ein nicht-leerer String", () => {
    expect(typeof cfg.uploadPlatformAccountLabel).toBe("string");
    expect(cfg.uploadPlatformAccountLabel.length).toBeGreaterThan(0);
  });

  it("videoSupportContact ist ein nicht-leerer String", () => {
    expect(typeof cfg.videoSupportContact).toBe("string");
    expect(cfg.videoSupportContact.length).toBeGreaterThan(0);
  });

  // ---- Terminbuchung / Versorgungsweg ------------------------------------

  it("acuteBookingLeadTimeHours ist nicht negativ", () => {
    expect(cfg.acuteBookingLeadTimeHours).toBeGreaterThanOrEqual(0);
  });

  it("paymentMethodsAccepted ist ein nicht-leeres Array", () => {
    expect(Array.isArray(cfg.paymentMethodsAccepted)).toBe(true);
    expect(cfg.paymentMethodsAccepted.length).toBeGreaterThanOrEqual(1);
  });

  it("alle Zahlungsarten in paymentMethodsAccepted sind nicht-leere Strings", () => {
    for (const method of cfg.paymentMethodsAccepted) {
      expect(typeof method).toBe("string");
      expect(method.length).toBeGreaterThan(0);
    }
  });

  // ---- Abrechnung --------------------------------------------------------

  it("billingPartnerName ist ein nicht-leerer String", () => {
    expect(typeof cfg.billingPartnerName).toBe("string");
    expect(cfg.billingPartnerName.length).toBeGreaterThan(0);
  });

  it("billingCycleLabel ist ein nicht-leerer String", () => {
    expect(typeof cfg.billingCycleLabel).toBe("string");
    expect(cfg.billingCycleLabel.length).toBeGreaterThan(0);
  });

  // ---- Keine unerwarteten Felder (kein offener Index-Typ) ----------------

  it("enthält keine PRACTICE_WORKFLOW-Parameter (Buchungscodes, Navigationspfade)", () => {
    const keys = Object.keys(cfg);
    expect(keys).not.toContain("bookingCode");
    expect(keys).not.toContain("bookingNavigationPath");
    expect(keys).not.toContain("appointmentTypeLabel");
  });
});
