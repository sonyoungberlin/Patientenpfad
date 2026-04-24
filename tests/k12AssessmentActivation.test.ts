/**
 * K12 ASSESSMENT Aktivierungslogik
 *
 * Prüft das neue Verhalten von K12 als ASSESSMENT-Checkpoint:
 * - K12 ist immer-present (always-present) mit enabled=false als Default
 * - K12 wird per Checkbox in M1 zugeschaltet
 * - Wenn nicht aktiviert: erscheint nicht in M2/M3/M5
 * - Wenn aktiviert: erscheint in M2/M3/M5
 * - K12 erzeugt weiterhin kein M4
 * - DECISION- und MULTI_SELECT-Logik bleiben unverändert
 */

import {
  CHECKPOINT_CATALOGUE,
  ALWAYS_PRESENT_ASSESSMENT_IDS,
  hydrateActiveCheckpointsFromSnapshot,
  ensureAlwaysPresentCheckpoints,
} from "@/lib/logic/checkpointCatalog";
import { buildM1SnapshotInitial } from "@/lib/logic/m1Activation";
import {
  deriveM5OutputCondensed,
} from "@/lib/logic/deriveM5Output";
import {
  CheckpointMode,
  isAssessmentCheckpoint,
  isMultiSelectCheckpoint,
  isStandardCheckpoint,
  type ActiveCheckpoint,
  type M1Selection,
} from "@/lib/types";

function makeK12(enabledValue: boolean): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE["K12"]!;
  return { ...template, status: "TO_DO", enabled: enabledValue } as ActiveCheckpoint;
}

function makeK01(): ActiveCheckpoint {
  const template = CHECKPOINT_CATALOGUE["K01"]!;
  return { ...template, status: "TO_DO" } as ActiveCheckpoint;
}

// ---------------------------------------------------------------------------
// K12 Katalog-Definition
// ---------------------------------------------------------------------------

describe("K12 im CHECKPOINT_CATALOGUE", () => {
  const k12 = CHECKPOINT_CATALOGUE["K12"];

  it("K12 ist im Katalog vorhanden", () => {
    expect(k12).toBeDefined();
  });

  it("K12 hat mode: ASSESSMENT", () => {
    expect(k12?.mode).toBe(CheckpointMode.ASSESSMENT);
  });

  it("K12 hat block_id 'pflegebeobachtung'", () => {
    expect(k12?.block_id).toBe("pflegebeobachtung");
  });

  it("K12 erzeugt kein M4 (m4.text ist leer)", () => {
    expect(k12?.m4.text).toBe("");
  });
});

// ---------------------------------------------------------------------------
// ALWAYS_PRESENT_ASSESSMENT_IDS
// ---------------------------------------------------------------------------

describe("ALWAYS_PRESENT_ASSESSMENT_IDS", () => {
  it("enthält K12", () => {
    expect(ALWAYS_PRESENT_ASSESSMENT_IDS).toContain("K12");
  });
});

// ---------------------------------------------------------------------------
// isAssessmentCheckpoint Type Guard
// ---------------------------------------------------------------------------

describe("isAssessmentCheckpoint", () => {
  it("erkennt K12 (ASSESSMENT-Checkpoint) korrekt", () => {
    const k12Hydrated = hydrateActiveCheckpointsFromSnapshot({
      blocks: { kommunikation: "klar", medizinische_lage: "klar", versorgung_im_alltag: "klar", pflegebeobachtung: "klar" },
      activated_checkpoint_ids: [],
    }).find((cp) => cp.id === "K12");
    expect(k12Hydrated).toBeDefined();
    expect(isAssessmentCheckpoint(k12Hydrated!)).toBe(true);
  });

  it("erkennt normale DECISION-Checkpoints als NICHT-ASSESSMENT", () => {
    const k01Hydrated = hydrateActiveCheckpointsFromSnapshot({
      blocks: { kommunikation: "unklar", medizinische_lage: "klar", versorgung_im_alltag: "klar", pflegebeobachtung: "klar" },
      activated_checkpoint_ids: ["K01"],
    }).find((cp) => cp.id === "K01");
    expect(k01Hydrated).toBeDefined();
    expect(isAssessmentCheckpoint(k01Hydrated!)).toBe(false);
  });

  it("erkennt MULTI_SELECT-Checkpoints als NICHT-ASSESSMENT", () => {
    const checkpoints = hydrateActiveCheckpointsFromSnapshot({
      blocks: { kommunikation: "klar", medizinische_lage: "klar", versorgung_im_alltag: "klar", pflegebeobachtung: "klar" },
      activated_checkpoint_ids: [],
    });
    const k10 = checkpoints.find((cp) => cp.id === "K10");
    expect(k10).toBeDefined();
    expect(isAssessmentCheckpoint(k10!)).toBe(false);
    expect(isMultiSelectCheckpoint(k10!)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// K12 ist standardmäßig nicht aktiviert
// ---------------------------------------------------------------------------

describe("K12 Default-Zustand: nicht aktiviert (enabled: false)", () => {
  it("K12 ist always-present mit enabled=false nach leerer Hydration", () => {
    const checkpoints = hydrateActiveCheckpointsFromSnapshot({
      blocks: { kommunikation: "klar", medizinische_lage: "klar", versorgung_im_alltag: "klar", pflegebeobachtung: "klar" },
      activated_checkpoint_ids: [],
    });
    const k12 = checkpoints.find((cp) => cp.id === "K12");
    expect(k12).toBeDefined();
    expect(k12?.enabled).toBe(false);
  });

  it("K12 ist always-present mit enabled=false wenn andere Blöcke unklar", () => {
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(
      buildM1SnapshotInitial({
        kommunikation: "unklar",
        medizinische_lage: "klar",
        versorgung_im_alltag: "klar",
        pflegebeobachtung: "klar",
      }),
    );
    const k12 = checkpoints.find((cp) => cp.id === "K12");
    expect(k12).toBeDefined();
    expect(k12?.enabled).toBe(false);
  });

  it("K12 ist NICHT in activated_checkpoint_ids (pflegebeobachtung unklar)", () => {
    const sel: M1Selection = {
      kommunikation: "klar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "unklar",
    };
    const snapshot = buildM1SnapshotInitial(sel);
    expect(snapshot.activated_checkpoint_ids).not.toContain("K12");
  });

  it("K12 bleibt always-present auch wenn alle DECISION-Blöcke klar", () => {
    const checkpoints = hydrateActiveCheckpointsFromSnapshot({
      blocks: { kommunikation: "klar", medizinische_lage: "klar", versorgung_im_alltag: "klar", pflegebeobachtung: "klar" },
      activated_checkpoint_ids: [],
    });
    expect(checkpoints.some((cp) => cp.id === "K12")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ensureAlwaysPresentCheckpoints für ASSESSMENT
// ---------------------------------------------------------------------------

describe("ensureAlwaysPresentCheckpoints: K12 wird hinzugefügt wenn fehlend", () => {
  it("fügt K12 mit enabled=false hinzu wenn noch nicht vorhanden", () => {
    const result = ensureAlwaysPresentCheckpoints([]);
    const k12 = result.find((cp) => cp.id === "K12");
    expect(k12).toBeDefined();
    expect(k12?.enabled).toBe(false);
    expect(isStandardCheckpoint(k12!)).toBe(true);
  });

  it("fügt K12 nicht doppelt ein wenn bereits vorhanden", () => {
    const existing = hydrateActiveCheckpointsFromSnapshot({
      blocks: { kommunikation: "klar", medizinische_lage: "klar", versorgung_im_alltag: "klar", pflegebeobachtung: "klar" },
      activated_checkpoint_ids: [],
    });
    const result = ensureAlwaysPresentCheckpoints(existing);
    expect(result.filter((cp) => cp.id === "K12")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// M5-Sichtbarkeit: K12 nur wenn enabled === true
// ---------------------------------------------------------------------------

describe("K12 M5-Sichtbarkeit", () => {
  it("K12 mit enabled=false → leerer M5-Text", () => {
    const k12Disabled = makeK12(false);
    const result = deriveM5OutputCondensed([k12Disabled]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("");
  });

  it("K12 mit enabled=true → M5-Text vorhanden", () => {
    const k12Enabled = makeK12(true);
    const result = deriveM5OutputCondensed([k12Enabled]);
    expect(result).toHaveLength(1);
    expect(result[0].text.length).toBeGreaterThan(0);
    expect(result[0].checkpoint_id).toBe("K12");
  });

  it("K12 mit enabled=false und anderen Checkpoints → nur K12 hat leeren Text", () => {
    const k12Disabled = makeK12(false);
    const k01 = makeK01();
    const result = deriveM5OutputCondensed([k01, k12Disabled]);
    const k12Entry = result.find((e) => e.checkpoint_id === "K12");
    expect(k12Entry?.text).toBe("");
    const k01Entry = result.find((e) => e.checkpoint_id === "K01");
    expect(k01Entry?.text.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// K12 erzeugt kein M4
// ---------------------------------------------------------------------------

describe("K12 erzeugt kein M4", () => {
  it("K12 hat leeren m4.text – wird vom M4-Filter ausgeschlossen", () => {
    const k12 = CHECKPOINT_CATALOGUE["K12"];
    expect(k12?.m4.text).toBe("");
  });
});

// ---------------------------------------------------------------------------
// DECISION- und MULTI_SELECT-Logik unverändert
// ---------------------------------------------------------------------------

describe("DECISION-Block-Logik bleibt unverändert durch K12-Änderung", () => {
  it("kommunikation aktiviert weiterhin K01, K08, K09", () => {
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(
      buildM1SnapshotInitial({
        kommunikation: "unklar",
        medizinische_lage: "klar",
        versorgung_im_alltag: "klar",
        pflegebeobachtung: "klar",
      }),
    );
    const ids = checkpoints.map((cp) => cp.id);
    expect(ids).toContain("K01");
    expect(ids).toContain("K08");
    expect(ids).toContain("K09");
  });

  it("K10/K11 MULTI_SELECT sind weiterhin always-present", () => {
    const checkpoints = hydrateActiveCheckpointsFromSnapshot({
      blocks: { kommunikation: "klar", medizinische_lage: "klar", versorgung_im_alltag: "klar", pflegebeobachtung: "klar" },
      activated_checkpoint_ids: [],
    });
    expect(checkpoints.some((cp) => cp.id === "K10")).toBe(true);
    expect(checkpoints.some((cp) => cp.id === "K11")).toBe(true);
    expect(isMultiSelectCheckpoint(checkpoints.find((cp) => cp.id === "K10")!)).toBe(true);
    expect(isMultiSelectCheckpoint(checkpoints.find((cp) => cp.id === "K11")!)).toBe(true);
  });
});
