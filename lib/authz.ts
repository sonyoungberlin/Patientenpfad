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
 * Phase 1a: zusätzlich zu „eingeloggt + freigeschaltet" muss das Account-Feld
 * `patient_communication_enabled` gesetzt sein. Dieses Feld wird im Admin-UI
 * separat freigeschaltet; Bestandsaccounts mit `is_approved = true` haben es
 * per Backfill bereits auf `true`, sodass sich das beobachtbare Verhalten
 * nicht ändert.
 *
 * Antworten:
 *  - 401 `Nicht angemeldet.`                       → kein gültiges Session-Cookie
 *  - 403 `Account nicht freigeschaltet.`           → Account nicht freigeschaltet
 *  - 403 `Patientenkommunikation nicht freigeschaltet.` → Feature-Gate aus
 */
export async function requirePatientCommunicationAccess(
  req: NextRequest,
): Promise<RequireResult> {
  const result = await requireApprovedAccount(req);
  if (result.error) return result;
  if (!result.account.patient_communication_enabled) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Patientenkommunikation nicht freigeschaltet." },
        { status: 403 },
      ),
    };
  }
  return result;
}

/**
 * Server-Component-Variante für `requirePatientCommunicationAccess`.
 *
 * Liefert den freigeschalteten Account oder `null`. Der Aufrufer entscheidet,
 * ob ein Redirect, eine Fehlerseite o. ä. gerendert wird – analog zum
 * Vorgehen in `app/questionnaires/page.tsx`.
 *
 * Phase 1a: zusätzlich zu „eingeloggt + freigeschaltet" muss
 * `patient_communication_enabled` aktiv sein.
 */
export async function requirePatientCommunicationAccessFromCookies(): Promise<SessionAccount | null> {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) return null;
  if (!account.patient_communication_enabled) return null;
  return account;
}

/**
 * Erwartet einen Account, der öffentliche Website-Fragebögen verwalten darf.
 *
 * Phase 3a: zusätzlich zu „eingeloggt + freigeschaltet" muss das Account-Feld
 * `website_forms_enabled` gesetzt sein. Dieses Feld wird im Admin-UI separat
 * freigeschaltet und ist standardmäßig für ALLE Accounts deaktiviert. Es gibt
 * bewusst keinen Admin-Bypass — auch Admins müssen den Flag tragen, sonst
 * wird der Zugriff verweigert.
 *
 * Phase 3a hat noch keine produktiven Aufrufer; der Helper bildet die
 * technische Grundlage für Phase 3b (öffentliche Routen, Submit-Flow).
 *
 * Antworten:
 *  - 401 `Nicht angemeldet.`                         → kein gültiges Session-Cookie
 *  - 403 `Account nicht freigeschaltet.`             → Account nicht freigeschaltet
 *  - 403 `Website-Formulare nicht freigeschaltet.`   → Feature-Gate aus
 */
export async function requireWebsiteFormsAccess(
  req: NextRequest,
): Promise<RequireResult> {
  const result = await requireApprovedAccount(req);
  if (result.error) return result;
  if (!result.account.website_forms_enabled) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Website-Formulare nicht freigeschaltet." },
        { status: 403 },
      ),
    };
  }
  return result;
}

/**
 * Server-Component-Variante für `requireWebsiteFormsAccess`.
 *
 * Liefert den freigeschalteten Account oder `null`. Der Aufrufer entscheidet,
 * ob ein Redirect, eine Fehlerseite o. ä. gerendert wird.
 *
 * Phase 3a: zusätzlich zu „eingeloggt + freigeschaltet" muss
 * `website_forms_enabled` aktiv sein. Kein Admin-Bypass.
 */
export async function requireWebsiteFormsAccessFromCookies(): Promise<SessionAccount | null> {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) return null;
  if (!account.website_forms_enabled) return null;
  return account;
}

/**
 * Phase 3b: Erwartet einen Account, der die Praxis-UI für öffentliche
 * Website-Fragebögen verwalten darf.
 *
 * Im Unterschied zu `requireWebsiteFormsAccess` (Phase 3a, technische
 * Grundlage) verlangt dieser Helper **zusätzlich** das Feature-Gate
 * `patient_communication_enabled`. Hintergrund: das Anlegen von Website-
 * Fragebögen ist nur sinnvoll für Praxen, die auch Patientenkommunikation
 * grundsätzlich freigeschaltet haben (gleiches Berechtigungsumfeld wie die
 * interne Fragebogen-Liste unter `/questionnaires`).
 *
 * Es gibt bewusst **keinen Admin-Bypass** — auch Admins benötigen beide
 * Flags.
 *
 * Antworten:
 *  - 401 `Nicht angemeldet.`
 *  - 403 `Account nicht freigeschaltet.`
 *  - 403 `Patientenkommunikation nicht freigeschaltet.`
 *  - 403 `Website-Formulare nicht freigeschaltet.`
 */
export async function requireWebsiteFormsManagementAccess(
  req: NextRequest,
): Promise<RequireResult> {
  const result = await requirePatientCommunicationAccess(req);
  if (result.error) return result;
  if (!result.account.website_forms_enabled) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Website-Formulare nicht freigeschaltet." },
        { status: 403 },
      ),
    };
  }
  return result;
}

/**
 * Server-Component-Variante für `requireWebsiteFormsManagementAccess`.
 *
 * Liefert den Account oder `null`. Aufrufer entscheidet über `redirect()`
 * o. ä. Es wird strikt verlangt, dass `is_approved`,
 * `patient_communication_enabled` und `website_forms_enabled` alle gesetzt
 * sind. Kein Admin-Bypass.
 */
export async function requireWebsiteFormsManagementAccessFromCookies(): Promise<SessionAccount | null> {
  const account = await requirePatientCommunicationAccessFromCookies();
  if (!account) return null;
  if (!account.website_forms_enabled) return null;
  return account;
}

/**
 * Darf der gegebene Account den Fragebogen sehen / bearbeiten?
 *
 * Phase 0: Genau dann, wenn der Account der Eigentümer ist. Damit ist das
 * Verhalten identisch zum bisherigen Inline-Check
 * (`session.owner_account_id !== account.id`).
 *
 * Phase 2: `owner_account_id` ist im Schema NOT NULL. Der Parametertyp
 * spiegelt das wider; ein nachgelagerter Admin-Bypass bleibt bewusst aus.
 */
export function canSeeQuestionnaire(
  account: Pick<SessionAccount, "id" | "is_admin">,
  session: { owner_account_id: string },
): boolean {
  // TODO(Phase 1): Admin-Bypass (`account.is_admin === true`) zulassen.
  return session.owner_account_id === account.id;
}
