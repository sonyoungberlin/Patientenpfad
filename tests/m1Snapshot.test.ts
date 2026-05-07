import {
  buildM1SnapshotInitial,
  deriveActiveCheckpointIdsFromM1,
} from "@/lib/logic/m1Activation";
import {
  CHECKPOINT_CATALOGUE,
  hydrateActiveCheckpointsFromSnapshot,
} from "@/lib/logic/checkpointCatalog";
import { isStandardCheckpoint } from "@/lib/types";
import type { M1Selection, M1SnapshotInitial } from "@/lib/types";

const ALL_UNKLAR: M1Selection = {
  kommunikation: "unklar",
  medizinische_lage: "unklar",
  versorgung_im_alltag: "unklar",
  pflegebeobachtung: "unklar",
};

const ALL_KLAR: M1Selection = {
  kommunikation: "klar",
  medizinische_lage: "klar",
  versorgung_im_alltag: "klar",
  pflegebeobachtung: "klar",
};

describe("buildM1SnapshotInitial", () => {
  it("speichert die blocks-Auswahl unverändert im Snapshot", () => {
    const snapshot = buildM1SnapshotInitial(ALL_UNKLAR);
    expect(snapshot.blocks).toEqual(ALL_UNKLAR);
  });

  it("leitet activated_checkpoint_ids deterministisch ab", () => {
    const snapshot = buildM1SnapshotInitial(ALL_UNKLAR);
    expect(snapshot.activated_checkpoint_ids).toEqual(
      deriveActiveCheckpointIdsFromM1(ALL_UNKLAR),
    );
  });

  it("enthält leere activated_checkpoint_ids wenn alle Blöcke klar sind", () => {
    const snapshot = buildM1SnapshotInitial(ALL_KLAR);
    expect(snapshot.activated_checkpoint_ids).toEqual([]);
  });

  it("enthält 9 block-aktivierte IDs wenn alle Blöcke unklar sind (K10/K11 always-present, K12 ASSESSMENT)", () => {
    const snapshot = buildM1SnapshotInitial(ALL_UNKLAR);
    expect(snapshot.activated_checkpoint_ids).toHaveLength(9);
    expect(snapshot.activated_checkpoint_ids).toContain("K01");
    expect(snapshot.activated_checkpoint_ids).toContain("K08");
    expect(snapshot.activated_checkpoint_ids).toContain("K09");
    expect(snapshot.activated_checkpoint_ids).toContain("K03");
    expect(snapshot.activated_checkpoint_ids).toContain("K04");
    expect(snapshot.activated_checkpoint_ids).toContain("K05");
    expect(snapshot.activated_checkpoint_ids).toContain("K02");
    expect(snapshot.activated_checkpoint_ids).toContain("K06");
    expect(snapshot.activated_checkpoint_ids).toContain("K07");
    // K12 is ASSESSMENT – never in activated_checkpoint_ids
    expect(snapshot.activated_checkpoint_ids).not.toContain("K12");
  });

  it("enthält nur kommunikation-Checkpoints wenn nur kommunikation unklar", () => {
    const sel: M1Selection = {
      kommunikation: "unklar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "klar",
    };
    const snapshot = buildM1SnapshotInitial(sel);
    expect(snapshot.activated_checkpoint_ids).toEqual(["K01", "K08", "K09"]);
  });
});

describe("CHECKPOINT_CATALOGUE", () => {
  it("enthält genau 11 Einträge (K01–K09, K12, K13)", () => {
    expect(Object.keys(CHECKPOINT_CATALOGUE)).toHaveLength(11);
  });

  it("jeder Eintrag hat eine id, block_id und m4", () => {
    for (const [key, entry] of Object.entries(CHECKPOINT_CATALOGUE)) {
      expect(entry.id).toBe(key);
      expect(entry.block_id).toBeTruthy();
      expect(entry.m4).toBeDefined();
    }
  });
});

describe("hydrateActiveCheckpointsFromSnapshot", () => {
  it("gibt bei leerem Snapshot always-present Checkpoints zurück (K10, K11 MULTI_SELECT + K12, K13 ASSESSMENT)", () => {
    const snapshot: M1SnapshotInitial = {
      blocks: ALL_KLAR,
      activated_checkpoint_ids: [],
    };
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    expect(checkpoints).toHaveLength(4);
    expect(checkpoints.map((c) => c.id)).toEqual(["K10", "K11", "K12", "K13"]);
  });

  it("gibt vollständige ActiveCheckpoint-Objekte zurück (inkl. always-present K10, K11, K12, K13)", () => {
    const snapshot = buildM1SnapshotInitial({
      kommunikation: "unklar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "klar",
    });
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    expect(checkpoints).toHaveLength(7);
    expect(checkpoints.map((c) => c.id)).toEqual(["K01", "K08", "K09", "K10", "K11", "K12", "K13"]);
  });

  it("setzt initial status TO_DO für alle Checkpoints", () => {
    const snapshot = buildM1SnapshotInitial(ALL_UNKLAR);
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    for (const cp of checkpoints) {
      if (isStandardCheckpoint(cp)) {
        expect(cp.status).toBe("TO_DO");
      }
    }
  });

  it("hydratisiert alle 13 Checkpoints wenn alle DECISION-Blöcke unklar sind (+ always-present K10, K11, K12, K13)", () => {
    const snapshot = buildM1SnapshotInitial(ALL_UNKLAR);
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    // 9 block-activated (K01–K09) + 4 always-present (K10, K11, K12, K13)
    expect(checkpoints).toHaveLength(13);
  });

  it("überspringt unbekannte IDs defensiv (K10, K11, K12, K13 still always-present)", () => {
    const snapshot: M1SnapshotInitial = {
      blocks: ALL_KLAR,
      activated_checkpoint_ids: ["K01", "UNKNOWN_99"],
    };
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    expect(checkpoints).toHaveLength(5);
    expect(checkpoints[0].id).toBe("K01");
    expect(checkpoints[1].id).toBe("K10");
    expect(checkpoints[2].id).toBe("K11");
    expect(checkpoints[3].id).toBe("K12");
    expect(checkpoints[4].id).toBe("K13");
  });

  it("Hydration aus Snapshot ist deterministisch – unabhängig vom aktuellen Mapping (K12, K13 always-present)", () => {
    // Simuliert: Snapshot wurde eingefroren, spätere Mapping-Änderungen dürfen
    // den laufenden Fall nicht beeinflussen.
    const frozenSnapshot: M1SnapshotInitial = {
      blocks: {
        kommunikation: "unklar",
        medizinische_lage: "klar",
        versorgung_im_alltag: "klar",
        pflegebeobachtung: "klar",
      },
      activated_checkpoint_ids: ["K01", "K08"], // eingefrorene IDs
    };
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(frozenSnapshot);
    expect(checkpoints.map((c) => c.id)).toEqual(["K01", "K08", "K10", "K11", "K12", "K13"]);
  });
});
