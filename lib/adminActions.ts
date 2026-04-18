/**
 * Admin-Hilfsfunktionen für die Betreiber-CLI.
 * Kein Frontend, keine Rollen – nur direkte DB-Operationen.
 */

import { prisma } from "./prisma";

export type AdminActionResult = { ok: boolean; message: string };

/**
 * Schaltet einen Account per E-Mail frei (is_approved = true).
 * Gibt einen Fehler zurück, wenn die E-Mail unbekannt ist.
 */
export async function approveAccount(
  email: string,
): Promise<AdminActionResult> {
  const account = await prisma.account.findUnique({ where: { email } });
  if (!account) {
    return {
      ok: false,
      message: `Kein Account mit E-Mail "${email}" gefunden. Tipp: Tester muss sich zuerst einmal einloggen.`,
    };
  }

  await prisma.account.update({
    where: { email },
    data: { is_approved: true },
  });

  return { ok: true, message: `Account "${email}" wurde freigeschaltet.` };
}

/**
 * Sperrt einen Account per E-Mail (is_approved = false).
 * Gibt einen Fehler zurück, wenn die E-Mail unbekannt ist.
 */
export async function revokeAccount(
  email: string,
): Promise<AdminActionResult> {
  const account = await prisma.account.findUnique({ where: { email } });
  if (!account) {
    return {
      ok: false,
      message: `Kein Account mit E-Mail "${email}" gefunden.`,
    };
  }

  await prisma.account.update({
    where: { email },
    data: { is_approved: false },
  });

  return { ok: true, message: `Account "${email}" wurde gesperrt.` };
}

export type AccountSummary = {
  id: string;
  email: string;
  is_approved: boolean;
  is_admin: boolean;
  createdAt: Date;
};

/**
 * Gibt alle Accounts sortiert nach Erstellungsdatum zurück.
 */
export async function listAccounts(): Promise<AccountSummary[]> {
  return prisma.account.findMany({
    select: { id: true, email: true, is_approved: true, is_admin: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}
