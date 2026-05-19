/**
 * ensureSelectionConditionalCheckpoints – Reha-Supplement-Logik
 *
 * Prüft, dass K03/K04/K05 automatisch ergänzt werden, wenn K11 den Wert
 * "Reha-Antrag" in seinen `selections` enthält.
 *
 * Testgruppen:
 *   1. Kein Trigger → keine Änderung
 *   2. K11 = "Reha-Antrag" → K03, K04, K05 werden ergänzt
 *   3. Duplikat-Schutz: bereits vorhandene K03/K04/K05 bleiben unverändert
 *   4. Zusammenspiel mit ensureAlwaysPresentCheckpoints und hydrateActiveCheckpointsFromSnapshot
 */

import {
  CHECKPOINT_CATALOGUE,
  MULTI_SELECT_CATALOGUE,
  ensureSelectionConditionalCheckpoints,
  ensureAlwaysPresentCheckpoints,
  hydrateActiveCheckpointsFromSnapshot,
} from "@/lib/logic/checkpointCatalog";
import {
  CheckpointMode,
  isMultiSelectCheckpoint,
  isStandardCheckpoint,
  type ActiveCheckpoint,
  type ActiveCheckpointMultiSelect,
  type M1SnapshotInitial,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeK11(selections: string[]): ActiveCheckpointMultiSelect {
  const template = MULTI_SELECT_CATALOGUE["K11"]!;
  return { ...template, selections, enabled: true };
}

function makeK03(status: "OK" | "TO_DO" | "ZURÜCKSTELLEN" = "TO_DO"): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE["K03"]!;
  return { ...template, status } as ActiveCheckpoint;
}

function makeK04(status: "OK" | "TO_DO" = "TO_DO"): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE["K04"]!;
  return { ...template, status } as ActiveCheckpoint;
}

function makeK06(status: "OK" | "TO_DO" = "TO_DO"): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE["K06"]!;
  return { ...template, status } as ActiveCheckpoint;
}

function makeK07(status: "OK" | "TO_DO" = "TO_DO"): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE["K07"]!;
  return { ...template, status } as ActiveCheckpoint;
}

function makeK14(status: "OK" | "TO_DO" = "TO_DO"): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE["K14"]!;
  return { ...template, status } as ActiveCheckpoint;
}

function makeK15(status: "OK" | "TO_DO" = "TO_DO"): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE["K15"]!;
  return { ...template, status } as ActiveCheckpoint;
}

function baseCheckpoints(): ActiveCheckpoint[] {
  // Minimale Ausgangsliste: nur K11 mit leeren Selektionen (always-present)
  return [makeK11([])];
}

// ---------------------------------------------------------------------------
// 1. Kein Trigger → keine Änderung
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: kein Trigger", () => {
  it("leere Checkpoint-Liste → unverändert zurückgegeben", () => {
    const result = ensureSelectionConditionalCheckpoints([]);
    expect(result).toEqual([]);
  });

  it("K11 fehlt → keine Ergänzung", () => {
    const cp = [{ ...CHECKPOINT_CATALOGUE["K01"]!, status: "TO_DO" } as ActiveCheckpoint];
    const result = ensureSelectionConditionalCheckpoints(cp);
    expect(result).toHaveLength(1);
  });

  it("K11 vorhanden, selections leer → keine Ergänzung", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11([])]);
    expect(result).toHaveLength(1);
  });

  it("K11 mit anderem Anliegen (Attest) → keine Ergänzung", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11(["Attest / Bescheinigung"]),
    ]);
    expect(result).toHaveLength(1);
  });

  it("K11 mit mehreren Anliegen, keines = Reha → keine Ergänzung", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11(["Attest / Bescheinigung", "Jobcenter / Sozialleistungen"]),
    ]);
    expect(result).toHaveLength(1);
  });

  it("gibt exakt dasselbe Array-Objekt zurück wenn keine Änderung nötig", () => {
    const input = [makeK11([])];
    const result = ensureSelectionConditionalCheckpoints(input);
    expect(result).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// 2. K11 = "Reha-Antrag" → K03, K04, K05 werden ergänzt
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Reha-Trigger aktiv", () => {
  it("K11 = ['Reha-Antrag'] → K03 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).toContain("K03");
  });

  it("K11 = ['Reha-Antrag'] → K04 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).toContain("K04");
  });

  it("K11 = ['Reha-Antrag'] → K05 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).toContain("K05");
  });

  it("K11 = ['Reha-Antrag'] → K06 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).toContain("K06");
  });

  it("K11 = ['Reha-Antrag'] → K07 wird ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).toContain("K07");
  });
  it("K11 = ['Reha-Antrag'] \u2192 K14 wird erg\u00e4nzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    expect(result.map((cp) => cp.id)).toContain("K14");
  });

  it("K11 = ['Reha-Antrag'] \u2192 K15 wird erg\u00e4nzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    expect(result.map((cp) => cp.id)).toContain("K15");
  });
  it("neu ergänzte Checkpoints haben status: TO_DO", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    for (const id of ["K03", "K04", "K05", "K06", "K07", "K14", "K15"]) {
      const cp = result.find((c) => c.id === id)!;
      expect(isStandardCheckpoint(cp)).toBe(true);
      if (isStandardCheckpoint(cp)) {
        expect(cp.status).toBe("TO_DO");
      }
    }
  });

  it("Gesamtl\u00e4nge nach Erg\u00e4nzung: 1 (K11) + 7 (K03/K04/K05/K06/K07/K14/K15) = 8", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    expect(result).toHaveLength(8);
  });

  it("K11 = ['Reha-Antrag', 'Attest / Bescheinigung'] \u2192 K03/K04/K05/K06/K07/K14/K15 werden trotzdem erg\u00e4nzt", () => {
    const result = ensureSelectionConditionalCheckpoints([
      makeK11(["Reha-Antrag", "Attest / Bescheinigung"]),
    ]);
    const ids = result.map((cp) => cp.id);
    expect(ids).toContain("K03");
    expect(ids).toContain("K04");
    expect(ids).toContain("K05");
    expect(ids).toContain("K06");
    expect(ids).toContain("K07");
    expect(ids).toContain("K14");
    expect(ids).toContain("K15");
  });

  it("K01, K02, K09 werden NICHT automatisch ergänzt", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    const ids = result.map((cp) => cp.id);
    expect(ids).not.toContain("K01");
    expect(ids).not.toContain("K02");
    expect(ids).not.toContain("K09");
  });

  it("ergänzte Checkpoints übernehmen Katalog-Daten korrekt (K03 title und block_id)", () => {
    const result = ensureSelectionConditionalCheckpoints([makeK11(["Reha-Antrag"])]);
    const k03 = result.find((cp) => cp.id === "K03")!;
    expect(k03).toBeDefined();
    expect(k03.block_id).toBe("medizinische_lage");
    expect(k03.id).toBe("K03");
  });
});

// ---------------------------------------------------------------------------
// 3. Duplikat-Schutz
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Duplikat-Schutz", () => {
  it("K03 bereits vorhanden mit TO_DO → bleibt unverändert, kein Duplikat", () => {
    const input: ActiveCheckpoint[] = [makeK11(["Reha-Antrag"]), makeK03("TO_DO")];
    const result = ensureSelectionConditionalCheckpoints(input);
    const k03s = result.filter((cp) => cp.id === "K03");
    expect(k03s).toHaveLength(1);
    expect(isStandardCheckpoint(k03s[0]) && k03s[0].status).toBe("TO_DO");
  });

  it("K03 bereits vorhanden mit OK → Status OK bleibt erhalten, kein Reset", () => {
    const input: ActiveCheckpoint[] = [makeK11(["Reha-Antrag"]), makeK03("OK")];
    const result = ensureSelectionConditionalCheckpoints(input);
    const k03s = result.filter((cp) => cp.id === "K03");
    expect(k03s).toHaveLength(1);
    expect(isStandardCheckpoint(k03s[0]) && k03s[0].status).toBe("OK");
  });

  it("K03 vorhanden mit OK, K04/K05 fehlen → nur K04/K05 werden ergänzt", () => {
    const input: ActiveCheckpoint[] = [makeK11(["Reha-Antrag"]), makeK03("OK")];
    const result = ensureSelectionConditionalCheckpoints(input);
    const ids = result.map((cp) => cp.id);
    expect(ids.filter((id) => id === "K03")).toHaveLength(1);
    expect(ids).toContain("K04");
    expect(ids).toContain("K05");
  });

  it("K03, K04, K05, K06, K07, K14, K15 alle vorhanden \u2192 Funktion gibt exakt dieselbe Liste zur\u00fcck", () => {
    const k05 = { ...CHECKPOINT_CATALOGUE["K05"]!, status: "TO_DO" } as ActiveCheckpoint;
    const input: ActiveCheckpoint[] = [
      makeK11(["Reha-Antrag"]),
      makeK03("OK"),
      makeK04("TO_DO"),
      k05,
      makeK06("TO_DO"),
      makeK07("TO_DO"),
      makeK14("TO_DO"),
      makeK15("TO_DO"),
    ];
    const result = ensureSelectionConditionalCheckpoints(input);
    expect(result).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// 4. Zusammenspiel mit ensureAlwaysPresentCheckpoints und Hydration
// ---------------------------------------------------------------------------

describe("ensureSelectionConditionalCheckpoints: Zusammenspiel", () => {
  it("ensureAlwaysPresent → ensureSelectionConditional: K11 erhält erst im zweiten Schritt Selektionen", () => {
    // Szenario: K11 ist always-present mit leeren Selektionen → kein Trigger
    const afterAlwaysPresent = ensureAlwaysPresentCheckpoints([]);
    const result = ensureSelectionConditionalCheckpoints(afterAlwaysPresent);
    const ids = result.map((cp) => cp.id);
    expect(ids).not.toContain("K03");
  });

  it("M1 ohne medizinische_lage + K11='Reha-Antrag' → K03/K04/K05 trotzdem ergänzt", () => {
    // M1: nur kommunikation = unklar, medizinische_lage = klar
    const snapshot: M1SnapshotInitial = {
      blocks: {
        kommunikation: "unklar",
        medizinische_lage: "klar",
        versorgung_im_alltag: "klar",
        pflegebeobachtung: null,
      },
      activated_checkpoint_ids: ["K01", "K08", "K09"],
    };
    const hydrated = hydrateActiveCheckpointsFromSnapshot(snapshot);
    // K11 ist always-present nach Hydration, aber mit leeren Selektionen
    const k11 = hydrated.find((cp) => cp.id === "K11")!;
    expect(isMultiSelectCheckpoint(k11)).toBe(true);

    // Simuliere: K11 bekommt "Reha-Antrag" (wie wenn Arzt in M3 auswählt)
    const withReha = hydrated.map((cp) =>
      cp.id === "K11" && isMultiSelectCheckpoint(cp)
        ? { ...cp, selections: ["Reha-Antrag"] }
        : cp,
    );

    const result = ensureSelectionConditionalCheckpoints(withReha);
    const ids = result.map((cp) => cp.id);
    expect(ids).toContain("K03");
    expect(ids).toContain("K04");
    expect(ids).toContain("K05");
    expect(ids).toContain("K06");
    expect(ids).toContain("K07");
    // K01/K09 waren schon via M1 drin — keine Duplikate
    expect(ids.filter((id) => id === "K01")).toHaveLength(1);
  });

  it("Hydration mit medizinische_lage=unklar + K11='Reha-Antrag' → K03 einmal vorhanden", () => {
    const snapshot: M1SnapshotInitial = {
      blocks: {
        kommunikation: "klar",
        medizinische_lage: "unklar",
        versorgung_im_alltag: "klar",
        pflegebeobachtung: null,
      },
      activated_checkpoint_ids: ["K03", "K04", "K05"],
    };
    const hydrated = hydrateActiveCheckpointsFromSnapshot(snapshot);
    // K11 mit "Reha-Antrag" setzen
    const withReha = hydrated.map((cp) =>
      cp.id === "K11" && isMultiSelectCheckpoint(cp)
        ? { ...cp, selections: ["Reha-Antrag"] }
        : cp,
    );
    const result = ensureSelectionConditionalCheckpoints(withReha);
    // Duplikat-Schutz: K03/K04/K05 je exakt einmal vorhanden (via M1)
    expect(result.filter((cp) => cp.id === "K03")).toHaveLength(1);
    expect(result.filter((cp) => cp.id === "K04")).toHaveLength(1);
    expect(result.filter((cp) => cp.id === "K05")).toHaveLength(1);
    // K06/K07 nicht via M1 → werden durch ensureSelectionConditional ergänzt
    expect(result.filter((cp) => cp.id === "K06")).toHaveLength(1);
    expect(result.filter((cp) => cp.id === "K07")).toHaveLength(1);
  });
});
