/**
 * Tests für die Papierkorb-Ansicht von /questionnaires
 *
 * Prüft:
 * - Default (`view` fehlt) filtert per `deleted_at: null` und zeigt den
 *   Aktiv-Tab als selektiert.
 * - `?view=trash` filtert per `deleted_at: { not: null }`, zeigt den
 *   Papierkorb-Tab als selektiert und rendert „Gelöscht"/„Wiederherstellen".
 * - Aktive Liste rendert KEIN „Gelöscht"-Badge und KEINEN Restore-Button.
 * - Unbekannte `view`-Werte fallen auf „aktiv" zurück.
 */

import { renderToStaticMarkup } from "react-dom/server";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn().mockResolvedValue({
    id: "acc-owner",
    email: "owner@example.com",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: true,
  }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock(
  "@/components/questionnaire/MedicalRecordNoteCopyButton",
  () =>
    function MockCopyButton() {
      return null;
    },
);

jest.mock(
  "@/components/questionnaire/QuestionnaireDeleteButton",
  () =>
    function MockDeleteButton() {
      return <button data-q-delete-mock="true">Löschen-Mock</button>;
    },
);

jest.mock(
  "@/components/questionnaire/QuestionnaireRestoreButton",
  () =>
    function MockRestoreButton({ sessionId }: { sessionId: string }) {
      return (
        <button data-q-restore-mock={sessionId}>Wiederherstellen-Mock</button>
      );
    },
);

import QuestionnairesPage from "@/app/questionnaires/page";
import { prisma } from "@/lib/prisma";

type PrismaMock = {
  patientQuestionnaireSession: { findMany: jest.Mock };
};
const pm = prisma as unknown as PrismaMock;

const ACTIVE_SESSION = {
  id: "sess-active",
  createdAt: new Date("2026-05-04T10:00:00Z"),
  patient_reference: "Aktiver Patient",
  selected_block_ids: [],
  status: "completed",
  token_expires_at: null,
  submitted_at: new Date("2026-05-04T10:00:00Z"),
  submitted_by: "patient",
  deduplicated_questions: [],
  answers: null,
  identity_gate_completed_at: null,
  pdf_downloaded_at: null,
  deleted_at: null,
};

const DELETED_SESSION = {
  id: "sess-deleted",
  createdAt: new Date("2026-05-03T10:00:00Z"),
  patient_reference: "Archivierter Patient",
  selected_block_ids: [],
  status: "completed",
  token_expires_at: null,
  submitted_at: new Date("2026-05-03T10:00:00Z"),
  submitted_by: "patient",
  deduplicated_questions: [],
  answers: null,
  identity_gate_completed_at: null,
  pdf_downloaded_at: null,
  deleted_at: new Date("2026-05-04T09:00:00Z"),
};

beforeEach(() => {
  pm.patientQuestionnaireSession.findMany.mockReset();
});

function pickDeletedAtFilter(call: { where: { AND: unknown[] } }) {
  // Suche das `deleted_at`-Fragment im AND-Array, ohne dessen Position fest
  // zu verdrahten.
  const and = call.where.AND;
  return and.find(
    (f): f is { deleted_at: unknown } =>
      typeof f === "object" && f !== null && "deleted_at" in f,
  );
}

describe("QuestionnairesPage – Papierkorb-Toggle", () => {
  it("Default: filtert auf deleted_at null und zeigt aktive Liste", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([ACTIVE_SESSION]);

    const markup = renderToStaticMarkup(await QuestionnairesPage());

    const call = pm.patientQuestionnaireSession.findMany.mock.calls[0][0];
    expect(pickDeletedAtFilter(call)).toEqual({ deleted_at: null });

    expect(markup).toContain('data-q-view-toggle="active"');
    expect(markup).toContain('data-q-view-tab="active"');
    expect(markup).toContain("Aktiver Patient");
    // Lösch-Mock ist sichtbar, Restore-Mock NICHT.
    expect(markup).toContain('data-q-delete-mock="true"');
    expect(markup).not.toContain("data-q-restore-mock");
    expect(markup).not.toContain("Gelöscht");
  });

  it('?view=trash: filtert auf deleted_at { not: null } und zeigt Restore-Button + "Gelöscht"-Badge', async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([DELETED_SESSION]);

    const markup = renderToStaticMarkup(
      await QuestionnairesPage({
        searchParams: Promise.resolve({ view: "trash" }),
      }),
    );

    const call = pm.patientQuestionnaireSession.findMany.mock.calls[0][0];
    expect(pickDeletedAtFilter(call)).toEqual({
      deleted_at: { not: null },
    });

    expect(markup).toContain('data-q-view-toggle="trash"');
    expect(markup).toContain("Archivierter Patient");
    // „Gelöscht"-Badge erscheint
    expect(markup).toContain("Gelöscht");
    expect(markup).toContain('data-q-deleted-badge="sess-deleted"');
    // Restore-Mock statt Lösch-Mock
    expect(markup).toContain('data-q-restore-mock="sess-deleted"');
    expect(markup).not.toContain('data-q-delete-mock="true"');
    // Karte ist als gelöscht markiert
    expect(markup).toContain('data-q-deleted="true"');
  });

  it("Papierkorb leer: zeigt entsprechende Meldung", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await QuestionnairesPage({
        searchParams: Promise.resolve({ view: "trash" }),
      }),
    );

    expect(markup).toContain("Papierkorb ist leer.");
  });

  it("Unbekannter ?view-Wert fällt auf aktive Liste zurück", async () => {
    pm.patientQuestionnaireSession.findMany.mockResolvedValue([ACTIVE_SESSION]);

    await QuestionnairesPage({
      searchParams: Promise.resolve({ view: "garbage" }),
    });

    const call = pm.patientQuestionnaireSession.findMany.mock.calls[0][0];
    expect(pickDeletedAtFilter(call)).toEqual({ deleted_at: null });
  });
});
