/**
 * Admin-Hilfsfunktionen für die Betreiber-CLI.
 * Kein Frontend, keine Rollen – nur direkte DB-Operationen.
 *
 * Hotfix (PR 1, nach Practice/Membership-Umbau):
 *   Quelle der Wahrheit für die Feature-Flags ist seit Phase P2 die
 *   `current_practice` (= OWNER-Membership) des eingeloggten Accounts —
 *   siehe `lib/auth.ts` (`resolveAccount`) und `lib/authz.ts`
 *   (`effectiveFlags`). Damit Admin-Toggles unter `/admin/accounts` wieder
 *   wirksam sind, schreiben die Toggle-Funktionen den neuen Wert nicht nur
 *   auf `Account.*`, sondern in derselben Transaktion auch auf
 *   `Practice.*` für **alle** Practices, in denen der Account `OWNER` ist.
 *
 *   - Account ohne OWNER-Membership: nur Account-Update, kein Crash
 *     (Sicherheitsnetz für nicht-migrierte Edge Cases / neu registrierte
 *     Accounts ohne Practice).
 *   - Mehrere OWNER-Memberships werden alle bedient (aktuell selten:
 *     P1-Backfill legt 1:1 an; das Modell erlaubt es aber).
 *   - Es werden bewusst **keine** ADMIN-/USER-Practices angefasst — der
 *     Plattform-Admin verändert nur Practices, in denen der betreffende
 *     Account selbst Inhaber ist. Cross-Tenant-Mutation bleibt
 *     ausgeschlossen.
 *   - Spätere Schritte (P5/P6) stellen die Toggles vollständig auf
 *     Practice-IDs um und droppen die Account-Spalten.
 */

import { Prisma, PracticeRole } from "@prisma/client";
import { prisma } from "./prisma";

export type AdminActionResult = { ok: boolean; message: string };

/**
 * Gemeinsamer Schreibpfad: aktualisiert ein einzelnes Feature-Flag auf
 * `Account` und auf allen `Practice`-Datensätzen, in denen der Account
 * `OWNER` ist — atomar in einer Transaktion. Existiert keine
 * OWNER-Membership, wird ausschließlich der Account aktualisiert.
 *
 * Die Funktion ist intentional auf die vier Carry-Over-Flags begrenzt
 * (`is_approved`, `inquiry_assistant_enabled`,
 * `patient_communication_enabled`, `website_forms_enabled`) — alle
 * existieren namensgleich auf beiden Modellen, sodass dasselbe
 * `data`-Objekt verwendet werden kann.
 */
type FlagPatch =
  | { is_approved: boolean }
  | { inquiry_assistant_enabled: boolean }
  | { patient_communication_enabled: boolean }
  | { website_forms_enabled: boolean };

async function updateAccountAndOwnerPractices(
  email: string,
  data: FlagPatch,
  notFoundMessage: string,
  successMessage: string,
): Promise<AdminActionResult> {
  const account = await prisma.account.findUnique({
    where: { email },
    select: {
      id: true,
      memberships: {
        where: { role: PracticeRole.OWNER },
        select: { practice_id: true },
      },
    },
  });
  if (!account) {
    return { ok: false, message: notFoundMessage };
  }

  const ownerPracticeIds: string[] = Array.isArray(account.memberships)
    ? account.memberships.map((m) => m.practice_id)
    : [];

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.account.update({ where: { email }, data }),
    ...ownerPracticeIds.map((id) =>
      prisma.practice.update({ where: { id }, data }),
    ),
  ];

  await prisma.$transaction(ops);

  return { ok: true, message: successMessage };
}

/**
 * Schaltet einen Account per E-Mail frei (`is_approved = true`) und
 * spiegelt den Wert auf alle OWNER-Practices des Accounts.
 * Gibt einen Fehler zurück, wenn die E-Mail unbekannt ist.
 */
export async function approveAccount(
  email: string,
): Promise<AdminActionResult> {
  return updateAccountAndOwnerPractices(
    email,
    { is_approved: true },
    `Kein Account mit E-Mail "${email}" gefunden. Tipp: Tester muss sich zuerst einmal einloggen.`,
    `Account "${email}" wurde freigeschaltet.`,
  );
}

/**
 * Sperrt einen Account per E-Mail (`is_approved = false`) und spiegelt
 * den Wert auf alle OWNER-Practices des Accounts.
 * Gibt einen Fehler zurück, wenn die E-Mail unbekannt ist.
 */
export async function revokeAccount(
  email: string,
): Promise<AdminActionResult> {
  return updateAccountAndOwnerPractices(
    email,
    { is_approved: false },
    `Kein Account mit E-Mail "${email}" gefunden.`,
    `Account "${email}" wurde gesperrt.`,
  );
}

export type AccountSummary = {
  id: string;
  email: string;
  is_approved: boolean;
  is_admin: boolean;
  inquiry_assistant_enabled: boolean;
  patient_communication_enabled: boolean;
  website_forms_enabled: boolean;
  createdAt: Date;
};

/**
 * Gibt alle Accounts sortiert nach Erstellungsdatum zurück.
 */
export async function listAccounts(): Promise<AccountSummary[]> {
  return prisma.account.findMany({
    select: {
      id: true,
      email: true,
      is_approved: true,
      is_admin: true,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: true,
      website_forms_enabled: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Aktiviert den Anfrage-Assistenten für einen Account per E-Mail.
 */
export async function enableInquiryAssistant(
  email: string,
): Promise<AdminActionResult> {
  return updateAccountAndOwnerPractices(
    email,
    { inquiry_assistant_enabled: true },
    `Kein Account mit E-Mail "${email}" gefunden.`,
    `Anfrage-Assistent für "${email}" aktiviert.`,
  );
}

/**
 * Deaktiviert den Anfrage-Assistenten für einen Account per E-Mail.
 */
export async function disableInquiryAssistant(
  email: string,
): Promise<AdminActionResult> {
  return updateAccountAndOwnerPractices(
    email,
    { inquiry_assistant_enabled: false },
    `Kein Account mit E-Mail "${email}" gefunden.`,
    `Anfrage-Assistent für "${email}" deaktiviert.`,
  );
}

/**
 * Aktiviert die Patientenkommunikation (Patientenfragebogen-Funktionen)
 * für einen Account per E-Mail.
 */
export async function enablePatientCommunication(
  email: string,
): Promise<AdminActionResult> {
  return updateAccountAndOwnerPractices(
    email,
    { patient_communication_enabled: true },
    `Kein Account mit E-Mail "${email}" gefunden.`,
    `Patientenkommunikation für "${email}" aktiviert.`,
  );
}

/**
 * Deaktiviert die Patientenkommunikation für einen Account per E-Mail.
 */
export async function disablePatientCommunication(
  email: string,
): Promise<AdminActionResult> {
  return updateAccountAndOwnerPractices(
    email,
    { patient_communication_enabled: false },
    `Kein Account mit E-Mail "${email}" gefunden.`,
    `Patientenkommunikation für "${email}" deaktiviert.`,
  );
}

/**
 * Phase 3a: Aktiviert die Freigabe für öffentliche Website-Fragebögen
 * (`website_forms_enabled = true`) für einen Account per E-Mail.
 */
export async function enableWebsiteForms(
  email: string,
): Promise<AdminActionResult> {
  return updateAccountAndOwnerPractices(
    email,
    { website_forms_enabled: true },
    `Kein Account mit E-Mail "${email}" gefunden.`,
    `Website-Formulare für "${email}" aktiviert.`,
  );
}

/**
 * Phase 3a: Deaktiviert die Freigabe für öffentliche Website-Fragebögen
 * (`website_forms_enabled = false`) für einen Account per E-Mail.
 */
export async function disableWebsiteForms(
  email: string,
): Promise<AdminActionResult> {
  return updateAccountAndOwnerPractices(
    email,
    { website_forms_enabled: false },
    `Kein Account mit E-Mail "${email}" gefunden.`,
    `Website-Formulare für "${email}" deaktiviert.`,
  );
}
