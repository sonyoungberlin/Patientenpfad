import { resolveEvidenceDateStatus, EvidenceDateHint } from "@/lib/office/evidenceDateHints";

describe("resolveEvidenceDateStatus", () => {
  const baseHint: EvidenceDateHint = {
    issuedAt: "2026-01-01",
    performedAt: "2026-02-01",
  };

  it("berechnet validUntil aus issuedAt + validityMonths", () => {
    const status = resolveEvidenceDateStatus(
      "EVID1",
      { issuedAt: "2026-01-01" },
      { validityMonths: 6 },
      undefined,
      { today: "2026-03-01" }
    );
    expect(status.validUntil).toBe("2026-07-01");
    expect(status.isExpired).toBe(false);
  });

  it("berechnet nextDueAt aus performedAt + recurrenceMonths", () => {
    const status = resolveEvidenceDateStatus(
      "EVID2",
      { performedAt: "2026-02-01" },
      { recurrenceMonths: 12 },
      undefined,
      { today: "2026-03-01" }
    );
    expect(status.nextDueAt).toBe("2027-02-01");
    expect(status.isDueSoon).toBe(false);
  });

  it("nutzt manuelles validUntil-Override", () => {
    const status = resolveEvidenceDateStatus(
      "EVID3",
      { validUntil: "2026-05-01" },
      { validityMonths: 6 },
      undefined,
      { today: "2026-06-01" }
    );
    expect(status.validUntil).toBe("2026-05-01");
    expect(status.isExpired).toBe(true);
  });

  it("nutzt manuelles nextDueAt-Override", () => {
    const status = resolveEvidenceDateStatus(
      "EVID4",
      { nextDueAt: "2026-04-01" },
      { recurrenceMonths: 12 },
      undefined,
      { today: "2026-03-01", dueSoonDays: 40 }
    );
    expect(status.nextDueAt).toBe("2026-04-01");
    expect(status.isDueSoon).toBe(true);
  });

  it("nutzt deadlineAt aus Hint, sonst Fallback", () => {
    const status1 = resolveEvidenceDateStatus(
      "EVID5",
      { deadlineAt: "2026-05-10" },
      {},
      "2026-06-01",
      { today: "2026-05-01" }
    );
    expect(status1.deadlineAt).toBe("2026-05-10");
    expect(status1.isOverdue).toBe(false);
    const status2 = resolveEvidenceDateStatus(
      "EVID5",
      {},
      {},
      "2026-04-01",
      { today: "2026-05-01" }
    );
    expect(status2.deadlineAt).toBe("2026-04-01");
    expect(status2.isOverdue).toBe(true);
  });

  it("ignoriert ungültige Datumswerte defensiv", () => {
    const status = resolveEvidenceDateStatus(
      "EVID6",
      { issuedAt: "not-a-date", validUntil: "2026-13-99" },
      { validityMonths: 6 },
      undefined,
      { today: "2026-03-01" }
    );
    expect(status.validUntil).toBeUndefined();
    expect(status.isExpired).toBeUndefined();
  });

  it("funktioniert ohne Hint und Katalog (alte Snapshots)", () => {
    const status = resolveEvidenceDateStatus(
      "EVID7",
      undefined,
      {},
      undefined,
      { today: "2026-03-01" }
    );
    expect(status.validUntil).toBeUndefined();
    expect(status.nextDueAt).toBeUndefined();
    expect(status.deadlineAt).toBeUndefined();
  });

  it("berechnet isDueSoon korrekt mit dueSoonDays", () => {
    const status = resolveEvidenceDateStatus(
      "EVID8",
      { performedAt: "2026-03-01" },
      { recurrenceMonths: 1 },
      undefined,
      { today: "2026-03-15", dueSoonDays: 20 }
    );
    expect(status.nextDueAt).toBe("2026-04-01");
    expect(status.isDueSoon).toBe(true);
  });
});

describe("Evidence-Katalog Hygiene", () => {
  it("validityMonths und recurrenceMonths dürfen nicht gleichzeitig gesetzt sein (außer explizit getestet)", () => {
    const entries = require("@/lib/office/evidenceCatalog").EVIDENCES as any[];
    for (const entry of entries) {
      if (entry.validityMonths && entry.recurrenceMonths) {
        // Ausnahmefälle explizit erlauben:
        expect(entry.id).toMatch(/ALLOW_BOTH/);
      }
    }
  });
});
