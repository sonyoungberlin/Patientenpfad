import {
  adaptLegacyVaccinationEntry,
  calculateNextVaccinationDate,
  countEditedVaccinations,
  countExplicitlyOpenVaccinations,
  formatStructuredVaccinationEntry,
  normalizeVaccinationReviewAnswers,
  parseStructuredVaccinationAnswer,
} from "@/lib/questionnaire/vaccinationReview";
import { VACCINATION_REVIEW_QUESTION_CATALOG } from "@/lib/questionnaire/vaccinationReviewCatalog";
import { parseRepeatableGroupEntries } from "@/lib/questionnaire/formatAnswer";
import {
  buildMedicalRecordNote,
  buildSemanticMedicalRecordDocument,
} from "@/lib/questionnaire/buildMedicalRecordNote";
import { buildStructuredAppXml } from "@/lib/questionnaire/appTextXml";

describe("vaccination review", () => {
  const question = structuredClone(VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS);
  delete question.structuredVaccinationUiVersion;
  question.vaccinationItems = [
    {
      id: "tdap_ipv_group",
      label: "Tetanus / Diphtherie / Pertussis / Poliomyelitis",
      categoryId: "combination",
      documentationMode: "component_group",
      componentFields: [
        { key: "tetanus_doses", label: "Tetanus", options: ["Grunddosis 1", "Grunddosis 2", "Grunddosis 3", "Auffrischung", "unklar"] },
        { key: "diphtheria_doses", label: "Diphtherie", options: ["Grunddosis 1", "Grunddosis 2", "Grunddosis 3", "Auffrischung", "unklar"] },
        { key: "pertussis_doses", label: "Pertussis", options: ["Impfung dokumentiert", "Weitere Impfung dokumentiert", "unklar"] },
        { key: "polio_doses", label: "Poliomyelitis", options: ["Grunddosis 1", "Grunddosis 2", "Grunddosis 3", "Auffrischung", "unklar"] },
      ],
    },
    ...VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS.vaccinationItems!.filter((item) => item.id !== "dtp" && item.id !== "polio"),
    { id: "other", label: "Weitere Impfung", categoryId: "other", documentationMode: "free_text" },
  ];
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

  it("normalizes the versioned model without deriving medical rules", () => {
    const answer = parseStructuredVaccinationAnswer(JSON.stringify({
      schema_version: 1,
      entries: [{
        vaccination_id: "hpv",
        medical_assessment: "recommended",
        implementation_status: "planned",
        doses: [
          { number: 2, status: "open", recommendedInterval: "in 5 Monaten" },
          { number: 1, status: "done", date: "2026-01-31" },
        ],
      }],
    }));

    expect(answer).toEqual({
      schema_version: 1,
      entries: [{
        vaccination_id: "hpv",
        medical_assessment: "recommended",
        implementation_status: "planned",
        doses: [
          { number: 1, status: "done", date: "2026-01-31" },
          { number: 2, status: "open", recommendedInterval: "in 5 Monaten" },
        ],
      }],
    });
    expect(countEditedVaccinations(answer!)).toBe(1);
    expect(countExplicitlyOpenVaccinations(answer!)).toBe(1);

    const normalized = normalizeVaccinationReviewAnswers({
      VACCINATION_REVIEW_ITEMS: JSON.stringify(answer),
    }, question);
    expect(normalized).toMatchObject({ ok: true });
    if (normalized.ok) expect(JSON.parse(normalized.answers.VACCINATION_REVIEW_ITEMS)).toEqual(answer);
  });

  it("counts only explicitly open structured vaccinations", () => {
    const answer = parseStructuredVaccinationAnswer(JSON.stringify({
      schema_version: 1,
      entries: [
        { vaccination_id: "hpv", doses: [{ number: 1, status: "open" }] },
        { vaccination_id: "rsv", implementation_status: "open" },
        { vaccination_id: "mmr" },
      ],
    }));

    expect(answer).not.toBeNull();
    expect(countEditedVaccinations(answer!)).toBe(2);
    expect(countExplicitlyOpenVaccinations(answer!)).toBe(2);
  });

  it("keeps legacy meaning separate from the structured assessment", () => {
    const entry = adaptLegacyVaccinationEntry({
      vaccination_id: "rsv",
      documented_status: "Nicht vorhanden",
      further_action: "Impfung ärztlich empfohlen",
    });

    expect(entry).toEqual({
      vaccination_id: "rsv",
      legacy: {
        documented_status: "Nicht vorhanden",
        further_action: "Impfung ärztlich empfohlen",
      },
    });
    expect(entry?.medical_assessment).toBeUndefined();
  });

  it("formats structured vaccination entries and uses them in the medical note", () => {
    const entry = {
      vaccination_id: "hpv",
      medical_assessment: "possible" as const,
      doses: [
        { number: 1, status: "done" as const },
          { number: 2, status: "planned" as const, recommendedInterval: "5 Monaten" },
      ],
    };
    expect(formatStructuredVaccinationEntry(entry, "HPV"))
      .toBe("HPV: kann erfolgen; 1. Dosis erfolgt, 2. Dosis geplant in 5 Monaten");

    const input = {
      answers: { VACCINATION_REVIEW_ITEMS: JSON.stringify({ schema_version: 1, entries: [entry] }) },
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
    };
    const note = buildMedicalRecordNote(input);
    expect(note).toContain("HPV: kann erfolgen; 1. Dosis erfolgt, 2. Dosis geplant in 5 Monaten");

    const xml = buildStructuredAppXml(buildSemanticMedicalRecordDocument(input));
    expect(xml).toContain("HPV: kann erfolgen; 1. Dosis erfolgt, 2. Dosis geplant in 5 Monaten");
    expect(xml).not.toContain("vaccination_id");
    expect(xml).not.toContain("schema_version");
  });

  it("formats the simplified single-dose and dose-series model", () => {
    expect(formatStructuredVaccinationEntry({
      vaccination_id: "influenza",
      status: "complete",
    }, "Influenza")).toBe("Influenza: vollständig");
    expect(formatStructuredVaccinationEntry({
      vaccination_id: "influenza",
      status: "open",
      note: "Abklärung mit Gyn",
    }, "Influenza")).toBe("Influenza: offen – Abklärung mit Gyn");
    expect(formatStructuredVaccinationEntry({
      vaccination_id: "covid19",
      status: "planned",
      note: "Termin im Oktober",
    }, "COVID-19")).toBe("COVID-19: geplant – Termin im Oktober");
    expect(formatStructuredVaccinationEntry({
      vaccination_id: "hpv",
      doses: [
        { number: 1, status: "done" },
        { number: 2, status: "open", note: "Impfpass suchen", recommended_interval_value: 5, recommended_interval_unit: "months" },
      ],
    }, "HPV")).toBe("HPV: 1. Dosis erfolgt, 2. Dosis offen, empfohlen in 5 Monaten – Impfpass suchen");
  });

  it("normalizes documented dose intervals in weeks and months without calculating them", () => {
    const answer = parseStructuredVaccinationAnswer(JSON.stringify({
      schema_version: 1,
      entries: [{
        vaccination_id: "hpv",
        doses: [
          { number: 1, status: "done" },
          { number: 2, status: "planned", recommended_interval_value: 4, recommended_interval_unit: "weeks" },
          { number: 3, status: "open", recommended_interval_value: 5, recommended_interval_unit: "months" },
        ],
      }],
    }));

    expect(answer?.entries[0].doses).toEqual([
      { number: 1, status: "done" },
      { number: 2, status: "planned", recommended_interval_value: 4, recommended_interval_unit: "weeks" },
      { number: 3, status: "open", recommended_interval_value: 5, recommended_interval_unit: "months" },
    ]);
  });

  it("gibt die ergänzende Bemerkung kompakt aus und lässt sie leer weg", () => {
    const frozenBlocks = [{
      id: "VACCINATION_REVIEW",
      label: "Impfpassprüfung und Beratung",
      displayOrder: 10,
      questions: [question],
      conditionalRules: [],
      initiallyVisible: true,
    }];
    const withNote = buildMedicalRecordNote({
      answers: {
        VACCINATION_REVIEW_ITEMS: JSON.stringify({ schema_version: 1, entries: [], supplemental_note: "Gelbfieberimpfung bereits im Tropeninstitut erfolgt" }),
      },
      selected_block_ids: ["VACCINATION_REVIEW"],
      internalWorkflowId: "vaccination_review_v1",
      frozenBlocks,
    });
    expect(withNote).toContain("Ergänzende Bemerkung: Gelbfieberimpfung bereits im Tropeninstitut erfolgt");

    const withoutNote = buildMedicalRecordNote({
      answers: { VACCINATION_REVIEW_ITEMS: JSON.stringify({ schema_version: 1, entries: [] }) },
      selected_block_ids: ["VACCINATION_REVIEW"],
      internalWorkflowId: "vaccination_review_v1",
      frozenBlocks,
    });
    expect(withoutNote).not.toContain("Ergänzende Bemerkung:");
  });
});
