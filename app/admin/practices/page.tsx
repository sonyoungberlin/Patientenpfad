/**
 * Plattform-Admin: Liste aller Practices.
 *
 * Quelle der Wahrheit für die Feature-Flags ist seit Phase P2 die Practice
 * (und nicht mehr der Account). Der Plattform-Admin verwaltet Practices
 * direkt — `/admin/accounts` bleibt als Legacy-Pfad bestehen.
 *
 * Berechtigung: nur eingeloggte, freigeschaltete Plattform-Admins.
 * Sonst Redirect nach `/`.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccountFromCookies } from "@/lib/auth";

export default async function AdminPracticesPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const practices = await prisma.practice.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      is_approved: true,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: true,
      website_forms_enabled: true,
      office_cases_enabled: true,
      created_at: true,
      memberships: {
        where: { role: PracticeRole.OWNER },
        select: { account: { select: { email: true } } },
        orderBy: { created_at: "asc" },
      },
      _count: { select: { memberships: true } },
    },
    orderBy: [{ is_approved: "asc" }, { created_at: "desc" }],
  });

  return (
    <main>
      <h1>Admin – Praxen</h1>
      <p className="text-muted">
        {practices.length} Praxis
        {practices.length !== 1 ? "en" : ""} gesamt
      </p>
      <p className="text-muted" style={{ fontSize: "0.85em" }}>
        Quelle der Wahrheit für Feature-Flags ist die Praxis. Toggles auf
        Detailseiten schreiben direkt auf die Praxis. Kein Admin-Bypass für
        normale Praxis-Routen.
      </p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>OWNER-E-Mail(s)</th>
            <th>Mitglieder</th>
            <th>freigeschaltet</th>
            <th>Anfrage-Assistent</th>
            <th>Patientenkommunikation</th>
            <th>Website-Formulare</th>
            <th>Officepfad</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {practices.map((p) => {
            const owners = p.memberships.map((m) => m.account.email);
            return (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.slug}</td>
                <td>
                  {owners.length === 0 ? (
                    <span className="text-muted">–</span>
                  ) : (
                    owners.join(", ")
                  )}
                </td>
                <td>{p._count.memberships}</td>
                <td>{p.is_approved ? "✓" : "–"}</td>
                <td>{p.inquiry_assistant_enabled ? "✓" : "–"}</td>
                <td>{p.patient_communication_enabled ? "✓" : "–"}</td>
                <td>{p.website_forms_enabled ? "✓" : "–"}</td>
                <td>{p.office_cases_enabled ? "✓" : "–"}</td>
                <td>
                  <Link href={`/admin/practices/${p.id}`}>Verwalten</Link>
                </td>
              </tr>
            );
          })}
          {practices.length === 0 && (
            <tr>
              <td colSpan={10} className="text-muted">
                Keine Praxen vorhanden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
