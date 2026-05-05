import { applySectionIntroToggle } from "@/lib/inquiries/sectionIntroToggle";
import {
  INQUIRY_CHECKPOINT_CATALOG_V2,
  SECTION_INTRO_CHECKPOINT_IDS,
  INTRO_CHECKPOINT_IDS,
} from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import {
  ActionStatus,
  InquiryCheckpointKind,
  InquiryCheckpointScope,
  InquiryCheckpointPlacement,
} from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// applySectionIntroToggle – exklusive Toggle-Gruppe für Section-Intros
// ---------------------------------------------------------------------------

const IDS = SECTION_INTRO_CHECKPOINT_IDS as readonly string[];
const [ID_A, ID_B, ID_C] = IDS;

describe("applySectionIntroToggle – exklusive Toggle-Gruppe", () => {
  it("Aktivieren eines INACTIVE-Section-Intros setzt es auf ACTIVE", () => {
    const result = applySectionIntroToggle({}, ID_A, IDS);
    expect(result[ID_A]).toBe("ACTIVE");
  });

  it("Aktivieren eines INACTIVE-Section-Intros deaktiviert alle anderen", () => {
    const initial = { [ID_B]: "ACTIVE" };
    const result = applySectionIntroToggle(initial, ID_A, IDS);
    expect(result[ID_A]).toBe("ACTIVE");
    expect(result[ID_B]).toBe("INACTIVE");
    expect(result[ID_C]).toBe("INACTIVE");
  });

  it("Klick auf bereits aktives Section-Intro deaktiviert es (Toggle-Off)", () => {
    const initial = { [ID_A]: "ACTIVE" };
    const result = applySectionIntroToggle(initial, ID_A, IDS);
    expect(result[ID_A]).toBe("INACTIVE");
  });

  it("Andere (Nicht-Section-Intro) Statuses bleiben unverändert", () => {
    const initial = { OTHER_KEY: "YES", [ID_A]: "INACTIVE" };
    const result = applySectionIntroToggle(initial, ID_B, IDS);
    expect(result.OTHER_KEY).toBe("YES");
    expect(result[ID_B]).toBe("ACTIVE");
    expect(result[ID_A]).toBe("INACTIVE");
  });

  it("Maximal ein Section-Intro ist nach jedem Toggle ACTIVE", () => {
    let statuses: Record<string, string> = {};
    for (const id of [ID_A, ID_B, ID_C, ID_A]) {
      statuses = applySectionIntroToggle(statuses, id, IDS);
      const activeCount = IDS.filter((x) => statuses[x] === "ACTIVE").length;
      expect(activeCount).toBeLessThanOrEqual(1);
    }
  });

  it("Mutiert das übergebene statuses-Objekt nicht", () => {
    const initial = { [ID_A]: "INACTIVE" } as Record<string, string>;
    const snapshot = { ...initial };
    applySectionIntroToggle(initial, ID_A, IDS);
    expect(initial).toEqual(snapshot);
  });
});

// ---------------------------------------------------------------------------
// SECTION_INTRO_CHECKPOINT_IDS – Katalog-Vollständigkeit
// ---------------------------------------------------------------------------

describe("SECTION_INTRO_CHECKPOINT_IDS – Katalog-Vollständigkeit", () => {
  it("alle Einträge sind im Katalog vorhanden", () => {
    for (const id of SECTION_INTRO_CHECKPOINT_IDS) {
      expect(INQUIRY_CHECKPOINT_CATALOG_V2[id]).toBeDefined();
    }
  });

  it("alle Section-Intros haben actionCategory 'SECTION_INTRO'", () => {
    for (const id of SECTION_INTRO_CHECKPOINT_IDS) {
      expect(INQUIRY_CHECKPOINT_CATALOG_V2[id].actionCategory).toBe(
        "SECTION_INTRO",
      );
    }
  });

  it("alle Section-Intros haben kind ACTION und scope GLOBAL", () => {
    for (const id of SECTION_INTRO_CHECKPOINT_IDS) {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
      expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
      expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
      expect(cp.placement).toBe(InquiryCheckpointPlacement.SHARED_BOTTOM);
    }
  });

  it("alle Section-Intros haben einen nicht-leeren ACTIVE-Text", () => {
    for (const id of SECTION_INTRO_CHECKPOINT_IDS) {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
      const text = cp.textByStatus?.[ActionStatus.ACTIVE];
      expect(typeof text).toBe("string");
      expect((text as string).length).toBeGreaterThan(0);
    }
  });

  it("Section-Intros sind NICHT in INTRO_CHECKPOINT_IDS enthalten (eigener Namespace)", () => {
    for (const id of SECTION_INTRO_CHECKPOINT_IDS) {
      expect(INTRO_CHECKPOINT_IDS).not.toContain(id);
    }
  });

  it("Pilot-Profile AU/LAB/APPOINTMENT enthalten ausschließlich gültige Section-Intro-IDs", () => {
    for (const profileId of ["AU", "LAB", "APPOINTMENT"]) {
      const profile = INQUIRY_PROFILE_CATALOG_V2[profileId];
      expect(profile).toBeDefined();
      const list = profile.availableSectionIntroIds ?? [];
      expect(list.length).toBeGreaterThan(0);
      for (const id of list) {
        expect(SECTION_INTRO_CHECKPOINT_IDS).toContain(id);
      }
    }
  });
});
