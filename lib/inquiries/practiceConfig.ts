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
