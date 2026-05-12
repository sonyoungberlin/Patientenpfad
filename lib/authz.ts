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
import { PracticeRole } from "@prisma/client";
import {
  getSessionAccount,
  getSessionAccountFromCookies,
  type SessionAccount,
  type SessionPractice,
} from "./auth";

export type RequireResult =
  | { account: SessionAccount; error: null }
  | { account: null; error: NextResponse };

/**
 * Phase P2: Liefert die wirksamen Feature-Flags eines Session-Accounts.
 *
 * Quelle der Wahrheit ist ab P2 die `current_practice` (OWNER-Membership des
 * Logins). Existiert keine Practice — z. B. bei nicht-migrierten Edge Cases
 * oder in Test-Doubles ohne `memberships` —, wird auf die historischen
 * Account-Flags zurückgefallen. `resolveAccount` spiegelt diese Werte
 * zusätzlich auf das Top-Level-Objekt, damit auch die ~25 bestehenden
 * Inline-Checks (`!account.is_approved`, `!account.inquiry_assistant_enabled`)
 * automatisch die Practice-Werte sehen, ohne dass die Routen angefasst werden.
 */
function effectiveFlags(account: SessionAccount): {
  is_approved: boolean;
  patient_communication_enabled: boolean;
  website_forms_enabled: boolean;
} {
  const p = account.current_practice;
  return p
    ? {
        is_approved: p.is_approved,
        patient_communication_enabled: p.patient_communication_enabled,
        website_forms_enabled: p.website_forms_enabled,
      }
    : {
        is_approved: account.is_approved,
        patient_communication_enabled: account.patient_communication_enabled,
        website_forms_enabled: account.website_forms_enabled,
      };
}

/**
 * Phase P2: Reiner Selektor — gibt die aktive Practice eines Session-Accounts
 * zurück oder `null`. Kein DB-Zugriff. Einziger Punkt für künftige
 * Quellenwechsel (Praxis-Wechsler, Admin-Impersonation o. ä.).
 */
export function getCurrentPractice(
  account: Pick<SessionAccount, "current_practice">,
): SessionPractice | null {
  return account.current_practice ?? null;
}

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
  if (!effectiveFlags(account).is_approved) {
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
  if (!effectiveFlags(result.account).patient_communication_enabled) {
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
 *
 * Phase P2: Quelle der Wahrheit für die Flags ist `current_practice`
 * (gespiegelt durch `resolveAccount`); historische Account-Werte greifen nur
 * als Fallback.
 */
export async function requirePatientCommunicationAccessFromCookies(): Promise<SessionAccount | null> {
  const account = await getSessionAccountFromCookies();
  if (!account) return null;
  const flags = effectiveFlags(account);
  if (!flags.is_approved) return null;
  if (!flags.patient_communication_enabled) return null;
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
  if (!effectiveFlags(result.account).website_forms_enabled) {
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
  if (!account) return null;
  const flags = effectiveFlags(account);
  if (!flags.is_approved) return null;
  if (!flags.website_forms_enabled) return null;
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
  if (!effectiveFlags(result.account).website_forms_enabled) {
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
 *
 * Phase P2: Quelle der Wahrheit für die Flags ist `current_practice`
 * (gespiegelt durch `resolveAccount`); historische Account-Werte greifen nur
 * als Fallback.
 */
export async function requireWebsiteFormsManagementAccessFromCookies(): Promise<SessionAccount | null> {
  const account = await requirePatientCommunicationAccessFromCookies();
  if (!account) return null;
  if (!effectiveFlags(account).website_forms_enabled) return null;
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

/**
 * Phase P2: Erwartet einen eingeloggten Account mit einer Membership in der
 * geprüften Practice und einer Rolle aus `allowedRoles`.
 *
 * Quelle der Rolle: `account.memberships` (im selben Prisma-Call wie der
 * Account geladen, kein zusätzlicher Roundtrip).
 *
 * Geprüfte Practice:
 *   - explizit über `opts.practiceId`, sonst
 *   - implizit über `account.current_practice?.id` (OWNER-Membership des
 *     Logins).
 *
 * Antworten:
 *   - 401 `Nicht angemeldet.`        → kein gültiges Session-Cookie
 *   - 403 `Kein Praxiszugriff.`      → keine Membership zur Practice
 *   - 403 `Rolle nicht ausreichend.` → Rolle nicht in `allowedRoles`
 *
 * Es gibt **bewusst keinen Plattform-Admin-Bypass** (`account.is_admin`).
 * Plattform-Admin und Praxis-Rolle sind orthogonal; Admin-Komfortzugriffe
 * werden erst in einer späteren Phase und ausschließlich über explizite
 * Impersonation modelliert.
 *
 * In Phase P2 hat dieser Helper noch **keine produktiven Aufrufer**; er ist
 * die technische Grundlage für P3/P4 und wird ausschließlich durch Unit-
 * Tests abgedeckt.
 */
export async function requirePracticeRole(
  req: NextRequest,
  allowedRoles: PracticeRole[],
  opts?: { practiceId?: string },
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

  const practiceId = opts?.practiceId ?? account.current_practice?.id ?? null;
  if (!practiceId) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Kein Praxiszugriff." },
        { status: 403 },
      ),
    };
  }

  const membership = account.memberships.find(
    (m) => m.practice_id === practiceId,
  );
  if (!membership) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Kein Praxiszugriff." },
        { status: 403 },
      ),
    };
  }

  if (!allowedRoles.includes(membership.role)) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Rolle nicht ausreichend." },
        { status: 403 },
      ),
    };
  }

  return { account, error: null };
}

/**
 * Server-Component-Variante für `requirePracticeRole`.
 *
 * Liefert den Account oder `null`. Der Aufrufer entscheidet über
 * `redirect()` o. ä. Auch hier kein Plattform-Admin-Bypass.
 *
 * In Phase P2 ohne produktive Aufrufer.
 */
export async function requirePracticeRoleFromCookies(
  allowedRoles: PracticeRole[],
  opts?: { practiceId?: string },
): Promise<SessionAccount | null> {
  const account = await getSessionAccountFromCookies();
  if (!account) return null;

  const practiceId = opts?.practiceId ?? account.current_practice?.id ?? null;
  if (!practiceId) return null;

  const membership = account.memberships.find(
    (m) => m.practice_id === practiceId,
  );
  if (!membership) return null;
  if (!allowedRoles.includes(membership.role)) return null;

  return account;
}

function getCurrentPracticeRoleInternal(
  account: Pick<SessionAccount, "current_practice" | "memberships">,
): PracticeRole | null {
  const practiceId = account.current_practice?.id ?? null;
  if (!practiceId) return null;
  const memberships = Array.isArray(
    (account as { memberships?: unknown }).memberships,
  )
    ? (account as { memberships: Array<{ practice_id: string; role: PracticeRole }> }).memberships
    : [];
  return (
    memberships.find((m) => m.practice_id === practiceId)?.role ??
    null
  );
}

type RoleCapabilityOptions = {
  // Legacy fallback: alte Accounts ohne aktuelle Practice nicht hart sperren.
  allowNoPracticeFallback?: boolean;
};

function hasCurrentPracticeRole(
  account: Pick<SessionAccount, "current_practice" | "memberships">,
  allowedRoles: PracticeRole[],
  opts?: RoleCapabilityOptions,
): boolean {
  const role = getCurrentPracticeRoleInternal(account);
  if (!role) return opts?.allowNoPracticeFallback === true;
  return allowedRoles.includes(role);
}

export function getCurrentPracticeRole(
  account: Pick<SessionAccount, "current_practice" | "memberships">,
): PracticeRole | null {
  return getCurrentPracticeRoleInternal(account);
}

export function isInboxOnlyAccount(
  account: Pick<SessionAccount, "current_practice" | "memberships">,
): boolean {
  return getCurrentPracticeRoleInternal(account) === PracticeRole.INBOX_ONLY;
}

export async function requireQuestionnaireInboxAccess(
  req: NextRequest,
): Promise<RequireResult> {
  const base = await requirePatientCommunicationAccess(req);
  if (base.error) return base;

  const allowed = hasCurrentPracticeRole(
    base.account,
    [
      PracticeRole.OWNER,
      PracticeRole.ADMIN,
      PracticeRole.USER,
      PracticeRole.INBOX_ONLY,
    ],
    { allowNoPracticeFallback: true },
  );
  if (!allowed) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Rolle nicht ausreichend." },
        { status: 403 },
      ),
    };
  }

  return base;
}

export async function requireQuestionnaireInboxAccessFromCookies(): Promise<SessionAccount | null> {
  const account = await requirePatientCommunicationAccessFromCookies();
  if (!account) return null;
  const allowed = hasCurrentPracticeRole(
    account,
    [
      PracticeRole.OWNER,
      PracticeRole.ADMIN,
      PracticeRole.USER,
      PracticeRole.INBOX_ONLY,
    ],
    { allowNoPracticeFallback: true },
  );
  return allowed ? account : null;
}

export async function requireQuestionnaireSendAccess(
  req: NextRequest,
): Promise<RequireResult> {
  const base = await requirePatientCommunicationAccess(req);
  if (base.error) return base;

  const allowed = hasCurrentPracticeRole(
    base.account,
    [PracticeRole.OWNER, PracticeRole.ADMIN, PracticeRole.USER],
    { allowNoPracticeFallback: true },
  );
  if (!allowed) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Rolle nicht ausreichend." },
        { status: 403 },
      ),
    };
  }

  return base;
}

export async function requireInquiriesAccess(
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

  if (!effectiveFlags(account).is_approved) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Account nicht freigeschaltet." },
        { status: 403 },
      ),
    };
  }

  if (!account.inquiry_assistant_enabled && !account.is_admin) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Kein Zugriff auf den Anfrage-Assistenten." },
        { status: 403 },
      ),
    };
  }

  const allowed = hasCurrentPracticeRole(
    account,
    [PracticeRole.OWNER, PracticeRole.ADMIN, PracticeRole.USER],
    { allowNoPracticeFallback: true },
  );
  if (!allowed) {
    return {
      account: null,
      error: NextResponse.json(
        { ok: false, error: "Rolle nicht ausreichend." },
        { status: 403 },
      ),
    };
  }

  return { account, error: null };
}

export async function requireInquiriesAccessFromCookies(): Promise<SessionAccount | null> {
  const account = await getSessionAccountFromCookies();
  if (!account) return null;
  if (!effectiveFlags(account).is_approved) return null;
  if (!account.inquiry_assistant_enabled && !account.is_admin) return null;

  const allowed = hasCurrentPracticeRole(
    account,
    [PracticeRole.OWNER, PracticeRole.ADMIN, PracticeRole.USER],
    { allowNoPracticeFallback: true },
  );
  return allowed ? account : null;
}
