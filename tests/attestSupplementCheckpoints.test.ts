/**
 * ensureSelectionConditionalCheckpoints – Attest/Jobcenter/Versicherung/Sonstiger Supplement-Logik
 *
 * Prüft die vier neuen K11-Trigger:
 *   - "Attest / Bescheinigung"        → K03, K18
 *   - "Versicherung / Gutachten"      → K03, K04, K05, K18
 *   - "Jobcenter / Sozialleistungen"  → K03, K04, K05, K06, K15, K18
 *   - "Sonstiger Antrag / Formular"   → K03, K18
 *
 * Testgruppen:
 *   1. Attest-Trigger
 *   2. Versicherung-Trigger
 *   3. Jobcenter-Trigger
 *   4. Sonstiger-Trigger
 *   5. Isolation: Reha/Pflege nicht durch neue Trigger aktiviert
 *   6. Isolation: neue Trigger aktivieren keine Reha/Pflege-spezifischen IDs
 *   7. Duplikat-Schutz
 *   8. Deduplication bei Mehrfachselektion
 */

import {
  CHECKPOINT_CATALOGUE,
  MULTI_SELECT_CATALOGUE,
  ensureSelectionConditionalCheckpoints,
} from "@/lib/logic/checkpointCatalog";
import {
  isStandardCheckpoint,
  type ActiveCheckpoint,
  type ActiveCheckpointMultiSelect,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeK11(selections: string[]): ActiveCheckpointMultiSelect {
  const template = MULTI_SELECT_CATALOGUE["K11"]!;
  return { ...template, selections, enabled: true };
}

function makeK18(status: "OK" | "TO_DO" = "TO_DO"): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE["K18"]!;
  return { ...template, status } as ActiveCheckpoint;
}

const ATTEST_SELECTION = "Attest / Bescheinigung";
const VERSICHERUNG_SELECTION = "Versicherung / Gutachten";
const JOBCENTER_SELECTION = "Jobcenter / Sozialleistungen";
const SONSTIGER_SELECTION = "Sonstiger Antrag / Formular";

// ---------------------------------------------------------------------------
// 1. Attest-Trigger
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Attest-Trigger", () => {
  it("Attest → K03 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([ATTEST_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K03");
  });

  it("Attest → K18 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([ATTEST_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K18");
  });

  it("Attest → Gesamtlänge: 1 (K11) + 2 (K03, K18) = 3", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([ATTEST_SELECTION])]);
    expect(result).toHaveLength(3);
  });

  it("Attest → K18 hat status: TO_DO", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([ATTEST_SELECTION])]);
    const k18 = result.find((cp) => cp.id === "K18")!;
    expect(isStandardCheckpoint(k18) && k18.status).toBe("TO_DO");
  });

  it("Attest → K18 übernimmt Katalog-Daten korrekt (title, block_id)", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([ATTEST_SELECTION])]);
    const k18 = result.find((cp) => cp.id === "K18")!;
    expect(k18.title).toBe("Anfragestelle & Unterlagen");
    expect(k18.block_id).toBe("medizinische_lage");
  });

  it("Attest → K04/K05/K06 werden NICHT ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([ATTEST_SELECTION])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).not.toContain("K04");
    expect(ids).not.toContain("K05");
    expect(ids).not.toContain("K06");
  });
});

// ---------------------------------------------------------------------------
// 2. Versicherung-Trigger
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Versicherung-Trigger", () => {
  it("Versicherung → K03 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([VERSICHERUNG_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K03");
  });

  it("Versicherung → K04 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([VERSICHERUNG_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K04");
  });

  it("Versicherung → K05 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([VERSICHERUNG_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K05");
  });

  it("Versicherung → K18 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([VERSICHERUNG_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K18");
  });

  it("Versicherung → Gesamtlänge: 1 (K11) + 4 (K03, K04, K05, K18) = 5", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([VERSICHERUNG_SELECTION])]);
    expect(result).toHaveLength(5);
  });

  it("Versicherung → K06/K15 werden NICHT ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([VERSICHERUNG_SELECTION])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).not.toContain("K06");
    expect(ids).not.toContain("K15");
  });
});

// ---------------------------------------------------------------------------
// 3. Jobcenter-Trigger
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Jobcenter-Trigger", () => {
  it("Jobcenter → K03 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([JOBCENTER_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K03");
  });

  it("Jobcenter → K04 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([JOBCENTER_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K04");
  });

  it("Jobcenter → K05 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([JOBCENTER_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K05");
  });

  it("Jobcenter → K06 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([JOBCENTER_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K06");
  });

  it("Jobcenter → K15 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([JOBCENTER_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K15");
  });

  it("Jobcenter → K18 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([JOBCENTER_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K18");
  });

  it("Jobcenter → Gesamtlänge: 1 (K11) + 6 (K03–K06, K15, K18) = 7", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([JOBCENTER_SELECTION])]);
    expect(result).toHaveLength(7);
  });

  it("Jobcenter → K07/K14/K16/K17 werden NICHT ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([JOBCENTER_SELECTION])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).not.toContain("K07");
    expect(ids).not.toContain("K14");
    expect(ids).not.toContain("K16");
    expect(ids).not.toContain("K17");
  });

  it("neu ergänzte Jobcenter-Checkpoints haben status: TO_DO", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([JOBCENTER_SELECTION])]);
    for (const id of ["K03", "K04", "K05", "K06", "K15", "K18"]) {
      const cp = result.find((c) => c.id === id)!;
      expect(isStandardCheckpoint(cp)).toBe(true);
      if (isStandardCheckpoint(cp)) {
        expect(cp.status).toBe("TO_DO");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Sonstiger-Trigger
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Sonstiger-Trigger", () => {
  it("Sonstiger → K03 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([SONSTIGER_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K03");
  });

  it("Sonstiger → K18 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([SONSTIGER_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K18");
  });

  it("Sonstiger → Gesamtlänge: 1 (K11) + 2 (K03, K18) = 3", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([SONSTIGER_SELECTION])]);
    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 5. Isolation: Reha/Pflege werden durch neue Trigger NICHT aktiviert
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Isolation neue Trigger → kein Reha/Pflege", () => {
  it("Attest aktiviert K14 nicht (Reha-spezifisch)", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([ATTEST_SELECTION])]);
    expect(result.map((cp) => cp.id)).not.toContain("K14");
  });

  it("Attest aktiviert K16 nicht (Pflege-spezifisch)", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([ATTEST_SELECTION])]);
    expect(result.map((cp) => cp.id)).not.toContain("K16");
  });

  it("Versicherung aktiviert K14/K15 nicht (Reha-spezifisch)", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([VERSICHERUNG_SELECTION])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).not.toContain("K14");
  });

  it("Versicherung aktiviert K16/K17 nicht (Pflege-spezifisch)", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([VERSICHERUNG_SELECTION])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).not.toContain("K16");
    expect(ids).not.toContain("K17");
  });

  it("Sonstiger aktiviert K14/K16 nicht", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([SONSTIGER_SELECTION])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).not.toContain("K14");
    expect(ids).not.toContain("K16");
  });
});

// ---------------------------------------------------------------------------
// 6. Isolation: Reha/Pflege aktivieren K18 NICHT
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Isolation Reha/Pflege → kein K18", () => {
  it("Reha-Trigger aktiviert K18 nicht", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
  });

  it("Pflege-Trigger aktiviert K18 nicht", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Pflegegrad / Höherstufung"])]);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
  });
});

// ---------------------------------------------------------------------------
// 7. Duplikat-Schutz
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Attest Duplikat-Schutz", () => {
  it("K18 bereits vorhanden mit OK → Status OK bleibt erhalten", () => {
    const input: ActiveCheckpoint[] = [makeK11([ATTEST_SELECTION]), makeK18("OK")];
    const result = ensureSelectionConditionalCheckpoints(input);
    const k18 = result.find((cp) => cp.id === "K18")!;
    expect(isStandardCheckpoint(k18) && k18.status).toBe("OK");
  });

  it("K18 bereits vorhanden → kein Duplikat", () => {
    const input: ActiveCheckpoint[] = [makeK11([ATTEST_SELECTION]), makeK18("TO_DO")];
    const result = ensureSelectionConditionalCheckpoints(input);
    expect(result.filter((cp) => cp.id === "K18")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 8. Deduplication bei Mehrfachselektion
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Deduplication Mehrfachselektion", () => {
  it("Attest + Versicherung → K03 exakt einmal", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11([ATTEST_SELECTION, VERSICHERUNG_SELECTION]),
    ]);
    expect(result.filter((cp) => cp.id === "K03")).toHaveLength(1);
  });

  it("Attest + Versicherung → K18 exakt einmal", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11([ATTEST_SELECTION, VERSICHERUNG_SELECTION]),
    ]);
    expect(result.filter((cp) => cp.id === "K18")).toHaveLength(1);
  });

  it("Attest + Versicherung → Gesamtlänge: 1 + 4 (K03, K04, K05, K18) = 5", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11([ATTEST_SELECTION, VERSICHERUNG_SELECTION]),
    ]);
    expect(result).toHaveLength(5);
  });

  it("Jobcenter + Reha → K03 exakt einmal (shared)", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11([JOBCENTER_SELECTION, "Reha-Antrag"]),
    ]);
    expect(result.filter((cp) => cp.id === "K03")).toHaveLength(1);
  });

  it("Jobcenter + Reha → K15 exakt einmal (shared)", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11([JOBCENTER_SELECTION, "Reha-Antrag"]),
    ]);
    expect(result.filter((cp) => cp.id === "K15")).toHaveLength(1);
  });

  it("Jobcenter + Reha → K14 (Reha-spezifisch) wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11([JOBCENTER_SELECTION, "Reha-Antrag"]),
    ]);
    expect(result.map((cp) => cp.id)).toContain("K14");
  });

  it("Jobcenter + Reha → K18 (Jobcenter-spezifisch) wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11([JOBCENTER_SELECTION, "Reha-Antrag"]),
    ]);
    expect(result.map((cp) => cp.id)).toContain("K18");
  });

  it("Attest + Sonstiger → K03/K18 je einmal (vollständige Deduplication)", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11([ATTEST_SELECTION, SONSTIGER_SELECTION]),
    ]);
    expect(result.filter((cp) => cp.id === "K03")).toHaveLength(1);
    expect(result.filter((cp) => cp.id === "K18")).toHaveLength(1);
    expect(result).toHaveLength(3); // K11 + K03 + K18
  });
});
