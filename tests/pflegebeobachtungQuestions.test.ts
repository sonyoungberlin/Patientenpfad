import { M2_QUESTIONS, M2_QUESTIONS_MFA } from "@/lib/logic/m2Questions";

describe("pflegebeobachtung – M2 Fragenkatalog (Einschätzungsblock)", () => {
  it("hat alle Beobachtungsfragen unter dem einzigen Checkpoint K12", () => {
    expect(M2_QUESTIONS.K12).toBeDefined();
    expect(M2_QUESTIONS.K12).toHaveLength(13);
  });

  it("K14/K15 existieren jetzt als Reha-Checkpoints; K16–K18 existieren nicht", () => {
    expect(M2_QUESTIONS.K14).toBeDefined();
    expect(M2_QUESTIONS.K15).toBeDefined();
    expect(M2_QUESTIONS.K16).toBeUndefined();
    expect(M2_QUESTIONS.K17).toBeUndefined();
    expect(M2_QUESTIONS.K18).toBeUndefined();
  });

  it("hat keine MFA-Fragen für K12 / K13 (ASSESSMENT-Checkpoints, Patient-only)", () => {
    expect(M2_QUESTIONS_MFA.K12).toBeUndefined();
    expect(M2_QUESTIONS_MFA.K13).toBeUndefined();
  });

  it("alle K12-Fragen haben eindeutige IDs M2-01 bis M2-14", () => {
    const questions = M2_QUESTIONS.K12;
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(13);
    expect(ids).toContain("M2-01");
    expect(ids).toContain("M2-14");
    expect(ids).not.toContain("M2-12");
  });

  it("alle K12-Fragen sind Beobachtungsfragen (Wirkt/Gibt es Hinweise/Besteht)", () => {
    for (const q of M2_QUESTIONS.K12) {
      const isObservation =
        q.text.startsWith("Wirkt") ||
        q.text.startsWith("Gibt es Hinweise") ||
        q.text.startsWith("Besteht");
      expect(isObservation).toBe(true);
    }
  });
});
