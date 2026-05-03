/**
 * Phase P3b: Zentrale Logik für die Practice-Skopierung von
 * `PatientQuestionnaireSession`.
 *
 * Konvention (Spiegel von `lib/websiteForms/practiceScope.ts`):
 *   - Lesen bevorzugt über `account.current_practice.id` →
 *     `owner_practice_id`. Fällt zurück auf den Account-Pfad
 *     (`owner_account_id = account.id`), wenn der Session-Account keine
 *     `current_practice` hat (Edge-Case-Login ohne OWNER-Membership).
 *   - Schreiben (Create): Doppelschreiben `owner_account_id` immer aus der
 *     Session, `owner_practice_id` zusätzlich aus `current_practice?.id`
 *     (oder weglassen). Updates / Deletes / PDF verändern dieses Feld in
 *     P3b NICHT — der P1-Backfill bleibt alleinige Quelle der Wahrheit
 *     für Bestandszeilen.
 *   - Quelle der Wahrheit beim Lesen ist die Practice. Sessions mit
 *     `owner_practice_id = null` sind im Practice-Modus unsichtbar
 *     (kein stilles Nachziehen).
 *   - Kein Admin-Bypass.
 *
 * Convention bei fremden IDs: `notFound()` / 404 (kein 403), siehe
 * `app/website-forms/[id]/route.ts` — die PDF-Route ist eine bewusste
 * Ausnahme und behält ihren historischen 403-Status.
 */

import type { Prisma } from "@prisma/client";
import type { SessionAccount } from "@/lib/auth";

type AccountScope = Pick<SessionAccount, "id" | "current_practice">;

type SessionOwnership = {
  owner_account_id: string;
  owner_practice_id?: string | null;
};

/**
 * Liefert das Prisma-`where`-Fragment, mit dem
 * `PatientQuestionnaireSession` für den aktuellen Account gefiltert
 * werden muss.
 *
 * - Mit `current_practice` → `{ owner_practice_id: <practiceId> }`
 *   (Practice-Scope: alle Mitglieder derselben Praxis sehen dieselben
 *   Sessions).
 * - Ohne `current_practice` → `{ owner_account_id: account.id }`
 *   (Bestandsverhalten, Edge-Case ohne Membership).
 */
export function getOwnershipFilter(
  account: AccountScope,
): Prisma.PatientQuestionnaireSessionWhereInput {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return { owner_practice_id: practiceId };
  }
  return { owner_account_id: account.id };
}

/**
 * Predicate für eine bereits geladene Session (z. B. aus `findUnique`).
 *
 * Spiegelt {@link getOwnershipFilter} exakt:
 *   - Mit `current_practice` → `session.owner_practice_id === practiceId`.
 *   - Ohne `current_practice` → Fallback auf `owner_account_id`.
 *
 * Wenn `owner_practice_id` der Session `null` ist (noch kein Backfill für
 * diese Zeile), greift der Fallback nur, wenn die Session ebenfalls keine
 * `current_practice` hat — ansonsten ist die Session für die Practice-
 * Sicht unsichtbar (per Spezifikation: kein stilles Nachziehen).
 */
export function ownsSession(
  account: AccountScope,
  session: SessionOwnership,
): boolean {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return session.owner_practice_id === practiceId;
  }
  return session.owner_account_id === account.id;
}

/**
 * Datenfragment für Create-Operationen. Doppelschreiben:
 *   - `owner_account_id` immer aus der Session.
 *   - `owner_practice_id` aus `current_practice?.id`. Wenn keine Practice
 *     vorhanden ist, **bleibt das Feld weg** (Schema-Default `null`) —
 *     niemals einen falschen Wert setzen.
 */
export function getCreateOwnershipData(
  account: AccountScope,
): { owner_account_id: string; owner_practice_id?: string } {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return { owner_account_id: account.id, owner_practice_id: practiceId };
  }
  return { owner_account_id: account.id };
}
