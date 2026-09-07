import { buildInternalWorkflowBlocks, getInternalWorkflow, resolveInternalWorkflow } from "@/lib/questionnaire/internalWorkflowRegistry";

describe("internal documentation workflow registry", () => {
  it("exposes only care_plan_v1 with five frozen blocks", () => {
    expect(getInternalWorkflow("care_plan_v1")).toMatchObject({
      id: "care_plan_v1",
      title: "Persönlicher Versorgungsplan",
    });
    expect(getInternalWorkflow("patient_block")).toBeNull();
    expect(getInternalWorkflow("__proto__")).toBeNull();

    const blocks = buildInternalWorkflowBlocks("care_plan_v1");
    expect(blocks).toHaveLength(5);
    expect(blocks.map((block) => block.label)).toEqual([
      "Hausärztliche Betreuung",
      "Fachärztliche Betreuung",
      "Versorgung und Organisation",
      "Unterstützende Personen",
      "Gemeinsame Vereinbarung",
    ]);
    const specialist = blocks[1].questions[0];
    expect(specialist.type).toBe("repeatable_group");
    expect(specialist.maxEntries).toBe(3);
    expect(blocks[2].questions[0].type).toBe("multi_select");
    expect(blocks[2].questions[0].required).toBe(false);
  });

  it("uses the care-plan fallback only for a missing workflow ID", () => {
    expect(getInternalWorkflow(null)).toBeNull();
    expect(resolveInternalWorkflow(null)).toMatchObject({ id: "care_plan_v1" });
    expect(resolveInternalWorkflow("unknown_workflow")).toBeNull();
  });

  it("exposes the vaccination review as a separate frozen workflow", () => {
    expect(getInternalWorkflow("vaccination_review_v1")).toMatchObject({
      id: "vaccination_review_v1",
      title: "Impfpassprüfung und Beratung",
      omitUnansweredInPdf: true,
    });
    const blocks = buildInternalWorkflowBlocks("vaccination_review_v1");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].questions[0]).toMatchObject({
      id: "VACCINATION_REVIEW_ITEMS",
      type: "repeatable_group",
      presentation: "vaccination_matrix",
    });
    expect(blocks[0].questions[0].vaccinationItems).toHaveLength(15);
  });
});