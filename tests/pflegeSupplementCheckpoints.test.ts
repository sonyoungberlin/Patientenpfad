/**
 * ensureSelectionConditionalCheckpoints – Pflege-Supplement-Logik
 *
 * Prüft, dass K03/K04/K05/K06/K07/K16/K17 automatisch ergänzt werden, wenn
 * K11 den Wert "Pflegegrad / Höherstufung" in seinen `selections` enthält.
 *
 * Testgruppen:
 *   1. Pflege-Trigger aktiv → K16/K17 werden ergänzt
 *   2. Isolation: Pflege-Trigger löst K14/K15 nicht aus
 *   3. Isolation: Reha-Trigger löst K16/K17 nicht aus
 *   4. Duplikat-Schutz: bereits vorhandene Checkpoints bleiben unverändert
 *   5. Beide Trigger gleichzeitig: gemeinsame IDs nur einmal vorhanden
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

function makeK16(status: "OK" | "TO_DO" = "TO_DO"): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE["K16"]!;
  return { ...template, status } as ActiveCheckpoint;
}

function makeK17(status: "OK" | "TO_DO" = "TO_DO"): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE["K17"]!;
  return { ...template, status } as ActiveCheckpoint;
}

const PFLEGE_SELECTION = "Pflegegrad / Höherstufung";

// ---------------------------------------------------------------------------
// 1. Pflege-Trigger aktiv → Checkpoints werden ergänzt
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Pflege-Trigger aktiv", () => {
  it("K11 = ['Pflegegrad / Höherstufung'] → K03 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K03");
  });

  it("K11 = ['Pflegegrad / Höherstufung'] → K04 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K04");
  });

  it("K11 = ['Pflegegrad / Höherstufung'] → K05 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K05");
  });

  it("K11 = ['Pflegegrad / Höherstufung'] → K06 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K06");
  });

  it("K11 = ['Pflegegrad / Höherstufung'] → K07 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K07");
  });

  it("K11 = ['Pflegegrad / Höherstufung'] → K16 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K16");
  });

  it("K11 = ['Pflegegrad / Höherstufung'] → K17 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    expect(result.map((cp) => cp.id)).toContain("K17");
  });

  it("neu ergänzte Pflege-Checkpoints haben status: TO_DO", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    for (const id of ["K03", "K04", "K05", "K06", "K07", "K16", "K17"]) {
      const cp = result.find((c) => c.id === id)!;
      expect(isStandardCheckpoint(cp)).toBe(true);
      if (isStandardCheckpoint(cp)) {
        expect(cp.status).toBe("TO_DO");
      }
    }
  });

  it("Gesamtlänge nach Pflege-Ergänzung: 1 (K11) + 7 (K03–K07/K16/K17) = 8", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    expect(result).toHaveLength(8);
  });

  it("K16 übernimmt Katalog-Daten korrekt (title und block_id)", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    const k16 = result.find((cp) => cp.id === "K16")!;
    expect(k16).toBeDefined();
    expect(k16.block_id).toBe("medizinische_lage");
    expect(k16.title).toBe("MD-Vorbereitung & Antragshistorie");
  });

  it("K17 übernimmt Katalog-Daten korrekt (title und block_id)", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    const k17 = result.find((cp) => cp.id === "K17")!;
    expect(k17).toBeDefined();
    expect(k17.block_id).toBe("versorgung_im_alltag");
    expect(k17.title).toBe("Kurzzeitpflege & Entlastung");
  });

  it("K01, K02, K09 werden NICHT automatisch ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).not.toContain("K01");
    expect(ids).not.toContain("K02");
    expect(ids).not.toContain("K09");
  });
});

// ---------------------------------------------------------------------------
// 2. Isolation: Pflege-Trigger löst K14/K15 (Reha) nicht aus
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Pflege-Isolation (kein Reha-Übertrag)", () => {
  it("Pflege-Trigger ergänzt K14 nicht", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    expect(result.map((cp) => cp.id)).not.toContain("K14");
  });

  it("Pflege-Trigger ergänzt K15 nicht", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([PFLEGE_SELECTION])]);
    expect(result.map((cp) => cp.id)).not.toContain("K15");
  });
});

// ---------------------------------------------------------------------------
// 3. Isolation: Reha-Trigger löst K16/K17 (Pflege) nicht aus
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Reha-Isolation (kein Pflege-Übertrag)", () => {
  it("Reha-Trigger ergänzt K16 nicht", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    expect(result.map((cp) => cp.id)).not.toContain("K16");
  });

  it("Reha-Trigger ergänzt K17 nicht", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    expect(result.map((cp) => cp.id)).not.toContain("K17");
  });
});

// ---------------------------------------------------------------------------
// 4. Duplikat-Schutz
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Pflege Duplikat-Schutz", () => {
  it("K16 bereits vorhanden mit TO_DO → bleibt unverändert, kein Duplikat", () => {
    const input: ActiveCheckpoint[] = [makeK11([PFLEGE_SELECTION]), makeK16("TO_DO")];
    const result = ensureSelectionConditionalCheckpoints(input);
    expect(result.filter((cp) => cp.id === "K16")).toHaveLength(1);
  });

  it("K16 bereits vorhanden mit OK → Status OK bleibt erhalten, kein Reset", () => {
    const input: ActiveCheckpoint[] = [makeK11([PFLEGE_SELECTION]), makeK16("OK")];
    const result = ensureSelectionConditionalCheckpoints(input);
    const k16 = result.find((cp) => cp.id === "K16")!;
    expect(isStandardCheckpoint(k16) && k16.status).toBe("OK");
  });

  it("K17 bereits vorhanden mit OK → Status OK bleibt erhalten", () => {
    const input: ActiveCheckpoint[] = [makeK11([PFLEGE_SELECTION]), makeK17("OK")];
    const result = ensureSelectionConditionalCheckpoints(input);
    const k17 = result.find((cp) => cp.id === "K17")!;
    expect(isStandardCheckpoint(k17) && k17.status).toBe("OK");
  });

  it("K03–K07, K16, K17 alle vorhanden → Funktion gibt exakt dieselbe Liste zurück", () => {
    const k03 = { ...CHECKPOINT_CATALOGUE["K03"]!, status: "OK" } as ActiveCheckpoint;
    const k04 = { ...CHECKPOINT_CATALOGUE["K04"]!, status: "TO_DO" } as ActiveCheckpoint;
    const k05 = { ...CHECKPOINT_CATALOGUE["K05"]!, status: "TO_DO" } as ActiveCheckpoint;
    const k06 = { ...CHECKPOINT_CATALOGUE["K06"]!, status: "TO_DO" } as ActiveCheckpoint;
    const k07 = { ...CHECKPOINT_CATALOGUE["K07"]!, status: "TO_DO" } as ActiveCheckpoint;
    const input: ActiveCheckpoint[] = [
      makeK11([PFLEGE_SELECTION]),
      k03, k04, k05, k06, k07,
      makeK16("TO_DO"),
      makeK17("TO_DO"),
    ];
    const result = ensureSelectionConditionalCheckpoints(input);
    expect(result).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// 5. Beide Trigger gleichzeitig: gemeinsame IDs nur einmal vorhanden
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Reha + Pflege gleichzeitig", () => {
  it("Beide Trigger → K03 exakt einmal vorhanden", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11(["Reha-Antrag", PFLEGE_SELECTION]),
    ]);
    expect(result.filter((cp) => cp.id === "K03")).toHaveLength(1);
  });

  it("Beide Trigger → K06 exakt einmal vorhanden", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11(["Reha-Antrag", PFLEGE_SELECTION]),
    ]);
    expect(result.filter((cp) => cp.id === "K06")).toHaveLength(1);
  });

  it("Beide Trigger → K14 wird ergänzt (Reha-spezifisch)", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11(["Reha-Antrag", PFLEGE_SELECTION]),
    ]);
    expect(result.map((cp) => cp.id)).toContain("K14");
  });

  it("Beide Trigger → K15 wird ergänzt (Reha-spezifisch)", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11(["Reha-Antrag", PFLEGE_SELECTION]),
    ]);
    expect(result.map((cp) => cp.id)).toContain("K15");
  });

  it("Beide Trigger → K16 wird ergänzt (Pflege-spezifisch)", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11(["Reha-Antrag", PFLEGE_SELECTION]),
    ]);
    expect(result.map((cp) => cp.id)).toContain("K16");
  });

  it("Beide Trigger → K17 wird ergänzt (Pflege-spezifisch)", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11(["Reha-Antrag", PFLEGE_SELECTION]),
    ]);
    expect(result.map((cp) => cp.id)).toContain("K17");
  });

  it("Beide Trigger → Gesamtlänge: 1 (K11) + 9 (K03–K07, K14, K15, K16, K17) = 10", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11(["Reha-Antrag", PFLEGE_SELECTION]),
    ]);
    expect(result).toHaveLength(10);
  });
});
