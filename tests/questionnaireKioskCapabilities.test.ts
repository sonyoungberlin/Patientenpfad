import { hasQuestionnaireKioskCapability, type QuestionnaireKioskIdentity } from "@/lib/questionnaireKiosk/auth";

const identity: QuestionnaireKioskIdentity = {
  deviceId: "device",
  practiceId: "practice",
  deviceName: "Kiosk",
  capabilities: ["questionnaires"],
};

describe("questionnaire kiosk capabilities", () => {
  it("keeps questionnaire-only devices isolated", () => {
    expect(hasQuestionnaireKioskCapability(identity, "questionnaires")).toBe(true);
    expect(hasQuestionnaireKioskCapability(identity, "internal_documentation")).toBe(false);
  });
});