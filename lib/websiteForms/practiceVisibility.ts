/**
 * Phase 3d: Sichtbarkeits-Helfer für `PatientQuestionnaireSession` in der
 * Praxis-Listen-/Detail-Sicht (`/questionnaires`).
 *
 * Anforderung (Plan-Anpassung 5):
 *   - Interne Sessions (`source != "website"`) bleiben unverändert sichtbar.
 *   - Website-Sessions sind ERST sichtbar, wenn alle drei Bedingungen
 *     erfüllt sind:
 *       1. `source = "website"`
 *       2. `status = "completed"`
 *       3. `confirmed_at IS NOT NULL`
 *
 * Die Predicate-Variante (`isQuestionnaireVisibleToPractice`) wird im
 * API-Detail-/Delete-Endpoint verwendet, damit eine unbestätigte Website-
 * Session weder direkt aufrufbar noch löschbar ist (404, kein 403, analog
 * zur Konvention in `app/api/website-forms/[id]/route.ts`).
 */

import type { Prisma } from "@prisma/client";
import {
  STATUS_AWAITING_EMAIL_CONFIRMATION,
  WEBSITE_SESSION_SOURCE,
} from "./constants";

/**
 * Prisma-`where`-Fragment für `findMany`.
 *
 * Bewusst als getypte Konstante, damit der Caller das Fragment in einem
 * `AND`-Array mit `owner_account_id`-Filter kombinieren kann.
 */
export const PRACTICE_VISIBLE_SESSION_FILTER: Prisma.PatientQuestionnaireSessionWhereInput = {
  OR: [
    { source: { not: WEBSITE_SESSION_SOURCE } },
    {
      AND: [
        { source: WEBSITE_SESSION_SOURCE },
        { status: "completed" },
        { confirmed_at: { not: null } },
      ],
    },
  ],
};

/**
 * Predicate für eine bereits geladene Session (z. B. aus `findUnique`).
 *
 * Spiegelt {@link PRACTICE_VISIBLE_SESSION_FILTER} genau wider; jede
 * Änderung muss in beiden Stellen passieren.
 */
export function isQuestionnaireVisibleToPractice(session: {
  source: string;
  status: string;
  confirmed_at: Date | null;
}): boolean {
  if (session.source !== WEBSITE_SESSION_SOURCE) return true;
  return session.status === "completed" && session.confirmed_at !== null;
}

/** Hilfs-Predicate für Symmetrie (z. B. in Cleanup-Skript / Tests). */
export function isAwaitingEmailConfirmation(session: {
  status: string;
}): boolean {
  return session.status === STATUS_AWAITING_EMAIL_CONFIRMATION;
}
