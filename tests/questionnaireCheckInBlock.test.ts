import {
  BLOCK_CATALOG,
  BLOCK_IDS_SORTED,
  QUESTION_CATALOG,
} from "@/lib/questionnaire/blockCatalog";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import { computeVisibleQuestionIds } from "@/lib/questionnaire/conditionalLogic";
import { buildFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import { getQuestionOptionValues } from "@/lib/questionnaire/questionOptions";
import { buildQuestionnaireExportFilename } from "@/lib/questionnaire/questionnaireExportFilename";
import {
  resolveQuestionnaireGdtExport,
  resolveQuestionnairePdfOptions,
} from "@/lib/questionnaire/questionnaireExportService";

const CHECK_IN_BLOCK_IDS = ["KONTAKT", "CHECK_IN"];

describe("CHECK_IN-Block", () => {
  it("ist ein normaler, aber nicht frei auswählbarer Block", () => {
    expect(BLOCK_CATALOG.CHECK_IN).toEqual(expect.objectContaining({
      id: "CHECK_IN",
      label: "Check-in",
      selectable: false,
      displayOrder: 25,
    }));
    expect(BLOCK_IDS_SORTED).not.toContain("CHECK_IN");
    expect(BLOCK_CATALOG.CHECK_IN.questionIds).toEqual([
      "CHECK_IN_PATIENT_TYPE",
      "CHECK_IN_MAIN_REASON",
      "CHECK_IN_EXAMINATION_REASON",
      "CHECK_IN_CONSULTATION_REASON",
    ]);
  });

  it("verwendet stabile Antwort-IDs statt sichtbarer Labels", () => {
    expect(getQuestionOptionValues(QUESTION_CATALOG.CHECK_IN_PATIENT_TYPE)).toEqual([
      "new_patient",
      "existing_patient",
    ]);
    expect(getQuestionOptionValues(QUESTION_CATALOG.CHECK_IN_MAIN_REASON)).toEqual([
      "prescription",
      "sick_leave",
      "referral",
      "medical_examination",
      "consultation",
    ]);
  });

  it("friert KONTAKT vor CHECK_IN ein und ergänzt keine Folgeblöcke", () => {
    const frozen = buildFrozenBlocks(CHECK_IN_BLOCK_IDS);

    expect(frozen.map((block) => block.id)).toEqual(CHECK_IN_BLOCK_IDS);
    expect(frozen.map((block) => block.id)).not.toContain("KURZANAMNESE");
    expect(frozen.flatMap((block) => block.conditionalRules))
      .toHaveLength(2);
  });

  it.each([
    ["medical_examination", ["CHECK_IN_EXAMINATION_REASON"]],
    ["consultation", ["CHECK_IN_CONSULTATION_REASON"]],
    ["prescription", []],
  ])("zeigt für %s nur das passende Unteranliegen", (mainReason, expectedConditionalIds) => {
    const block = BLOCK_CATALOG.CHECK_IN;
    const visible = computeVisibleQuestionIds(
      block.conditionalRules ?? [],
      block.questionIds,
      { CHECK_IN_MAIN_REASON: mainReason },
    );

    expect(visible.has("CHECK_IN_PATIENT_TYPE")).toBe(true);
    expect(visible.has("CHECK_IN_MAIN_REASON")).toBe(true);
    expect([...visible].filter((id) => id.endsWith("_REASON") && id !== "CHECK_IN_MAIN_REASON"))
      .toEqual(expectedConditionalIds);
  });

  it("nutzt unverändert die allgemeine Kontakt- und Exportbenennung", () => {
    const session = {
      patient_reference: "12345",
      submitted_at: new Date("2026-09-10T10:00:00.000Z"),
      submitted_by: "patient",
      selected_block_ids: CHECK_IN_BLOCK_IDS,
      deduplicated_questions: [],
      frozen_blocks: null,
      answers: {},
      source: "kiosk_direct",
      practice_form: null,
      session_kind: "patient_communication",
      internal_workflow_id: null,
    };

    expect(buildQuestionnaireExportFilename(session, {
      blockCatalog: BLOCK_CATALOG,
      extension: "pdf",
    })).toBe("20260910_12345_Kontaktdaten_Checkin.pdf");
    expect(resolveQuestionnaireGdtExport(session)).toEqual(expect.objectContaining({
      filename: "20260910_12345_Kontaktdaten_Checkin.gdt",
      documentationText: "System: Check-in eingegangen",
    }));
    expect(resolveQuestionnairePdfOptions(session).title)
      .toBe("Fragebogen – Patientenangaben");
  });

  it("dokumentiert stabile Antwort-IDs mit ihren deutschen Labels", () => {
    const note = buildMedicalRecordNote({
      selected_block_ids: CHECK_IN_BLOCK_IDS,
      frozenBlocks: buildFrozenBlocks(CHECK_IN_BLOCK_IDS),
      answers: {
        CONTACT_PHONE: "030 123456",
        CHECK_IN_PATIENT_TYPE: "new_patient",
        CHECK_IN_MAIN_REASON: "medical_examination",
        CHECK_IN_EXAMINATION_REASON: "acute_pain",
      },
    });

    expect(note.split("\n")[0]).toBe("Digitale Anfrage");
    expect(note).toContain("Kontaktdaten");
    expect(note).toContain("Check-in");
    expect(note).toContain("Neupatient");
    expect(note).toContain("Ärztliche Untersuchung");
    expect(note).toContain("Akute Schmerzen");
  });
});