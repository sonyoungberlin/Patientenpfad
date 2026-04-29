/**
 * Tests für den M1B/M3-Pilot am PRESCRIPTION-Profil.
 *
 * 1. PRESCRIPTION hat M1B-Optionen (communicationReasons).
 * 2. PRESCRIPTION hat M3-Ziele (responseGoals).
 * 3. M1B verweist nur auf existierende M3-Ziel-IDs.
 * 4. M3 verweist nur auf existierende specificRoles.
 * 5. Renderer bleibt unverändert (communicationReasons/responseGoals tauchen nicht im Output auf).
 */

import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import {
  ActionStatus,
  DecisionStatus,
  ExplanationStatus,
  type SpecificRole,
  type ExplanationOutputStatus,
} from "@/lib/inquiries/types";

const PRESCRIPTION = INQUIRY_PROFILE_CATALOG_V2["PRESCRIPTION"];

// ---------------------------------------------------------------------------
// 1. PRESCRIPTION hat communicationReasons
// ---------------------------------------------------------------------------

describe("PRESCRIPTION – M1B communicationReasons", () => {
  it("Profil ist definiert", () => {
    expect(PRESCRIPTION).toBeDefined();
  });

  it("communicationReasons ist gesetzt und nicht leer", () => {
    expect(PRESCRIPTION.communicationReasons).toBeDefined();
    expect(PRESCRIPTION.communicationReasons!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten eingehenden Anlässe", () => {
    const ids = PRESCRIPTION.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("REQ_RENEWAL");
    expect(ids).toContain("REQ_NEW_PRESCRIPTION");
    expect(ids).toContain("REQ_PRESCRIPTION_CLARIFICATION");
    expect(ids).toContain("REQ_DELIVERY_FORMAT");
  });

  it("enthält alle erwarteten ausgehenden Anlässe", () => {
    const ids = PRESCRIPTION.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("OUT_RECIPE_READY_INFO");
    expect(ids).toContain("OUT_MISSING_REQUIREMENT");
    expect(ids).toContain("OUT_SPECIALIST_RESPONSIBILITY");
    expect(ids).toContain("OUT_PRACTICE_CLARIFICATION");
  });

  it("jeder Anlass hat ein label und eine direction", () => {
    for (const reason of PRESCRIPTION.communicationReasons!) {
      expect(typeof reason.label).toBe("string");
      expect(reason.label.length).toBeGreaterThan(0);
      expect(["INCOMING", "OUTGOING"]).toContain(reason.direction);
    }
  });

  it("eingehende Anlässe haben direction INCOMING", () => {
    const incoming = PRESCRIPTION.communicationReasons!.filter((r) =>
      r.id.startsWith("REQ_"),
    );
    for (const r of incoming) {
      expect(r.direction).toBe("INCOMING");
    }
  });

  it("ausgehende Anlässe haben direction OUTGOING", () => {
    const outgoing = PRESCRIPTION.communicationReasons!.filter((r) =>
      r.id.startsWith("OUT_"),
    );
    for (const r of outgoing) {
      expect(r.direction).toBe("OUTGOING");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. PRESCRIPTION hat responseGoals
// ---------------------------------------------------------------------------

describe("PRESCRIPTION – M3 responseGoals", () => {
  it("responseGoals ist gesetzt und nicht leer", () => {
    expect(PRESCRIPTION.responseGoals).toBeDefined();
    expect(PRESCRIPTION.responseGoals!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten Antwortziele", () => {
    const ids = PRESCRIPTION.responseGoals!.map((g) => g.id);
    expect(ids).toContain("ISSUE_CONFIRMED");
    expect(ids).toContain("ISSUE_BLOCKED_EXTERNAL");
    expect(ids).toContain("ISSUE_BLOCKED_MISSING_DOC");
    expect(ids).toContain("ISSUE_BLOCKED_MISSING_INFO");
    expect(ids).toContain("ISSUE_BLOCKED_COST_COVERAGE");
    expect(ids).toContain("PROCESS_EXPLAINED");
    expect(ids).toContain("MEDICAL_REVIEW_NEEDED");
  });

  it("jedes Antwortziel hat ein label", () => {
    for (const goal of PRESCRIPTION.responseGoals!) {
      expect(typeof goal.label).toBe("string");
      expect(goal.label.length).toBeGreaterThan(0);
    }
  });

  it("jedes Antwortziel hat mindestens eine relevantSpecificRole", () => {
    for (const goal of PRESCRIPTION.responseGoals!) {
      expect(goal.relevantSpecificRoles.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. M1B verweist nur auf existierende M3-Ziel-IDs
// ---------------------------------------------------------------------------

describe("M1B → M3-Referenz-Integrität", () => {
  it("alle suggestedResponseGoalIds in communicationReasons sind bekannte ResponseGoalIds", () => {
    const knownGoalIds = new Set<string>(
      PRESCRIPTION.responseGoals!.map((g) => g.id),
    );
    const violations: string[] = [];
    for (const reason of PRESCRIPTION.communicationReasons!) {
      for (const goalId of reason.suggestedResponseGoalIds) {
        if (!knownGoalIds.has(goalId)) {
          violations.push(
            `communicationReason ${reason.id} verweist auf unbekannte responseGoalId: ${goalId}`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4. M3 verweist nur auf bekannte specificRoles
// ---------------------------------------------------------------------------

const KNOWN_SPECIFIC_ROLES: SpecificRole[] = [
  "MISSING_DOCUMENT",
  "MISSING_INFORMATION",
  "CHANNEL_NOT_SUITABLE",
  "EXTERNAL_RESPONSIBILITY",
  "RULE_TIME_LIMIT",
  "RULE_COST_COVERAGE",
  "MEDICAL_REVIEW_REQUIRED",
  "PROCESS_INFO",
  "OUTCOME_INFO",
];

describe("M3 → specificRole-Referenz-Integrität", () => {
  it("alle relevantSpecificRoles in responseGoals sind bekannte SpecificRole-Werte", () => {
    const violations: string[] = [];
    for (const goal of PRESCRIPTION.responseGoals!) {
      for (const role of goal.relevantSpecificRoles) {
        if (!KNOWN_SPECIFIC_ROLES.includes(role)) {
          violations.push(
            `responseGoal ${goal.id} verweist auf unbekannte specificRole: ${role}`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5. Renderer bleibt unverändert
// ---------------------------------------------------------------------------

describe("Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe", () => {
  it("renderInquiryResponseFromSections enthält keine M1B- oder M3-IDs im Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "PRESCRIPTION",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          PRESCRIPTION_STATUTORY_POSSIBLE: ExplanationStatus.YES,
        },
        explanationOutputStatuses: {
          PRESCRIPTION_STATUTORY_POSSIBLE: "SHOW" as ExplanationOutputStatus,
        },
      },
    ]);

    const allText = [
      ...result.sections.flatMap((s) => [
        s.mainDecision ?? "",
        ...s.attachedParagraphs,
      ]),
      ...result.sharedBottom,
    ].join(" ");

    // M1B-IDs dürfen nicht im Output erscheinen
    const m1bIds: string[] = [
      "REQ_RENEWAL",
      "REQ_NEW_PRESCRIPTION",
      "REQ_PRESCRIPTION_CLARIFICATION",
      "REQ_DELIVERY_FORMAT",
      "OUT_RECIPE_READY_INFO",
      "OUT_MISSING_REQUIREMENT",
      "OUT_SPECIALIST_RESPONSIBILITY",
      "OUT_PRACTICE_CLARIFICATION",
    ];
    for (const id of m1bIds) {
      expect(allText).not.toContain(id);
    }

    // M3-IDs dürfen nicht im Output erscheinen
    const m3ids: string[] = [
      "ISSUE_CONFIRMED",
      "ISSUE_BLOCKED_EXTERNAL",
      "ISSUE_BLOCKED_MISSING_DOC",
      "ISSUE_BLOCKED_MISSING_INFO",
      "ISSUE_BLOCKED_COST_COVERAGE",
      "PROCESS_EXPLAINED",
      "MEDICAL_REVIEW_NEEDED",
    ];
    for (const id of m3ids) {
      expect(allText).not.toContain(id);
    }
  });

  it("communicationReasons und responseGoals sind nicht Teil des Renderer-Outputs (structurally)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "PRESCRIPTION",
        decisionStatus: DecisionStatus.NOT_POSSIBLE,
        checkpointStatuses: {},
        explanationOutputStatuses: {},
      },
    ]);

    // Der Output-Typ InquiryResponseV2Output hat keine M1B/M3-Felder
    expect(result).not.toHaveProperty("communicationReasons");
    expect(result).not.toHaveProperty("responseGoals");
    expect(result.sections[0]).not.toHaveProperty("communicationReasons");
    expect(result.sections[0]).not.toHaveProperty("responseGoals");
  });
});

// ---------------------------------------------------------------------------
// 6. M2/M3-Bereinigung: PRESCRIPTION_STATUTORY_POSSIBLE YES-Text geleert
// ---------------------------------------------------------------------------

describe("PRESCRIPTION_STATUTORY_POSSIBLE – M2/M3-Bereinigung", () => {
  it("textByStatus.YES ist leer (Prozessdetail wird über E_RECIPE_USE transportiert)", () => {
    const checkpoint = INQUIRY_CHECKPOINT_CATALOG_V2["PRESCRIPTION_STATUTORY_POSSIBLE"];
    expect(checkpoint).toBeDefined();
    expect((checkpoint.textByStatus as Record<string, string | undefined>)[ExplanationStatus.YES]).toBeUndefined();
  });

  it("textByStatus.NO enthält Privatrezept-Hinweis", () => {
    const checkpoint = INQUIRY_CHECKPOINT_CATALOG_V2["PRESCRIPTION_STATUTORY_POSSIBLE"];
    const noText = (checkpoint.textByStatus as Record<string, string | undefined>)[ExplanationStatus.NO];
    expect(typeof noText).toBe("string");
    expect(noText).toContain("Privatrezept");
  });
});

// ---------------------------------------------------------------------------
// 7. M2/M3-Bereinigung: E_RECIPE_USE in boundActionCheckpointIds
// ---------------------------------------------------------------------------

describe("PRESCRIPTION – E_RECIPE_USE als boundAction", () => {
  it("E_RECIPE_USE ist NICHT in availableActionIds", () => {
    expect(PRESCRIPTION.availableActionIds).not.toContain("E_RECIPE_USE");
  });

  it("E_RECIPE_USE ist in boundActionCheckpointIds", () => {
    expect(PRESCRIPTION.boundActionCheckpointIds).toBeDefined();
    expect(PRESCRIPTION.boundActionCheckpointIds).toContain("E_RECIPE_USE");
  });

  it("boundActionConditions.E_RECIPE_USE zeigt bei PRESCRIPTION_STATUTORY_POSSIBLE=YES", () => {
    const condition = PRESCRIPTION.boundActionConditions?.["E_RECIPE_USE"];
    expect(condition).toBeDefined();
    expect(condition?.showWhenAny).toEqual([{ PRESCRIPTION_STATUTORY_POSSIBLE: "YES" }]);
  });

  it("E_RECIPE_USE-Text enthält QR-Code/PDF-Hinweis", () => {
    const checkpoint = INQUIRY_CHECKPOINT_CATALOG_V2["E_RECIPE_USE"];
    const text = (checkpoint.textByStatus as Record<string, string | undefined>)[ActionStatus.ACTIVE];
    expect(typeof text).toBe("string");
    expect(text).toContain("eGK");
    expect(text).toContain("QR-Code");
    expect(text).toContain("PDF");
  });

  it("Renderer gibt E_RECIPE_USE-Text in sharedBottom aus, wenn ACTIVE gesetzt", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "PRESCRIPTION",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          PRESCRIPTION_STATUTORY_POSSIBLE: ExplanationStatus.YES,
          E_RECIPE_USE: ActionStatus.ACTIVE,
        },
        explanationOutputStatuses: {
          PRESCRIPTION_STATUTORY_POSSIBLE: "SHOW" as ExplanationOutputStatus,
        },
      },
    ]);
    const sharedBottomText = result.sharedBottom.join(" ");
    expect(sharedBottomText).toContain("eRezept");
    expect(sharedBottomText).toContain("QR-Code");
  });

  it("Renderer gibt E_RECIPE_USE NICHT aus, wenn checkpointStatus fehlt", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "PRESCRIPTION",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          PRESCRIPTION_STATUTORY_POSSIBLE: ExplanationStatus.YES,
        },
        explanationOutputStatuses: {
          PRESCRIPTION_STATUTORY_POSSIBLE: "SHOW" as ExplanationOutputStatus,
        },
      },
    ]);
    const allText = [...result.sharedBottom, ...result.sections.flatMap((s) => s.attachedParagraphs)].join(" ");
    expect(allText).not.toContain("QR-Code");
  });
});

// ---------------------------------------------------------------------------
// 8. M2/M3-Bereinigung: PRESCRIPTION_NO_POSTAL_DELIVERY YES-Text gekürzt
// ---------------------------------------------------------------------------

describe("PRESCRIPTION_NO_POSTAL_DELIVERY – gekürzter Text", () => {
  it("YES-Text enthält nur den Ablehnungshinweis, keine eRezept/Apotheke-Prozessinfo", () => {
    const checkpoint = INQUIRY_CHECKPOINT_CATALOG_V2["PRESCRIPTION_NO_POSTAL_DELIVERY"];
    const yesText = (checkpoint.textByStatus as Record<string, string | undefined>)[ExplanationStatus.YES];
    expect(typeof yesText).toBe("string");
    expect(yesText).toBe("Ein Postversand von Rezepten erfolgt nicht.");
    expect(yesText).not.toContain("eRezept");
    expect(yesText).not.toContain("Apotheke");
  });
});
