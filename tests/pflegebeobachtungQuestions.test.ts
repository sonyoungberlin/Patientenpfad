import { M2_QUESTIONS, M2_QUESTIONS_MFA } from "@/lib/logic/m2Questions";

describe("pflegebeobachtung – M2 Fragenkatalog", () => {
  it("hat Patienten-/Gesprächsfragen für K12-K18", () => {
    expect(M2_QUESTIONS.K12).toBeDefined();
    expect(M2_QUESTIONS.K13).toBeDefined();
    expect(M2_QUESTIONS.K14).toBeDefined();
    expect(M2_QUESTIONS.K15).toBeDefined();
    expect(M2_QUESTIONS.K16).toBeDefined();
    expect(M2_QUESTIONS.K17).toBeDefined();
    expect(M2_QUESTIONS.K18).toBeDefined();
  });

  it("hat keine MFA-Fragen für K12-K18", () => {
    expect(M2_QUESTIONS_MFA.K12).toBeUndefined();
    expect(M2_QUESTIONS_MFA.K13).toBeUndefined();
    expect(M2_QUESTIONS_MFA.K14).toBeUndefined();
    expect(M2_QUESTIONS_MFA.K15).toBeUndefined();
    expect(M2_QUESTIONS_MFA.K16).toBeUndefined();
    expect(M2_QUESTIONS_MFA.K17).toBeUndefined();
    expect(M2_QUESTIONS_MFA.K18).toBeUndefined();
  });

  it("alle K12-K18 Fragen sind Beobachtungsfragen (Wirkt/Gibt es Hinweise)", () => {
    const observationKeys = ["K12", "K13", "K14", "K15", "K16", "K17", "K18"];
    for (const key of observationKeys) {
      const questions = M2_QUESTIONS[key];
      expect(questions).toBeDefined();
      for (const q of questions) {
        const isObservation = q.text.startsWith("Wirkt") || q.text.startsWith("Gibt es Hinweise") || q.text.startsWith("Besteht");
        expect(isObservation).toBe(true);
      }
    }
  });
});
