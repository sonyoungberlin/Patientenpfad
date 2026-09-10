import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { inflateSync } from "node:zlib";

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

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  await PDFDocument.load(bytes);
  const raw = Buffer.from(bytes).toString("latin1");
  const streams: string[] = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      streams.push(inflateSync(Buffer.from(match[1]!, "latin1")).toString("latin1"));
    } catch {
      streams.push(match[1]!);
    }
  }
  return streams
    .join(" ")
    .replace(/<([0-9A-F]+)>\s+Tj/g, (_, hex: string) =>
      Buffer.from(hex, "hex").toString("latin1"),
    );
}

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
      patient_reference: "PAT-2B",
      submitted_at: new Date("2026-09-09T10:00:00.000Z"),
      selected_block_ids: selectedBlockIds,
      deduplicated_questions: questions,
      answers,
      frozen_blocks: frozenBlocks,
      source: "practice_direct",
      session_kind: "internal_documentation",
      internal_workflow_id: null,
    });
    expect(detail.noteText).not.toContain("Interne Dokumentation");
    expect(detail.noteText).toContain("Versorgung abstimmen");
    expect(detail.noteText).toContain("Impfungen");
    expect(detail.noteText).toContain("Keine weitere Abklärung oder Kontrolle erforderlich.");
    expect(detail.xmlFilename).toBe("20260909_PAT2B_Interne_Dokumentation.xml");
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

  it("bereinigt Titel und BMI und ergänzt Frozen-Einheiten in Copytext und PDF", async () => {
    const measurementBlocks = buildInternalDocumentationFrozenBlocks([
      "HEALTH_CHECK_CLINICAL_STATUS",
      "HEALTH_CHECK_MEASUREMENTS",
    ]);
    const measurementAnswers = {
      HEALTH_CHECK_GENERAL_STATUS: "unauffällig",
      HEALTH_CHECK_BP_SYSTOLIC: "120",
      HEALTH_CHECK_BP_DIASTOLIC: "80",
      HEALTH_CHECK_HEART_RATE: "83",
      HEALTH_CHECK_BLOOD_GLUCOSE: "102",
      HEALTH_CHECK_HEIGHT_CM: "175",
      HEALTH_CHECK_WEIGHT_KG: "80",
    };
    const note = buildMedicalRecordNote({
      answers: measurementAnswers,
      selected_block_ids: measurementBlocks.map((block) => block.id),
      frozenBlocks: measurementBlocks,
      internalWorkflowId: null,
    });

    expect(note).not.toContain("Interne Dokumentation");
    expect(note).not.toContain("Berechnete Werte");
    expect(note).not.toContain("BMI:");
    expect(note).toContain("Klinischer Status");
    expect(note).toContain("Messwerte");
    expect(note).toContain("RR 120/80 mmHg - HF 83/min - BZ 102 mg/dl - Größe 175 cm - Gewicht 80 kg");
    const partialNote = buildMedicalRecordNote({
      answers: {
        HEALTH_CHECK_BP_SYSTOLIC: "128",
        HEALTH_CHECK_BP_DIASTOLIC: "86",
        HEALTH_CHECK_HEART_RATE: "83",
        HEALTH_CHECK_WEIGHT_KG: "80",
      },
      selected_block_ids: measurementBlocks.map((block) => block.id),
      frozenBlocks: measurementBlocks,
      internalWorkflowId: null,
    });
    expect(partialNote).toContain("RR 128/86 mmHg - HF 83/min - Gewicht 80 kg");
    expect(partialNote).not.toContain("BZ ");
    expect(partialNote).not.toContain("Größe ");
    expect(measurementAnswers.HEALTH_CHECK_HEIGHT_CM).toBe("175");
    expect(measurementAnswers.HEALTH_CHECK_WEIGHT_KG).toBe("80");

    const result = await buildQuestionnairePdfBytes(session({
      selected_block_ids: measurementBlocks.map((block) => block.id),
      deduplicated_questions: measurementBlocks.flatMap((block) => block.questions),
      frozen_blocks: measurementBlocks,
      answers: measurementAnswers,
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    const text = await extractPdfText(result.bytes);

    expect(text).not.toContain("Interne Dokumentation");
    expect(text).not.toContain("Berechnete Werte");
    expect(text).not.toContain("BMI:");
    expect(text).toContain("Klinischer Status");
    expect(text).toContain("Messwerte");
    expect(text).toContain("RR 120/80 mmHg - HF 83/min - BZ 102 mg/dl - Größe 175 cm - Gewicht 80 kg");
  });

  it("speichert Messwerte weiterhin ohne Einheiten", async () => {
    const measurementBlocks = buildInternalDocumentationFrozenBlocks([
      "HEALTH_CHECK_MEASUREMENTS",
    ]);
    const measurementAnswers = {
      HEALTH_CHECK_HEIGHT_CM: "175",
      HEALTH_CHECK_WEIGHT_KG: "80",
      HEALTH_CHECK_HEART_RATE: "83",
      HEALTH_CHECK_BLOOD_GLUCOSE: "102",
    };
    sessionDb.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: null,
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: measurementBlocks,
    });

    await submitInternalDocumentationSession({
      sessionId: "phase-2b-session",
      answers: measurementAnswers,
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });

    expect(sessionDb.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ answers: measurementAnswers }),
    }));
  });

  it("gibt EKG kompakt aus und speichert numerische Rohwerte", async () => {
    const ekgBlocks = buildInternalDocumentationFrozenBlocks(["EKG"]);
    const ekgAnswers = {
      EKG_RHYTHM: "Sinusrhythmus",
      EKG_HEART_RATE: "83",
      EKG_QTC: "410",
    };
    const note = buildMedicalRecordNote({
      answers: ekgAnswers,
      selected_block_ids: ["EKG"],
      frozenBlocks: ekgBlocks,
      internalWorkflowId: null,
    });

    expect(note).toContain("EKG\nRhythmus: Sinusrhythmus - HF: 83/min - QTc: 410 ms");
    expect(note).not.toContain("Lagetyp:");
    expect(note).not.toContain("Blockbilder:");
    expect(ekgAnswers.EKG_HEART_RATE).toBe("83");
    expect(ekgAnswers.EKG_QTC).toBe("410");
    const completeNote = buildMedicalRecordNote({
      answers: {
        ...ekgAnswers,
        EKG_AXIS: "Indifferenztyp",
        EKG_BLOCK_PATTERNS: "keine",
        EKG_ERBS: "keine",
      },
      selected_block_ids: ["EKG"],
      frozenBlocks: ekgBlocks,
      internalWorkflowId: null,
    });
    expect(completeNote).toContain(
      "Rhythmus: Sinusrhythmus - HF: 83/min - Lagetyp: Indifferenztyp - QTc: 410 ms - Blockbilder: keine - ERBS: keine",
    );

    const result = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["EKG"],
      deduplicated_questions: ekgBlocks.flatMap((block) => block.questions),
      frozen_blocks: ekgBlocks,
      answers: ekgAnswers,
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    expect(await extractPdfText(result.bytes)).toContain(
      "Rhythmus: Sinusrhythmus - HF: 83/min - QTc: 410 ms",
    );

    const emptyPdf = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["EKG"],
      deduplicated_questions: ekgBlocks.flatMap((block) => block.questions),
      frozen_blocks: ekgBlocks,
      answers: {},
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    expect(await extractPdfText(emptyPdf.bytes)).not.toContain("EKG");

    const emptyNote = buildMedicalRecordNote({
      answers: {},
      selected_block_ids: ["EKG"],
      frozenBlocks: ekgBlocks,
      internalWorkflowId: null,
    });
    expect(emptyNote).not.toContain("EKG");

    sessionDb.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: null,
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: ekgBlocks,
    });
    await submitInternalDocumentationSession({
      sessionId: "phase-2b-session",
      answers: ekgAnswers,
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });
    expect(sessionDb.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ answers: ekgAnswers }),
    }));
  });

  it("rendert mehrere Dokumentaktionen im PDF und unterdrückt den unbenutzten Block", async () => {
    const documentBlocks = buildInternalDocumentationFrozenBlocks(["DOCUMENT_HANDLING"]);
    const selectedResult = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["DOCUMENT_HANDLING"],
      deduplicated_questions: documentBlocks.flatMap((block) => block.questions),
      frozen_blocks: documentBlocks,
      answers: { DOCUMENT_HANDLING_ACTIONS: "handed_out, pending_submission" },
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });
    const emptyResult = await buildQuestionnairePdfBytes(session({
      selected_block_ids: ["DOCUMENT_HANDLING"],
      deduplicated_questions: documentBlocks.flatMap((block) => block.questions),
      frozen_blocks: documentBlocks,
      answers: {},
    }), {
      title: "Interne Dokumentation",
      filenameLabel: "Interne Dokumentation",
      referenceLabel: "Patientenreferenz",
      blockCatalog: {},
    });

    const selectedText = await extractPdfText(selectedResult.bytes);
    expect(selectedText).toContain("Dokumente / Befunde wurden mitgegeben.");
    expect(selectedText).toContain("Dokumente / Befunde werden nachgereicht.");
    expect(await extractPdfText(emptyResult.bytes)).not.toContain("Dokumente / Befunde");
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
