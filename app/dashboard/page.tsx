import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { toAppShellAccount } from "@/lib/appShellAccount";
import { getVisibleNavigationSections } from "@/lib/navigation";
import AppShell from "@/components/AppShell";

/**
 * Interne Startseite (Dashboard).
 *
 * Zeigt nach Login eine klare Auswahl zwischen den drei Hauptarbeitsbereichen
 * (Fragebögen-Posteingang, Patientenkommunikation, Patientenfälle) statt direkt
 * in einen Flow zu springen.
 *
 * Auth: identisches Muster wie `app/cases/page.tsx` — nicht eingeloggte oder
 * noch nicht freigeschaltete Accounts werden auf `/` geleitet, damit dort der
 * bestehende Login-/„Freischaltung ausstehend"-Flow greift. Es wird **keine**
 * neue Auth-Logik eingeführt.
 *
 * Die Praxis-Kachel folgt der Sichtbarkeitsregel von
 * `app/practice/members/page.tsx`: nur OWNER/ADMIN der aktiven Practice; kein
 * Plattform-Admin-Bypass.
 */
export default async function DashboardPage() {
  const account = await getSessionAccountFromCookies();

  if (!account || !account.is_approved) {
    redirect("/");
  }

  const appShellAccount = toAppShellAccount(account);
  const navigationSections = appShellAccount
    ? getVisibleNavigationSections(appShellAccount)
    : [];
  return (
    <>
      <AppShell account={appShellAccount} />
      <main>
        <h1>Hallo.</h1>
        <p style={{ fontSize: "1.125rem", marginBottom: "1.5rem" }}>
          Welchen nächsten Schritt möchten Sie gehen?
        </p>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: "1rem",
          }}
        >
          {navigationSections.map((section) => (
            <section
              key={section.id}
              className="card"
              data-testid={`${section.id}-tile`}
            >
              <h2 style={{ marginTop: 0 }}>{section.title}</h2>
              <p>{section.description}</p>
              <ul style={{ display: "grid", gap: "0.5rem", margin: 0, paddingLeft: "1.25rem" }}>
                {section.items.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
