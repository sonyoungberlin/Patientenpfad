import { M2_QUESTIONS, M2_QUESTIONS_MFA } from "@/lib/logic/m2Questions";

describe("pflegebeobachtung – M2 Fragenkatalog", () => {
  it("hat Patienten-/Gesprächsfragen für K12-K15", () => {
    expect(M2_QUESTIONS.K12).toBeDefined();
    expect(M2_QUESTIONS.K13).toBeDefined();
    expect(M2_QUESTIONS.K14).toBeDefined();
    expect(M2_QUESTIONS.K15).toBeDefined();
  });

  it("hat keine MFA-Fragen für K12-K15", () => {
    expect(M2_QUESTIONS_MFA.K12).toBeUndefined();
    expect(M2_QUESTIONS_MFA.K13).toBeUndefined();
    expect(M2_QUESTIONS_MFA.K14).toBeUndefined();
    expect(M2_QUESTIONS_MFA.K15).toBeUndefined();
  });
});
