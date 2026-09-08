import { buildInternalWorkflowBlocks, getInternalWorkflow, resolveInternalWorkflow } from "@/lib/questionnaire/internalWorkflowRegistry";

describe("internal documentation workflow registry", () => {
  it("exposes only care_plan_v1 with five frozen blocks", () => {
    expect(getInternalWorkflow("care_plan_v1")).toMatchObject({
      id: "care_plan_v1",
      title: "Persönlicher Versorgungsplan",
      omitUnansweredInPdf: true,
      omitMatchingBlockQuestionLabels: true,
      includeEmptyBlocksInCopyText: true,
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
    expect(specialist.groupSchema?.map((field) => [field.key, field.maxLength])).toEqual([
      ["specialty", 120],
      ["practice", 120],
      ["interval", undefined],
      ["note", 120],
    ]);
    expect(blocks.flatMap((block) => block.questions)
      .filter((question) => question.type === "textarea")
      .map((question) => [question.id, question.maxLength])).toEqual([
      ["CARE_PLAN_HA_REASON", 120],
      ["CARE_PLAN_HA_NOTES", 120],
      ["CARE_PLAN_SUPPLY_NOTES", 120],
      ["CARE_PLAN_SUPPORT_NOTES", 120],
      ["CARE_PLAN_AGREEMENT_TEXT", 120],
    ]);
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
      vaccinationSchemaVersion: 2,
    });
    expect(blocks[0].questions[0].vaccinationItems).toHaveLength(14);
    expect(blocks[0].questions[0].vaccinationItems?.[0]).toMatchObject({
      id: "tdap_ipv_group",
      label: "Tetanus / Diphtherie / Pertussis / Poliomyelitis",
      documentationMode: "component_group",
    });
    expect(blocks[0].questions[0].vaccinationItems?.[0].componentFields).toHaveLength(4);
    const schema = blocks[0].questions[0].groupSchema ?? [];
    expect(schema.filter((field) => field.maxLength === 120).map((field) => field.key)).toEqual([
      "custom_label",
      "documented_season",
      "note",
      "interval_value",
    ]);
    expect(schema.find((field) => field.key === "vaccination_id")?.maxLength).toBeUndefined();
  });

  it("deep-copies nested vaccination v2 metadata into the frozen snapshot", () => {
    const workflow = getInternalWorkflow("vaccination_review_v1")!;
    const catalogQuestion = workflow.questionCatalog.VACCINATION_REVIEW_ITEMS;
    const component = catalogQuestion.vaccinationItems?.[0].componentFields?.[0];
    const originalOption = component?.options[0];
    const frozen = buildInternalWorkflowBlocks("vaccination_review_v1");

    expect(originalOption).toBe("Grunddosis 1");
    component!.options[0] = "Katalog nach Snapshot verändert";
    try {
      expect(frozen[0].questions[0].vaccinationItems?.[0].componentFields?.[0].options[0]).toBe("Grunddosis 1");
    } finally {
      component!.options[0] = originalOption!;
    }
  });
});