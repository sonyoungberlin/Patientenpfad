import { hasDigitalRequestFollowUpGate } from "@/lib/digitalRequests/followUpGate";

describe("hasDigitalRequestFollowUpGate", () => {
  it("erfüllt das Gate mit einer Patientennummer", () => {
    expect(
      hasDigitalRequestFollowUpGate({ patient_reference: "PAT-001" }),
    ).toBe(true);
  });

  it("erfüllt das Gate mit bestätigter Neupatienten-Ausnahme", () => {
    expect(
      hasDigitalRequestFollowUpGate({
        new_patient_exception_confirmed_at: new Date(),
      }),
    ).toBe(true);
  });

  it("erfüllt das Gate nicht ohne Zuordnung oder Ausnahme", () => {
    expect(hasDigitalRequestFollowUpGate({})).toBe(false);
    expect(
      hasDigitalRequestFollowUpGate({ patient_reference: "   " }),
    ).toBe(false);
  });

  it("interpretiert die öffentliche Selbstauskunft nicht als Gate", () => {
    expect(
      hasDigitalRequestFollowUpGate({
        patient_relationship: "new_patient",
      } as never),
    ).toBe(false);
  });

  it("lässt eine widersprüchliche Selbstauskunft neben der Ausnahme zu", () => {
    expect(
      hasDigitalRequestFollowUpGate({
        patient_relationship: "existing_patient",
        new_patient_exception_confirmed_at: new Date(),
      } as never),
    ).toBe(true);
  });
});