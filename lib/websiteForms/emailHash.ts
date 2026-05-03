/**
 * Phase 3d: Hashing der vom Einreichenden angegebenen E-Mail-Adresse für
 * `PatientQuestionnaireSession.submitter_email_hash`.
 *
 * E-Mails werden bewusst NICHT im Klartext persistiert. Der Hash dient
 * nur als Spam-/Doppel-Submission-Indikator und für Audit-Zwecke.
 */

import { createHash } from "crypto";

/** Normalisiert (trim + lowercase) und bildet den hex-kodierten SHA-256-Hash. */
export function hashSubmitterEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}
