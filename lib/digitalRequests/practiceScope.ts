/**
 * Phase A: Zentrale Logik für die Practice-Skopierung von `DigitalRequest`.
 *
 * Konvention (Spiegel von `lib/questionnaire/practiceScope.ts`):
 *   - Lesen bevorzugt über `account.current_practice.id` →
 *     `owner_practice_id`. Fällt zurück auf den Account-Pfad
 *     (`owner_account_id = account.id`), wenn kein `current_practice`.
 *   - Schreiben (Create): Doppelschreiben — `owner_account_id` immer,
 *     `owner_practice_id` zusätzlich aus `current_practice?.id`.
 *   - Kein Admin-Bypass.
 */

import type { Prisma } from "@prisma/client";
import type { SessionAccount } from "@/lib/auth";

type AccountScope = Pick<SessionAccount, "id" | "current_practice">;

/**
 * Liefert das Prisma-`where`-Fragment, mit dem `DigitalRequest`-Abfragen
 * auf den aktuellen Mandanten beschränkt werden.
 *
 * - Mit `current_practice` → `{ owner_practice_id: <practiceId> }`
 * - Ohne `current_practice` → `{ owner_account_id: account.id }`
 */
export function getOwnershipFilter(
  account: AccountScope,
): Prisma.DigitalRequestWhereInput {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return { owner_practice_id: practiceId };
  }
  return { owner_account_id: account.id };
}

/**
 * Liefert die Pflichtfelder für `prisma.digitalRequest.create`.
 *
 * - `owner_account_id` immer gesetzt (Pflicht).
 * - `owner_practice_id` gesetzt, wenn der Account eine `current_practice` hat.
 */
export function getCreateOwnershipData(account: AccountScope): {
  owner_account_id: string;
  owner_practice_id?: string;
} {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return { owner_account_id: account.id, owner_practice_id: practiceId };
  }
  return { owner_account_id: account.id };
}
