import {
  activeOfficeApplicationFilter,
  expiredOfficeApplicationFilter,
  officeApplicationCutoff,
} from "@/lib/digitalRequests/officeApplicationLifecycle";

const NOW = new Date("2026-09-10T12:00:00.000Z");

describe("Bewerbungsanfragen-Lifecycle", () => {
  it("zeigt offene Bewerbungsanfragen innerhalb von 48 Stunden", () => {
    const filter = activeOfficeApplicationFilter(NOW);

    expect(filter).toEqual({
      request_type: "office",
      deleted_at: null,
      createdAt: { gte: new Date("2026-09-08T12:00:00.000Z") },
      status: { in: ["new", "in_review"] },
    });
  });

  it("blendet Bewerbungsanfragen nach 48 Stunden aus", () => {
    expect(expiredOfficeApplicationFilter(NOW)).toEqual({
      request_type: "office",
      createdAt: { lt: new Date("2026-09-08T12:00:00.000Z") },
    });
  });

  it("blendet sent, rejected und closed sofort aus", () => {
    const statusFilter = activeOfficeApplicationFilter(NOW).status;
    expect(statusFilter).toEqual({ in: ["new", "in_review"] });
    expect((statusFilter as { in: string[] }).in).not.toEqual(
      expect.arrayContaining(["sent", "rejected", "closed"]),
    );
  });

  it("verwendet exakt einen 48-Stunden-Cutoff", () => {
    expect(officeApplicationCutoff(NOW)).toEqual(
      new Date("2026-09-08T12:00:00.000Z"),
    );
  });
});