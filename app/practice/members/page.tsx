/**
 * Phase P4a: Read-only Mitgliederübersicht der aktuellen Practice.
 *
 * Sichtbar für OWNER und ADMIN der aktuellen Practice. USER und Aufrufer
 * ohne Membership in der aktuellen Practice bekommen `notFound()` (404),
 * konsistent mit der Konvention für Praxis-Pfade (keine 403, keine
 * Existenz-Leakage).
 *
 * Es gibt **bewusst keinen** Plattform-Admin-Bypass: ein Account mit
 * `is_admin = true` ohne Membership in der Practice sieht ebenfalls 404.
 *
 * Phase-P4a-Scope:
 *   - Tabelle: E-Mail, Rolle, Beigetreten
 *   - Markierung „(Du)" für die eigene Zeile
 *   - **Keine** Mutationen (kein Hinzufügen, kein Entfernen, kein
 *     Rollenwechsel) – kommt mit P4b.
 */

import { notFound, redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getSessionAccountFromCookies,
  type SessionAccount,
} from "@/lib/auth";
import { requirePracticeRoleFromCookies } from "@/lib/authz";

const ROLE_LABEL: Record<PracticeRole, string> = {
  OWNER: "Inhaber",
  ADMIN: "Admin",
  USER: "Mitarbeiter",
};

export default async function PracticeMembersPage() {
  // 1) Login + freigeschaltet (analog zu /admin/accounts).
  const account: SessionAccount | null = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }

  // 2) Praxis-Rolle: nur OWNER/ADMIN. USER und Accounts ohne Membership in
  //    der aktuellen Practice bekommen 404. Kein Plattform-Admin-Bypass.
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

  const memberships = await prisma.practiceMembership.findMany({
    where: { practice_id: practice.id },
    select: {
      id: true,
      role: true,
      created_at: true,
      account: { select: { id: true, email: true } },
    },
    orderBy: [{ role: "asc" }, { created_at: "asc" }],
  });

  return (
    <main>
      <h1>Mitglieder</h1>
      <p className="text-muted" style={{ marginBottom: "0.5rem" }}>
        Praxis: <strong>{practice.name}</strong>
      </p>
      <p
        role="note"
        style={{
          background: "#f0f4ff",
          border: "1px solid #c0d0e8",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.25rem",
          marginBottom: "1.5rem",
        }}
      >
        Mitglieder können in dieser Phase noch nicht hinzugefügt, geändert
        oder entfernt werden.
      </p>

      <p className="text-muted" style={{ marginBottom: "0.5rem" }}>
        {memberships.length} Mitglied{memberships.length === 1 ? "" : "er"}
      </p>

      <table>
        <thead>
          <tr>
            <th>E-Mail</th>
            <th>Rolle</th>
            <th>Beigetreten</th>
          </tr>
        </thead>
        <tbody>
          {memberships.map((m) => {
            const isSelf = m.account.id === account.id;
            return (
              <tr key={m.id}>
                <td>
                  {m.account.email}
                  {isSelf ? " (Du)" : ""}
                </td>
                <td>{ROLE_LABEL[m.role]}</td>
                <td>
                  {new Date(m.created_at).toLocaleDateString("de-DE")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
