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
import { PracticeLegalProfileFields } from "@/components/admin/PracticeLegalProfileFields";

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
      disabled_at: true,
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
      <section style={{ margin: "1.5rem 0 2rem" }}>
        <h2>Neue Praxis anlegen</h2>
        <p className="text-muted">
          Praxis und offizielles Vertrags-/Praxisprofil werden gemeinsam angelegt.
          Die Praxis startet gesperrt und kann anschließend auf der Detailseite freigeschaltet werden.
        </p>
        <form method="POST" action="/api/admin/practices" style={{ display: "grid", gap: "0.75rem" }}>
          <label>
            Anzeigename der Praxis *
            <input name="display_name" required maxLength={120} style={{ display: "block", width: "100%" }} />
          </label>
          <label>
            Bestehenden OWNER-Account zuordnen (optional)
            <input name="owner_email" type="email" style={{ display: "block", width: "100%" }} />
          </label>
          <PracticeLegalProfileFields />
          <button type="submit" style={{ justifySelf: "start" }}>Praxis anlegen</button>
        </form>
      </section>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>OWNER-E-Mail(s)</th>
            <th>Mitglieder</th>
            <th>Status</th>
            <th>Deaktiviert seit</th>
            <th>Löschbar ab</th>
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
                <td>{p.is_approved && !p.disabled_at ? "Aktiv" : "Deaktiviert"}</td>
                <td>{p.disabled_at ? p.disabled_at.toLocaleDateString("de-DE") : "–"}</td>
                <td>{p.disabled_at ? new Date(p.disabled_at.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("de-DE") : "–"}</td>
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
              <td colSpan={12} className="text-muted">
                Keine Praxen vorhanden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
