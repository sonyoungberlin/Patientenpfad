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
  const account = await prisma.account.findUnique({
    where: { email },
    select: { id: true },
  });
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
  const account = await prisma.account.findUnique({
    where: { email },
    select: { id: true },
  });
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
  const account = await prisma.account.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!account) {
    return { ok: false, message: `Kein Account mit E-Mail "${email}" gefunden.` };
  }
  await prisma.account.update({
    where: { email },
    data: { inquiry_assistant_enabled: true },
  });
  return { ok: true, message: `Anfrage-Assistent für "${email}" aktiviert.` };
}

/**
 * Deaktiviert den Anfrage-Assistenten für einen Account per E-Mail.
 */
export async function disableInquiryAssistant(
  email: string,
): Promise<AdminActionResult> {
  const account = await prisma.account.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!account) {
    return { ok: false, message: `Kein Account mit E-Mail "${email}" gefunden.` };
  }
  await prisma.account.update({
    where: { email },
    data: { inquiry_assistant_enabled: false },
  });
  return { ok: true, message: `Anfrage-Assistent für "${email}" deaktiviert.` };
}

/**
 * Aktiviert die Patientenkommunikation (Patientenfragebogen-Funktionen)
 * für einen Account per E-Mail.
 */
export async function enablePatientCommunication(
  email: string,
): Promise<AdminActionResult> {
  const account = await prisma.account.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!account) {
    return { ok: false, message: `Kein Account mit E-Mail "${email}" gefunden.` };
  }
  await prisma.account.update({
    where: { email },
    data: { patient_communication_enabled: true },
  });
  return { ok: true, message: `Patientenkommunikation für "${email}" aktiviert.` };
}

/**
 * Deaktiviert die Patientenkommunikation für einen Account per E-Mail.
 */
export async function disablePatientCommunication(
  email: string,
): Promise<AdminActionResult> {
  const account = await prisma.account.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!account) {
    return { ok: false, message: `Kein Account mit E-Mail "${email}" gefunden.` };
  }
  await prisma.account.update({
    where: { email },
    data: { patient_communication_enabled: false },
  });
  return { ok: true, message: `Patientenkommunikation für "${email}" deaktiviert.` };
}

/**
 * Phase 3a: Aktiviert die Freigabe für öffentliche Website-Fragebögen
 * (`website_forms_enabled = true`) für einen Account per E-Mail.
 *
 * Hat in Phase 3a noch keinen sichtbaren Effekt nach außen, da weder
 * öffentliche Routen noch eine Praxis-UI zum Anlegen von Formularen
 * existieren. Der Flag bereitet ausschließlich Phase 3b vor.
 */
export async function enableWebsiteForms(
  email: string,
): Promise<AdminActionResult> {
  const account = await prisma.account.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!account) {
    return { ok: false, message: `Kein Account mit E-Mail "${email}" gefunden.` };
  }
  await prisma.account.update({
    where: { email },
    data: { website_forms_enabled: true },
  });
  return { ok: true, message: `Website-Formulare für "${email}" aktiviert.` };
}

/**
 * Phase 3a: Deaktiviert die Freigabe für öffentliche Website-Fragebögen
 * (`website_forms_enabled = false`) für einen Account per E-Mail.
 */
export async function disableWebsiteForms(
  email: string,
): Promise<AdminActionResult> {
  const account = await prisma.account.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!account) {
    return { ok: false, message: `Kein Account mit E-Mail "${email}" gefunden.` };
  }
  await prisma.account.update({
    where: { email },
    data: { website_forms_enabled: false },
  });
  return { ok: true, message: `Website-Formulare für "${email}" deaktiviert.` };
}
