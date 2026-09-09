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

  it("registriert alle 12 Blocks und global eindeutige Fragen", () => {
    expect(INTERNAL_BLOCK_ORDER).toHaveLength(12);
    expect(Object.keys(INTERNAL_BLOCK_CATALOG)).toHaveLength(12);
    expect(new Set(INTERNAL_BLOCK_ORDER).size).toBe(12);
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
    const ids = ["VACCINATION_REVIEW", "HEALTH_CHECK_NEXT_STEPS", "CARE_PLAN_HA"];
    const first = buildInternalDocumentationFrozenBlocks(ids);
    const second = buildInternalDocumentationFrozenBlocks([...ids].reverse());

    expect(first.map((block) => block.id)).toEqual([
      "CARE_PLAN_HA",
      "VACCINATION_REVIEW",
      "HEALTH_CHECK_NEXT_STEPS",
    ]);
    expect(second.map((block) => block.id)).toEqual(first.map((block) => block.id));
    expect(first.every((block) => block.outputSemantics === "documented-content-v1")).toBe(true);
    expect(first.flatMap((block) => block.questions).map((question) => question.id))
      .toEqual(expect.arrayContaining([
        "CARE_PLAN_HA_DATE",
        "HEALTH_CHECK_FOLLOW_UP_REQUIRED",
        "VACCINATION_REVIEW_ITEMS",
      ]));
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