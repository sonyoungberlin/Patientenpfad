/**
 * Statische Praxis-Konfiguration für den Anfrage-Assistenten.
 *
 * WICHTIG – Inventurdatei, noch keine Runtime-Nutzung:
 *
 * - Diese Datei wird aktuell von keinem anderen Modul importiert und hat
 *   keinen Einfluss auf das App-Verhalten.
 * - Keine Template-Substitution in textByStatus-Strings.
 * - Keine Entscheidungslogik. Werte hier steuern NICHT den Checkpoint-Status.
 * - PRACTICE_WORKFLOW-Parameter (Buchungscodes, Navigationspfade) sind bewusst
 *   NICHT enthalten – siehe docs/scaling/workflow-normalization.md.
 *
 * Hintergrund und Variablenliste: docs/scaling/practice-config-audit.md
 */

// ---------------------------------------------------------------------------
// Typ
// ---------------------------------------------------------------------------

/**
 * Konfigurierbare Betriebsparameter einer Praxis für den Anfrage-Assistenten.
 *
 * Alle Felder sind readonly. Kein offener Index-Typ. Kein Partial<>.
 * Jede Praxis-Instanz muss alle Felder explizit befüllen.
 */
export type PracticeInquiryConfig = {
  // ---- Buchungskalender --------------------------------------------------
  /** Bezeichnung des Online-Buchungskalenders in der Patientenkommunikation. */
  readonly bookingCalendarName: string;
  /**
   * URL des Online-Buchungskalenders.
   * Leer lassen (""), wenn die URL praxisspezifisch gesetzt werden muss.
   */
  readonly bookingCalendarUrl: string;
  /** Buchungscode für den Termin „Befundbesprechung". */
  readonly findingsReviewBookingCode: string;
  /** Buchungscode für den Termin „Chroniker-Kontrolltermin". */
  readonly chronicControlBookingCode: string;
  /** Buchungscode für den Termin „Check-Up - 2. Termin". */
  readonly checkupSecondBookingCode: string;
  /** Buchungscode für Termine mit ärztlicher Anordnung, z. B. Blutwerte oder EKG. */
  readonly doctorOrderBookingCode: string;
  /**
   * URL für digitale Anfragen.
   * Leer lassen (""), wenn die URL praxisspezifisch gesetzt werden muss.
   */
  readonly digitalRequestUrl: string;

  // ---- Offene Sprechstunde -----------------------------------------------
  /** Wochentage der offenen Sprechstunde, z. B. "täglich" oder "Mo–Fr". */
  readonly openConsultationDays: string;
  /** Zeitfenster der offenen Sprechstunde, z. B. "9–10 Uhr". */
  readonly openConsultationHours: string;
  /** Ob ein Kapazitätshinweis (Auslastung, begrenzte Aufnahme) kommuniziert wird. */
  readonly openConsultationCapacityLimited: boolean;

  // ---- Digitale Anfrage / SLA --------------------------------------------
  /** Untere Schranke der Bearbeitungszeit für digitale Anfragen. */
  readonly digitalRequestProcessingTimeMin: number;
  /** Obere Schranke der Bearbeitungszeit für digitale Anfragen. */
  readonly digitalRequestProcessingTimeMax: number;
  /** Einheit der Bearbeitungszeit. */
  readonly digitalRequestProcessingTimeUnit: "Stunden" | "Werktage";

  // ---- Labor -------------------------------------------------------------
  /** Nüchternzeit in Stunden vor einer Blutentnahme. */
  readonly fastingHours: number;
  /** Ob ein Kaffee-Ausnahme-Hinweis kommuniziert wird. */
  readonly fastingCoffeeNote: boolean;
  /** Typische Laborergebnis-Lieferzeit als Freitext, z. B. "2–5". */
  readonly labResultDaysTypical: string;
  /** Hinweis auf Abrechnungsweg bei Selbstzahler-Laborwerten. */
  readonly labBillingNote: string;

  // ---- Plattform ---------------------------------------------------------
  /** Eigenname der Kommunikations- und Buchungsplattform, z. B. "Doctolib". */
  readonly uploadPlatformName: string;
  /** Bezeichnung des Nutzerkontos auf der Plattform, z. B. "Doctolib-Account". */
  readonly uploadPlatformAccountLabel: string;
  /** Bezeichnung des technischen Supports der Plattform. */
  readonly videoSupportContact: string;

  // ---- Terminbuchung / Versorgungsweg ------------------------------------
  /** Typische Vorlaufzeit für Akuttermin-Buchungen in Stunden. */
  readonly acuteBookingLeadTimeHours: number;
  /** Ob Videosprechstunden angeboten werden. */
  readonly videoConsultationOffered: boolean;
  /** Ob Hausbesuche angeboten werden. */
  readonly homeVisitsOffered: boolean;
  /** Ob die direkte Apothekenübermittlung von Rezepten unterstützt wird. */
  readonly pharmacyDirectTransferSupported: boolean;
  /** Akzeptierte Zahlungsarten vor Ort, z. B. ["EC", "Kreditkarte"]. */
  readonly paymentMethodsAccepted: readonly string[];
  /** Ob die Praxis ausschließlich Erwachsene behandelt. */
  readonly adultsOnlyPractice: boolean;

  // ---- Abrechnung --------------------------------------------------------
  /** Name des externen Abrechnungsdienstleisters oder Partnerlabors. */
  readonly billingPartnerName: string;
  /** Abrechnungsrhythmus als Freitext, z. B. "quartalsweise". */
  readonly billingCycleLabel: string;
  /** Ob Rezepte per Post versendet werden. */
  readonly prescriptionPostalDeliveryAllowed: boolean;
};

// ---------------------------------------------------------------------------
// Pilot-Praxis-Konfiguration
// ---------------------------------------------------------------------------

/**
 * Aktuelle Konfiguration der Pilotpraxis.
 *
 * Diese Konstante spiegelt die Betriebsparameter wider, die bisher direkt
 * in den textByStatus-Strings der Checkpoint-Kataloge hartcodiert sind.
 * Sie hat noch keinen Einfluss auf das App-Verhalten.
 *
 * Quellen:
 * - docs/scaling/practice-config-audit.md (Abschnitt 4)
 * - lib/inquiries/inquiryCheckpointCatalog.ts (Originalwerte)
 */
export const PILOT_PRACTICE_INQUIRY_CONFIG = {
  // ---- Buchungskalender --------------------------------------------------
  bookingCalendarName: "Online-Buchungskalender",
  // URL ist praxisspezifisch – bewusst leer; muss je Deployment gesetzt werden
  bookingCalendarUrl: "",
  findingsReviewBookingCode: "BFSP25",
  chronicControlBookingCode: "CHKT25",
  checkupSecondBookingCode: "CHECK25",
  doctorOrderBookingCode: "LKBP25",
  // URL ist praxisspezifisch – bewusst leer; muss je Deployment gesetzt werden
  digitalRequestUrl: "",

  // ---- Offene Sprechstunde -----------------------------------------------
  openConsultationDays: "täglich",
  openConsultationHours: "9–10 Uhr",
  openConsultationCapacityLimited: true,

  // ---- Digitale Anfrage / SLA --------------------------------------------
  digitalRequestProcessingTimeMin: 8,
  digitalRequestProcessingTimeMax: 12,
  digitalRequestProcessingTimeUnit: "Stunden" as const,

  // ---- Labor -------------------------------------------------------------
  fastingHours: 8,
  fastingCoffeeNote: true,
  labResultDaysTypical: "2–5",
  labBillingNote: "direkt über das Labor",

  // ---- Plattform ---------------------------------------------------------
  uploadPlatformName: "Doctolib",
  uploadPlatformAccountLabel: "Doctolib-Account",
  videoSupportContact: "Doctolib Support",

  // ---- Terminbuchung / Versorgungsweg ------------------------------------
  acuteBookingLeadTimeHours: 24,
  videoConsultationOffered: true,
  homeVisitsOffered: false,
  pharmacyDirectTransferSupported: true,
  paymentMethodsAccepted: ["EC", "Kreditkarte"] as const,
  adultsOnlyPractice: true,

  // ---- Abrechnung --------------------------------------------------------
  billingPartnerName: "Partnerlabor",
  billingCycleLabel: "quartalsweise",
  prescriptionPostalDeliveryAllowed: false,
} as const satisfies PracticeInquiryConfig;

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";

/**
 * Gibt die Praxis-Konfiguration für den Anfrage-Assistenten zurück.
 *
 * Liest die 15 Phase-1-Felder aus der DB und fällt feldweise auf
 * PILOT_PRACTICE_INQUIRY_CONFIG zurück, wenn ein Feld NULL ist oder die
 * Practice nicht gefunden wird.
 *
 * NULL- und undefined-safe: fehlende IDs fallen sofort auf die Pilot-Config zurück.
 */
export async function getPracticeInquiryConfig(
  practiceId: string | null | undefined,
): Promise<PracticeInquiryConfig> {
  if (!practiceId) return PILOT_PRACTICE_INQUIRY_CONFIG;

  const p = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: {
      inq_booking_calendar_name:         true,
      inq_findings_review_code:          true,
      inq_chronic_control_code:          true,
      inq_checkup_second_code:           true,
      inq_doctor_order_code:             true,
      inq_upload_platform_name:          true,
      inq_upload_platform_account_label: true,
      inq_open_consultation_days:        true,
      inq_open_consultation_hours:       true,
      inq_open_consultation_cap_limited: true,
      inq_video_support_contact:         true,
      inq_billing_cycle_label:           true,
      inq_digital_req_time_min:          true,
      inq_digital_req_time_max:          true,
      inq_digital_req_time_unit:         true,
    },
  });

  if (!p) return PILOT_PRACTICE_INQUIRY_CONFIG;

  const P = PILOT_PRACTICE_INQUIRY_CONFIG;

  const VALID_UNITS = ["Stunden", "Werktage"] as const;
  const rawUnit = p.inq_digital_req_time_unit;
  const safeUnit: "Stunden" | "Werktage" =
    rawUnit !== null && (VALID_UNITS as readonly string[]).includes(rawUnit)
      ? (rawUnit as "Stunden" | "Werktage")
      : P.digitalRequestProcessingTimeUnit;

  return {
    ...P,
    bookingCalendarName:              p.inq_booking_calendar_name         ?? P.bookingCalendarName,
    findingsReviewBookingCode:        p.inq_findings_review_code          ?? P.findingsReviewBookingCode,
    chronicControlBookingCode:        p.inq_chronic_control_code          ?? P.chronicControlBookingCode,
    checkupSecondBookingCode:         p.inq_checkup_second_code           ?? P.checkupSecondBookingCode,
    doctorOrderBookingCode:           p.inq_doctor_order_code             ?? P.doctorOrderBookingCode,
    uploadPlatformName:               p.inq_upload_platform_name          ?? P.uploadPlatformName,
    uploadPlatformAccountLabel:       p.inq_upload_platform_account_label ?? P.uploadPlatformAccountLabel,
    openConsultationDays:             p.inq_open_consultation_days        ?? P.openConsultationDays,
    openConsultationHours:            p.inq_open_consultation_hours       ?? P.openConsultationHours,
    openConsultationCapacityLimited:  p.inq_open_consultation_cap_limited ?? P.openConsultationCapacityLimited,
    videoSupportContact:              p.inq_video_support_contact         ?? P.videoSupportContact,
    billingCycleLabel:                p.inq_billing_cycle_label           ?? P.billingCycleLabel,
    digitalRequestProcessingTimeMin:  p.inq_digital_req_time_min          ?? P.digitalRequestProcessingTimeMin,
    digitalRequestProcessingTimeMax:  p.inq_digital_req_time_max          ?? P.digitalRequestProcessingTimeMax,
    digitalRequestProcessingTimeUnit: safeUnit,
  };
}
