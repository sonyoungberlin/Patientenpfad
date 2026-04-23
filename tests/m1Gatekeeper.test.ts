import { isGatekeeperCase, buildM1SnapshotInitial } from "@/lib/logic/m1Activation";
import { hydrateActiveCheckpointsFromSnapshot } from "@/lib/logic/checkpointCatalog";
import { isStandardCheckpoint } from "@/lib/types";
import type { M1Selection } from "@/lib/types";

describe("isGatekeeperCase", () => {
  it("gibt true zurück wenn alle Blöcke klar sind", () => {
    const sel: M1Selection = {
      kommunikation: "klar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "klar",
    };
    expect(isGatekeeperCase(sel)).toBe(true);
  });

  it("gibt false zurück wenn mindestens ein Block unklar ist", () => {
    const sel: M1Selection = {
      kommunikation: "unklar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "klar",
    };
    expect(isGatekeeperCase(sel)).toBe(false);
  });

  it("gibt false zurück wenn alle Blöcke unklar sind", () => {
    const sel: M1Selection = {
      kommunikation: "unklar",
      medizinische_lage: "unklar",
      versorgung_im_alltag: "unklar",
      pflegebeobachtung: "unklar",
    };
    expect(isGatekeeperCase(sel)).toBe(false);
  });

  it("gibt false zurück wenn nur medizinische_lage unklar ist", () => {
    const sel: M1Selection = {
      kommunikation: "klar",
      medizinische_lage: "unklar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "klar",
    };
    expect(isGatekeeperCase(sel)).toBe(false);
  });
});

describe("M1-Flow: medizinische_lage unklar → Snapshot + aktive Checkpoints", () => {
  const sel: M1Selection = {
    kommunikation: "klar",
    medizinische_lage: "unklar",
    versorgung_im_alltag: "klar",
    pflegebeobachtung: "klar",
  };

  it("erstellt einen Snapshot mit K03, K04, K05 (K10 ist blockunabhängig)", () => {
    const snapshot = buildM1SnapshotInitial(sel);
    expect(snapshot.activated_checkpoint_ids).toEqual(["K03", "K04", "K05"]);
  });

  it("hydratisiert 5 vollständige ActiveCheckpoints aus dem Snapshot (K10, K11 always-present)", () => {
    const snapshot = buildM1SnapshotInitial(sel);
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    expect(checkpoints).toHaveLength(5);
    expect(checkpoints.map((c) => c.id)).toEqual(["K03", "K04", "K05", "K10", "K11"]);
  });

  it("alle Checkpoints haben status TO_DO", () => {
    const snapshot = buildM1SnapshotInitial(sel);
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    for (const cp of checkpoints) {
      if (isStandardCheckpoint(cp)) {
        expect(cp.status).toBe("TO_DO");
      }
    }
  });

  it("kein Legacy-Checkpoint im Ergebnis", () => {
    const snapshot = buildM1SnapshotInitial(sel);
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    const hasLegacy = checkpoints.some(
      (c) => c.id === "dokumentenlage_arztbrief_vorhanden",
    );
    expect(hasLegacy).toBe(false);
  });
});

describe("Gatekeeper-Fall: klar/klar/klar → kein Snapshot, keine Checkpoints", () => {
  const sel: M1Selection = {
    kommunikation: "klar",
    medizinische_lage: "klar",
    versorgung_im_alltag: "klar",
    pflegebeobachtung: "klar",
  };

  it("isGatekeeperCase erkennt den Fall", () => {
    expect(isGatekeeperCase(sel)).toBe(true);
  });

  it("Snapshot hätte keine activated_checkpoint_ids", () => {
    // Defensiv: falls doch ein Snapshot gebaut würde (was die Route verhindert),
    // wäre die Liste leer – kein stilles Durchrutschen.
    const snapshot = buildM1SnapshotInitial(sel);
    expect(snapshot.activated_checkpoint_ids).toEqual([]);
  });

  it("Hydration eines leeren Snapshots ergibt nur always-present Checkpoints (K10, K11)", () => {
    const snapshot = buildM1SnapshotInitial(sel);
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    expect(checkpoints).toHaveLength(2);
    expect(checkpoints[0].id).toBe("K10");
    expect(checkpoints[1].id).toBe("K11");
  });
});

describe("UI-Payload: m1Selection wird korrekt übermittelt", () => {
  it("Initialauswahl ist explizit (alle unklar)", () => {
    // Spiegelt den INITIAL_SELECTION in page.tsx
    const initial: M1Selection = {
      kommunikation: "unklar",
      medizinische_lage: "unklar",
      versorgung_im_alltag: "unklar",
      pflegebeobachtung: "unklar",
    };
    expect(isGatekeeperCase(initial)).toBe(false);
    const snapshot = buildM1SnapshotInitial(initial);
    expect(snapshot.activated_checkpoint_ids).toHaveLength(16);
  });

  it("Payload mit m1Selection hat keinen Legacy-Pfad", () => {
    // Prüft, dass der Snapshot bei vorhandenem m1Selection niemals
    // den Legacy-Checkpoint enthält.
    const anySelection: M1Selection = {
      kommunikation: "unklar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "klar",
    };
    const snapshot = buildM1SnapshotInitial(anySelection);
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    expect(
      checkpoints.some((c) => c.id === "dokumentenlage_arztbrief_vorhanden"),
    ).toBe(false);
  });
});
