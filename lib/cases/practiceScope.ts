/**
 * Zentrale Logik für die Practice-Skopierung von `CaseSession`.
 *
 * Konvention (Spiegel von `lib/questionnaire/practiceScope.ts`):
 *   - Lesen bevorzugt über `account.current_practice.id` →
 *     `owner_practice_id`. Fällt zurück auf den Account-Pfad
 *     (`owner_account_id = account.id`), wenn der Session-Account keine
 *     `current_practice` hat (Edge-Case-Login ohne Membership).
 *   - Schreiben (Create): Doppelschreiben — `owner_account_id` immer,
 *     `owner_practice_id` zusätzlich aus `current_practice?.id`.
 *   - Einzelzugriff: Bei Practice-Scope wird zusätzlich auf Fälle mit
 *     `owner_practice_id = NULL` per `owner_account_id` zurückgefallen,
 *     damit Bestandszeilen ohne Backfill noch zugänglich bleiben.
 *   - Kein Admin-Bypass.
 */

import type { Prisma } from "@prisma/client";
import type { SessionAccount } from "@/lib/auth";

type AccountScope = Pick<SessionAccount, "id" | "current_practice">;

type CaseSessionOwnership = {
  owner_account_id: string | null;
  owner_practice_id?: string | null;
};

/**
 * Liefert das Prisma-`where`-Fragment, mit dem `CaseSession`-Abfragen
 * auf den aktuellen Mandanten beschränkt werden.
 *
 * - Mit `current_practice` → `{ owner_practice_id: <practiceId> }`
 *   (Practice-Scope: alle Mitglieder derselben Praxis sehen dieselben Fälle).
 * - Ohne `current_practice` → `{ owner_account_id: account.id }`
 *   (Bestandsverhalten, Edge-Case ohne Membership).
 */
export function getCaseOwnershipFilter(
  account: AccountScope,
): Prisma.CaseSessionWhereInput {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return { owner_practice_id: practiceId };
  }
  return { owner_account_id: account.id };
}

/**
 * Liefert die Pflichtfelder für `prisma.caseSession.create`.
 *
 * - `owner_account_id` immer gesetzt (Pflicht).
 * - `owner_practice_id` gesetzt, wenn der Account eine `current_practice` hat.
 */
export function getCaseCreateOwnershipData(account: AccountScope): {
  owner_account_id: string;
  owner_practice_id?: string;
} {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return { owner_account_id: account.id, owner_practice_id: practiceId };
  }
  return { owner_account_id: account.id };
}

/**
 * Prüft, ob der Account Zugriff auf eine gegebene CaseSession hat.
 *
 * - Mit `current_practice`:
 *     1. `session.owner_practice_id === practiceId` → true (normaler Practice-Scope).
 *     2. `session.owner_practice_id === null && session.owner_account_id === account.id`
 *        → true (Fallback für Bestandszeilen ohne `owner_practice_id`-Backfill).
 * - Ohne `current_practice` → Fallback auf `owner_account_id`.
 */
export function canAccessCaseSession(
  account: AccountScope,
  session: CaseSessionOwnership,
): boolean {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    if (session.owner_practice_id === practiceId) return true;
    // Fallback: Bestandszeile ohne owner_practice_id, aber selber Account
    if (
      session.owner_practice_id == null &&
      session.owner_account_id === account.id
    ) {
      return true;
    }
    return false;
  }
  return session.owner_account_id === account.id;
}
