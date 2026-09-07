import {
  calculateNextVaccinationDate,
  normalizeVaccinationReviewAnswers,
} from "@/lib/questionnaire/vaccinationReview";
import { VACCINATION_REVIEW_QUESTION_CATALOG } from "@/lib/questionnaire/vaccinationReviewCatalog";
import { parseRepeatableGroupEntries } from "@/lib/questionnaire/formatAnswer";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";

describe("vaccination review", () => {
  const question = VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS;
  const legacyQuestion = structuredClone(question);
  delete legacyQuestion.vaccinationSchemaVersion;
  legacyQuestion.vaccinationItems = [
    { id: "tdap", label: "Tetanus / Diphtherie / Pertussis", doseOptions: ["1. Dosis", "2. Dosis", "3. Dosis", "weitere", "unklar"] },
    { id: "polio", label: "Poliomyelitis", doseOptions: ["1. Dosis", "2. Dosis", "3. Dosis", "weitere", "unklar"] },
  ];

  it("uses date-only arithmetic with calendar-month clamping", () => {
    expect(calculateNextVaccinationDate("2026-01-31", "1", "Monate")).toBe("2026-02-28");
    expect(calculateNextVaccinationDate("2028-01-31", "1", "Monate")).toBe("2028-02-29");
    expect(calculateNextVaccinationDate("2024-01-31", "1", "Monate")).toBe("2024-02-29");
    expect(calculateNextVaccinationDate("2024-02-29", "12", "Monate")).toBe("2025-02-28");
    expect(calculateNextVaccinationDate("2024-12-31", "1", "Monate")).toBe("2025-01-31");
  });

  it("normalizes dates server-side and removes stale hidden values", () => {
    const result = normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{
        vaccination_id: "tdap",
        documented_status: "Teilweise vorhanden",
        documented_doses: "1. Dosis, unklar",
        further_action: "Impfung ärztlich empfohlen",
        reference_date: "2024-01-31",
        interval_value: "1",
        interval_unit: "Monate",
        next_date: "1999-01-01",
        note: "  Notiz  ",
      }]),
    }, legacyQuestion);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.answers.VACCINATION_REVIEW_ITEMS)).toEqual([{
          vaccination_id: "tdap",
          documented_status: "Teilweise vorhanden",
          documented_doses: "unklar",
          further_action: "Impfung ärztlich empfohlen",
          reference_date: "2024-01-31",
          interval_value: "1",
          interval_unit: "Monate",
          next_date: "2024-02-29",
          note: "Notiz",
      }]);
    }
  });

  it("rejects unknown vaccination IDs fail-closed and incomplete custom rows", () => {
    expect(normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{ vaccination_id: "unknown", documented_status: "Unklar" }]),
    }, question).ok).toBe(false);
    expect(normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{ vaccination_id: "other", documented_status: "Unklar" }]),
    }, question).ok).toBe(false);
  });

  it("removes status-incompatible planning and dose fields", () => {
    const result = normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([
        {
          vaccination_id: "tdap",
          documented_status: "Vollständig vorhanden",
          documented_doses: "1. Dosis",
          further_action: "Impfung ärztlich empfohlen",
          reference_date: "2026-01-31",
          interval_value: "1",
          interval_unit: "Monate",
          next_date: "2099-01-01",
          note: "stale",
        },
        {
          vaccination_id: "polio",
          documented_status: "Nicht vorhanden",
          documented_doses: "2. Dosis",
          further_action: "Derzeit kein weiteres Vorgehen",
          reference_date: "2026-01-31",
          interval_value: "1",
          interval_unit: "Monate",
          next_date: "2099-01-01",
        },
      ]),
    }, legacyQuestion);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.answers.VACCINATION_REVIEW_ITEMS)).toEqual([
        { vaccination_id: "tdap", documented_status: "Vollständig vorhanden" },
        {
          vaccination_id: "polio",
          documented_status: "Nicht vorhanden",
          further_action: "Derzeit kein weiteres Vorgehen",
        },
      ]);
    }
  });

  it("normalizes the v2 combination components from frozen item options", () => {
    const result = normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{
        vaccination_id: "tdap_ipv_group",
        documented_status: "Teilweise vorhanden",
        tetanus_doses: "Grunddosis 1, Auffrischung",
        diphtheria_doses: "unklar, Grunddosis 1",
        pertussis_doses: "Impfung dokumentiert, Weitere Impfung dokumentiert",
        polio_doses: "Grunddosis 1, nicht erlaubt",
      }]),
    }, question);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.answers.VACCINATION_REVIEW_ITEMS)).toEqual([{
        vaccination_id: "tdap_ipv_group",
        documented_status: "Teilweise vorhanden",
        tetanus_doses: "Grunddosis 1, Auffrischung",
        diphtheria_doses: "unklar",
        pertussis_doses: "Impfung dokumentiert, Weitere Impfung dokumentiert",
        polio_doses: "Grunddosis 1",
      }]);
    }
  });

  it("keeps complete v2 combination entries free of component values", () => {
    const result = normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{
        vaccination_id: "tdap_ipv_group",
        documented_status: "Vollständig vorhanden",
        tetanus_doses: "Grunddosis 1",
        polio_doses: "Auffrischung",
      }]),
    }, question);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.answers.VACCINATION_REVIEW_ITEMS)).toEqual([{
        vaccination_id: "tdap_ipv_group",
        documented_status: "Vollständig vorhanden",
      }]);
    }
  });

  it("normalizes meningococcal subtypes separately from dose options", () => {
    const result = normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{
        vaccination_id: "meningococcal",
        documented_status: "Teilweise vorhanden",
        documented_subtypes: "ACWY, B",
        documented_doses: "Dosis 1",
      }]),
    }, question);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.answers.VACCINATION_REVIEW_ITEMS)).toEqual([{
        vaccination_id: "meningococcal",
        documented_status: "Teilweise vorhanden",
        documented_subtypes: "ACWY, B",
      }]);
    }
  });

  it("normalizes v2 planning server-side and never trusts client next_date", () => {
    const result = normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{
        vaccination_id: "rsv",
        documented_status: "Nicht vorhanden",
        further_action: "Durchführung geplant / vereinbart",
        note: "  Rücksprache erfolgt  ",
        reference_date: "2026-01-31",
        interval_value: "1",
        interval_unit: "Monate",
        next_date: "2099-12-31",
      }]),
    }, question);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.answers.VACCINATION_REVIEW_ITEMS)).toEqual([{
        vaccination_id: "rsv",
        documented_status: "Nicht vorhanden",
        further_action: "Durchführung geplant / vereinbart",
        note: "Rücksprache erfolgt",
        reference_date: "2026-01-31",
        interval_value: "1",
        interval_unit: "Monate",
        next_date: "2026-02-28",
      }]);
    }
  });

  it.each(["Vollständig vorhanden", "Nicht vorhanden", "Unklar"])(
    "removes incompatible v2 documentation after status changes to %s",
    (documentedStatus) => {
      const result = normalizeVaccinationReviewAnswers({
        VACCINATION_REVIEW_ITEMS: JSON.stringify([{
          vaccination_id: "tdap_ipv_group",
          documented_status: documentedStatus,
          documented_doses: "Dosis 1",
          documented_subtypes: "ACWY",
          documented_season: "2025/26",
          documented_date: "2026-01-02",
          tetanus_doses: "Grunddosis 1",
          diphtheria_doses: "Grunddosis 2",
          pertussis_doses: "Impfung dokumentiert",
          polio_doses: "Auffrischung",
        }]),
      }, question);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(JSON.parse(result.answers.VACCINATION_REVIEW_ITEMS)).toEqual([{
          vaccination_id: "tdap_ipv_group",
          documented_status: documentedStatus,
        }]);
      }
    },
  );

  it("removes stale v2 planning values when the action no longer allows them", () => {
    const result = normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{
        vaccination_id: "rsv",
        documented_status: "Unklar",
        further_action: "Derzeit kein weiteres Vorgehen",
        note: "stale",
        reference_date: "2026-01-31",
        interval_value: "1",
        interval_unit: "Monate",
        next_date: "2099-12-31",
      }]),
    }, question);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.answers.VACCINATION_REVIEW_ITEMS)).toEqual([{
        vaccination_id: "rsv",
        documented_status: "Unklar",
        further_action: "Derzeit kein weiteres Vorgehen",
      }]);
    }
  });

  it("filters unknown v2 dose values and accepts a valid custom vaccination label", () => {
    const result = normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([
        {
          vaccination_id: "zoster",
          documented_status: "Teilweise vorhanden",
          documented_doses: "Dosis 1, Dosis 99",
        },
        {
          vaccination_id: "other",
          custom_label: "Japanische Enzephalitis",
          documented_status: "Unklar",
        },
      ]),
    }, question);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.answers.VACCINATION_REVIEW_ITEMS)).toEqual([
        { vaccination_id: "zoster", documented_status: "Teilweise vorhanden", documented_doses: "Dosis 1" },
        { vaccination_id: "other", documented_status: "Unklar", custom_label: "Japanische Enzephalitis" },
      ]);
    }
  });

  it("uses frozen v2 options while preserving legacy v1 normalization", () => {
    const frozenV2 = structuredClone(question);
    frozenV2.groupSchema!.find((field) => field.key === "documented_status")!.options = ["Archiviert"];
    expect(normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{ vaccination_id: "rsv", documented_status: "Archiviert" }]),
    }, frozenV2).ok).toBe(true);

    const legacyV1 = structuredClone(question);
    delete legacyV1.vaccinationSchemaVersion;
    legacyV1.vaccinationItems = [{ id: "tdap", label: "Tetanus / Diphtherie / Pertussis", doseOptions: ["1. Dosis"] }];
    expect(normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{
        vaccination_id: "tdap",
        documented_status: "Teilweise vorhanden",
        documented_doses: "1. Dosis",
      }]),
    }, legacyV1)).toMatchObject({ ok: true });
  });

  it("formats the v2 combination with its label and readable components", () => {
    const answer = JSON.stringify([{
      vaccination_id: "tdap_ipv_group",
      documented_status: "Teilweise vorhanden",
      tetanus_doses: "Grunddosis 1, Auffrischung",
      pertussis_doses: "Impfung dokumentiert",
      further_action: "Impfung ärztlich empfohlen",
      note: "Kontrolle vereinbart",
    }]);
    const entries = parseRepeatableGroupEntries(answer, question.id, question);
    expect(entries[0]).toMatchObject({
      title: "Tetanus / Diphtherie / Pertussis / Poliomyelitis",
      fields: expect.arrayContaining([
        { label: "Tetanus", value: "Grunddosis 1, Auffrischung", fieldType: "multi_select" },
        { label: "Pertussis", value: "Impfung dokumentiert", fieldType: "multi_select" },
      ]),
    });
    expect(entries[0].fields.some((field) => field.value === "tdap_ipv_group")).toBe(false);

    const note = buildMedicalRecordNote({
      answers: { VACCINATION_REVIEW_ITEMS: answer },
      selected_block_ids: ["VACCINATION_REVIEW"],
      internalWorkflowId: "vaccination_review_v1",
      frozenBlocks: [{
        id: "VACCINATION_REVIEW",
        label: "Impfpassprüfung und Beratung",
        displayOrder: 10,
        questions: [question],
        conditionalRules: [],
        initiallyVisible: true,
      }],
    });
    expect(note).toContain("Tetanus / Diphtherie / Pertussis / Poliomyelitis:");
    expect(note).toContain("Dokumentierter Impfstatus: Teilweise vorhanden");
    expect(note).toContain("Tetanus: Grunddosis 1, Auffrischung");
    expect(note).toContain("Bemerkung:");
    expect(note).toContain("Kontrolle vereinbart");
    expect(note).not.toContain("Impfung: tdap_ipv_group");
    expect(note).not.toContain("VACCINATION_REVIEW_ITEMS:");
    expect(note).not.toContain("COVID-19:");
  });
});
