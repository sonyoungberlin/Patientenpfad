/**
 * Verifiziert die Anzeige- und Sortier-Logik der prominenten Zeit auf
 * `/questionnaires`:
 *   - Header zeigt `submitted_at ?? createdAt` (= tatsächliche Eingangszeit
 *     bei Website-Sessions nach E-Mail-Bestätigung; sonst Erstellzeit).
 *   - Formatierung in Europe/Berlin (TZ-unabhängig).
 *   - Keine separate "Eingegangen: …"-Zeile mehr (redundant).
 *   - `findMany` wird mit `orderBy [{ submitted_at desc nulls:last },
 *     { createdAt desc }]` aufgerufen.
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
      return null;
    },
);

import { prisma } from "@/lib/prisma";

type PrismaMock = {
  patientQuestionnaireSession: { findMany: jest.Mock };
};
const prismaMock = prisma as unknown as PrismaMock;

// 11.01.2024 08:00 UTC == 09:00 Europe/Berlin
const SUBMITTED_AT = new Date("2024-01-11T08:00:00Z");
// 10.01.2024 10:00 UTC == 11:00 Europe/Berlin
const CREATED_AT = new Date("2024-01-10T10:00:00Z");

const COMPLETED_SESSION = {
  id: "session-completed-1",
  createdAt: CREATED_AT,
  patient_reference: "Max Mustermann",
  selected_block_ids: [],
  status: "completed",
  token_expires_at: null,
  submitted_at: SUBMITTED_AT,
  submitted_by: "patient",
  deduplicated_questions: [],
  answers: null,
  identity_gate_completed_at: null,
};

const PENDING_INTERNAL_SESSION = {
  id: "session-pending-1",
  createdAt: CREATED_AT,
  patient_reference: "Erika Musterfrau",
  selected_block_ids: [],
  status: "pending",
  token_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
  submitted_at: null,
  submitted_by: null,
  deduplicated_questions: [],
  answers: null,
  identity_gate_completed_at: null,
};

describe("QuestionnairesPage – Zeitanzeige", () => {
  beforeEach(() => {
    prismaMock.patientQuestionnaireSession.findMany.mockReset();
  });

  it("zeigt im Kopf submitted_at (Europe/Berlin), wenn vorhanden", async () => {
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      COMPLETED_SESSION,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage({}));
    // 11.01.2024 08:00 UTC -> 09:00 Berlin
    expect(markup).toContain("11.01.24, 09:00");
    // createdAt-Zeit (11:00 Berlin) darf NICHT prominent erscheinen.
    expect(markup).not.toContain("10.01.24, 11:00");
  });

  it("fällt auf createdAt zurück, wenn submitted_at null ist", async () => {
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      PENDING_INTERNAL_SESSION,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage({}));
    // 10.01.2024 10:00 UTC -> 11:00 Berlin
    expect(markup).toContain("10.01.24, 11:00");
  });

  it("rendert keine separate 'Eingegangen:'-Zeile mehr", async () => {
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([
      COMPLETED_SESSION,
    ]);

    const markup = renderToStaticMarkup(await QuestionnairesPage({}));
    expect(markup).not.toContain("Eingegangen:");
  });

  it("sortiert findMany nach submitted_at desc nulls:last, dann createdAt desc", async () => {
    prismaMock.patientQuestionnaireSession.findMany.mockResolvedValue([]);

    await QuestionnairesPage({});

    const call = prismaMock.patientQuestionnaireSession.findMany.mock.calls[0]?.[0];
    expect(call?.orderBy).toEqual([
      { submitted_at: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ]);
  });
});
