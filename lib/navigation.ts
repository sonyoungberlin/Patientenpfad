import type { AppShellAccount, AppShellPracticeRole } from "./appShellAccount";

export type NavigationSectionId =
  | "inbox"
  | "patient-communication"
  | "patient-path"
  | "office-path"
  | "workflow-path"
  | "practice-management";

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  matches: readonly string[];
  roles?: readonly AppShellPracticeRole[];
  requiresPracticeRole?: boolean;
  feature?: "patient_communication_enabled" | "website_forms_enabled";
  officeFeature?: boolean;
  workflowFeature?: boolean;
};

export type NavigationSection = {
  id: NavigationSectionId;
  title: string;
  description: string;
  items: readonly NavigationItem[];
  pathPriority?: number;
  sectionMatches?: readonly string[];
};

export type AppShellContext = {
  id: "inbox" | "patient" | "doctor" | "office";
  label: "Posteingang" | "Patient" | "Ärztlich" | "Office";
  iconSrc: string;
};

const APP_SHELL_CONTEXTS: Readonly<Record<AppShellContext["id"], AppShellContext>> = {
  inbox: {
    id: "inbox",
    label: "Posteingang",
    iconSrc: "/context-icons/context-inbox.png",
  },
  patient: {
    id: "patient",
    label: "Patient",
    iconSrc: "/context-icons/context-patient.png",
  },
  doctor: {
    id: "doctor",
    label: "Ärztlich",
    iconSrc: "/context-icons/context-doctor.png",
  },
  office: {
    id: "office",
    label: "Office",
    iconSrc: "/context-icons/context-office.png",
  },
};

const APP_SHELL_CONTEXT_ROUTES: readonly {
  prefix: string;
  context: AppShellContext["id"];
}[] = [
  { prefix: "/office-cases/questionnaire/new", context: "inbox" },
  { prefix: "/office-cases/questionnaire", context: "inbox" },
  { prefix: "/office-cases/applications", context: "inbox" },
  { prefix: "/cases/internal-documentation", context: "doctor" },
  { prefix: "/questionnaires", context: "inbox" },
  { prefix: "/digital-requests", context: "inbox" },
  { prefix: "/inquiries", context: "patient" },
  { prefix: "/cases", context: "patient" },
  { prefix: "/office-cases", context: "office" },
  { prefix: "/workflow-cases", context: "office" },
];

export function getAppShellContext(pathname: string): AppShellContext | null {
  const route = APP_SHELL_CONTEXT_ROUTES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return route ? APP_SHELL_CONTEXTS[route.context] : null;
}

const PRACTICE_ROLES = ["OWNER", "ADMIN", "USER"] as const;
const MANAGEMENT_ROLES = ["OWNER", "ADMIN"] as const;
const INBOX_ROLES = ["OWNER", "ADMIN", "USER", "INBOX_ONLY"] as const;

export const NAVIGATION_SECTIONS: readonly NavigationSection[] = [
  {
    id: "inbox",
    title: "Posteingang",
    description: "Fragebögen versenden und Rückläufe bearbeiten.",
    pathPriority: 20,
    items: [
      {
        id: "questionnaire-inbox",
        label: "Fragebogen-Posteingang",
        href: "/questionnaires",
        matches: ["/questionnaires"],
        roles: INBOX_ROLES,
        feature: "patient_communication_enabled",
      },
      {
        id: "digital-requests-inbox",
        label: "Digitale Anfragen",
        href: "/digital-requests",
        matches: ["/digital-requests"],
        roles: PRACTICE_ROLES,
        feature: "patient_communication_enabled",
      },
      {
        id: "applicant-inbox",
        label: "Bewerbungsanfragen",
        href: "/office-cases/applications",
        matches: ["/office-cases/applications"],
        roles: PRACTICE_ROLES,
        requiresPracticeRole: true,
        officeFeature: true,
      },
      {
        id: "applicant-questionnaire-inbox",
        label: "Bewerber-Fragebögen",
        href: "/office-cases/questionnaire",
        matches: ["/office-cases/questionnaire"],
        roles: MANAGEMENT_ROLES,
        requiresPracticeRole: true,
        officeFeature: true,
      },
    ],
  },
  {
    id: "patient-communication",
    title: "Patientenkommunikation",
    description: "Anfragen strukturiert klären und beantworten.",
    items: [
      {
        id: "inquiry-templates",
        label: "Vorlagen",
        href: "/inquiries",
        matches: ["/inquiries"],
        roles: PRACTICE_ROLES,
        feature: "patient_communication_enabled",
      },
      {
        id: "new-inquiry",
        label: "Neue Nachricht",
        href: "/inquiries/new",
        matches: ["/inquiries/new"],
        roles: PRACTICE_ROLES,
        feature: "patient_communication_enabled",
      },
      {
        id: "inquiry-questionnaire",
        label: "Fragebogen zusammenstellen",
        href: "/inquiries/questionnaire",
        matches: ["/inquiries/questionnaire"],
        roles: PRACTICE_ROLES,
        feature: "patient_communication_enabled",
      },
    ],
  },
  {
    id: "patient-path",
    title: "Patientenpfad",
    description: "Offene und bearbeitete Fälle aufrufen.",
    items: [
      {
        id: "case-list",
        label: "Fallliste",
        href: "/cases",
        matches: ["/cases"],
        roles: PRACTICE_ROLES,
      },
      {
        id: "new-case",
        label: "Neuer Fall",
        href: "/cases/new",
        matches: ["/cases/new"],
        roles: PRACTICE_ROLES,
      },
      {
        id: "internal-documentation",
        label: "Interne Dokumentation",
        href: "/cases/internal-documentation",
        matches: ["/cases/internal-documentation"],
        roles: PRACTICE_ROLES,
        feature: "patient_communication_enabled",
      },
    ],
  },
  {
    id: "office-path",
    title: "Officepfad",
    description: "Organisatorische Aufgaben strukturiert klären.",
    sectionMatches: ["/office-cases"],
    items: [
      {
        id: "office-cases",
        label: "Officefälle",
        href: "/office-cases",
        matches: ["/office-cases"],
        roles: MANAGEMENT_ROLES,
        requiresPracticeRole: true,
        officeFeature: true,
      },
      {
        id: "new-office-case",
        label: "Neuer Officefall",
        href: "/office-cases/new",
        matches: ["/office-cases/new"],
        roles: MANAGEMENT_ROLES,
        requiresPracticeRole: true,
        officeFeature: true,
      },
      {
        id: "office-questionnaires",
        label: "Bewerbungsfragebögen",
        href: "/office-cases/questionnaire",
        matches: ["/office-cases/questionnaire"],
        roles: MANAGEMENT_ROLES,
        requiresPracticeRole: true,
        officeFeature: true,
      },
      {
        id: "office-applications",
        label: "Bewerbungsanfragen",
        href: "/office-cases/applications",
        matches: ["/office-cases/applications"],
        roles: PRACTICE_ROLES,
        requiresPracticeRole: true,
        officeFeature: true,
      },
    ],
  },
  {
    id: "workflow-path",
    title: "Arbeitsprozesse",
    description: "Musterprozesse strukturiert dokumentieren.",
    sectionMatches: ["/workflow-cases"],
    items: [
      {
        id: "workflow-cases",
        label: "Arbeitsprozesse",
        href: "/workflow-cases",
        matches: ["/workflow-cases"],
        roles: PRACTICE_ROLES,
        workflowFeature: true,
      },
      {
        id: "new-workflow-session",
        label: "Neue Sitzung",
        href: "/workflow-cases/new",
        matches: ["/workflow-cases/new"],
        roles: PRACTICE_ROLES,
        workflowFeature: true,
      },
      {
        id: "new-practice-process",
        label: "Praxisprozesse",
        href: "/workflow-cases/internal-protocol/new",
        matches: ["/workflow-cases/internal-protocol/new"],
        roles: PRACTICE_ROLES,
        workflowFeature: true,
      },
    ],
  },
  {
    id: "practice-management",
    title: "Praxisverwaltung",
    description: "Zugang und Einstellungen verwalten",
    items: [
      {
        id: "practice-catalog",
        label: "Praxiskatalog",
        href: "/practice/catalog",
        matches: ["/practice/catalog"],
        roles: MANAGEMENT_ROLES,
        requiresPracticeRole: true,
        workflowFeature: true,
      },
      {
        id: "practice-members",
        label: "Mitglieder",
        href: "/practice/members",
        matches: ["/practice/members"],
        roles: MANAGEMENT_ROLES,
        requiresPracticeRole: true,
      },
      {
        id: "questionnaire-kiosk",
        label: "Kiosk-Geräte",
        href: "/practice/questionnaire-kiosk",
        matches: ["/practice/questionnaire-kiosk"],
        roles: ["OWNER"],
        requiresPracticeRole: true,
      },
      {
        id: "legal-profile",
        label: "Offizielle Praxisdaten",
        href: "/practice/legal-profile",
        matches: ["/practice/legal-profile"],
        roles: MANAGEMENT_ROLES,
        requiresPracticeRole: true,
      },
      {
        id: "signature",
        label: "Signatur",
        href: "/practice/signature",
        matches: ["/practice/signature"],
        roles: MANAGEMENT_ROLES,
        requiresPracticeRole: true,
      },
      {
        id: "inquiry-settings",
        label: "Anfrage-Einstellungen",
        href: "/practice/inquiry-settings",
        matches: ["/practice/inquiry-settings"],
        roles: MANAGEMENT_ROLES,
        requiresPracticeRole: true,
      },
      {
        id: "website-forms",
        label: "Website-Formulare",
        href: "/website-forms",
        matches: ["/website-forms"],
        roles: MANAGEMENT_ROLES,
        requiresPracticeRole: true,
        feature: "website_forms_enabled",
      },
    ],
  },
] as const;

export function getCurrentNavigationRole(
  account: AppShellAccount,
): AppShellPracticeRole | null {
  const practiceId = account.current_practice?.id;
  return (
    account.memberships.find((membership) => membership.practice_id === practiceId)
      ?.role ?? null
  );
}

function itemIsVisible(
  item: NavigationItem,
  account: AppShellAccount,
): boolean {
  const role = getCurrentNavigationRole(account);
  if (item.roles && role !== null && !item.roles.includes(role)) return false;
  if (item.requiresPracticeRole && role === null) return false;
  if (item.feature && !account[item.feature]) return false;
  if (item.officeFeature && !account.office_cases_enabled && !account.is_admin) {
    return false;
  }
  if (item.workflowFeature && !account.arbeitsprozesse_enabled && !account.is_admin) {
    return false;
  }
  return true;
}

export function getVisibleNavigationSections(
  account: AppShellAccount,
): NavigationSection[] {
  return NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => itemIsVisible(item, account)),
  })).filter((section) => section.items.length > 0);
}

export function getNavigationSectionForPath(
  sections: readonly NavigationSection[],
  pathname: string,
): NavigationSection | null {
  const matches = sections
    .map((section) => {
      const matchingItemLength = Math.max(
        0,
        ...section.items.flatMap((item) =>
          item.matches
            .filter((match) => pathname === match || pathname.startsWith(match + "/"))
            .map((match) => match.length),
        ),
      );
      const sectionMatches = section.sectionMatches?.some(
        (match) => pathname === match || pathname.startsWith(match + "/"),
      );
      return {
        section,
        matchingItemLength,
        matchesSection: matchingItemLength > 0 || sectionMatches,
      };
    })
    .filter((entry) => entry.matchesSection)
    .sort(
      (a, b) =>
        b.matchingItemLength - a.matchingItemLength ||
        (b.section.pathPriority ?? 0) - (a.section.pathPriority ?? 0),
    )
    .map((entry) => entry.section);
  return matches[0] ?? null;
}

export function getActiveNavigationItem(
  section: NavigationSection,
  pathname: string,
): string | null {
  return (
    section.items
      .filter((item) =>
        item.matches.some(
          (match) => pathname === match || pathname.startsWith(match + "/"),
        ),
      )
      .sort((a, b) => b.matches.join("/").length - a.matches.join("/").length)[0]
      ?.id ?? null
  );
}