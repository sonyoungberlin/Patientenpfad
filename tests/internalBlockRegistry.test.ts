import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import {
  buildInternalDocumentationFrozenBlocks,
  INTERNAL_BLOCK_CATALOG,
  INTERNAL_BLOCK_ORDER,
  INTERNAL_QUESTION_CATALOG,
  resolveInternalBlocks,
} from "@/lib/questionnaire/internalWorkflowRegistry";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: { create: jest.fn() },
  },
}));

const create = prisma.patientQuestionnaireSession.create as jest.Mock;

describe("interne Block Registry und Phase-2A-Frozen-Pipeline", () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ id: "session-2a" });
  });

  it("registriert alle 14 Blocks und global eindeutige Fragen", () => {
    expect(INTERNAL_BLOCK_ORDER).toHaveLength(14);
    expect(Object.keys(INTERNAL_BLOCK_CATALOG)).toHaveLength(14);
    expect(new Set(INTERNAL_BLOCK_ORDER).size).toBe(14);
    expect(INTERNAL_BLOCK_CATALOG.DOCUMENT_HANDLING).toMatchObject({
      label: "Dokumente / Befunde",
      questionIds: ["DOCUMENT_HANDLING_ACTIONS"],
    });
    expect(INTERNAL_BLOCK_CATALOG.EKG).toMatchObject({
      label: "EKG",
      questionIds: ["EKG_RHYTHM", "EKG_HEART_RATE", "EKG_AXIS", "EKG_QTC", "EKG_BLOCK_PATTERNS", "EKG_ERBS"],
      documentationPresentation: { layout: "inline", separator: " – " },
    });
    expect(Object.values(INTERNAL_BLOCK_CATALOG).flatMap((block) => block.questionIds))
      .toHaveLength(new Set(Object.values(INTERNAL_BLOCK_CATALOG).flatMap((block) => block.questionIds)).size);
    for (const block of Object.values(INTERNAL_BLOCK_CATALOG)) {
      for (const questionId of block.questionIds) {
        expect(INTERNAL_QUESTION_CATALOG[questionId]).toBeDefined();
      }
    }
  });

  it("weist unbekannte und doppelte Block-IDs zurück", () => {
    expect(() => resolveInternalBlocks([])).toThrow("Mindestens ein interner Block");
    expect(() => resolveInternalBlocks(["UNKNOWN_INTERNAL_BLOCK"])).toThrow("Unbekannter");
    expect(() => resolveInternalBlocks(["CARE_PLAN_HA", "CARE_PLAN_HA"]))
      .toThrow("mehrfach ausgewählt");
  });

  it("sortiert Einzelblocks und Kombinationen unabhängig von der Eingabereihenfolge", () => {
    const ids = ["VACCINATION_REVIEW", "HEALTH_CHECK_NEXT_STEPS", "EKG", "DOCUMENT_HANDLING", "CARE_PLAN_HA"];
    const first = buildInternalDocumentationFrozenBlocks(ids);
    const second = buildInternalDocumentationFrozenBlocks([...ids].reverse());

    expect(first.map((block) => block.id)).toEqual([
      "CARE_PLAN_HA",
      "DOCUMENT_HANDLING",
      "EKG",
      "VACCINATION_REVIEW",
      "HEALTH_CHECK_NEXT_STEPS",
    ]);
    expect(second.map((block) => block.id)).toEqual(first.map((block) => block.id));
    expect(first.every((block) => block.outputSemantics === "documented-content-v1")).toBe(true);
    expect(first.flatMap((block) => block.questions).map((question) => question.id))
      .toEqual(expect.arrayContaining([
        "CARE_PLAN_HA_DATE",
        "DOCUMENT_HANDLING_ACTIONS",
        "EKG_RHYTHM",
        "HEALTH_CHECK_FOLLOW_UP_REQUIRED",
        "VACCINATION_REVIEW_ITEMS",
      ]));
  });

  it("friert Messwert- und EKG-Inline-Metadaten mit allen Fragen ein", () => {
    const frozen = buildInternalDocumentationFrozenBlocks(["EKG", "HEALTH_CHECK_MEASUREMENTS"]);
    const ekg = frozen.find((block) => block.id === "EKG")!;
    const measurements = frozen.find((block) => block.id === "HEALTH_CHECK_MEASUREMENTS")!;

    expect(ekg.questions.map((question) => question.id)).toEqual([
      "EKG_RHYTHM",
      "EKG_HEART_RATE",
      "EKG_AXIS",
      "EKG_QTC",
      "EKG_BLOCK_PATTERNS",
      "EKG_ERBS",
    ]);
    expect(ekg.questions.filter((question) => question.type === "text"))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ id: "EKG_RHYTHM", maxLength: 120 }),
        expect.objectContaining({ id: "EKG_AXIS", maxLength: 120 }),
        expect.objectContaining({ id: "EKG_BLOCK_PATTERNS", maxLength: 120 }),
        expect.objectContaining({ id: "EKG_ERBS", maxLength: 120 }),
      ]));
    expect(ekg.documentationPresentation?.items).toHaveLength(6);
    expect(measurements.questions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "HEALTH_CHECK_HEART_RATE", unit: "/min", unitSeparator: "" }),
      expect.objectContaining({ id: "HEALTH_CHECK_BLOOD_GLUCOSE", unit: "mg/dl" }),
    ]));
    expect(measurements.documentationPresentation).toMatchObject({
      layout: "inline",
      separator: " – ",
    });
    expect(measurements.documentationPresentation?.items[0]).toMatchObject({
      questionIds: ["HEALTH_CHECK_BP_SYSTOLIC", "HEALTH_CHECK_BP_DIASTOLIC"],
      valueSeparator: "/",
    });
  });

  it("friert die strukturierten Dokumentoptionen vollständig ein", () => {
    const frozen = buildInternalDocumentationFrozenBlocks(["DOCUMENT_HANDLING"]);

    expect(frozen).toHaveLength(1);
    expect(frozen[0]).toMatchObject({
      id: "DOCUMENT_HANDLING",
      label: "Dokumente / Befunde",
      outputSemantics: "documented-content-v1",
    });
    expect(frozen[0].questions).toEqual([expect.objectContaining({
      id: "DOCUMENT_HANDLING_ACTIONS",
      type: "multi_select",
      required: false,
      options: [
        { value: "attached", label: "sind beigefügt", documentationText: "Dokumente / Befunde sind beigefügt." },
        { value: "handed_out", label: "wurden mitgegeben", documentationText: "Dokumente / Befunde wurden mitgegeben." },
        { value: "requested", label: "wurden angefordert", documentationText: "Dokumente / Befunde wurden angefordert." },
        { value: "pending_submission", label: "werden nachgereicht", documentationText: "Dokumente / Befunde werden nachgereicht." },
      ],
    })]);
  });

  it.each([
    ["care_plan_v1", "CARE_PLAN_HA"],
    ["vaccination_review_v1", "VACCINATION_REVIEW"],
    ["health_check_v1", "HEALTH_CHECK_CLINICAL_STATUS"],
  ])("hält den bestehenden %s-Workflowpfad kompatibel", (_workflowId, blockId) => {
    const frozen = buildInternalDocumentationFrozenBlocks([blockId]);
    expect(frozen[0]?.id).toBe(blockId);
  });

  it("erzeugt eine neue Session blockbasiert ohne Workflow-ID", async () => {
    const result = await createQuestionnaireSession({
      selectedBlockIds: ["HEALTH_CHECK_CLINICAL_STATUS", "CARE_PLAN_HA", "VACCINATION_REVIEW"],
      patientReference: "PAT-2A",
      patientLanguage: "de",
      ownerAccountId: "account-2a",
      ownerPracticeId: "practice-2a",
      source: "practice_direct",
      sessionKind: "internal_documentation",
      internalWorkflowId: null,
      origin: "https://example.test",
    });

    const data = create.mock.calls[0][0].data;
    expect(result.sessionId).toBe("session-2a");
    expect(data.internal_workflow_id).toBeUndefined();
    expect(data.selected_block_ids).toEqual([
      "CARE_PLAN_HA",
      "VACCINATION_REVIEW",
      "HEALTH_CHECK_CLINICAL_STATUS",
    ]);
    expect(data.frozen_blocks).toEqual(expect.any(Array));
    expect(data.deduplicated_questions).toEqual(expect.any(Array));
    expect(data.frozen_conditional_rules).toEqual(Prisma.JsonNull);
    expect(data.frozen_blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "CARE_PLAN_HA", outputSemantics: "documented-content-v1" }),
      expect.objectContaining({ id: "VACCINATION_REVIEW", outputSemantics: "documented-content-v1" }),
      expect.objectContaining({ id: "HEALTH_CHECK_CLINICAL_STATUS", outputSemantics: "documented-content-v1" }),
    ]));
  });
});