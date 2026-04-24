import {
  deriveActiveCheckpointIdsFromM1,
  M1_CHECKPOINT_MAP,
} from "@/lib/logic/m1Activation";
import type { M1Selection } from "@/lib/types";

describe("M1_CHECKPOINT_MAP", () => {
  it("enthält genau 4 Blöcke", () => {
    expect(Object.keys(M1_CHECKPOINT_MAP)).toHaveLength(4);
  });

  it("kommunikation aktiviert K01, K08 und K09", () => {
    expect(M1_CHECKPOINT_MAP.kommunikation).toEqual(["K01", "K08", "K09"]);
  });

  it("medizinische_lage aktiviert K03, K04, K05", () => {
    expect(M1_CHECKPOINT_MAP.medizinische_lage).toEqual(["K03", "K04", "K05"]);
  });

  it("versorgung_im_alltag aktiviert K02, K06, K07", () => {
    expect(M1_CHECKPOINT_MAP.versorgung_im_alltag).toEqual([
      "K02",
      "K06",
      "K07",
    ]);
  });

  it("pflegebeobachtung hat keine block-aktivierten Checkpoints (K12 ist ASSESSMENT, wird per Checkbox gesteuert)", () => {
    expect(M1_CHECKPOINT_MAP.pflegebeobachtung).toEqual([]);
  });
});

describe("deriveActiveCheckpointIdsFromM1", () => {
  it("gibt leere Liste zurück wenn alle Blöcke klar sind", () => {
    const selection: M1Selection = {
      kommunikation: "klar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "klar",
    };
    expect(deriveActiveCheckpointIdsFromM1(selection)).toEqual([]);
  });

  it("aktiviert nur Checkpoints unklar-er Blöcke", () => {
    const selection: M1Selection = {
      kommunikation: "unklar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "klar",
    };
    expect(deriveActiveCheckpointIdsFromM1(selection)).toEqual(["K01", "K08", "K09"]);
  });

  it("aktiviert alle Checkpoints wenn alle Blöcke unklar sind (K12 ist ASSESSMENT – nicht über Block aktiviert)", () => {
    const selection: M1Selection = {
      kommunikation: "unklar",
      medizinische_lage: "unklar",
      versorgung_im_alltag: "unklar",
      pflegebeobachtung: "unklar",
    };
    expect(deriveActiveCheckpointIdsFromM1(selection)).toEqual([
      "K01",
      "K08",
      "K09",
      "K03",
      "K04",
      "K05",
      "K02",
      "K06",
      "K07",
    ]);
  });

  it("aktiviert medizinische_lage und versorgung_im_alltag korrekt", () => {
    const selection: M1Selection = {
      kommunikation: "klar",
      medizinische_lage: "unklar",
      versorgung_im_alltag: "unklar",
      pflegebeobachtung: "klar",
    };
    expect(deriveActiveCheckpointIdsFromM1(selection)).toEqual([
      "K03",
      "K04",
      "K05",
      "K02",
      "K06",
      "K07",
    ]);
  });

  it("pflegebeobachtung 'unklar' aktiviert keine block-aktivierten Checkpoints (K12 ist ASSESSMENT)", () => {
    const selection: M1Selection = {
      kommunikation: "klar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "unklar",
    };
    expect(deriveActiveCheckpointIdsFromM1(selection)).toEqual([]);
  });
});
