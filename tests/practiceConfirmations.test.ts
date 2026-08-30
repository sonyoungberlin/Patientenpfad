import {
  buildPracticeConfirmationSlots,
  buildPracticeConfirmationsFrozenBlock,
  parseSelectedPracticeConfirmationIds,
  selectPracticeConfirmationSlots,
} from "@/lib/questionnaire/confirmation";

describe("Practice-Confirmation-Snapshot", () => {
  const configured = buildPracticeConfirmationSlots({
    questionnaire_confirmation_text_1: "  Ich bestätige A.  ",
    questionnaire_confirmation_text_2: null,
    questionnaire_confirmation_text_3: "Ich bestätige C.",
  });

  it("liefert nur konfigurierte und getrimmte Slots", () => {
    expect(configured).toEqual([
      { id: "PRACTICE_CONFIRMATION_1", text: "Ich bestätige A." },
      { id: "PRACTICE_CONFIRMATION_3", text: "Ich bestätige C." },
    ]);
  });

  it("akzeptiert 0 bis 3 eindeutige whitelisted IDs", () => {
    expect(parseSelectedPracticeConfirmationIds(undefined)).toEqual([]);
    expect(parseSelectedPracticeConfirmationIds([])).toEqual([]);
    expect(
      parseSelectedPracticeConfirmationIds([
        "PRACTICE_CONFIRMATION_1",
        "PRACTICE_CONFIRMATION_1",
        "PRACTICE_CONFIRMATION_3",
      ]),
    ).toEqual(["PRACTICE_CONFIRMATION_1", "PRACTICE_CONFIRMATION_3"]);
    expect(parseSelectedPracticeConfirmationIds(["UNKNOWN"])).toBeNull();
    expect(parseSelectedPracticeConfirmationIds([
      "PRACTICE_CONFIRMATION_1",
      "PRACTICE_CONFIRMATION_2",
      "PRACTICE_CONFIRMATION_3",
    ])).toHaveLength(3);
  });

  it("friert nur ausgewählte Slots mit stabiler ID und exaktem Text ein", () => {
    const selected = selectPracticeConfirmationSlots(configured, [
      "PRACTICE_CONFIRMATION_1",
    ]);
    const block = buildPracticeConfirmationsFrozenBlock(selected);
    expect(block?.questions).toEqual([
      {
        id: "PRACTICE_CONFIRMATION_1",
        text: "Ich bestätige A.",
        type: "confirmation",
        required: true,
      },
    ]);
  });

  it("bestehender Snapshot bleibt von späteren Practice-Änderungen unberührt", () => {
    const block = buildPracticeConfirmationsFrozenBlock(configured);
    const changed = buildPracticeConfirmationSlots({
      questionnaire_confirmation_text_1: "Ich bestätige B.",
    });
    expect(changed[0].text).toBe("Ich bestätige B.");
    expect(block?.questions[0].text).toBe("Ich bestätige A.");
  });
});