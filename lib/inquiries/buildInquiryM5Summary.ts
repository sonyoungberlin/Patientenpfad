/**
 * Kompakter M5-Summary-Builder für den Anfrage-Assistenten.
 *
 * Erzeugt pro Anliegen eine kurze Krankenblatt-Notiz im Format:
 *   PROFILCODE | ENTSCHEIDUNGSCODE | GRUNDCODE_1 | GRUNDCODE_2
 *
 * Beispiele:
 *   AU: REJECTED | TIME_LIMIT
 *   RX: OK | E_RECIPE         (falls E_RECIPE als m5Code hinterlegt)
 *   REF: OPEN | NO_SPECIALTY
 *   TECH: OPEN | TECH
 *
 * Regeln:
 * - Keine Fließtexte, keine ganzen Sätze.
 * - Keine ACTION-Texte, keine Links, keine Öffnungszeiten.
 * - Maximal 2 Grund-Codes pro Eintrag (die wichtigsten zuerst).
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
// Profil-Kurzbezeichnungen (reine Darstellung / M5)
// ---------------------------------------------------------------------------

export const M5_PROFILE_CODES: Record<string, string> = {
  AU: "AU",
  PRESCRIPTION: "RX",
  REFERRAL: "REF",
  MEDICAL_DOCUMENTS: "DOC",
  APPOINTMENT: "APPT",
  ACUTE_CARE: "ACUTE",
  LAB: "LAB",
  SAMPLE_COLLECTION: "SAMPLE",
  IMMUNIZATION: "IMM",
  BILLING: "BILL",
  TECH_SUPPORT: "TECH",
  ONBOARDING: "ONB",
};

// ---------------------------------------------------------------------------
// Decision-Status → kompakter Code
// ---------------------------------------------------------------------------

export const M5_DECISION_CODES: Record<DecisionStatus, string> = {
  [DecisionStatus.POSSIBLE]: "OK",
  [DecisionStatus.NOT_POSSIBLE]: "REJECTED",
  [DecisionStatus.DISABLED]: "OPEN",
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
 * Format: `PROFILCODE | ENTSCHEIDUNGSCODE | GRUNDCODE_1 | GRUNDCODE_2`
 *
 * Ausschlüsse:
 * - ACTION-Checkpoints (next steps, nicht Entscheidungsgründe)
 * - DECISION-Checkpoints (werden als Entscheidungscode erfasst)
 * - Checkpoints ohne m5Code (weder explizit noch aus specificRole ableitbar)
 * - PROCESS_INFO / OUTCOME_INFO specificRole (kein Entscheidungsgrund)
 */
export function buildInquiryM5SectionSummary(section: InquirySection): string {
  const profileCode = M5_PROFILE_CODES[section.inquiryId] ?? section.inquiryId;
  const decisionCode = M5_DECISION_CODES[section.decisionStatus] ?? "OPEN";

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

  // Maximal 2 Grund-Codes
  const limited = reasonCodes.slice(0, 2);
  const parts = [profileCode, decisionCode, ...limited];
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
