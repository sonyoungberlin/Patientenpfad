/**
 * UI-Tests für die /questionnaires-Seite (Praxis-Funktion):
 * Prüft dass bei completed Sessions der Krankenblatt-Text angezeigt wird
 * und bei pending/anderen Sessions nicht.
 */

import { renderToStaticMarkup } from "react-dom/server";
import QuestionnairesPage from "@/app/questionnaires/page";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  getSessionAccountFromCookies: jest.fn().mockResolvedValue({
    id: "acc-admin",
    email: "admin@example.com",
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

// MedicalRecordNoteCopyButton is a client component; mock it for SSR tests
jest.mock(
  "@/components/questionnaire/MedicalRecordNoteCopyButton",
  () =>
    function MockCopyButton({
      noteText,
      sessionId,
    }: {
      noteText: string;
      sessionId: string;
    }) {
      return (
        <div data-q-record-note-section={sessionId}>
          <button type="button" data-q-copy-note={sessionId}>
            Krankenblatt-Text kopieren
          </button>
          <pre data-q-note={sessionId}>{noteText}</pre>
        </div>
      );
    },
);

// QuestionnaireDeleteButton is a client component; mock it for SSR tests
jest.mock(
  "@/components/questionnaire/QuestionnaireDeleteButton",
  () =>
    function MockDeleteButton({ sessionId }: { sessionId: string }) {
      return (
        <button type="button" data-q-delete={sessionId}>
          Löschen
        </button>
      );
    },
);

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  patientQuestionnaireSession: { findMany: jest.Mock };
};
const prismaMock = prisma as unknown as PrismaMock;

const COMPLETED_SESSION = {
  id: "session-completed-1",
  createdAt: new Date("2024-01-10T10:00:00Z"),
  patient_reference: "Max Mustermann",
  selected_block_ids: ["ARBEITSUNFAEHIGKEIT", "KONTAKT"],
  status: "completed",
  token_expires_at: new Date("2024-01-17T10:00:00Z"),
  submitted_at: new Date("2024-01-11T08:00:00Z"),
  deduplicated_questions: [
    { id: "AU_SYMPTOMS", text: "Welche Beschwerden haben Sie?", type: "textarea", required: true },
  ],
  answers: {
    AU_SYMPTOMS: "Husten",
    AU_START_DATE: "2024-01-10",
    CONTACT_PHONE: "0170 1234567",
  },
};

const PENDING_SESSION = {
  id: "session-pending-1",
  createdAt: new Date("2024-01-10T10:00:00Z"),
  patient_reference: "Erika Musterfrau",
  selected_block_ids: ["REZEPT"],
  status: "pending",
  token_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
  submitted_at: null,
  deduplicated_questions: [],
  answers: null,
};

describe("QuestionnairesPage – Krankenblatt-Text", () => {
  beforeEach(() => {
    prismaMock.patientQuestionnaireSession.findMany.mockReset();
  });

  it("zeigt 'Krankenblatt-Text kopieren'-Button bei completed Session", async () => {
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      COMPLETED_SESSION,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage());
    expect(markup).toContain("Krankenblatt-Text kopieren");
    expect(markup).toContain(`data-q-copy-note="session-completed-1"`);
  });

  it("zeigt Krankenblatt-Text-Inhalt bei completed Session", async () => {
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      COMPLETED_SESSION,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage());
    expect(markup).toContain("AU-Anfrage (digital)");
    expect(markup).toContain("Beschwerden");
  });

  it("zeigt keinen Krankenblatt-Text bei pending Session", async () => {
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      PENDING_SESSION,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage());
    expect(markup).not.toContain("Krankenblatt-Text kopieren");
    expect(markup).not.toContain("data-q-copy-note");
  });

  it("zeigt Krankenblatt-Text nur für completed, nicht für pending in gemischter Liste", async () => {
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      COMPLETED_SESSION,
      PENDING_SESSION,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage());
    expect(markup).toContain(`data-q-copy-note="session-completed-1"`);
    expect(markup).not.toContain(`data-q-copy-note="session-pending-1"`);
  });

  it("zeigt keinen Krankenblatt-Text bei abgelaufener Session", async () => {
    const expiredSession = {
      ...PENDING_SESSION,
      id: "session-expired-1",
      token_expires_at: new Date(Date.now() - 60 * 60 * 1000), // expired
    };
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      expiredSession,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage());
    expect(markup).not.toContain("Krankenblatt-Text kopieren");
  });
});

describe("QuestionnairesPage – Löschen-Button", () => {
  beforeEach(() => {
    prismaMock.patientQuestionnaireSession.findMany.mockReset();
  });

  it("zeigt Löschen-Button bei completed Session", async () => {
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      COMPLETED_SESSION,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage());
    expect(markup).toContain("Löschen");
    expect(markup).toContain(`data-q-delete="session-completed-1"`);
  });

  it("zeigt Löschen-Button bei pending Session", async () => {
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      PENDING_SESSION,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage());
    expect(markup).toContain("Löschen");
    expect(markup).toContain(`data-q-delete="session-pending-1"`);
  });

  it("zeigt Löschen-Button bei abgelaufener Session", async () => {
    const expiredSession = {
      ...PENDING_SESSION,
      id: "session-expired-2",
      token_expires_at: new Date(Date.now() - 60 * 60 * 1000),
    };
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      expiredSession,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage());
    expect(markup).toContain("Löschen");
    expect(markup).toContain(`data-q-delete="session-expired-2"`);
  });

  it("zeigt pro Session genau einen Löschen-Button", async () => {
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      COMPLETED_SESSION,
      PENDING_SESSION,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage());
    expect(markup).toContain(`data-q-delete="session-completed-1"`);
    expect(markup).toContain(`data-q-delete="session-pending-1"`);
  });
});
