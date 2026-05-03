/**
 * Zentrale Berechtigungs-Helper.
 *
 * Phase 0: Diese Helper kapseln das **bisherige** Verhalten der API-Routen
 * und Server-Components, ohne es zu verändern. Sie sind die Grundlage für
 * Phase 1, in der zwischen Praxis- und Admin-Sicht unterschieden wird.
 *
 * Konventionen:
 *  - `require*`-Helper geben `{ account, error }` zurück. Bei einem `error`
 *    enthält das Feld eine fertige `NextResponse`, die vom Aufrufer einfach
 *    zurückgegeben werden kann. Im Erfolgsfall ist `error === null` und
 *    `account` ist gesetzt.
 *  - Für Server-Components (Cookies via `next/headers`) gibt es jeweils
 *    eine `*FromCookies`-Variante, die `null` statt einer `NextResponse`
 *    zurückgibt; der Aufrufer entscheidet dann selbst über `redirect()`.
 *  - `canSeeQuestionnaire` ist eine reine Predicate-Funktion ohne
 *    Seiteneffekt.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSessionAccount,
  getSessionAccountFromCookies,
  type SessionAccount,
} from "./auth";

export type RequireResult =
  | { account: SessionAccount; error: null }
  | { account: null; error: NextResponse };

/**
 * Erwartet einen eingeloggten Admin-Account.
 *
 * Antworten (1:1 wie die bisherige lokale `requireAdmin`-Funktion in
 * `app/api/admin/accounts/route.ts`):
 *  - 401 `Nicht eingeloggt.`     → kein gültiges Session-Cookie
 *  - 403 `Kein Admin-Zugriff.`   → Account ist kein Admin
 */
export async function requireAdmin(req: NextRequest): Promise<RequireResult> {
  const account = await getSessionAccount(req);
  if (!account) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Nicht eingeloggt." },
        { status: 401 },
      ),
    };
  }
  if (!account.is_admin) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Kein Admin-Zugriff." },
        { status: 403 },
      ),
    };
  }
  return { account, error: null };
}

/**
 * Erwartet einen eingeloggten und freigeschalteten (`is_approved`) Account.
 *
 * Antworten (1:1 wie der bisherige Inline-Check in
 * `app/api/questionnaire/[id]/route.ts` und `.../pdf/route.ts`):
 *  - 401 `Nicht angemeldet.`             → kein gültiges Session-Cookie
 *  - 403 `Account nicht freigeschaltet.` → Account nicht freigeschaltet
 */
export async function requireApprovedAccount(
  req: NextRequest,
): Promise<RequireResult> {
  const account = await getSessionAccount(req);
  if (!account) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Nicht angemeldet." },
        { status: 401 },
      ),
    };
  }
  if (!account.is_approved) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Account nicht freigeschaltet." },
        { status: 403 },
      ),
    };
  }
  return { account, error: null };
}

/**
 * Erwartet einen Account, der die Patientenkommunikation nutzen darf.
 *
 * Phase 0: Verhalten identisch zu {@link requireApprovedAccount}.
 *
 * In Phase 1 wird hier zusätzlich das neue Account-Feld
 * `patient_communication_enabled` geprüft. Der Helper existiert bereits jetzt,
 * damit Aufrufstellen (DELETE/PDF/POST der Fragebogen-Routen, künftige
 * `/questionnaires`-Praxis-Route) in Phase 0 schon stabil benannt werden
 * können, ohne dass sich ihr Verhalten ändert.
 */
export async function requirePatientCommunicationAccess(
  req: NextRequest,
): Promise<RequireResult> {
  // TODO(Phase 1): zusätzlich `account.patient_communication_enabled` prüfen.
  return requireApprovedAccount(req);
}

/**
 * Server-Component-Variante für `requirePatientCommunicationAccess`.
 *
 * Liefert den freigeschalteten Account oder `null`. Der Aufrufer entscheidet,
 * ob ein Redirect, eine Fehlerseite o. ä. gerendert wird – analog zum
 * bisherigen Vorgehen in `app/admin/questionnaires/page.tsx`.
 *
 * Phase 0: Verhalten identisch zu „eingeloggt UND `is_approved`".
 */
export async function requirePatientCommunicationAccessFromCookies(): Promise<SessionAccount | null> {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) return null;
  // TODO(Phase 1): zusätzlich `account.patient_communication_enabled` prüfen.
  return account;
}

/**
 * Darf der gegebene Account den Fragebogen sehen / bearbeiten?
 *
 * Phase 0: Genau dann, wenn der Account der Eigentümer ist. Damit ist das
 * Verhalten identisch zum bisherigen Inline-Check
 * (`session.owner_account_id !== account.id`).
 *
 * In Phase 1 wird hier ein Admin-Bypass ergänzt; bewusst noch **nicht**
 * jetzt, um in Phase 0 jede fachliche Änderung auszuschließen.
 */
export function canSeeQuestionnaire(
  account: Pick<SessionAccount, "id" | "is_admin">,
  session: { owner_account_id: string | null },
): boolean {
  // TODO(Phase 1): Admin-Bypass (`account.is_admin === true`) zulassen.
  return session.owner_account_id === account.id;
}
