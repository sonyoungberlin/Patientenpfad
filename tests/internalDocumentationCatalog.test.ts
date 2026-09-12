import { buildInternalWorkflowBlocks, getInternalWorkflow, resolveInternalWorkflow } from "@/lib/questionnaire/internalWorkflowRegistry";
import { getQuestionOptionValues } from "@/lib/questionnaire/questionOptions";

describe("internal documentation workflow registry", () => {
  it("exposes only care_plan_v1 with five frozen blocks", () => {
    expect(getInternalWorkflow("care_plan_v1")).toMatchObject({
      id: "care_plan_v1",
      title: "Persönlicher Versorgungsplan",
      legacyOutputPolicy: {
        omitUnansweredInPdf: true,
        omitMatchingBlockQuestionLabels: true,
        includeEmptyBlocksInCopyText: true,
      },
    });
    expect(getInternalWorkflow("patient_block")).toBeNull();
    expect(getInternalWorkflow("__proto__")).toBeNull();

    const blocks = buildInternalWorkflowBlocks("care_plan_v1");
    expect(blocks).toHaveLength(5);
    expect(blocks.map((block) => block.id)).not.toContain("DOCUMENT_HANDLING");
    expect(blocks.map((block) => block.id)).not.toContain("MEDICAL_STATEMENT");
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
    expect(blocks[2].questions.map((question) => question.id)).toEqual([
      "CARE_PLAN_SPECIALIST_REPORTS",
      "CARE_PLAN_PRESCRIPTION_RENEWAL",
      "CARE_PLAN_REFERRAL",
      "CARE_PLAN_SUPPLY_NOTES",
    ]);
    expect(blocks[2].questions.slice(0, 3).map((question) => question.type)).toEqual([
      "select",
      "select",
      "select",
    ]);
    expect(getQuestionOptionValues(blocks[2].questions[0])).toEqual([
      "Patientin / Patient",
      "Praxis",
      "Patientin / Patient und Praxis",
      "Keine Anforderung erforderlich",
    ]);
    expect(getQuestionOptionValues(blocks[2].questions[1])).toEqual([
      "Ohne vorherige ärztliche Rücksprache",
      "Nach vorheriger ärztlicher Rücksprache",
    ]);
    expect(getQuestionOptionValues(blocks[2].questions[2])).toEqual(
      getQuestionOptionValues(blocks[2].questions[1]),
    );
    expect(blocks[2].questions.slice(0, 3).flatMap((question) => question.options ?? []))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          value: "Patientin / Patient",
          label: "Patientin / Patient",
          documentationText: "Die erforderlichen Facharztberichte werden durch die Patientin bzw. den Patienten angefordert.",
        }),
        expect.objectContaining({
          value: "Nach vorheriger ärztlicher Rücksprache",
          label: "Nach vorheriger ärztlicher Rücksprache",
          documentationText: expect.any(String),
        }),
      ]));
    expect(blocks[2].questions[3]).toMatchObject({ type: "textarea", maxLength: 120 });
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
      legacyOutputPolicy: { omitUnansweredInPdf: true },
    });
    const blocks = buildInternalWorkflowBlocks("vaccination_review_v1");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].questions[0]).toMatchObject({
      id: "VACCINATION_REVIEW_ITEMS",
      type: "repeatable_group",
      presentation: "vaccination_matrix",
      vaccinationSchemaVersion: 2,
      structuredVaccinationUiVersion: 1,
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

  it("exposes health_check_v1 with six modular blocks", () => {
    expect(getInternalWorkflow("health_check_v1")).toMatchObject({
      id: "health_check_v1",
      title: "Gesundheitsuntersuchung",
      legacyOutputPolicy: {
        omitUnansweredInPdf: true,
        includeEmptyBlocksInCopyText: false,
        omitEmptyBlocksInPdf: true,
      },
    });
    const blocks = buildInternalWorkflowBlocks("health_check_v1");
    expect(blocks.map((block) => block.label)).toEqual([
      "Klinischer Status",
      "Messwerte",
      "Labor",
      "Urinstatus",
      "Prävention / Empfehlungen",
      "Weiteres Vorgehen",
    ]);
    const clinical = blocks[0].questions;
    const expectedClinicalDocumentation = [
      ["HEALTH_CHECK_GENERAL_STATUS", "Allgemeinzustand unauffällig.", "Auffälligkeit des Allgemeinzustands."],
      ["HEALTH_CHECK_HEART_STATUS", "Herz klinisch unauffällig.", "Auffälliger klinischer Herzbefund."],
      ["HEALTH_CHECK_LUNG_STATUS", "Lunge klinisch unauffällig.", "Auffälliger klinischer Lungenbefund."],
      ["HEALTH_CHECK_ABDOMEN_STATUS", "Abdomen klinisch unauffällig.", "Auffälliger klinischer Abdominalbefund."],
      ["HEALTH_CHECK_VESSELS_PULSES_STATUS", "Gefäß- und Pulsstatus klinisch unauffällig.", "Auffälliger Gefäß- oder Pulsbefund."],
      ["HEALTH_CHECK_MUSCULOSKELETAL_STATUS", "Bewegungsapparat klinisch unauffällig.", "Auffälliger klinischer Befund des Bewegungsapparats."],
      ["HEALTH_CHECK_NEUROLOGICAL_STATUS", "Neurologischer Status klinisch unauffällig.", "Auffälliger neurologischer Befund."],
      ["HEALTH_CHECK_SKIN_STATUS", "Haut klinisch unauffällig.", "Auffälliger Hautbefund."],
      ["HEALTH_CHECK_PSYCH_STATUS", "Psychischer Befund klinisch unauffällig.", "Auffälliger psychischer Befund."],
    ];
    expect(clinical.slice(0, 9).map((question) => [
      question.id,
      question.options?.map((option) => typeof option === "string" ? option : {
        value: option.value,
        label: option.label,
        documentationText: option.documentationText,
      }),
    ])).toEqual(expectedClinicalDocumentation.map(([id, unremarkable, remarkable]) => [
      id,
      [
        { value: "unauffällig", label: "unauffällig", documentationText: unremarkable },
        { value: "auffällig", label: "auffällig", documentationText: remarkable },
      ],
    ]));
    expect(clinical[9]).toMatchObject({
      id: "HEALTH_CHECK_CLINICAL_NOTE",
      type: "textarea",
      maxLength: 120,
    });
    const followUp = blocks[5].questions[0];
    expect(followUp).toMatchObject({
      id: "HEALTH_CHECK_FOLLOW_UP_REQUIRED",
      text: "Weitere Abklärung oder Kontrolle erforderlich",
      type: "yes_no",
      required: true,
      options: ["nein", "ja"],
    });
    expect(blocks[5].questions[1].options).toEqual([
      "Verlaufskontrolle in unserer Praxis",
      "Weitere Untersuchung in unserer Praxis geplant",
      "Weitere Abklärung beim zuständigen Hausarzt empfohlen",
      "Fachärztliche Abklärung empfohlen",
    ]);
    expect(blocks.flatMap((block) => block.questions)
      .filter((question) => question.type === "textarea")
      .every((question) => question.maxLength === 120)).toBe(true);

    expect(blocks.map((block) => block.questions.map((question) => question.id))).toEqual([
      ["HEALTH_CHECK_GENERAL_STATUS", "HEALTH_CHECK_HEART_STATUS", "HEALTH_CHECK_LUNG_STATUS", "HEALTH_CHECK_ABDOMEN_STATUS", "HEALTH_CHECK_VESSELS_PULSES_STATUS", "HEALTH_CHECK_MUSCULOSKELETAL_STATUS", "HEALTH_CHECK_NEUROLOGICAL_STATUS", "HEALTH_CHECK_SKIN_STATUS", "HEALTH_CHECK_PSYCH_STATUS", "HEALTH_CHECK_CLINICAL_NOTE"],
      ["HEALTH_CHECK_BP_SYSTOLIC", "HEALTH_CHECK_BP_DIASTOLIC", "HEALTH_CHECK_HEIGHT_CM", "HEALTH_CHECK_WEIGHT_KG"],
      ["HEALTH_CHECK_LIPID_PROFILE_STATUS", "HEALTH_CHECK_FASTING_GLUCOSE_STATUS", "HEALTH_CHECK_LAB_NOTE"],
      ["HEALTH_CHECK_URINE_STATUS", "HEALTH_CHECK_URINE_NOTE"],
      ["HEALTH_CHECK_PREVENTION_TOPICS", "HEALTH_CHECK_OTHER_NOTE"],
      ["HEALTH_CHECK_FOLLOW_UP_REQUIRED", "HEALTH_CHECK_NEXT_STEPS", "HEALTH_CHECK_NEXT_STEPS_NOTE"],
    ]);
    expect(blocks[1].questions.map((question) => [question.text, question.unit])).toEqual([
      ["RR systolisch", "mmHg"],
      ["RR diastolisch", "mmHg"],
      ["Größe", "cm"],
      ["Gewicht", "kg"],
    ]);
    expect(blocks[1].documentationPresentation).toBeUndefined();
    expect(blocks[4].questions[0].options).toEqual([
      "Herz-Kreislauf", "Gewicht", "Ernährung", "Bewegung", "Nikotin", "Alkohol",
      "Psychische / psychosoziale Belastung", "Familiäre Risiken", "Vorsorge / Früherkennung",
      "Impfstatus", "Sonstiges",
    ]);
    expect(JSON.stringify(blocks)).not.toMatch(/BMI|Hepatitis|vaccination_matrix|LDL|HDL|Triglyceride/);

    const workflow = getInternalWorkflow("health_check_v1")!;
    const catalogOptions = workflow.questionCatalog.HEALTH_CHECK_GENERAL_STATUS.options!;
    expect(getQuestionOptionValues(blocks[0].questions[0])).toEqual(["unauffällig", "auffällig"]);
    expect(blocks[0].questions[0].options).not.toBe(catalogOptions);
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