import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { toAppShellAccount } from "@/lib/appShellAccount";
import { getVisibleNavigationSections } from "@/lib/navigation";
import { prisma } from "@/lib/prisma";

type ActionLink = {
  label: string;
  href: string;
};

type AdminCardProps = {
  title: string;
  description: string;
  actions: ActionLink[];
};

function AdminCard({ title, description, actions }: AdminCardProps) {
  return (
    <section className="card" style={{ display: "grid", alignContent: "start", gap: "0.75rem" }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ margin: 0 }}>{description}</p>
      <ul style={{ display: "grid", gap: "0.5rem", margin: 0, paddingLeft: "1.25rem" }}>
        {actions.map((action) => (
          <li key={`${action.label}-${action.href}`}>
            <Link href={action.href}>{action.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function AdminHomePage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const appShellAccount = toAppShellAccount(account);
  if (!appShellAccount) redirect("/");
  const visiblePracticeLinks = new Set(
    getVisibleNavigationSections(appShellAccount).flatMap((section) =>
      section.items.map((item) => item.href),
    ),
  );
  const canSeePracticeLink = (href: string) =>
    visiblePracticeLinks.has(href) ||
    (href === "/practice/checkpoint-definitions" &&
      visiblePracticeLinks.has("/practice/catalog"));

  const practiceCards = [
    {
      title: "Team und Praxislinks",
      description:
        "Sehen Sie die Mitglieder Ihrer Praxis und fügen Sie vorhandene Accounts hinzu. Verwalten Sie außerdem öffentliche Praxislinks, Benachrichtigungen und vorhandene Download-Einstellungen.",
      actions: [
        { label: "Mitglieder, Praxislinks und Benachrichtigungen", href: "/practice/members" },
      ],
      requires: "/practice/members",
    },
    {
      title: "Anfragen und Nachrichten",
      description:
        "Passen Sie Anfrage-Angaben, Informationstexte und Fragebogen-Bestätigungen an. Hinterlegen Sie die Nachrichtensignatur Ihrer Praxis.",
      actions: [
        { label: "Anfrage-Einstellungen und Texte", href: "/practice/inquiry-settings" },
        { label: "Nachrichtensignatur", href: "/practice/signature" },
      ],
      requires: "/practice/inquiry-settings",
    },
    {
      title: "Dokumentation und Vorlagen",
      description:
        "Bearbeiten Sie die Dokumentationsbausteine Ihrer Praxis und stellen Sie daraus passende Vorlagen zusammen.",
      actions: [
        { label: "Dokumentationsbausteine", href: "/practice/documentation-library" },
        { label: "Dokumentationsvorlagen", href: "/practice/documentation-templates" },
      ],
      requires: "/practice/documentation-library",
    },
    {
      title: "Praxisabläufe und Checkpoints",
      description:
        "Rufen Sie Praxisfälle auf, arbeiten Sie mit Praxisfall-Ketten und sehen Sie veröffentlichte Abläufe und Checkpoint-Definitionen Ihrer Praxis ein.",
      actions: [
        { label: "Praxisfall starten", href: "/workflow-cases/internal-protocol/new" },
        { label: "Praxisfall-Ketten", href: "/practice/chains" },
        { label: "Praxiskatalog", href: "/practice/catalog" },
        { label: "Checkpoint-Definitionen", href: "/practice/checkpoint-definitions" },
        { label: "Praxisbibliothek", href: "/practice/library" },
      ],
      requires: "/practice/chains",
    },
    {
      title: "Kiosk-Geräte",
      description: "Sehen und verwalten Sie die Kiosk-Geräte Ihrer Praxis.",
      actions: [{ label: "Kiosk-Geräte verwalten", href: "/practice/questionnaire-kiosk" }],
      requires: "/practice/questionnaire-kiosk",
    },
    {
      title: "Website-Formulare",
      description:
        "Legen Sie Formulare an und bearbeiten Sie deren Fragebogenblöcke und Aktivstatus. Patientinnen und Patienten können aktive Formulare öffentlich ausfüllen und ihre Angaben per E-Mail bestätigen.",
      actions: [{ label: "Formulare ansehen und bearbeiten", href: "/website-forms" }],
      requires: "/website-forms",
    },
  ].flatMap((card) => {
    if (!canSeePracticeLink(card.requires)) return [];
    const actions = card.actions.filter((action) => canSeePracticeLink(action.href));
    return actions.length > 0 ? [{ ...card, actions }] : [];
  });

  const practices = await prisma.practice.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <main style={{ maxWidth: "72rem", width: "100%", marginInline: "auto" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1>Administration</h1>
        <p className="text-muted" style={{ marginBottom: 0 }}>
          Verwalten Sie Praxen, Konten und die zentralen Inhalte des Patientenpfads.
        </p>
      </header>

      <section aria-labelledby="platform-admin-heading" style={{ marginBottom: "2.5rem" }}>
        <h2 id="platform-admin-heading">Plattform-Administration</h2>
        <p className="text-muted">
          Diese Aufgaben betreffen die Plattform oder mehrere Praxen. Wählen Sie bei
          Praxis-Einstellungen anschließend die gewünschte Praxis aus.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
            gap: "1rem",
          }}
        >
          <AdminCard
            title="Praxen und Zugänge"
            description="Legen Sie Praxen an, schalten Sie sie frei oder deaktivieren Sie sie. Verwalten Sie Funktionsfreigaben, Mitglieder, Standard-Praxen und das Fallkontingent."
            actions={[
              { label: "Praxen anlegen und Freigaben verwalten", href: "/admin/practices" },
              { label: "Mitglieder und Standard-Praxis zuordnen", href: "/admin/practices" },
              { label: "Fallkontingent ändern", href: "/admin/practices" },
            ]}
          />
          <AdminCard
            title="Praxisdaten und E-Mail-Versand"
            description="Bearbeiten Sie offizielle Praxis- und Vertragsdaten, richten Sie den E-Mail-Versand ein und passen Sie Angaben für den Anfrage-Assistenten an."
            actions={[
              { label: "E-Mail-Versand einrichten", href: "/admin/practices" },
              { label: "Offizielle Praxisdaten bearbeiten", href: "/admin/practices" },
              { label: "Anfrage-Konfiguration anpassen", href: "/admin/practices" },
            ]}
          />
          <AdminCard
            title="Benutzerkonten"
            description="Schalten Sie Konten frei oder sperren Sie sie, senden Sie Links zum Einrichten von Passwörtern oder löschen Sie Konten. Angezeigte Funktionsfreigaben sind teilweise eine Legacy-Ansicht."
            actions={[
              { label: "Konten und Freigaben prüfen", href: "/admin/accounts" },
              { label: "Passwort-Setup-Link senden oder Konto löschen", href: "/admin/accounts" },
            ]}
          />
          <AdminCard
            title="Patientenpfad-Bibliothek"
            description="Pflegen Sie zentrale Praxisfall-Vorlagen und Checkpoints. Erstellen und bearbeiten Sie Inhalte und ordnen Sie Checkpoints über Labels zu."
            actions={[
              { label: "Praxisfälle bearbeiten oder neu anlegen", href: "/admin/practice-processes" },
              { label: "Checkpoints und Labels verwalten", href: "/admin/practice-processes/checkpoints" },
              { label: "Neuen Checkpoint anlegen", href: "/admin/practice-processes/checkpoints/new" },
            ]}
          />
        </div>
      </section>

      {practices.length > 0 && (
        <section aria-labelledby="practice-shortcuts-heading" style={{ marginBottom: "2.5rem" }}>
          <h2 id="practice-shortcuts-heading">Direkt zu einer Praxisaufgabe</h2>
          <p className="text-muted">
            Öffnen Sie für eine bestimmte Praxis direkt den passenden Einstellungsbereich.
          </p>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {practices.map((practice) => (
              <article
                key={practice.id}
                className="admin-practice-shortcut"
              >
                <strong>{practice.name}</strong>
                <nav
                  aria-label={`Einstellungen für ${practice.name}`}
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem" }}
                >
                  <Link href={`/admin/practices/${practice.id}#mail-config`}>E-Mail-Versand</Link>
                  <Link href={`/admin/practices/${practice.id}#case-quota`}>Fallkontingent</Link>
                  <Link href={`/admin/practices/${practice.id}#inquiry-config`}>Anfrage-Konfiguration</Link>
                  <Link href={`/admin/practices/${practice.id}#legal-profile`}>Offizielle Praxisdaten</Link>
                  <Link href={`/admin/practices/${practice.id}#members`}>Mitglieder</Link>
                </nav>
              </article>
            ))}
          </div>
        </section>
      )}

      {practiceCards.length > 0 && (
        <section aria-labelledby="practice-admin-heading">
          <h2 id="practice-admin-heading">Praxisverwaltung</h2>
          <p className="text-muted">
            Diese Links gelten nur für Ihre aktuelle Praxis und die dort vorhandene Rolle.
            Plattform-Adminrechte ersetzen keine Praxis-Mitgliedschaft.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
              gap: "1rem",
            }}
          >
            {practiceCards.map((card) => (
              <AdminCard
                key={card.title}
                title={card.title}
                description={card.description}
                actions={card.actions}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}