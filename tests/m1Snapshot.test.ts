import {
  buildM1SnapshotInitial,
  deriveActiveCheckpointIdsFromM1,
} from "@/lib/logic/m1Activation";
import {
  CHECKPOINT_CATALOGUE,
  hydrateActiveCheckpointsFromSnapshot,
} from "@/lib/logic/checkpointCatalog";
import type { M1Selection, M1SnapshotInitial } from "@/lib/types";

const ALL_UNKLAR: M1Selection = {
  kommunikation: "unklar",
  medizinische_lage: "unklar",
  versorgung_im_alltag: "unklar",
};

const ALL_KLAR: M1Selection = {
  kommunikation: "klar",
  medizinische_lage: "klar",
  versorgung_im_alltag: "klar",
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

  it("enthält alle 9 IDs wenn alle Blöcke unklar sind", () => {
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
  });

  it("enthält nur kommunikation-Checkpoints wenn nur kommunikation unklar", () => {
    const sel: M1Selection = {
      kommunikation: "unklar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
    };
    const snapshot = buildM1SnapshotInitial(sel);
    expect(snapshot.activated_checkpoint_ids).toEqual(["K01", "K08", "K09"]);
  });
});

describe("CHECKPOINT_CATALOGUE", () => {
  it("enthält genau 9 Einträge (K01–K09)", () => {
    expect(Object.keys(CHECKPOINT_CATALOGUE)).toHaveLength(9);
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
  it("gibt leere Liste zurück bei leerem Snapshot", () => {
    const snapshot: M1SnapshotInitial = {
      blocks: ALL_KLAR,
      activated_checkpoint_ids: [],
    };
    expect(hydrateActiveCheckpointsFromSnapshot(snapshot)).toEqual([]);
  });

  it("gibt vollständige ActiveCheckpoint-Objekte zurück", () => {
    const snapshot = buildM1SnapshotInitial({
      kommunikation: "unklar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
    });
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    expect(checkpoints).toHaveLength(3);
    expect(checkpoints.map((c) => c.id)).toEqual(["K01", "K08", "K09"]);
  });

  it("setzt initial status TO_DO für alle Checkpoints", () => {
    const snapshot = buildM1SnapshotInitial(ALL_UNKLAR);
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    for (const cp of checkpoints) {
      expect(cp.status).toBe("TO_DO");
    }
  });

  it("hydratisiert alle 9 Checkpoints wenn alle Blöcke unklar", () => {
    const snapshot = buildM1SnapshotInitial(ALL_UNKLAR);
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    expect(checkpoints).toHaveLength(9);
  });

  it("überspringt unbekannte IDs defensiv", () => {
    const snapshot: M1SnapshotInitial = {
      blocks: ALL_KLAR,
      activated_checkpoint_ids: ["K01", "UNKNOWN_99"],
    };
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0].id).toBe("K01");
  });

  it("Hydration aus Snapshot ist deterministisch – unabhängig vom aktuellen Mapping", () => {
    // Simuliert: Snapshot wurde eingefroren, spätere Mapping-Änderungen dürfen
    // den laufenden Fall nicht beeinflussen.
    const frozenSnapshot: M1SnapshotInitial = {
      blocks: {
        kommunikation: "unklar",
        medizinische_lage: "klar",
        versorgung_im_alltag: "klar",
      },
      activated_checkpoint_ids: ["K01", "K08"], // eingefrorene IDs
    };
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(frozenSnapshot);
    expect(checkpoints.map((c) => c.id)).toEqual(["K01", "K08"]);
  });
});
