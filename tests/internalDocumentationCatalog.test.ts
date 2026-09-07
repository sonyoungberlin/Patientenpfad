import { buildInternalWorkflowBlocks, getInternalWorkflow } from "@/lib/questionnaire/internalWorkflowRegistry";

describe("internal documentation workflow registry", () => {
  it("exposes only care_plan_v1 with five frozen blocks", () => {
    expect(getInternalWorkflow("care_plan_v1")).toMatchObject({
      id: "care_plan_v1",
      title: "Persönlicher Versorgungsplan",
    });
    expect(getInternalWorkflow("patient_block")).toBeNull();

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
});