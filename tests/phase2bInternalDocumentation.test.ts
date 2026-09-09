import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/authz", () => ({
  requireQuestionnaireInboxAccess: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import { buildQuestionnaireInboxDetail } from "@/lib/questionnaire/inboxDetail";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import { buildInternalDocumentationFrozenBlocks } from "@/lib/questionnaire/internalWorkflowRegistry";
import { isNewBlockBasedInternalSession } from "@/lib/questionnaire/documentedContent";
import { submitInternalDocumentationSession } from "@/lib/questionnaire/internalDocumentationService";
import { GET as PdfRoute } from "@/app/api/questionnaire/[id]/pdf/route";

const sessionDb = prisma.patientQuestionnaireSession as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
};
const accessMock = requireQuestionnaireInboxAccess as jest.Mock;

const selectedBlockIds = [
  "CARE_PLAN_HA",
  "VACCINATION_REVIEW",
  "HEALTH_CHECK_NEXT_STEPS",
];
const frozenBlocks = buildInternalDocumentationFrozenBlocks(selectedBlockIds);
const questions = frozenBlocks.flatMap((block) => block.questions);
const answers = {
  CARE_PLAN_HA_REASON: "Versorgung abstimmen",
  VACCINATION_REVIEW_ITEMS: JSON.stringify([{
    vaccination_id: "influenza",
    documented_status: "Vollständig vorhanden",
  }]),
  HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein",
};

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "phase-2b-session",
    status: "completed",
    session_kind: "internal_documentation",
    internal_workflow_id: null,
    source: "practice_direct",
    owner_practice_id: "practice-1",
    created_by_kiosk_device_id: null,
    deleted_at: null,
    patient_reference: "PAT-2B",
    submitted_at: new Date("2026-09-09T10:00:00.000Z"),
    submitted_by: "practice",
    selected_block_ids: selectedBlockIds,
    deduplicated_questions: questions,
    frozen_blocks: frozenBlocks,
    answers,
    practice_form: null,
    context: "patient",
    pdf_downloaded_at: null,
    ...overrides,
  };
}

describe("Phase 2B blockbasierte interne Dokumentation", () => {
  beforeEach(() => {
    sessionDb.findUnique.mockReset();
    sessionDb.update.mockReset().mockResolvedValue({});
    sessionDb.updateMany.mockReset().mockResolvedValue({ count: 1 });
    accessMock.mockReset().mockResolvedValue({
      account: { id: "account-1", current_practice: { id: "practice-1" } },
    });
  });

  it("erkennt nur vollständige null-Workflow-Snapshots als neuen Pfad", () => {
    expect(isNewBlockBasedInternalSession({
      sessionKind: "internal_documentation",
      internalWorkflowId: null,
      frozenBlocks,
    })).toBe(true);
    expect(isNewBlockBasedInternalSession({
      sessionKind: "internal_documentation",
      internalWorkflowId: "care_plan_v1",
      frozenBlocks,
    })).toBe(false);
    expect(isNewBlockBasedInternalSession({
      sessionKind: "internal_documentation",
      internalWorkflowId: null,
      frozenBlocks: [frozenBlocks[0], { ...frozenBlocks[1], outputSemantics: undefined }],
    })).toBe(false);
  });

  it("submitten, Inbox-Detail und Copytext ohne Workflowauflösung", async () => {
    sessionDb.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: null,
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: frozenBlocks,
    });

    await submitInternalDocumentationSession({
      sessionId: "phase-2b-session",
      answers,
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });

    expect(sessionDb.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "phase-2b-session",
        internal_workflow_id: null,
      }),
      data: expect.objectContaining({ status: "completed", answers }),
    }));

    const detail = buildQuestionnaireInboxDetail({
      selected_block_ids: selectedBlockIds,
      deduplicated_questions: questions,
      answers,
      frozen_blocks: frozenBlocks,
      session_kind: "internal_documentation",
      internal_workflow_id: null,
    });
    expect(detail.noteText).toContain("Interne Dokumentation");
    expect(detail.noteText).toContain("Versorgung abstimmen");
    expect(detail.noteText).toContain("Impfungen");
    expect(detail.noteText).toContain("Keine weitere Abklärung oder Kontrolle erforderlich.");
  });

  it("rendert Cross-Module-PDF neutral und Frozen-basiert", async () => {
    const result = await buildQuestionnairePdfBytes(session(), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });

    expect(result.filename).toBe("20260909_PAT2B_Interne_Dokumentation.pdf");
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it("liefert die neue Session über die normale PDF-Route ohne Workflow", async () => {
    sessionDb.findUnique.mockResolvedValue(session());
    const response = await PdfRoute(
      new NextRequest("http://localhost/api/questionnaire/phase-2b-session/pdf"),
      { params: Promise.resolve({ id: "phase-2b-session" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain(
      "20260909_PAT2B_Interne_Dokumentation.pdf",
    );
  });
});
