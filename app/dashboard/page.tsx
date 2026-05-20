import Link from "next/link";
import { redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { getCurrentPracticeRole } from "@/lib/authz";
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

  if (getCurrentPracticeRole(account) === PracticeRole.INBOX_ONLY) {
    redirect("/questionnaires");
  }

  const myRole =
    (account.current_practice &&
      account.memberships.find(
        (m) => m.practice_id === account.current_practice!.id,
      )?.role) ||
    null;
  const canUseCases =
    myRole === null ||
    myRole === PracticeRole.OWNER ||
    myRole === PracticeRole.ADMIN ||
    myRole === PracticeRole.USER;
  const patientCommunicationEnabled = account.current_practice
    ? account.current_practice.patient_communication_enabled
    : account.patient_communication_enabled;
  const canUseDigitalRequests =
    patientCommunicationEnabled &&
    (myRole === null ||
      myRole === PracticeRole.OWNER ||
      myRole === PracticeRole.ADMIN ||
      myRole === PracticeRole.USER);
  const canUseInquiries =
    myRole === null ||
    myRole === PracticeRole.OWNER ||
    myRole === PracticeRole.ADMIN ||
    myRole === PracticeRole.USER;
  const canUseQuestionnaireInbox =
    myRole === null ||
    myRole === PracticeRole.OWNER ||
    myRole === PracticeRole.ADMIN ||
    myRole === PracticeRole.USER ||
    myRole === PracticeRole.INBOX_ONLY;
  const showPracticeTile =
    myRole === PracticeRole.OWNER || myRole === PracticeRole.ADMIN;
  const showOfficeTile = account.office_cases_enabled || account.is_admin;

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
          {canUseQuestionnaireInbox && (
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Fragebögen</h2>
              <p>Eingegangene Fragebögen bearbeiten</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href="/questionnaires">
                  <button type="button">Posteingang öffnen</button>
                </Link>
              </div>
            </section>
          )}

          {canUseInquiries && (
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Patientenkommunikation</h2>
              <p>Nachrichten formulieren</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href="/inquiries">
                  <button type="button">Vorlagen öffnen</button>
                </Link>
                <Link href="/inquiries/new">
                  <button type="button">Neue Nachricht</button>
                </Link>
              </div>
            </section>
          )}

          {canUseCases && (
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Patientenfälle</h2>
              <p>Fehlende Informationen sammeln und dokumentieren</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href="/cases">
                  <button type="button">Fallliste öffnen</button>
                </Link>
                <Link href="/">
                  <button type="button">Neuer Fall</button>
                </Link>
              </div>
            </section>
          )}

          {canUseDigitalRequests && (
            <section className="card" data-testid="digital-requests-tile">
              <h2 style={{ marginTop: 0 }}>Digitale Anfragen</h2>
              <p>Anfragen prüfen und Fragebogenlinks senden</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href="/digital-requests">
                  <button type="button">Anfragen öffnen</button>
                </Link>
              </div>
            </section>
          )}

          {showOfficeTile && (
          <section className="card">
            <h2 style={{ marginTop: 0 }}>Officepfad</h2>
            <p>Organisatorische Snapshots strukturiert klären</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Link href="/office-cases">
                <button type="button">Officefälle öffnen</button>
              </Link>
            </div>
          </section>
          )}

          {showPracticeTile && (
            <section className="card">
              <h2 style={{ marginTop: 0 }}>Praxis</h2>
              <p>Zugang und Einstellungen verwalten</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href="/practice/members">
                  <button type="button">Praxis öffnen</button>
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
