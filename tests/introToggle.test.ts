import { applyIntroToggle } from "@/lib/inquiries/introToggle";
import { INTRO_CHECKPOINT_IDS } from "@/lib/inquiries/inquiryCheckpointCatalog";

// ---------------------------------------------------------------------------
// applyIntroToggle – exklusive Toggle-Gruppe für Intro-Checkpoints
// ---------------------------------------------------------------------------

const IDS = INTRO_CHECKPOINT_IDS as readonly string[];
const [ID_A, ID_B, ID_C, ID_D] = IDS;

describe("applyIntroToggle – exklusive Toggle-Gruppe", () => {
  it("Aktivieren eines INACTIVE-Intros setzt es auf ACTIVE", () => {
    const result = applyIntroToggle({}, ID_A, IDS);
    expect(result[ID_A]).toBe("ACTIVE");
  });

  it("Aktivieren eines INACTIVE-Intros deaktiviert alle anderen", () => {
    const initial = { [ID_B]: "ACTIVE" };
    const result = applyIntroToggle(initial, ID_A, IDS);
    expect(result[ID_A]).toBe("ACTIVE");
    expect(result[ID_B]).toBe("INACTIVE");
    expect(result[ID_C]).toBe("INACTIVE");
    expect(result[ID_D]).toBe("INACTIVE");
  });

  it("Wechsel: Klick auf anderes Intro aktiviert dieses und deaktiviert das vorherige", () => {
    const initial = { [ID_A]: "ACTIVE" };
    const result = applyIntroToggle(initial, ID_B, IDS);
    expect(result[ID_A]).toBe("INACTIVE");
    expect(result[ID_B]).toBe("ACTIVE");
  });

  it("Wechsel zwischen allen vier Intros funktioniert", () => {
    let statuses: Record<string, string> = {};

    statuses = applyIntroToggle(statuses, ID_A, IDS);
    expect(statuses[ID_A]).toBe("ACTIVE");
    expect(statuses[ID_B]).toBe("INACTIVE");

    statuses = applyIntroToggle(statuses, ID_C, IDS);
    expect(statuses[ID_A]).toBe("INACTIVE");
    expect(statuses[ID_C]).toBe("ACTIVE");

    statuses = applyIntroToggle(statuses, ID_D, IDS);
    expect(statuses[ID_C]).toBe("INACTIVE");
    expect(statuses[ID_D]).toBe("ACTIVE");
  });

  it("erneuter Klick auf ACTIVE-Intro deaktiviert alle (Toggle-Off)", () => {
    const initial = { [ID_A]: "ACTIVE" };
    const result = applyIntroToggle(initial, ID_A, IDS);
    expect(result[ID_A]).toBe("INACTIVE");
    for (const id of IDS) {
      expect(result[id]).toBe("INACTIVE");
    }
  });

  it("kein Intro aktiv (leerer Zustand) → output.intro bleibt undefined-kompatibel", () => {
    const initial = { [ID_B]: "ACTIVE" };
    const afterToggleOff = applyIntroToggle(initial, ID_B, IDS);
    for (const id of IDS) {
      expect(afterToggleOff[id]).toBe("INACTIVE");
    }
  });

  it("mutiert nicht das übergebene statuses-Objekt", () => {
    const initial = { [ID_A]: "INACTIVE" };
    const frozen = { ...initial };
    applyIntroToggle(initial, ID_A, IDS);
    expect(initial).toEqual(frozen);
  });

  it("nicht-Intro-Statuses bleiben unverändert", () => {
    const initial = { SOME_OTHER_CHECKPOINT: "YES", [ID_A]: "INACTIVE" };
    const result = applyIntroToggle(initial, ID_A, IDS);
    expect(result["SOME_OTHER_CHECKPOINT"]).toBe("YES");
  });
});
