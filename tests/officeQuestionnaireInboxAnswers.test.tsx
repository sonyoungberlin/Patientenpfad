/**
 * Tests für die Office-Fragebogen-Inbox (/office-cases/questionnaire):
 *
 * - completed Session mit answers zeigt „Antworten anzeigen"
 * - pending Session ohne answers zeigt kein „Antworten anzeigen"
 * - Fragen und Antworten werden in der Aufklapp-Ansicht gerendert
 * - leere Antworten zeigen „–"
 * - yes_no-Antworten werden formatiert
 * - repeatable_group-Antworten werden strukturiert angezeigt
 * - konditionale Fragen nicht abgefragt → „Nicht abgefragt"
 * - PDF-Button erscheint nur bei completed
 * - Löschen-Button immer vorhanden
 * - Zugriff nur für OWNER/ADMIN (requireOfficeQuestionnaireAccessFromCookies)
 */

import { renderToStaticMarkup } from "react-dom/server";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => <a href={href} {...rest}>{children}</a>,
}));

jest.mock("@/lib/authz", () => ({
  requireOfficeQuestionnaireAccessFromCookies: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/office/scope", () => ({
  getOfficeOwnershipFilter: () => ({ owner_practice_id: "p-1" }),
  canAccessOfficeCases: () => true,
}));

jest.mock("@/components/office/OfficeQuestionnaireDeleteButton", () => ({
  __esModule: true,
  default: ({ sessionId }: { sessionId: string }) => (
    <button type="button" data-office-q-delete={sessionId}>
      Löschen
    </button>
  ),
}));

import { prisma } from "@/lib/prisma";
import { requireOfficeQuestionnaireAccessFromCookies } from "@/lib/authz";
import OfficeQuestionnairePage from "@/app/office-cases/questionnaire/page";

type PrismaMock = {
  patientQuestionnaireSession: { findMany: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;
const authMock = requireOfficeQuestionnaireAccessFromCookies as jest.Mock;

const OWNER_ACCOUNT = {
  id: "acc-owner",
  email: "owner@praxis.de",
  is_approved: true,
  is_admin: false,
  current_practice: { id: "p-1", slug: "praxis", name: "Praxis" },
};

/** Minimaler FrozenBlock-Snapshot für Tests. */
function makeFrozenBlocks(
  blockId: string,
  questions: Array<{ id: string; text: string; type: string; required: boolean }>,
  conditionalRules: unknown[] = [],
) {
  return [
    {
      id: blockId,
      label: "Test-Block",
      displayOrder: 10,
      questions,
      conditionalRules,
      initiallyVisible: true,
    },
  ];
}

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    createdAt: new Date("2026-01-10T10:00:00Z"),
    patient_reference: "Anna Muster",
    selected_block_ids: ["BEWERBER_KONTAKT"],
    status: "pending",
    token_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
    submitted_at: null,
    pdf_downloaded_at: null,
    answers: null,
    frozen_blocks: null,
    ...overrides,
  };
}

beforeEach(() => {
  pm.patientQuestionnaireSession.findMany.mockReset();
  authMock.mockReset();
  authMock.mockResolvedValue(OWNER_ACCOUNT);
});

// ---------------------------------------------------------------------------
// Zugriff
// ---------------------------------------------------------------------------

describe("OfficeQuestionnairePage – Zugriff", () => {
  it("leitet weiter wenn nicht eingeloggt", async () => {
    authMock.mockResolvedValue(null);
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([]);
    await expect(OfficeQuestionnairePage()).rejects.toThrow("__REDIRECT__:/");
  });

  it("rendert Seite für OWNER", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    expect(markup).toContain("Bewerber-Fragebögen");
  });
});

// ---------------------------------------------------------------------------
// „Antworten anzeigen" – Sichtbarkeit
// ---------------------------------------------------------------------------

describe("OfficeQuestionnairePage – Antworten anzeigen", () => {
  it("zeigt 'Antworten anzeigen' bei completed Session mit answers", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([
      baseSession({
        id: "s-completed",
        status: "completed",
        submitted_at: new Date("2026-01-11T08:00:00Z"),
        answers: { OFF_VORNAME: "Anna" },
        frozen_blocks: makeFrozenBlocks("BEWERBER_KONTAKT", [
          { id: "OFF_VORNAME", text: "Vorname", type: "text", required: true },
        ]),
      }),
    ]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    expect(markup).toContain("Antworten anzeigen");
  });

  it("zeigt kein 'Antworten anzeigen' bei pending Session ohne answers", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([
      baseSession({ id: "s-pending", status: "pending" }),
    ]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    expect(markup).not.toContain("Antworten anzeigen");
  });

  it("zeigt kein 'Antworten anzeigen' wenn answers leer (null)", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([
      baseSession({
        id: "s-no-answers",
        status: "completed",
        submitted_at: new Date("2026-01-11T08:00:00Z"),
        answers: null,
        frozen_blocks: makeFrozenBlocks("BEWERBER_KONTAKT", [
          { id: "OFF_VORNAME", text: "Vorname", type: "text", required: true },
        ]),
      }),
    ]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    expect(markup).not.toContain("Antworten anzeigen");
  });
});

// ---------------------------------------------------------------------------
// Fragen und Antworten werden gerendert
// ---------------------------------------------------------------------------

describe("OfficeQuestionnairePage – Antwortinhalt", () => {
  it("rendert Fragetext und Antwortwert", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([
      baseSession({
        status: "completed",
        submitted_at: new Date("2026-01-11T08:00:00Z"),
        answers: { OFF_VORNAME: "Anna", OFF_NACHNAME: "Muster" },
        frozen_blocks: makeFrozenBlocks("BEWERBER_KONTAKT", [
          { id: "OFF_VORNAME", text: "Vorname", type: "text", required: true },
          { id: "OFF_NACHNAME", text: "Nachname", type: "text", required: true },
        ]),
      }),
    ]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    expect(markup).toContain("Vorname");
    expect(markup).toContain("Nachname");
    expect(markup).toContain("Anna");
    expect(markup).toContain("Muster");
  });

  it("zeigt '–' bei leerer Antwort auf sichtbare Frage", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([
      baseSession({
        status: "completed",
        submitted_at: new Date("2026-01-11T08:00:00Z"),
        answers: { OFF_VORNAME: "Anna", OFF_NACHNAME: "" },
        frozen_blocks: makeFrozenBlocks("BEWERBER_KONTAKT", [
          { id: "OFF_VORNAME", text: "Vorname", type: "text", required: true },
          { id: "OFF_NACHNAME", text: "Nachname", type: "text", required: false },
        ]),
      }),
    ]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    // Leere Antwort rendert das Dash-Zeichen
    expect(markup).toContain("–");
  });

  it("formatiert yes_no-Antwort mit Großbuchstabe", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([
      baseSession({
        status: "completed",
        submitted_at: new Date("2026-01-11T08:00:00Z"),
        answers: { OFF_FUEHRERSCHEIN: "ja" },
        frozen_blocks: makeFrozenBlocks("BEWERBER_FUEHRERSCHEIN", [
          { id: "OFF_FUEHRERSCHEIN", text: "Führerschein vorhanden?", type: "yes_no", required: false },
        ]),
      }),
    ]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    expect(markup).toContain("Führerschein vorhanden?");
    expect(markup).toContain("Ja");
    expect(markup).not.toMatch(/>ja</);
  });

  it("rendert repeatable_group strukturiert mit Einträgen", async () => {
    const groupAnswer = JSON.stringify([
      { sprache: "Englisch", niveau: "C1" },
    ]);
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([
      baseSession({
        status: "completed",
        submitted_at: new Date("2026-01-11T08:00:00Z"),
        answers: { OFF_SPRACHKENNTNISSE: groupAnswer },
        frozen_blocks: makeFrozenBlocks("BEWERBER_SPRACHKENNTNISSE", [
          {
            id: "OFF_SPRACHKENNTNISSE",
            text: "Sprachkenntnisse",
            type: "repeatable_group",
            required: false,
          },
        ]),
      }),
    ]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    expect(markup).toContain("Sprachkenntnisse");
    expect(markup).toContain("Eintrag");
  });
});

// ---------------------------------------------------------------------------
// Konditionale Fragen
// ---------------------------------------------------------------------------

describe("OfficeQuestionnairePage – konditionale Fragen", () => {
  it("zeigt 'Nicht abgefragt' bei nicht-sichtbarer konditionaler Frage", async () => {
    // OFF_FUEHRERSCHEIN_KLASSEN ist nur sichtbar wenn OFF_FUEHRERSCHEIN = "ja"
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([
      baseSession({
        status: "completed",
        submitted_at: new Date("2026-01-11T08:00:00Z"),
        answers: { OFF_FUEHRERSCHEIN: "nein" },
        frozen_blocks: makeFrozenBlocks(
          "BEWERBER_FUEHRERSCHEIN",
          [
            { id: "OFF_FUEHRERSCHEIN", text: "Führerschein?", type: "yes_no", required: false },
            { id: "OFF_FUEHRERSCHEIN_KLASSEN", text: "Führerscheinklassen", type: "text", required: false },
          ],
          [
            {
              action: "showQuestion",
              targetId: "OFF_FUEHRERSCHEIN_KLASSEN",
              condition: {
                target: { kind: "question", questionId: "OFF_FUEHRERSCHEIN" },
                operator: "equals",
                value: "ja",
              },
            },
          ],
        ),
      }),
    ]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    expect(markup).toContain("Nicht abgefragt");
  });
});

// ---------------------------------------------------------------------------
// PDF und Löschen
// ---------------------------------------------------------------------------

describe("OfficeQuestionnairePage – PDF und Löschen", () => {
  it("zeigt PDF-Button nur bei completed Session", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([
      baseSession({
        id: "s-comp",
        status: "completed",
        submitted_at: new Date("2026-01-11T08:00:00Z"),
        answers: { OFF_VORNAME: "Anna" },
        frozen_blocks: null,
      }),
      baseSession({
        id: "s-pend",
        status: "pending",
      }),
    ]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    expect(markup).toContain(`data-office-q-pdf="s-comp"`);
    expect(markup).not.toContain(`data-office-q-pdf="s-pend"`);
  });

  it("zeigt Löschen-Button für alle Sessions", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([
      baseSession({ id: "s-1", status: "completed", submitted_at: new Date() }),
      baseSession({ id: "s-2", status: "pending" }),
    ]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    expect(markup).toContain(`data-office-q-delete="s-1"`);
    expect(markup).toContain(`data-office-q-delete="s-2"`);
  });
});

// ---------------------------------------------------------------------------
// Fallback: frozen_blocks = null → OFFICE_BLOCK_CATALOG
// ---------------------------------------------------------------------------

describe("OfficeQuestionnairePage – Catalog-Fallback", () => {
  it("rendert Antworten aus OFFICE_BLOCK_CATALOG wenn frozen_blocks fehlen", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([
      baseSession({
        status: "completed",
        submitted_at: new Date("2026-01-11T08:00:00Z"),
        selected_block_ids: ["BEWERBER_KONTAKT"],
        answers: { OFF_VORNAME: "Karl" },
        frozen_blocks: null,
      }),
    ]);
    const markup = renderToStaticMarkup(await OfficeQuestionnairePage());
    expect(markup).toContain("Antworten anzeigen");
    expect(markup).toContain("Karl");
  });
});
