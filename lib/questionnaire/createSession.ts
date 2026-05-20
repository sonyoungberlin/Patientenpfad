/**
 * Phase B Schritt 1: Gemeinsame Service-Funktion zum Erstellen einer
 * `PatientQuestionnaireSession`.
 *
 * Ausgelagert aus `app/api/questionnaire/route.ts`, damit dieselbe Logik
 * später auch vom DigitalRequest-Flow (Phase B Schritt 2) genutzt werden
 * kann, ohne Code zu duplizieren.
 *
 * Verantwortlichkeiten dieser Funktion:
 *   - Token generieren (UUID) + TTL berechnen.
 *   - `deduplicated_questions` via `buildQuestionnaireQuestions` einfrieren.
 *   - `PatientQuestionnaireSession` in der DB anlegen.
 *   - `sessionId`, `token` (Klartext) und den vollständigen `tokenLink`
 *     zurückgeben.
 *
 * NICHT in dieser Funktion:
 *   - HTTP-Request/Response-Verarbeitung (bleibt in der Route).
 *   - Authentifizierung / Authorisierung.
 *   - Eingabevalidierung der Block-IDs (bleibt im Aufrufer, da route und
 *     zukünftige Aufrufer unterschiedliche Fehlerformate brauchen).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildQuestionnaireQuestions } from "@/lib/questionnaire/buildQuestionnaireQuestions";

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 Stunden

export type CreateSessionInput = {
  /** Bereits validierte und gefilterte Block-IDs (min. 1 Eintrag). */
  selectedBlockIds: string[];
  /** Obligatorische interne Patientenreferenz (z. B. PVS-Nummer). */
  patientReference: string;
  /** "de" | "en", nach `normalizeQuestionnaireLanguage` normalisiert. */
  patientLanguage: string;
  /** Pflicht-FK (Doppelschreiben-Konvention). */
  ownerAccountId: string;
  /** Optionaler Mandanten-FK (Practice-first). */
  ownerPracticeId?: string | null;
  /** Optionale Verknüpfung zur auslösenden InquirySession. */
  inquirySessionId?: string | null;
  /** Optionaler SHA-256-Hash des Geburtsdatums (kein Klartext). */
  birthDateHash?: string | null;
  /**
   * Ursprungs-URL für den Token-Link (z. B. `req.nextUrl.origin`).
   * Wird für den zurückgegebenen `tokenLink` verwendet.
   */
  origin: string;
};

export type CreateSessionResult = {
  sessionId: string;
  /** Klartext-Token (UUID). Wird nur einmalig zurückgegeben, nie erneut ausgelesen. */
  token: string;
  /** Vollständige URL für den Patienten: `${origin}/q/${token}`. */
  tokenLink: string;
};

/**
 * Legt eine neue `PatientQuestionnaireSession` an und gibt Session-ID,
 * Token (Klartext) und Token-Link zurück.
 *
 * Wirft bei DB-Fehlern — der Aufrufer ist verantwortlich für Fehlerbehandlung.
 */
export async function createQuestionnaireSession(
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const {
    selectedBlockIds,
    patientReference,
    patientLanguage,
    ownerAccountId,
    ownerPracticeId,
    inquirySessionId,
    birthDateHash,
    origin,
  } = input;

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  const deduplicatedQuestions = buildQuestionnaireQuestions(selectedBlockIds);

  const session = await prisma.patientQuestionnaireSession.create({
    data: {
      token,
      token_expires_at: expiresAt,
      owner_account_id: ownerAccountId,
      ...(ownerPracticeId ? { owner_practice_id: ownerPracticeId } : {}),
      patient_reference: patientReference,
      inquiry_session_id: inquirySessionId ?? null,
      selected_block_ids: selectedBlockIds as Prisma.InputJsonValue,
      deduplicated_questions:
        deduplicatedQuestions as unknown as Prisma.InputJsonValue,
      patient_language: patientLanguage,
      status: "pending",
      ...(birthDateHash ? { birth_date_hash: birthDateHash } : {}),
    },
    select: { id: true },
  });

  const tokenLink = `${origin}/q/${token}`;

  return { sessionId: session.id, token, tokenLink };
}
