/**
 * Kompakter M5-Summary-Builder für den Anfrage-Assistenten.
 *
 * Erzeugt pro Anliegen eine kurze Krankenblatt-Notiz im Format:
 *   Profil | Entscheidung | Grund | optionaler zweiter Grund
 *
 * Beispiele:
 *   AU | abgelehnt | Frist überschritten
 *   Rezept | möglich
 *   Überweisung | offen | Fachrichtung fehlt
 *   Technik | offen | technisches Problem
 *
 * Regeln:
 * - Keine Fließtexte, keine ganzen Sätze.
 * - Keine ACTION-Texte, keine Links, keine Öffnungszeiten.
 * - Maximal 2 Grund-Segmente pro Eintrag (die wichtigsten zuerst).
 * - M4/Patientenantwort bleibt unverändert.
 * - Keine Änderung an DecisionStatus, Session oder Renderer.
 */

import {
  DecisionStatus,
  ExplanationStatus,
  ActionStatus,
  InquiryCheckpointKind,
  type InquirySection,
  type M5ReasonCode,
  type SpecificRole,
} from "@/lib/inquiries/types";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";

// ---------------------------------------------------------------------------
// Profil-Bezeichnungen (deutsch, lesbar / M5)
// ---------------------------------------------------------------------------

export const M5_PROFILE_CODES: Record<string, string> = {
  AU: "AU",
  PRESCRIPTION: "Rezept",
  REFERRAL: "Überweisung",
  MEDICAL_DOCUMENTS: "Attest",
  APPOINTMENT: "Termin",
  ACUTE_CARE: "Akut",
  LAB: "Labor",
  SAMPLE_COLLECTION: "Probe",
  IMMUNIZATION: "Impfung",
  BILLING: "Abrechnung",
  TECH_SUPPORT: "Technik",
  ONBOARDING: "Anmeldung",
};

// ---------------------------------------------------------------------------
// Decision-Status → lesbarer deutscher Text
// ---------------------------------------------------------------------------

export const M5_DECISION_CODES: Record<DecisionStatus, string> = {
  [DecisionStatus.POSSIBLE]: "möglich",
  [DecisionStatus.NOT_POSSIBLE]: "abgelehnt",
  [DecisionStatus.DISABLED]: "offen",
};

// ---------------------------------------------------------------------------
// Grund-Codes → lesbarer deutscher Kurztext
// ---------------------------------------------------------------------------

export const M5_REASON_LABELS: Record<M5ReasonCode, string> = {
  NO_DATA: "fehlende Angaben",
  NO_DOC: "fehlende Unterlagen",
  NO_SPECIALTY: "Fachrichtung fehlt",
  NO_REPORT: "Facharztbericht fehlt",
  NEED_VISIT: "Arztkontakt nötig",
  EXTERNAL: "externe Zuständigkeit",
  COST: "Selbstzahlerleistung",
  TIME_LIMIT: "Frist überschritten",
  INFECTIOUS: "Infekt-Verdacht",
  WRONG_CHANNEL: "falscher Weg",
  TECH: "technisches Problem",
  HAV: "Hausarztvermittlungsfall",
};

// ---------------------------------------------------------------------------
// SpecificRole → M5ReasonCode (nur entscheidungsrelevante Rollen)
// ---------------------------------------------------------------------------

const SPECIFIC_ROLE_TO_M5_CODE: Partial<Record<SpecificRole, M5ReasonCode>> = {
  MISSING_INFORMATION: "NO_DATA",
  MISSING_DOCUMENT: "NO_DOC",
  CHANNEL_NOT_SUITABLE: "WRONG_CHANNEL",
  EXTERNAL_RESPONSIBILITY: "EXTERNAL",
  RULE_TIME_LIMIT: "TIME_LIMIT",
  RULE_COST_COVERAGE: "COST",
  MEDICAL_REVIEW_REQUIRED: "NEED_VISIT",
  // PROCESS_INFO    → skip (Ablaufhinweis, kein Entscheidungsgrund)
  // OUTCOME_INFO    → skip (positives Ergebnis, kein Blockierungsgrund)
};

// ---------------------------------------------------------------------------
// Hilfs-Funktion: m5Code eines Checkpoints auflösen
// ---------------------------------------------------------------------------

function resolveM5ReasonCode(checkpointId: string): M5ReasonCode | undefined {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2[checkpointId];
  if (!cp) return undefined;

  // Expliziter m5Code auf dem Checkpoint hat Vorrang
  if (cp.m5Code) return cp.m5Code;

  // Ableitung aus specificRole (nur für EXPLANATION-Checkpoints mit SPECIFIC-Scope,
  // sowie GLOBAL MODULAR-Checkpoints die einen M5-Code benötigen)
  if (cp.specificRole) {
    return SPECIFIC_ROLE_TO_M5_CODE[cp.specificRole];
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Haupt-Builder
// ---------------------------------------------------------------------------

/**
 * Erzeugt eine einzelne M5-Kurznotiz für eine Section.
 *
 * Format: `Profil | Entscheidung | Grund | optionaler zweiter Grund`
 *
 * Ausschlüsse:
 * - ACTION-Checkpoints (next steps, nicht Entscheidungsgründe)
 * - DECISION-Checkpoints (werden als Entscheidungscode erfasst)
 * - Checkpoints ohne m5Code (weder explizit noch aus specificRole ableitbar)
 * - PROCESS_INFO / OUTCOME_INFO specificRole (kein Entscheidungsgrund)
 */
export function buildInquiryM5SectionSummary(section: InquirySection): string {
  const profileCode = M5_PROFILE_CODES[section.inquiryId] ?? section.inquiryId;
  const decisionCode = M5_DECISION_CODES[section.decisionStatus] ?? "offen";

  const reasonCodes: M5ReasonCode[] = [];

  for (const [checkpointId, status] of Object.entries(section.checkpointStatuses)) {
    // Nur aktive/gesetzte Checkpoints berücksichtigen
    if (status !== ExplanationStatus.YES && status !== ActionStatus.ACTIVE) continue;

    const cp = INQUIRY_CHECKPOINT_CATALOG_V2[checkpointId];
    if (!cp) continue;

    // ACTION-Checkpoints und DECISION-Checkpoints überspringen
    if (
      cp.kind === InquiryCheckpointKind.ACTION ||
      cp.kind === InquiryCheckpointKind.DECISION
    ) {
      continue;
    }

    const m5Code = resolveM5ReasonCode(checkpointId);
    if (!m5Code) continue;
    if (reasonCodes.includes(m5Code)) continue;

    reasonCodes.push(m5Code);
  }

  // Maximal 2 Grund-Segmente – als lesbare deutsche Kurztexte ausgeben
  const reasonLabels = reasonCodes.slice(0, 2).map((code) => M5_REASON_LABELS[code]);
  const parts = [profileCode, decisionCode, ...reasonLabels];
  return parts.join(" | ");
}

/**
 * Erzeugt M5-Kurznotizen für alle Sections.
 *
 * @param sections – Sections mit Entscheidungsstatus und Checkpoint-Statuses.
 * @returns Geordnete Liste von M5-Kurznotizen (eine pro Anliegen).
 */
export function buildInquiryM5Summary(sections: InquirySection[]): string[] {
  return sections.map(buildInquiryM5SectionSummary);
}
