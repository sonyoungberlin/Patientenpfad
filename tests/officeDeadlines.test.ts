import { getCheckpointDueStatus, subtractCalendarMonths, subtractDays } from "@/lib/office/deadlines";
import { OfficeCheckpointKind, OfficeCheckpointState } from "@/lib/office/types";
import { containsSensitivePersonalIdentifier } from "@/lib/office/privacy";

describe("Office task deadlines", () => {
  it("berechnet interne Kontrolltermine relativ zum Arbeitsbeginn", () => {
    expect(subtractCalendarMonths("2027-06-30", 4)).toBe("2027-02-28");
    expect(subtractDays("2027-01-01", 28)).toBe("2026-12-04");
    expect(subtractCalendarMonths("kein-datum", 4)).toBeNull();
  });

  it("unterscheidet überfällig, innerhalb von 30 Tagen und später", () => {
    const checkpoint = {
      id: "CP-1",
      title: "Frist",
      kind: OfficeCheckpointKind.FACT,
      state: OfficeCheckpointState.OPEN,
      deadline: "2026-07-01",
    } as const;
    expect(getCheckpointDueStatus({ ...checkpoint, deadline: "2026-05-31" }, "2026-06-01")).toBe("overdue");
    expect(getCheckpointDueStatus(checkpoint, "2026-06-01")).toBe("due_soon");
    expect(getCheckpointDueStatus({ ...checkpoint, deadline: "2026-07-02" }, "2026-06-01")).toBe("upcoming");
    expect(getCheckpointDueStatus({
      ...checkpoint,
      state: OfficeCheckpointState.NOT_REQUIRED,
    }, "2026-06-01")).toBe("none");
  });
});

describe("Office personal-data guard", () => {
  it("erkennt Steuer-ID, deutsche Sozialversicherungsnummer und IBAN", () => {
    expect(containsSensitivePersonalIdentifier("Steuer-ID 12345678901")).toBe(true);
    expect(containsSensitivePersonalIdentifier("12 345678 A 123")).toBe(true);
    expect(containsSensitivePersonalIdentifier("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(containsSensitivePersonalIdentifier("Lohnabrechnung vorbereitet")).toBe(false);
  });
});
