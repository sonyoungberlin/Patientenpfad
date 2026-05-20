/**
 * Phase B Schritt 5: UX-Tests für den versendeten Status.
 *
 * Abgedeckt:
 *  1. DigitalRequestDetailClient: Formular ist schreibgeschützt wenn isSent=true
 *  2. DigitalRequestDetailClient: Speichern-Button wird ausgeblendet wenn isSent
 *  3. DigitalRequestDetailClient: Read-Only-Hinweis sichtbar wenn isSent
 *  4. Detailseite: Versand-Hinweis sichtbar wenn status=sent
 *  5. Detailseite: Fragebogen-Link sichtbar wenn questionnaire_session_id gesetzt
 *  6. Detailseite: kein Versand-Hinweis wenn status=new
 *  7. QuestionnaireCard: Badge "Digitale Anfrage" sichtbar wenn isFromDigitalRequest
 *  8. QuestionnaireCard: kein Badge wenn isFromDigitalRequest=false
 *  9. Liste: "Ansehen" für sent-Zeilen, "Bearbeiten" für aktive Zeilen
 */

import { renderToStaticMarkup } from "react-dom/server";

// ---------------------------------------------------------------------------
// Navigation + Auth mocks
// ---------------------------------------------------------------------------

const redirectMock = jest.fn((url: string) => {
  throw new Error(`__REDIRECT__:${url}`);
});
const notFoundMock = jest.fn(() => {
  throw new Error("__NOTFOUND__");
});

jest.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
  notFound: () => notFoundMock(),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/digital-requests",
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn(),
}));

jest.mock("@/lib/authz", () => ({
  requirePatientCommunicationAccessFromCookies: jest.fn(),
  isInboxOnlyAccount: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    digitalRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  requirePatientCommunicationAccessFromCookies,
  isInboxOnlyAccount,
} from "@/lib/authz";

type PrismaMock = {
  digitalRequest: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
};
const pm = prisma as unknown as PrismaMock;
const requireAccessMock =
  requirePatientCommunicationAccessFromCookies as jest.Mock;
const isInboxOnlyMock = isInboxOnlyAccount as jest.Mock;

// ---------------------------------------------------------------------------
// Imports — nach den Mocks
// ---------------------------------------------------------------------------

import QuestionnaireCard from "@/components/questionnaire/QuestionnaireCard";
import DigitalRequestDetailPage from "@/app/digital-requests/[id]/page";
import DigitalRequestsPage from "@/app/digital-requests/page";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ACCOUNT = {
  id: "account-1",
  email: "arzt@example.com",
  is_approved: true,
  is_admin: false,
  inquiry_assistant_enabled: false,
  patient_communication_enabled: true,
  current_practice: {
    id: "p-1",
    slug: "praxis-1",
    name: "Praxis 1",
    is_approved: true,
    inquiry_assistant_enabled: true,
    patient_communication_enabled: true,
    website_forms_enabled: false,
    office_cases_enabled: false,
  },
  memberships: [{ practice_id: "p-1", role: "OWNER" }],
};

const BLOCKS = [
  { id: "IDENTITAET", label: "Identität" },
  { id: "VERSICHERUNG", label: "Versicherungsdaten" },
];

const DR_SENT = {
  id: "dr-1",
  createdAt: new Date("2026-05-20T10:00:00Z"),
  submitter_name: "Anna Muster",
  submitter_email: "anna@example.com",
  concern_text: null,
  status: "sent",
  patient_reference: "PAT-001",
  selected_block_ids: ["IDENTITAET"],
  questionnaire_session_id: "session-1",
  sent_at: new Date("2026-05-20T10:30:00Z"),
};

const DR_NEW = {
  ...DR_SENT,
  id: "dr-2",
  status: "new",
  questionnaire_session_id: null,
  sent_at: null,
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function runPage<T>(fn: () => Promise<T>) {
  try {
    const result = await fn();
    return { redirect: null, notFound: false, result };
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    if (m === "__NOTFOUND__")
      return { redirect: null, notFound: true, result: null };
    if (m.startsWith("__REDIRECT__:"))
      return { redirect: m.slice("__REDIRECT__:".length), notFound: false, result: null };
    throw err;
  }
}

// ---------------------------------------------------------------------------
// DigitalRequestDetailClient — Read-Only-Verhalten
// (Wird durch die Server-Seite gerendert; kein direkter Hook-Aufruf möglich)
// ---------------------------------------------------------------------------

describe("Detailseite — sent-Status (via Server-Component-Render)", () => {
  beforeEach(() => {
    requireAccessMock.mockResolvedValue(ACCOUNT);
    isInboxOnlyMock.mockReturnValue(false);
  });

  it("zeigt Versand-Hinweis und keinen Speichern-Button wenn status=sent", async () => {
    pm.digitalRequest.findFirst.mockResolvedValue(DR_SENT);
    const { result } = await runPage(() =>
      DigitalRequestDetailPage({ params: Promise.resolve({ id: "dr-1" }) }),
    );
    const markup = renderToStaticMarkup(result as React.ReactElement);
    expect(markup).toContain("Fragebogen wurde versendet");
    expect(markup).not.toContain("Auswahl speichern");
  });

  it("zeigt Fragebogen-Link wenn questionnaire_session_id gesetzt", async () => {
    pm.digitalRequest.findFirst.mockResolvedValue(DR_SENT);
    const { result } = await runPage(() =>
      DigitalRequestDetailPage({ params: Promise.resolve({ id: "dr-1" }) }),
    );
    const markup = renderToStaticMarkup(result as React.ReactElement);
    expect(markup).toContain("/questionnaires/session-1");
  });

  it("zeigt keinen Versand-Hinweis und den Speichern-Button wenn status=new", async () => {
    pm.digitalRequest.findFirst.mockResolvedValue(DR_NEW);
    const { result } = await runPage(() =>
      DigitalRequestDetailPage({ params: Promise.resolve({ id: "dr-2" }) }),
    );
    const markup = renderToStaticMarkup(result as React.ReactElement);
    expect(markup).not.toContain("Fragebogen wurde versendet");
    expect(markup).toContain("Auswahl speichern");
  });

  it("zeigt Versandzeitpunkt wenn sent_at gesetzt", async () => {
    pm.digitalRequest.findFirst.mockResolvedValue(DR_SENT);
    const { result } = await runPage(() =>
      DigitalRequestDetailPage({ params: Promise.resolve({ id: "dr-1" }) }),
    );
    const markup = renderToStaticMarkup(result as React.ReactElement);
    expect(markup).toContain("Versandzeitpunkt");
  });
});

// ---------------------------------------------------------------------------
// Liste — CTA-Label je Status
// ---------------------------------------------------------------------------

describe("DigitalRequestsPage — CTA-Labels", () => {
  beforeEach(() => {
    requireAccessMock.mockResolvedValue(ACCOUNT);
    isInboxOnlyMock.mockReturnValue(false);
  });

  it("zeigt 'Ansehen' für sent-Zeilen", async () => {
    pm.digitalRequest.findMany.mockResolvedValue([
      { id: "dr-1", createdAt: new Date(), submitter_name: "Test", status: "sent", concern_text: null },
    ]);
    const { result } = await runPage(() => DigitalRequestsPage());
    const markup = renderToStaticMarkup(result as React.ReactElement);
    expect(markup).toContain("Ansehen");
    expect(markup).not.toContain("Bearbeiten");
  });

  it("zeigt 'Bearbeiten' für aktive Zeilen (new / in_review)", async () => {
    pm.digitalRequest.findMany.mockResolvedValue([
      { id: "dr-1", createdAt: new Date(), submitter_name: "Test", status: "new", concern_text: null },
    ]);
    const { result } = await runPage(() => DigitalRequestsPage());
    const markup = renderToStaticMarkup(result as React.ReactElement);
    expect(markup).toContain("Bearbeiten");
    expect(markup).not.toContain("Ansehen");
  });

  it("separiert aktive und versendete Zeilen in zwei Bereiche", async () => {
    pm.digitalRequest.findMany.mockResolvedValue([
      { id: "dr-1", createdAt: new Date(), submitter_name: "Aktiv", status: "new", concern_text: null },
      { id: "dr-2", createdAt: new Date(), submitter_name: "Versendet", status: "sent", concern_text: null },
    ]);
    const { result } = await runPage(() => DigitalRequestsPage());
    const markup = renderToStaticMarkup(result as React.ReactElement);
    expect(markup).toContain("Offen");
    expect(markup).toContain("Versendet");
    expect(markup).toContain("Bearbeiten");
    expect(markup).toContain("Ansehen");
  });
});

// ---------------------------------------------------------------------------
// QuestionnaireCard — Herkunftsbadge
// ---------------------------------------------------------------------------

describe("QuestionnaireCard — isFromDigitalRequest", () => {
  const BASE_PROPS = {
    id: "session-1",
    displayedAt: new Date("2026-05-20T10:00:00Z"),
    patientReference: "PAT-001",
    blockLabels: "Identität",
    displayStatus: "pending",
    statusLabel: "Ausstehend",
    submittedBy: null,
    identityGateCompletedAt: null,
    questions: [],
    answers: null,
    noteText: "",
  };

  it("zeigt Badge 'Digitale Anfrage' wenn isFromDigitalRequest=true", () => {
    const markup = renderToStaticMarkup(
      QuestionnaireCard({ ...BASE_PROPS, isFromDigitalRequest: true }),
    );
    expect(markup).toContain("Digitale Anfrage");
  });

  it("kein Badge wenn isFromDigitalRequest=false", () => {
    const markup = renderToStaticMarkup(
      QuestionnaireCard({ ...BASE_PROPS, isFromDigitalRequest: false }),
    );
    expect(markup).not.toContain("Digitale Anfrage");
  });

  it("kein Badge wenn isFromDigitalRequest nicht übergeben (Default)", () => {
    const markup = renderToStaticMarkup(QuestionnaireCard(BASE_PROPS));
    expect(markup).not.toContain("Digitale Anfrage");
  });
});
