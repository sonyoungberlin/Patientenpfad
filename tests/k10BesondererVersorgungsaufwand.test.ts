import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointType,
  isMultiSelectCheckpoint,
  isStandardCheckpoint,
  type ActiveCheckpoint,
  type ActiveCheckpointMultiSelect,
} from "@/lib/types";
import { MULTI_SELECT_CATALOGUE, hydrateActiveCheckpointsFromSnapshot } from "@/lib/logic/checkpointCatalog";
import { buildM1SnapshotInitial } from "@/lib/logic/m1Activation";
import { deriveM4Output } from "@/lib/logic/deriveM4Output";
import { deriveM5Output } from "@/lib/logic/deriveM5Output";
import { deriveBlockStatus } from "@/lib/logic/deriveBlockStatus";
import { BlockStatus } from "@/lib/types";
import { M2_QUESTIONS } from "@/lib/logic/m2Questions";
import type { M1Selection } from "@/lib/types";

// ---------------------------------------------------------------------------
// K10 Katalog-Prüfung
// ---------------------------------------------------------------------------

describe("K10 – MULTI_SELECT_CATALOGUE", () => {
  const k10 = MULTI_SELECT_CATALOGUE.K10;

  it("existiert im MULTI_SELECT_CATALOGUE", () => {
    expect(k10).toBeDefined();
  });

  it("gehört zum Block medizinische_lage", () => {
    expect(k10.block_id).toBe("medizinische_lage");
  });

  it("hat keine Vorbereitungsperspektiven", () => {
    expect(k10.perspectives).toEqual([]);
  });

  it("hat mode MULTI_SELECT", () => {
    expect(k10.mode).toBe(CheckpointMode.MULTI_SELECT);
  });

  it("Titel ist Besonderer Versorgungsaufwand", () => {
    expect(k10.title).toBe("Besonderer Versorgungsaufwand");
  });

  it("enthält genau 7 Auswahloptionen", () => {
    expect(k10.options).toHaveLength(7);
    expect(k10.options).toEqual([
      "Neupatient / unbekannt",
      "Multimedikation",
      "postoperative / akute Nachsorge",
      "erhöhter Betreuungsbedarf",
      "eingeschränkte Kommunikation",
      "Betäubungsmittel",
      "psychischer oder psychosozialer Betreuungsbedarf",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

describe("K10 – Hydration aus M1-Snapshot", () => {
  it("wird hydratisiert wenn medizinische_lage unklar", () => {
    const snapshot = buildM1SnapshotInitial({
      kommunikation: "klar",
      medizinische_lage: "unklar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "klar",
    });
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    const k10 = checkpoints.find((c) => c.id === "K10");
    expect(k10).toBeDefined();
    expect(isMultiSelectCheckpoint(k10!)).toBe(true);
  });

  it("wird mit enabled=false und leeren selections hydratisiert", () => {
    const snapshot = buildM1SnapshotInitial({
      kommunikation: "klar",
      medizinische_lage: "unklar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "klar",
    });
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    const k10 = checkpoints.find((c) => c.id === "K10") as ActiveCheckpointMultiSelect;
    expect(k10.enabled).toBe(false);
    expect(k10.selections).toEqual([]);
  });

  it("wird IMMER hydratisiert, auch wenn medizinische_lage klar", () => {
    const snapshot = buildM1SnapshotInitial({
      kommunikation: "unklar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "unklar",
      pflegebeobachtung: "klar",
    });
    const checkpoints = hydrateActiveCheckpointsFromSnapshot(snapshot);
    const k10 = checkpoints.find((c) => c.id === "K10");
    expect(k10).toBeDefined();
    expect(isMultiSelectCheckpoint(k10!)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// M4 – Kein Patienten-To-do
// ---------------------------------------------------------------------------

describe("K10 – M4 (Patientenhinweise)", () => {
  const k10: ActiveCheckpointMultiSelect = {
    id: "K10",
    block_id: "medizinische_lage",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    perspectives: [],
    mode: CheckpointMode.MULTI_SELECT,
    title: "Besonderer Versorgungsaufwand",
    options: ["Neupatient / unbekannt", "Multimedikation"],
    selections: ["Multimedikation"],
    enabled: true,
  };

  it("erzeugt keinen M4-Eintrag (auch wenn aktiviert und ausgewählt)", () => {
    const m4 = deriveM4Output([k10]);
    expect(m4).toEqual([]);
  });

  it("erzeugt keinen M4-Eintrag neben Standard-Checkpoints", () => {
    const stdCp: ActiveCheckpoint = {
      id: "K03",
      block_id: "medizinische_lage",
      type: CheckpointType.NACHWEIS,
      category: CheckpointCategory.M,
      perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
      status: "TO_DO",
      title: "Diagnosenlage",
      m4: { type: "ACTION", text: "Bitte Befunde mitbringen." },
    };
    const m4 = deriveM4Output([stdCp, k10]);
    expect(m4).toEqual(["Bitte Befunde mitbringen."]);
  });
});

// ---------------------------------------------------------------------------
// M5 – Dokumentation
// ---------------------------------------------------------------------------

describe("K10 – M5 (Dokumentation)", () => {
  function makeK10(enabled: boolean, selections: string[]): ActiveCheckpointMultiSelect {
    return {
      id: "K10",
      block_id: "medizinische_lage",
      type: CheckpointType.BEDARF,
      category: CheckpointCategory.O,
      perspectives: [],
      mode: CheckpointMode.MULTI_SELECT,
      title: "Besonderer Versorgungsaufwand",
      options: [
        "Neupatient / unbekannt",
        "Multimedikation",
        "postoperative / akute Nachsorge",
        "erhöhter Betreuungsbedarf",
        "eingeschränkte Kommunikation",
        "Betäubungsmittel",
        "psychischer oder psychosozialer Betreuungsbedarf",
      ],
      selections,
      enabled,
    };
  }

  it("erzeugt Dokumentationseintrag bei einer Auswahl", () => {
    const result = deriveM5Output([makeK10(true, ["Multimedikation"])]);
    expect(result).toEqual([
      { checkpoint_id: "K10", text: "Besonderer Versorgungsaufwand: Multimedikation" },
    ]);
  });

  it("erzeugt Dokumentationseintrag bei mehreren Auswahlen, kommasepariert", () => {
    const result = deriveM5Output([
      makeK10(true, ["Neupatient / unbekannt", "postoperative / akute Nachsorge"]),
    ]);
    expect(result).toEqual([
      {
        checkpoint_id: "K10",
        text: "Besonderer Versorgungsaufwand: Neupatient / unbekannt, postoperative / akute Nachsorge",
      },
    ]);
  });

  it("erzeugt leeren Text wenn nicht aktiviert", () => {
    const result = deriveM5Output([makeK10(false, [])]);
    expect(result).toEqual([{ checkpoint_id: "K10", text: "" }]);
  });

  it("erzeugt leeren Text wenn aktiviert aber keine Auswahl", () => {
    const result = deriveM5Output([makeK10(true, [])]);
    expect(result).toEqual([{ checkpoint_id: "K10", text: "" }]);
  });

  it("erzeugt leeren Text wenn nicht aktiviert, auch bei Auswahl (Randfall)", () => {
    const result = deriveM5Output([makeK10(false, ["Multimedikation"])]);
    expect(result).toEqual([{ checkpoint_id: "K10", text: "" }]);
  });
});

// ---------------------------------------------------------------------------
// Block-Status
// ---------------------------------------------------------------------------

describe("K10 – Block-Status", () => {
  it("beeinflusst den Block-Status nicht", () => {
    const k10: ActiveCheckpointMultiSelect = {
      id: "K10",
      block_id: "medizinische_lage",
      type: CheckpointType.BEDARF,
      category: CheckpointCategory.O,
      perspectives: [],
      mode: CheckpointMode.MULTI_SELECT,
      title: "Besonderer Versorgungsaufwand",
      options: ["Multimedikation"],
      selections: ["Multimedikation"],
      enabled: true,
    };
    // Only K10 in list → MULTI_SELECT is skipped → currentStatus returned
    expect(deriveBlockStatus([k10], BlockStatus.OFFEN)).toBe(BlockStatus.OFFEN);
    expect(deriveBlockStatus([k10], BlockStatus.GEKLAERT)).toBe(BlockStatus.GEKLAERT);
  });
});

// ---------------------------------------------------------------------------
// M2 – Keine Patientenfragen
// ---------------------------------------------------------------------------

describe("K10 – M2 (Patientenfragen)", () => {
  it("hat keine M2-Fragen", () => {
    expect(M2_QUESTIONS.K10).toBeUndefined();
  });
});
