/**
 * Phase P3a: Zentrale Logik für die Practice-Skopierung von
 * `PracticeQuestionnaireForm`.
 *
 * Konvention:
 *   - Lesen bevorzugt über `account.current_practice.id` →
 *     `owner_practice_id`. Fällt zurück auf den Account-Pfad
 *     (`owner_account_id = account.id`), wenn der Session-Account keine
 *     `current_practice` hat (Edge-Case-Login ohne OWNER-Membership).
 *   - Schreiben (Create): Doppelschreiben `owner_account_id` immer aus der
 *     Session, `owner_practice_id` zusätzlich aus `current_practice?.id`
 *     (oder `null`). Updates verändern dieses Feld in P3a NICHT — der P1-
 *     Backfill bleibt alleinige Quelle der Wahrheit für Bestandszeilen.
 *   - Quelle der Wahrheit beim Lesen ist die Practice. Wenn ein Form ein
 *     `owner_practice_id` hat, gewinnen die Practice-Flags gegenüber den
 *     Account-Flags (analog zu `effectiveFlags` in `lib/authz.ts`).
 *   - Kein Admin-Bypass.
 *
 * Convention bei fremden IDs ist weiterhin `notFound()` / 404 (kein 403),
 * siehe `app/website-forms/[id]/page.tsx`.
 */

import type { Prisma } from "@prisma/client";
import type { SessionAccount } from "@/lib/auth";

type AccountScope = Pick<SessionAccount, "id" | "current_practice">;

type FormOwnership = {
  owner_account_id: string;
  owner_practice_id?: string | null;
};

type FlagSet = {
  is_approved: boolean;
  patient_communication_enabled: boolean;
  website_forms_enabled: boolean;
};

type FormFlagsSource = {
  owner_practice?: FlagSet | null;
  owner_account?: FlagSet | null;
};

/**
 * Liefert das Prisma-`where`-Fragment, mit dem `PracticeQuestionnaireForm`
 * für den aktuellen Account gefiltert werden muss.
 *
 * - Mit `current_practice` → `{ owner_practice_id: <practiceId> }`
 *   (Practice-Scope: alle Mitglieder derselben Praxis sehen dieselben
 *   Forms).
 * - Ohne `current_practice` → `{ owner_account_id: account.id }`
 *   (Bestandsverhalten, Edge-Case ohne Membership).
 */
export function getOwnershipFilter(
  account: AccountScope,
): Prisma.PracticeQuestionnaireFormWhereInput {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return { owner_practice_id: practiceId };
  }
  return { owner_account_id: account.id };
}

/**
 * Predicate für eine bereits geladene Form (z. B. aus `findUnique`).
 *
 * Spiegelt {@link getOwnershipFilter} exakt:
 *   - Mit `current_practice` → `form.owner_practice_id === practiceId`.
 *   - Ohne `current_practice` → Fallback auf `owner_account_id`.
 *
 * Wenn `owner_practice_id` der Form `null` ist (noch kein Backfill für
 * diese Zeile), greift der Fallback nur, wenn die Session ebenfalls keine
 * `current_practice` hat — ansonsten ist die Form für die Practice-Sicht
 * unsichtbar (per Spezifikation: kein stilles Nachziehen).
 */
export function ownsForm(account: AccountScope, form: FormOwnership): boolean {
  const practiceId = account.current_practice?.id ?? null;
  if (practiceId) {
    return form.owner_practice_id === practiceId;
  }
  return form.owner_account_id === account.id;
}

/**
 * Gibt die für die Sichtbarkeits-Cascade des öffentlichen Formulars
 * geltenden Flags zurück. Practice gewinnt: wenn `owner_practice` geladen
 * ist, werden seine Flags verwendet — sonst Fallback auf `owner_account`.
 *
 * Liefert `null`, wenn keine der beiden Flag-Quellen vorhanden ist (führt
 * im Caller zu `notFound()`).
 */
export function getEffectivePracticeFlags(
  form: FormFlagsSource,
): FlagSet | null {
  if (form.owner_practice) {
    return {
      is_approved: form.owner_practice.is_approved,
      patient_communication_enabled:
        form.owner_practice.patient_communication_enabled,
      website_forms_enabled: form.owner_practice.website_forms_enabled,
    };
  }
  if (form.owner_account) {
    return {
      is_approved: form.owner_account.is_approved,
      patient_communication_enabled:
        form.owner_account.patient_communication_enabled,
      website_forms_enabled: form.owner_account.website_forms_enabled,
    };
  }
  return null;
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
