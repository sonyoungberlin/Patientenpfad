/**
 * filterUnjustifiedConditionalCheckpoints
 *
 * Prüft, dass K18 nur erhalten bleibt, wenn K11 einen gültigen Trigger enthält.
 * Schützt vor Alt-DB-Daten: alte K18-Einträge ohne Trigger werden entfernt.
 *
 * Testgruppen:
 *   1. K18 ohne K11-Trigger → entfernt
 *   2. K18 mit gültigem Trigger → erhalten (Status unverändert)
 *   3. Reha/Pflege-Trigger → K18 wird NICHT legitimiert
 *   4. Kein K18 vorhanden → kein Eingriff
 *   5. Mehrere Checkpoints – K18 selektiv entfernt
 */

import {
  CHECKPOINT_CATALOGUE,
  MULTI_SELECT_CATALOGUE,
  filterUnjustifiedConditionalCheckpoints,
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

function makeStandard(id: string): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE[id] ?? CHECKPOINT_CATALOGUE["K01"]!;
  return { ...template, id, status: "TO_DO" } as ActiveCheckpoint;
}

// ---------------------------------------------------------------------------
// 1. K18 ohne passenden Trigger → entfernt
// ---------------------------------------------------------------------------

describe("filterUnjustifiedConditionalCheckpoints: K18 ohne Trigger → entfernt", () => {
  it("K18 ohne K11 → entfernt", () => {
    const result = filterUnjustifiedConditionalCheckpoints([makeK18()]);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
  });

  it("K18 + K11 mit leeren Selektionen → entfernt", () => {
    const result = filterUnjustifiedConditionalCheckpoints([makeK11([]), makeK18()]);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
  });

  it("K18 + K11 mit Reha-Selektion → entfernt (Reha legitimiert K18 nicht)", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Reha-Antrag"]),
      makeK18(),
    ]);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
  });

  it("K18 + K11 mit Pflege-Selektion → entfernt (Pflege legitimiert K18 nicht)", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Pflegegrad / Höherstufung"]),
      makeK18(),
    ]);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
  });

  it("K18 + K11 mit unbekannter Selektion → entfernt", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Unbekanntes Anliegen"]),
      makeK18("OK"),
    ]);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
  });

  it("Alt-K18 mit block_id 'pflegebeobachtung' + kein Trigger → entfernt", () => {
    const altK18: ActiveCheckpoint = {
      ...CHECKPOINT_CATALOGUE["K18"]!,
      block_id: "pflegebeobachtung",
      status: "TO_DO",
    } as ActiveCheckpoint;
    const result = filterUnjustifiedConditionalCheckpoints([makeK11([]), altK18]);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
  });
});

// ---------------------------------------------------------------------------
// 2. K18 mit gültigem Trigger → erhalten (Status unverändert)
// ---------------------------------------------------------------------------

describe("filterUnjustifiedConditionalCheckpoints: K18 mit gültigem Trigger → erhalten", () => {
  it("K11 = 'Attest / Bescheinigung' → K18 mit TO_DO bleibt", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Attest / Bescheinigung"]),
      makeK18("TO_DO"),
    ]);
    expect(result.map((cp) => cp.id)).toContain("K18");
  });

  it("K11 = 'Attest / Bescheinigung' → K18 mit OK-Status bleibt unverändert", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Attest / Bescheinigung"]),
      makeK18("OK"),
    ]);
    const k18 = result.find((cp) => cp.id === "K18")!;
    expect(k18).toBeDefined();
    expect(isStandardCheckpoint(k18) && k18.status).toBe("OK");
  });

  it("K11 = 'Versicherung / Gutachten' → K18 bleibt", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Versicherung / Gutachten"]),
      makeK18(),
    ]);
    expect(result.map((cp) => cp.id)).toContain("K18");
  });

  it("K11 = 'Jobcenter / Sozialleistungen' → K18 bleibt", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Jobcenter / Sozialleistungen"]),
      makeK18(),
    ]);
    expect(result.map((cp) => cp.id)).toContain("K18");
  });

  it("K11 = 'Sonstiger Antrag / Formular' → K18 bleibt", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Sonstiger Antrag / Formular"]),
      makeK18(),
    ]);
    expect(result.map((cp) => cp.id)).toContain("K18");
  });

  it("K11 = Reha + Attest → K18 bleibt (Attest reicht)", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Reha-Antrag", "Attest / Bescheinigung"]),
      makeK18(),
    ]);
    expect(result.map((cp) => cp.id)).toContain("K18");
  });
});

// ---------------------------------------------------------------------------
// 3. Reha/Pflege-Trigger ohne K18-Trigger → K18 wird entfernt
// ---------------------------------------------------------------------------

describe("filterUnjustifiedConditionalCheckpoints: Reha/Pflege ohne K18-Trigger", () => {
  it("Reha-Antrag allein: K18 nicht legitimiert", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Reha-Antrag"]),
      makeK18(),
    ]);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
  });

  it("Pflegegrad allein: K18 nicht legitimiert", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Pflegegrad / Höherstufung"]),
      makeK18(),
    ]);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
  });

  it("Reha + Pflege: K18 nicht legitimiert", () => {
    const result = filterUnjustifiedConditionalCheckpoints([
      makeK11(["Reha-Antrag", "Pflegegrad / Höherstufung"]),
      makeK18(),
    ]);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
  });
});

// ---------------------------------------------------------------------------
// 4. Kein K18 → kein Eingriff (identisches Array)
// ---------------------------------------------------------------------------

describe("filterUnjustifiedConditionalCheckpoints: kein K18 → kein Eingriff", () => {
  it("leere Liste → bleibt leer", () => {
    const input: ActiveCheckpoint[] = [];
    expect(filterUnjustifiedConditionalCheckpoints(input)).toBe(input);
  });

  it("Liste ohne K18 → dasselbe Array-Objekt", () => {
    const input: ActiveCheckpoint[] = [makeK11([]), makeStandard("K01")];
    expect(filterUnjustifiedConditionalCheckpoints(input)).toBe(input);
  });

  it("Reha-Fall ohne K18: K14/K15 unberührt", () => {
    const input: ActiveCheckpoint[] = [
      makeK11(["Reha-Antrag"]),
      makeStandard("K14"),
      makeStandard("K15"),
    ];
    const result = filterUnjustifiedConditionalCheckpoints(input);
    expect(result).toBe(input);
    expect(result.map((cp) => cp.id)).toContain("K14");
    expect(result.map((cp) => cp.id)).toContain("K15");
  });
});

// ---------------------------------------------------------------------------
// 5. Selektives Entfernen: K18 weg, andere Checkpoints bleiben
// ---------------------------------------------------------------------------

describe("filterUnjustifiedConditionalCheckpoints: selektives Entfernen", () => {
  it("K18 entfernt, K03/K11 bleiben erhalten", () => {
    const input: ActiveCheckpoint[] = [
      makeK11([]),
      makeStandard("K03"),
      makeK18(),
    ];
    const result = filterUnjustifiedConditionalCheckpoints(input);
    expect(result.map((cp) => cp.id)).not.toContain("K18");
    expect(result.map((cp) => cp.id)).toContain("K03");
    expect(result.map((cp) => cp.id)).toContain("K11");
  });

  it("Gesamtlänge nach Entfernung korrekt (−1)", () => {
    const input: ActiveCheckpoint[] = [
      makeK11([]),
      makeStandard("K03"),
      makeK18(),
      makeStandard("K04"),
    ];
    const result = filterUnjustifiedConditionalCheckpoints(input);
    expect(result).toHaveLength(3);
  });
});
