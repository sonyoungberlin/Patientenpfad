/**
 * Praxis-Signatur-Seite (PR 1 des Umzugs von Account- auf Practice-Scope).
 *
 * Sichtbar für OWNER und ADMIN der aktuellen Practice. USER und Aufrufer
 * ohne Membership in der aktuellen Practice bekommen `notFound()` (404),
 * konsistent mit der Konvention für Praxis-Pfade (analog
 * `app/practice/members/page.tsx`). Es gibt **bewusst keinen**
 * Plattform-Admin-Bypass.
 */

import { notFound, redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getSessionAccountFromCookies,
  type SessionAccount,
} from "@/lib/auth";
import { requirePracticeRoleFromCookies } from "@/lib/authz";
import SignatureForm from "./SignatureForm";

export default async function PracticeSignaturePage() {
  // 1) Login + freigeschaltet (analog zu /practice/members).
  const account: SessionAccount | null = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }

  // 2) Praxis-Rolle: nur OWNER/ADMIN. USER/Fremde sehen 404. Kein
  //    Plattform-Admin-Bypass.
  const allowed = await requirePracticeRoleFromCookies([
    PracticeRole.OWNER,
    PracticeRole.ADMIN,
  ]);
  if (!allowed) {
    notFound();
  }

  const practice = account.current_practice;
  // Aufgrund der Rollen-Prüfung ist `current_practice` zwingend gesetzt;
  // dieser Check existiert nur als TypeScript-Narrowing.
  if (!practice) {
    notFound();
  }

  // 3) Aktuelle Signatur laden. Fallback "" falls die Migration noch nicht
  //    angewendet wurde — dann liefert ein DB-Fehler einen leeren String,
  //    damit die Seite weiterhin rendert.
  let initialSignature = "";
  try {
    const data = await prisma.practice.findUnique({
      where: { id: practice.id },
      select: { message_signature: true },
    });
    initialSignature = data?.message_signature ?? "";
  } catch {
    initialSignature = "";
  }

  return (
    <main>
      <h1>Nachrichtensignatur</h1>
      <p className="text-muted" style={{ marginBottom: "0.5rem" }}>
        Praxis: <strong>{practice.name}</strong>
      </p>
      <p style={{ marginBottom: "1rem" }}>
        Diese Signatur wird automatisch an Patientennachrichten angehängt
        (z. B. Fragebogen-Link aus M2 oder „Nachricht kopieren" in der
        ärztlichen Checkliste). Sie gilt für alle Mitglieder der Praxis.
      </p>

      <SignatureForm initialSignature={initialSignature} />
    </main>
  );
}
