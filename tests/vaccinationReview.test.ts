import {
  calculateNextVaccinationDate,
  normalizeVaccinationReviewAnswers,
} from "@/lib/questionnaire/vaccinationReview";
import { VACCINATION_REVIEW_QUESTION_CATALOG } from "@/lib/questionnaire/vaccinationReviewCatalog";

describe("vaccination review", () => {
  const question = VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS;

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
    }, question);

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

  it("rejects unknown vaccinations and incomplete custom rows", () => {
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
    }, question);

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
});
