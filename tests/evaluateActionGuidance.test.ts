/**
 * Tests für evaluateActionGuidance.
 *
 * Prüft: Grundverhalten, allOf/anyOf/noneOf, Spezifitätslogik,
 * fehlende Statuswerte, Katalogstruktur und Renderer-Isolation.
 */

import { evaluateActionGuidance } from "@/lib/inquiries/evaluateActionGuidance";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import {
  DecisionStatus,
  ExplanationStatus,
  ActionStatus,
  type ActionGuidanceRule,
  type CheckpointStatusValue,
} from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function makeRules(partials: Partial<ActionGuidanceRule>[]): ActionGuidanceRule[] {
  return partials.map((p, i) => ({
    id: `RULE_${i}`,
    checkpointId: "TARGET_ACTION",
    hint: "visible",
    ...p,
  }));
}

const POSSIBLE = DecisionStatus.POSSIBLE;
const NOT_POSSIBLE = DecisionStatus.NOT_POSSIBLE;
const DISABLED = DecisionStatus.DISABLED;
const PROFILE = "TEST_PROFILE";
const NO_STATUSES: Record<string, CheckpointStatusValue> = {};

// ---------------------------------------------------------------------------
// Grundverhalten
// ---------------------------------------------------------------------------

describe("evaluateActionGuidance – Grundverhalten", () => {
  it("gibt undefined zurück wenn keine Regeln vorhanden", () => {
    expect(evaluateActionGuidance([], "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)).toBeUndefined();
  });

  it("gibt undefined zurück wenn keine Regel zur checkpointId passt", () => {
    const rules = makeRules([{ checkpointId: "OTHER_ACTION" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)).toBeUndefined();
  });

  it("gibt undefined zurück wenn kein profileId-Match", () => {
    const rules = makeRules([{ profileId: "OTHER_PROFILE" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)).toBeUndefined();
  });

  it("Regel ohne when gilt immer", () => {
    const rules = makeRules([{ hint: "recommended" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("recommended");
  });

  it("Regel mit when: {} (alle Felder undefined) gilt immer", () => {
    const rules = makeRules([{ when: {}, hint: "visible" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("visible");
  });

  it("gibt alle vier hint-Werte korrekt weiter: recommended", () => {
    const rules = makeRules([{ hint: "recommended" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("recommended");
  });

  it("gibt alle vier hint-Werte korrekt weiter: visible", () => {
    const rules = makeRules([{ hint: "visible" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("visible");
  });

  it("gibt alle vier hint-Werte korrekt weiter: hiddenByDefault", () => {
    const rules = makeRules([{ hint: "hiddenByDefault" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("hiddenByDefault");
  });

  it("gibt alle vier hint-Werte korrekt weiter: caution", () => {
    const rules = makeRules([{ hint: "caution", hintText: "Vorsicht!" }]);
    const result = evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES);
    expect(result?.hint).toBe("caution");
    expect(result?.hintText).toBe("Vorsicht!");
  });

  it("Regel mit profileId = undefined gilt profilübergreifend", () => {
    const rules = makeRules([{ profileId: undefined, hint: "visible" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", "ANY_PROFILE", POSSIBLE, NO_STATUSES)?.hint).toBe("visible");
  });
});

// ---------------------------------------------------------------------------
// when.decisionStatus
// ---------------------------------------------------------------------------

describe("evaluateActionGuidance – when.decisionStatus", () => {
  it("Regel greift bei passendem decisionStatus POSSIBLE", () => {
    const rules = makeRules([{ when: { decisionStatus: POSSIBLE }, hint: "recommended" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("recommended");
  });

  it("Regel greift nicht bei nicht passendem decisionStatus", () => {
    const rules = makeRules([{ when: { decisionStatus: POSSIBLE }, hint: "recommended" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, NOT_POSSIBLE, NO_STATUSES)).toBeUndefined();
  });

  it("Regel greift bei NOT_POSSIBLE", () => {
    const rules = makeRules([{ when: { decisionStatus: NOT_POSSIBLE }, hint: "hiddenByDefault" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, NOT_POSSIBLE, NO_STATUSES)?.hint).toBe("hiddenByDefault");
  });

  it("Regel greift nicht bei DISABLED wenn decisionStatus=POSSIBLE erwartet", () => {
    const rules = makeRules([{ when: { decisionStatus: POSSIBLE }, hint: "recommended" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, DISABLED, NO_STATUSES)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// when.allOf
// ---------------------------------------------------------------------------

describe("evaluateActionGuidance – when.allOf", () => {
  const statuses: Record<string, CheckpointStatusValue> = {
    CP_A: ExplanationStatus.YES,
    CP_B: ExplanationStatus.YES,
  };

  it("alle Bedingungen erfüllt → Regel greift", () => {
    const rules = makeRules([{
      when: {
        allOf: [
          { checkpointId: "CP_A", status: ExplanationStatus.YES },
          { checkpointId: "CP_B", status: ExplanationStatus.YES },
        ],
      },
      hint: "recommended",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, statuses)?.hint).toBe("recommended");
  });

  it("eine Bedingung nicht erfüllt → Regel greift nicht", () => {
    const rules = makeRules([{
      when: {
        allOf: [
          { checkpointId: "CP_A", status: ExplanationStatus.YES },
          { checkpointId: "CP_B", status: ExplanationStatus.NO },
        ],
      },
      hint: "recommended",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, statuses)).toBeUndefined();
  });

  it("leeres allOf [] → Bedingung gilt als erfüllt", () => {
    const rules = makeRules([{ when: { allOf: [] }, hint: "visible" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("visible");
  });
});

// ---------------------------------------------------------------------------
// when.anyOf
// ---------------------------------------------------------------------------

describe("evaluateActionGuidance – when.anyOf", () => {
  const statuses: Record<string, CheckpointStatusValue> = {
    CP_A: ExplanationStatus.YES,
    CP_B: ExplanationStatus.NO,
  };

  it("mindestens eine Bedingung erfüllt → Regel greift", () => {
    const rules = makeRules([{
      when: {
        anyOf: [
          { checkpointId: "CP_A", status: ExplanationStatus.YES },
          { checkpointId: "CP_B", status: ExplanationStatus.YES },
        ],
      },
      hint: "caution",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, statuses)?.hint).toBe("caution");
  });

  it("keine Bedingung erfüllt → Regel greift nicht", () => {
    const rules = makeRules([{
      when: {
        anyOf: [
          { checkpointId: "CP_A", status: ExplanationStatus.NO },
          { checkpointId: "CP_B", status: ExplanationStatus.YES },
        ],
      },
      hint: "caution",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, statuses)).toBeUndefined();
  });

  it("leeres anyOf [] → Bedingung gilt als erfüllt", () => {
    const rules = makeRules([{ when: { anyOf: [] }, hint: "visible" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("visible");
  });
});

// ---------------------------------------------------------------------------
// when.noneOf
// ---------------------------------------------------------------------------

describe("evaluateActionGuidance – when.noneOf", () => {
  const statuses: Record<string, CheckpointStatusValue> = {
    CP_A: ExplanationStatus.NO,
    CP_B: ExplanationStatus.NO,
  };

  it("keine der Bedingungen erfüllt → Regel greift", () => {
    const rules = makeRules([{
      when: {
        noneOf: [
          { checkpointId: "CP_A", status: ExplanationStatus.YES },
          { checkpointId: "CP_B", status: ExplanationStatus.YES },
        ],
      },
      hint: "recommended",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, statuses)?.hint).toBe("recommended");
  });

  it("eine Bedingung erfüllt → Regel greift nicht", () => {
    const withOneMatch: Record<string, CheckpointStatusValue> = { CP_A: ExplanationStatus.YES, CP_B: ExplanationStatus.NO };
    const rules = makeRules([{
      when: {
        noneOf: [
          { checkpointId: "CP_A", status: ExplanationStatus.YES },
        ],
      },
      hint: "recommended",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, withOneMatch)).toBeUndefined();
  });

  it("leeres noneOf [] → Bedingung gilt als erfüllt", () => {
    const rules = makeRules([{ when: { noneOf: [] }, hint: "visible" }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("visible");
  });
});

// ---------------------------------------------------------------------------
// Kombinationen
// ---------------------------------------------------------------------------

describe("evaluateActionGuidance – kombinierte when-Klauseln", () => {
  it("decisionStatus + allOf + noneOf alle erfüllt → Regel greift", () => {
    const statuses: Record<string, CheckpointStatusValue> = {
      CP_A: ExplanationStatus.YES,
      CP_B: ExplanationStatus.NO,
    };
    const rules = makeRules([{
      when: {
        decisionStatus: POSSIBLE,
        allOf: [{ checkpointId: "CP_A", status: ExplanationStatus.YES }],
        noneOf: [{ checkpointId: "CP_B", status: ExplanationStatus.YES }],
      },
      hint: "recommended",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, statuses)?.hint).toBe("recommended");
  });

  it("decisionStatus passt, aber allOf nicht → Regel greift nicht", () => {
    const statuses: Record<string, CheckpointStatusValue> = {
      CP_A: ExplanationStatus.NO,
    };
    const rules = makeRules([{
      when: {
        decisionStatus: POSSIBLE,
        allOf: [{ checkpointId: "CP_A", status: ExplanationStatus.YES }],
      },
      hint: "recommended",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, statuses)).toBeUndefined();
  });

  it("allOf passt, aber noneOf verletzt → Regel greift nicht", () => {
    const statuses: Record<string, CheckpointStatusValue> = {
      CP_A: ExplanationStatus.YES,
      CP_B: ExplanationStatus.YES,
    };
    const rules = makeRules([{
      when: {
        allOf: [{ checkpointId: "CP_A", status: ExplanationStatus.YES }],
        noneOf: [{ checkpointId: "CP_B", status: ExplanationStatus.YES }],
      },
      hint: "recommended",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, statuses)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Fehlende Statuswerte
// ---------------------------------------------------------------------------

describe("evaluateActionGuidance – fehlende Statuswerte", () => {
  it("fehlender checkpointStatus in allOf → Bedingung nicht erfüllt, kein Fehler", () => {
    const rules = makeRules([{
      when: {
        allOf: [{ checkpointId: "NONEXISTENT", status: ExplanationStatus.YES }],
      },
      hint: "recommended",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)).toBeUndefined();
  });

  it("fehlender checkpointStatus in anyOf → Bedingung nicht erfüllt", () => {
    const rules = makeRules([{
      when: {
        anyOf: [{ checkpointId: "NONEXISTENT", status: ExplanationStatus.YES }],
      },
      hint: "recommended",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)).toBeUndefined();
  });

  it("fehlender checkpointStatus in noneOf → gilt als nicht erfüllt → noneOf-Bedingung bleibt erfüllt", () => {
    const rules = makeRules([{
      when: {
        noneOf: [{ checkpointId: "NONEXISTENT", status: ExplanationStatus.YES }],
      },
      hint: "recommended",
    }]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("recommended");
  });
});

// ---------------------------------------------------------------------------
// Spezifitätslogik
// ---------------------------------------------------------------------------

describe("evaluateActionGuidance – Spezifitätslogik", () => {
  it("profilspezifische Regel (Score 4) gewinnt gegen globale Fallback-Regel (Score 0)", () => {
    const rules = makeRules([
      { profileId: undefined, hint: "visible" },           // Score 0
      { profileId: "TEST_PROFILE", hint: "recommended" }, // Score 4
    ]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", "TEST_PROFILE", POSSIBLE, NO_STATUSES)?.hint).toBe("recommended");
  });

  it("Regel mit decisionStatus (Score 2) gewinnt gegen globale ohne when (Score 0)", () => {
    const rules = makeRules([
      { profileId: undefined, hint: "visible" },                             // Score 0
      { profileId: undefined, when: { decisionStatus: POSSIBLE }, hint: "recommended" }, // Score 2
    ]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("recommended");
  });

  it("voller Score (7) überschreibt alle anderen", () => {
    const statuses: Record<string, CheckpointStatusValue> = { CP_A: ExplanationStatus.YES };
    const rules = makeRules([
      { profileId: undefined, hint: "visible" },                                         // Score 0
      { profileId: "TEST_PROFILE", when: { decisionStatus: POSSIBLE }, hint: "caution" }, // Score 6
      {
        profileId: "TEST_PROFILE",
        when: {
          decisionStatus: POSSIBLE,
          allOf: [{ checkpointId: "CP_A", status: ExplanationStatus.YES }],
        },
        hint: "recommended",
      }, // Score 7
    ]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", "TEST_PROFILE", POSSIBLE, statuses)?.hint).toBe("recommended");
  });

  it("Gleichstand: erste Regel in Array-Reihenfolge gewinnt", () => {
    const rules = makeRules([
      { profileId: undefined, hint: "recommended" }, // Score 0
      { profileId: undefined, hint: "visible" },     // Score 0
    ]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", PROFILE, POSSIBLE, NO_STATUSES)?.hint).toBe("recommended");
  });

  it("Nicht-passende profileId-Regel wird nicht berücksichtigt", () => {
    const rules = makeRules([
      { profileId: "OTHER_PROFILE", hint: "recommended" }, // passt nicht
      { profileId: undefined, hint: "visible" },            // Score 0, passt
    ]);
    expect(evaluateActionGuidance(rules, "TARGET_ACTION", "TEST_PROFILE", POSSIBLE, NO_STATUSES)?.hint).toBe("visible");
  });
});

// ---------------------------------------------------------------------------
// Katalogstruktur – PRESCRIPTION actionGuidanceRules
// ---------------------------------------------------------------------------

describe("PRESCRIPTION actionGuidanceRules – Katalogstruktur", () => {
  const prescriptionProfile = INQUIRY_PROFILE_CATALOG_V2["PRESCRIPTION"];

  it("PRESCRIPTION-Profil hat actionGuidanceRules", () => {
    expect(prescriptionProfile.actionGuidanceRules).toBeDefined();
    expect(prescriptionProfile.actionGuidanceRules!.length).toBeGreaterThan(0);
  });

  it("jede checkpointId in actionGuidanceRules (Regel selbst) existiert in availableActionIds des Profils", () => {
    for (const rule of prescriptionProfile.actionGuidanceRules!) {
      expect(prescriptionProfile.availableActionIds).toContain(rule.checkpointId);
    }
  });

  it("jede GuidanceCondition.checkpointId (allOf/anyOf/noneOf) existiert im INQUIRY_CHECKPOINT_CATALOG_V2", () => {
    for (const rule of prescriptionProfile.actionGuidanceRules!) {
      const allConditions = [
        ...(rule.when?.allOf ?? []),
        ...(rule.when?.anyOf ?? []),
        ...(rule.when?.noneOf ?? []),
      ];
      for (const cond of allConditions) {
        expect(INQUIRY_CHECKPOINT_CATALOG_V2[cond.checkpointId]).toBeDefined();
      }
    }
  });

  it("hintText ist nur gesetzt, wenn hint === 'caution'", () => {
    for (const rule of prescriptionProfile.actionGuidanceRules!) {
      if (rule.hintText !== undefined) {
        expect(rule.hint).toBe("caution");
      }
    }
  });

  it("alle Regeln haben eindeutige IDs", () => {
    const ids = prescriptionProfile.actionGuidanceRules!.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Inhaltliche Regeln – PRESCRIPTION Pilotregeln
// ---------------------------------------------------------------------------

describe("PRESCRIPTION Pilotregeln – inhaltliches Verhalten", () => {
  const rules = INQUIRY_PROFILE_CATALOG_V2["PRESCRIPTION"].actionGuidanceRules!;

  it("DOCUMENT_UPLOAD: recommended wenn PRESCRIPTION_SPECIALIST_REPORT_REQUIRED = YES", () => {
    const result = evaluateActionGuidance(
      rules,
      "DOCUMENT_UPLOAD",
      "PRESCRIPTION",
      POSSIBLE,
      { PRESCRIPTION_SPECIALIST_REPORT_REQUIRED: ExplanationStatus.YES },
    );
    expect(result?.hint).toBe("recommended");
  });

  it("DOCUMENT_UPLOAD: kein Hinweis wenn PRESCRIPTION_SPECIALIST_REPORT_REQUIRED = NO", () => {
    const result = evaluateActionGuidance(
      rules,
      "DOCUMENT_UPLOAD",
      "PRESCRIPTION",
      POSSIBLE,
      { PRESCRIPTION_SPECIALIST_REPORT_REQUIRED: ExplanationStatus.NO },
    );
    expect(result).toBeUndefined();
  });

  it("E_RECIPE_USE: recommended wenn POSSIBLE und PRESCRIPTION_STATUTORY_POSSIBLE = YES", () => {
    const result = evaluateActionGuidance(
      rules,
      "E_RECIPE_USE",
      "PRESCRIPTION",
      POSSIBLE,
      { PRESCRIPTION_STATUTORY_POSSIBLE: ExplanationStatus.YES },
    );
    expect(result?.hint).toBe("recommended");
  });

  it("E_RECIPE_USE: hiddenByDefault wenn NOT_POSSIBLE (spezifischste Regel gewinnt)", () => {
    const result = evaluateActionGuidance(
      rules,
      "E_RECIPE_USE",
      "PRESCRIPTION",
      NOT_POSSIBLE,
      { PRESCRIPTION_STATUTORY_POSSIBLE: ExplanationStatus.YES },
    );
    expect(result?.hint).toBe("hiddenByDefault");
  });

  it("PHARMACY_INFORMATION: recommended wenn POSSIBLE", () => {
    const result = evaluateActionGuidance(
      rules,
      "PHARMACY_INFORMATION",
      "PRESCRIPTION",
      POSSIBLE,
      NO_STATUSES,
    );
    expect(result?.hint).toBe("recommended");
  });

  it("PHARMACY_INFORMATION: kein Hinweis wenn NOT_POSSIBLE", () => {
    const result = evaluateActionGuidance(
      rules,
      "PHARMACY_INFORMATION",
      "PRESCRIPTION",
      NOT_POSSIBLE,
      NO_STATUSES,
    );
    expect(result).toBeUndefined();
  });

  it("BOOK_APPOINTMENT: caution wenn PRESCRIPTION_BTM_ADHS_RULES = YES", () => {
    const result = evaluateActionGuidance(
      rules,
      "BOOK_APPOINTMENT",
      "PRESCRIPTION",
      POSSIBLE,
      { PRESCRIPTION_BTM_ADHS_RULES: ExplanationStatus.YES },
    );
    expect(result?.hint).toBe("caution");
    expect(result?.hintText).toContain("Spezialisten");
  });

  it("BOOK_APPOINTMENT: caution wenn PRESCRIPTION_GYN_EXCLUSIVITY = YES", () => {
    const result = evaluateActionGuidance(
      rules,
      "BOOK_APPOINTMENT",
      "PRESCRIPTION",
      POSSIBLE,
      { PRESCRIPTION_GYN_EXCLUSIVITY: ExplanationStatus.YES },
    );
    expect(result?.hint).toBe("caution");
  });

  it("BOOK_APPOINTMENT: kein Hinweis wenn beide Bedingungen NO", () => {
    const result = evaluateActionGuidance(
      rules,
      "BOOK_APPOINTMENT",
      "PRESCRIPTION",
      POSSIBLE,
      {
        PRESCRIPTION_BTM_ADHS_RULES: ExplanationStatus.NO,
        PRESCRIPTION_GYN_EXCLUSIVITY: ExplanationStatus.NO,
      },
    );
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Renderer-Isolation
// ---------------------------------------------------------------------------

describe("renderInquiryResponseFromSections – Renderer-Isolation", () => {
  // Stellt sicher, dass actionGuidanceRules die gerenderte Ausgabe NICHT verändert.
  // Die Regeln sind nur für die UI-Schicht gedacht; der Renderer ignoriert sie vollständig.

  it("PRESCRIPTION mit actionGuidanceRules: kein guidance-Text landet in attachedParagraphs oder sharedBottom", async () => {
    const { renderInquiryResponseFromSections } = await import("@/lib/inquiries/renderInquiryResponse");

    const section = {
      inquiryId: "PRESCRIPTION",
      decisionStatus: DecisionStatus.POSSIBLE,
      checkpointStatuses: {
        PRESCRIPTION_STATUTORY_POSSIBLE: ExplanationStatus.YES,
        PRESCRIPTION_SPECIALIST_REPORT_REQUIRED: ExplanationStatus.YES,
        PRESCRIPTION_BTM_ADHS_RULES: ExplanationStatus.NO,
        PRESCRIPTION_GYN_EXCLUSIVITY: ExplanationStatus.NO,
        PRESCRIPTION_NO_POSTAL_DELIVERY: ExplanationStatus.NO,
        MEDICAL_CONSULTATION_REQUIRED: ExplanationStatus.NO,
        IS_CHRONIC_PATIENT: ExplanationStatus.NO,
        PATIENT_NOT_IN_GERMANY: ExplanationStatus.NO,
        DIGITAL_REQUEST: ActionStatus.INACTIVE,
        ONLINE_ANAMNESIS: ActionStatus.INACTIVE,
        BOOK_APPOINTMENT: ActionStatus.INACTIVE,
        E_RECIPE_USE: ActionStatus.INACTIVE,
        PHARMACY_INFORMATION: ActionStatus.INACTIVE,
        DOCUMENT_UPLOAD: ActionStatus.INACTIVE,
        PROCESSING_DELAY: ActionStatus.INACTIVE,
        TECHNICAL_ISSUE: ActionStatus.INACTIVE,
      },
    };

    const output = renderInquiryResponseFromSections([section]);

    // Der Renderer darf guidance-Hinweistexte (hintText) nicht in die Ausgabe einfließen lassen.
    // Guidance steuert ausschließlich die UI-Darstellung – der Renderer bleibt unverändert.
    expect(output.sections).toHaveLength(1);
    expect(output.sections[0].inquiryId).toBe("PRESCRIPTION");
    for (const rule of INQUIRY_PROFILE_CATALOG_V2["PRESCRIPTION"].actionGuidanceRules!) {
      if (rule.hintText) {
        expect(output.sections[0].attachedParagraphs).not.toContain(rule.hintText);
        expect(output.sharedBottom).not.toContain(rule.hintText);
      }
    }
    // Renderer erzeugt keinen Output für INACTIVE actions
    expect(output.sharedBottom).toHaveLength(0);
  });
});
