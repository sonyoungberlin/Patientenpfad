import Link from "next/link";
import { redirect } from "next/navigation";
import { PracticeRole } from "@prisma/client";
import { requirePracticeRoleFromCookies } from "@/lib/authz";
import { toAppShellAccount } from "@/lib/appShellAccount";
import { getVisibleNavigationSections } from "@/lib/navigation";

type PracticeAction = {
  label: string;
  href: string;
};

type PracticeCardData = {
  title: string;
  description: string;
  actions: PracticeAction[];
  requiresFeature?: "patient_communication_enabled" | "office_cases_enabled";
};

type PracticeGroupData = {
  title: string;
  cards: PracticeCardData[];
};

function PracticeCard({
  title,
  description,
  actions,
}: PracticeCardData) {
  return (
    <section
      className="card"
      style={{ display: "grid", alignContent: "start", gap: "0.75rem" }}
    >
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

export default async function PracticeHomePage() {
  const account = await requirePracticeRoleFromCookies([
    PracticeRole.OWNER,
    PracticeRole.ADMIN,
  ]);
  if (!account || !account.is_approved) {
    redirect("/");
  }

  const appShellAccount = toAppShellAccount(account);
  if (!appShellAccount) redirect("/");

  const visiblePracticeLinks = new Set(
    getVisibleNavigationSections(appShellAccount)
      .find((section) => section.id === "practice-management")
      ?.items.map((item) => item.href) ?? [],
  );
  const visibleOfficeLinks = new Set(
    getVisibleNavigationSections(appShellAccount)
      .find((section) => section.id === "office-path")
      ?.items.map((item) => item.href) ?? [],
  );
  const canSee = (href: string) => {
    const [pathname] = href.split("#", 1);
    if (pathname === "/practice/checkpoint-definitions") {
      return visiblePracticeLinks.has("/practice/catalog");
    }
    if (pathname === "/website-forms") {
      return (
        appShellAccount.patient_communication_enabled &&
        visiblePracticeLinks.has(pathname)
      );
    }
    return visiblePracticeLinks.has(pathname) || visibleOfficeLinks.has(pathname);
  };

  const groups: PracticeGroupData[] = [
    {
      title: "Team und Praxisauftritt",
      cards: [
        {
          title: "Mitglieder und Zugänge",
          description:
            "Prüfen Sie die Mitglieder Ihrer Praxis und fügen Sie vorhandene Accounts als Mitarbeiter-, Mini- oder Kiosk-Zugang hinzu. Rollenwechsel, Entfernen und Einladungs-E-Mails sind hier nicht verfügbar.",
          actions: [
            { label: "Mitglieder ansehen", href: "/practice/members#members" },
            { label: "Bestehenden Account hinzufügen", href: "/practice/members#member-add" },
          ],
        },
        {
          title: "Praxisprofil",
          description:
            "Passen Sie den öffentlichen Namen und Link-Slug Ihrer Praxis an. Diese Angaben bestimmen, unter welchem Namen und Link Patientinnen und Patienten Ihre Praxis finden.",
          actions: [
            { label: "Öffentlichen Praxisauftritt bearbeiten", href: "/practice/members#public-practice-profile" },
          ],
        },
        {
          title: "Patienten-Check-in und digitale Anfragen",
          description:
            "Rufen Sie den öffentlichen Check-in-Link und QR-Code auf. Verwalten Sie den Link für digitale Anfragen und legen Sie fest, an welche Adresse neue Anfragen gemeldet werden.",
          requiresFeature: "patient_communication_enabled",
          actions: [
            { label: "Check-in-Link und QR-Code", href: "/practice/members#patient-check-in-link" },
            { label: "Anfrage-Link und Benachrichtigung", href: "/practice/members#anfrage-link-section" },
          ],
        },
        {
          title: "Bewerbungsanfragen",
          description:
            "Rufen Sie den öffentlichen Bewerbungslink auf und legen Sie fest, an welche Adresse neue Bewerbungen gemeldet werden.",
          requiresFeature: "office_cases_enabled",
          actions: [
            { label: "Bewerbungslink und Benachrichtigung", href: "/practice/members#bewerben-link-section" },
          ],
        },
        {
          title: "Fragebogen-Export und Download-Geräte",
          description:
            "Wählen Sie den Exportmodus, konfigurieren Sie den automatischen PDF-Download und verwalten Sie Geräte, die den Download auslösen dürfen.",
          actions: [
            { label: "Exportmodus einstellen", href: "/practice/members#questionnaire-auto-export-mode" },
            { label: "Automatischen PDF-Download konfigurieren", href: "/practice/members#questionnaire-auto-download" },
            { label: "Download-Geräte verwalten", href: "/practice/members#persistent-auto-download-devices" },
          ],
        },
      ],
    },
    {
      title: "Kommunikation",
      cards: [
        {
          title: "Anfrage-Einstellungen und Bestätigungstexte",
          description:
            "Passen Sie Angaben für den Anfrage-Assistenten, Informationstexte für Patientinnen und Patienten sowie die verfügbaren Fragebogen-Bestätigungstexte an.",
          actions: [
            { label: "Anfrage-Einstellungen öffnen", href: "/practice/inquiry-settings" },
          ],
        },
        {
          title: "Nachrichtensignatur",
          description:
            "Bearbeiten Sie den Text, der unter Nachrichten Ihrer Praxis an Patientinnen und Patienten angefügt wird.",
          actions: [{ label: "Signatur bearbeiten", href: "/practice/signature" }],
        },
        {
          title: "Website-Fragebögen",
          description:
            "Legen Sie öffentliche Fragebögen an, bearbeiten Sie Sprache und Inhalte und schalten Sie Formulare aktiv oder inaktiv. Nach dem Absenden erhält die Person eine Bestätigungs-E-Mail; nach der Bestätigung werden die Angaben an die Praxis übermittelt.",
          actions: [{ label: "Website-Formulare verwalten", href: "/website-forms" }],
        },
      ],
    },
    {
      title: "Interne Dokumentation",
      cards: [
        {
          title: "Dokumentationsbausteine",
          description:
            "Erstellen und bearbeiten Sie wiederverwendbare Inhalte für die interne Dokumentation. Sie können Bausteine importieren, deaktivieren oder löschen und deren Verwendung in Vorlagen prüfen.",
          actions: [
            { label: "Dokumentationsbausteine verwalten", href: "/practice/documentation-library" },
          ],
        },
        {
          title: "Dokumentationsvorlagen",
          description:
            "Stellen Sie Bausteine zu Vorlagen zusammen, die Ihr Team für die Dokumentation verwenden kann. Vorlagen lassen sich anlegen, bearbeiten, duplizieren und deaktivieren.",
          actions: [
            { label: "Dokumentationsvorlagen verwalten", href: "/practice/documentation-templates" },
          ],
        },
      ],
    },
    {
      title: "Praxisfälle und Arbeitsabläufe",
      cards: [
        {
          title: "Praxisfälle vorbereiten",
          description:
            "Wählen Sie einen Praxisfall, konfigurieren Sie die Standards Ihrer Praxis und bereiten Sie die Veröffentlichung vor.",
          actions: [
            { label: "Praxisfall vorbereiten", href: "/workflow-cases/internal-protocol/new" },
          ],
        },
        {
          title: "Praxisfall-Ketten",
          description:
            "Verbinden Sie veröffentlichte Praxisfall-Versionen mit Übergängen. Speichern Sie Entwürfe, markieren Sie Ketten als einsatzbereit oder deaktivieren Sie sie.",
          actions: [{ label: "Praxisfall-Ketten verwalten", href: "/practice/chains" }],
        },
        {
          title: "Veröffentlichte Praxisfälle",
          description:
            "Lesen Sie veröffentlichte Praxisfälle und Versionen. Starten Sie eine neue Version oder deaktivieren beziehungsweise reaktivieren Sie einen Katalogeintrag. Bestehende Versionen werden nicht direkt bearbeitet.",
          actions: [{ label: "Praxiskatalog öffnen", href: "/practice/catalog" }],
        },
        {
          title: "Checkpoint-Definitionen",
          description:
            "Legen Sie für eine Checkpoint-Vorlage fest, welche Anker und Umsetzung für Ihre Praxis gelten.",
          actions: [
            { label: "Checkpoint-Definitionen öffnen", href: "/practice/checkpoint-definitions" },
          ],
        },
      ],
    },
    {
      title: "Geräte und offizielle Praxisdaten",
      cards: [
        {
          title: "Kiosk-Geräte",
          description:
            "Richten Sie ein Gerät als Kiosk ein und prüfen oder widerrufen Sie vorhandene Kiosk-Geräte.",
          actions: [{ label: "Kiosk-Geräte verwalten", href: "/practice/questionnaire-kiosk" }],
        },
        {
          title: "Offizielle Praxisdaten ansehen · Nur Leseansicht",
          description:
            "Sehen Sie die offiziellen Vertrags- und Impressumsdaten Ihrer Praxis ein. Änderungen kann ausschließlich der Plattformbetreiber vornehmen.",
          actions: [{ label: "Offizielle Praxisdaten ansehen", href: "/practice/legal-profile" }],
        },
      ],
    },
  ];

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      cards: group.cards.flatMap((card) => {
        if (card.requiresFeature && !appShellAccount[card.requiresFeature]) {
          return [];
        }
        const actions = card.actions.filter((action) => canSee(action.href));
        return actions.length > 0 ? [{ ...card, actions }] : [];
      }),
    }))
    .filter((group) => group.cards.length > 0);

  return (
    <main style={{ maxWidth: "72rem", width: "100%", marginInline: "auto" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1>Praxisverwaltung</h1>
        <p className="text-muted" style={{ marginBottom: 0 }}>
          Verwalten Sie Team, Kommunikation und die Arbeitsabläufe Ihrer Praxis.
          Sichtbare Funktionen richten sich nach Ihrer Praxisrolle und den
          freigeschalteten Funktionen.
        </p>
      </header>

      {visibleGroups.map((group) => (
        <section
          key={group.title}
          aria-labelledby={`practice-group-${group.title.replaceAll(" ", "-")}`}
          style={{ marginBottom: "2.5rem" }}
        >
          <h2 id={`practice-group-${group.title.replaceAll(" ", "-")}`}>
            {group.title}
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
              gap: "1rem",
            }}
          >
            {group.cards.map((card) => (
              <PracticeCard key={card.title} {...card} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}