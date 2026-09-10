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
import { QUESTION_CATALOG } from "@/lib/questionnaire/blockCatalog";
import { INTERNAL_CONSENT_DOCUMENTATION_TEXT } from "@/lib/questionnaire/internalDocumentationCatalog";

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

  it("registriert alle 17 Blocks und global eindeutige Fragen", () => {
    expect(INTERNAL_BLOCK_ORDER).toHaveLength(17);
    expect(Object.keys(INTERNAL_BLOCK_CATALOG)).toHaveLength(17);
    expect(new Set(INTERNAL_BLOCK_ORDER).size).toBe(17);
    expect(INTERNAL_BLOCK_CATALOG.DOCUMENT_HANDLING).toMatchObject({
      label: "Dokumente / Befunde",
      questionIds: ["DOCUMENT_HANDLING_ACTIONS"],
    });
    expect(INTERNAL_BLOCK_CATALOG.EKG).toMatchObject({
      label: "EKG",
      questionIds: ["EKG_RHYTHM", "EKG_HEART_RATE", "EKG_AXIS", "EKG_QTC", "EKG_BLOCK_PATTERNS", "EKG_ERBS"],
      documentationPresentation: { layout: "inline", separator: " – " },
    });
    expect(INTERNAL_BLOCK_CATALOG.MEDICAL_STATEMENT).toMatchObject({
      label: "Stellungnahme",
      questionIds: [
        "MEDICAL_STATEMENT_IMPAIRMENT_TYPE",
        "MEDICAL_STATEMENT_TIME_ASSESSMENT",
        "MEDICAL_STATEMENT_RECOMMENDATIONS",
      ],
    });
    expect(INTERNAL_BLOCK_CATALOG.SPECIALISTS).toMatchObject({
      label: "Fachärzte",
      questionIds: ["FACHAERZTE"],
    });
    expect(INTERNAL_BLOCK_CATALOG.INTERNAL_CONSENT).toMatchObject({
      label: "Einwilligungserklärung",
      questionIds: ["INTERNAL_CONSENT_INCLUDE"],
      paperSignature: { label: "Datum / Unterschrift Patient/in" },
    });
    expect(INTERNAL_QUESTION_CATALOG.FACHAERZTE).toBe(QUESTION_CATALOG.FACHAERZTE);
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
    const ids = ["VACCINATION_REVIEW", "HEALTH_CHECK_NEXT_STEPS", "MEDICAL_STATEMENT", "EKG", "DOCUMENT_HANDLING", "CARE_PLAN_HA"];
    const first = buildInternalDocumentationFrozenBlocks(ids);
    const second = buildInternalDocumentationFrozenBlocks([...ids].reverse());

    expect(first.map((block) => block.id)).toEqual([
      "CARE_PLAN_HA",
      "DOCUMENT_HANDLING",
      "EKG",
      "MEDICAL_STATEMENT",
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
        "MEDICAL_STATEMENT_IMPAIRMENT_TYPE",
        "HEALTH_CHECK_FOLLOW_UP_REQUIRED",
        "VACCINATION_REVIEW_ITEMS",
      ]));
  });

  it("speichert Abschnitt und Reihenfolge im Snapshot", () => {
    const frozen = buildInternalDocumentationFrozenBlocks(
      ["CARE_PLAN_HA", "VACCINATION_REVIEW"],
      [
        { blockId: "VACCINATION_REVIEW", section: 1, order: 0 },
        { blockId: "CARE_PLAN_HA", section: 3, order: 0 },
      ],
    );

    expect(frozen.map(({ id, section, order }) => ({ id, section, order }))).toEqual([
      { id: "VACCINATION_REVIEW", section: 1, order: 0 },
      { id: "CARE_PLAN_HA", section: 3, order: 0 },
    ]);
  });

  it("friert die Stellungnahme mit technischen Values und Dokumentationssätzen ein", () => {
    const frozen = buildInternalDocumentationFrozenBlocks(["MEDICAL_STATEMENT"]);

    expect(frozen).toHaveLength(1);
    expect(frozen[0]).toMatchObject({
      id: "MEDICAL_STATEMENT",
      label: "Stellungnahme",
      outputSemantics: "documented-content-v1",
    });
    expect(frozen[0]).not.toHaveProperty("documentationPresentation");
    expect(frozen[0].questions).toEqual([
      expect.objectContaining({
        id: "MEDICAL_STATEMENT_IMPAIRMENT_TYPE",
        text: "Art der Beeinträchtigung",
        type: "select",
        required: false,
        options: [
          { value: "physical", label: "Körperlich", documentationText: "Es liegen körperliche Beschwerden vor, die die berufliche Belastbarkeit derzeit einschränken." },
          { value: "psychological", label: "Psychisch", documentationText: "Es bestehen psychische Belastungen bzw. eine psychische Erkrankung, die aktuell mit einer eingeschränkten Belastbarkeit, Konzentrationsfähigkeit und Stresstoleranz einhergeht." },
          { value: "combined", label: "Kombiniert", documentationText: "Es bestehen sowohl körperliche als auch psychische gesundheitliche Einschränkungen, die sich gegenseitig verstärken und die berufliche Belastbarkeit derzeit deutlich reduzieren." },
        ],
      }),
      expect.objectContaining({
        id: "MEDICAL_STATEMENT_TIME_ASSESSMENT",
        text: "Zeitliche Einschätzung",
        type: "select",
        required: false,
        options: [
          { value: "short_medium_term", label: "Kurz-/mittelfristig", documentationText: "Diese Einschätzung gilt vorerst und sollte im Verlauf erneut überprüft werden." },
          { value: "uncertain_course", label: "Verlauf unklar", documentationText: "Die weitere gesundheitliche Entwicklung bleibt abzuwarten; eine erneute ärztliche Beurteilung ist erforderlich." },
          { value: "longer_term", label: "Längerfristig", documentationText: "Aus aktueller medizinischer Sicht ist eine Rückkehr in die bisherige Tätigkeit absehbar nicht möglich." },
        ],
      }),
      expect.objectContaining({
        id: "MEDICAL_STATEMENT_RECOMMENDATIONS",
        text: "Weitere Einschätzung / Empfehlung",
        type: "multi_select",
        required: false,
        options: [
          { value: "current_activity_not_recommended", label: "Aktuelle Tätigkeit nicht empfehlenswert", documentationText: "Die Fortführung der aktuellen Tätigkeit erscheint aus ärztlicher Sicht derzeit nicht empfehlenswert, da eine Verschlechterung des Gesundheitszustands zu erwarten ist." },
          { value: "medical_reassessment", label: "Erneute ärztliche Beurteilung", documentationText: "Eine erneute ärztliche Beurteilung im weiteren Verlauf wird empfohlen." },
          { value: "alternative_measures", label: "Alternative Maßnahmen prüfen", documentationText: "Aus hausärztlicher Sicht wird empfohlen, alternative Maßnahmen (z. B. berufliche Neuorientierung, Rehabilitationsmaßnahmen oder sozialmedizinische Abklärung) zu prüfen." },
          { value: "social_medical_assessment", label: "Sozialmedizinische Begutachtung", documentationText: "Eine weiterführende sozialmedizinische Begutachtung kann sinnvoll sein." },
        ],
      }),
    ]);
  });

  it("friert Fachärzte und Einwilligung vollständig und unabhängig ein", () => {
    const specialists = buildInternalDocumentationFrozenBlocks(["SPECIALISTS"]);
    const consent = buildInternalDocumentationFrozenBlocks(["INTERNAL_CONSENT"]);

    expect(specialists).toHaveLength(1);
    expect(specialists[0]).toMatchObject({
      id: "SPECIALISTS",
      outputSemantics: "documented-content-v1",
      questions: [expect.objectContaining({
        id: "FACHAERZTE",
        type: "textarea",
        text: "Behandelnde Fachärzte",
      })],
    });
    expect(consent).toHaveLength(1);
    expect(consent[0]).toMatchObject({
      id: "INTERNAL_CONSENT",
      outputSemantics: "documented-content-v1",
      paperSignature: { label: "Datum / Unterschrift Patient/in" },
      questions: [expect.objectContaining({
        id: "INTERNAL_CONSENT_INCLUDE",
        type: "multi_select",
        options: [{
          value: "include_in_print",
          label: "Einwilligungserklärung aufnehmen",
          documentationText: INTERNAL_CONSENT_DOCUMENTATION_TEXT,
        }],
      })],
    });
    expect(consent[0].questions[0]).not.toHaveProperty("send_patient_copy");
    expect(consent[0].questions[0].type).not.toBe("confirmation");
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