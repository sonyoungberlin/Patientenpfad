import Link from "next/link";
import { redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { getSessionAccountFromCookies } from "@/lib/auth";
import AppShell from "@/components/AppShell";

/**
 * Interne Startseite (Dashboard).
 *
 * Zeigt nach Login eine klare Auswahl zwischen den drei Hauptarbeitsbereichen
 * (Patientenfälle, Patientenkommunikation, Fragebögen-Posteingang) statt direkt
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

  const myRole =
    (account.current_practice &&
      account.memberships.find(
        (m) => m.practice_id === account.current_practice!.id,
      )?.role) ||
    null;
  const showPracticeTile =
    myRole === PracticeRole.OWNER || myRole === PracticeRole.ADMIN;

  return (
    <>
      <AppShell />
      <main>
        <h1>Was möchten Sie tun?</h1>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginTop: "1rem",
          }}
        >
          <section className="card">
            <h2 style={{ marginTop: 0 }}>Patientenfälle</h2>
            <p>Dokumentation und Verlauf bearbeiten</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Link href="/cases">
                <button type="button">Fallliste öffnen</button>
              </Link>
              <Link href="/">
                <button type="button">Neuer Fall</button>
              </Link>
            </div>
          </section>

          <section className="card">
            <h2 style={{ marginTop: 0 }}>Patientenkommunikation</h2>
            <p>Nachrichten schreiben und beantworten</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Link href="/inquiries">
                <button type="button">Kommunikation öffnen</button>
              </Link>
              <Link href="/inquiries/new">
                <button type="button">Neue Nachricht</button>
              </Link>
            </div>
          </section>

          <section className="card">
            <h2 style={{ marginTop: 0 }}>Fragebögen</h2>
            <p>Eingegangene Fragebögen einsehen</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Link href="/questionnaires">
                <button type="button">Posteingang öffnen</button>
              </Link>
            </div>
          </section>

          {showPracticeTile && (
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Praxis</h2>
              <p>Mitglieder und Einstellungen verwalten</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href="/practice/members">
                  <button type="button">Praxis verwalten</button>
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
