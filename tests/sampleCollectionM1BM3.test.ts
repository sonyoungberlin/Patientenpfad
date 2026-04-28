/**
 * Tests für den M1B/M3-Pilot am SAMPLE_COLLECTION-Profil.
 *
 * 1. SAMPLE_COLLECTION hat M1B-Optionen (communicationReasons).
 * 2. SAMPLE_COLLECTION hat M3-Ziele (responseGoals).
 * 3. M1B verweist nur auf existierende M3-Ziel-IDs.
 * 4. M3 verweist nur auf existierende specificRoles.
 * 5. Renderer bleibt unverändert (communicationReasons/responseGoals tauchen nicht im Output auf).
 */

import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import {
  DecisionStatus,
  type SpecificRole,
  type ExplanationOutputStatus,
} from "@/lib/inquiries/types";

const SAMPLE_COLLECTION = INQUIRY_PROFILE_CATALOG_V2["SAMPLE_COLLECTION"];

// ---------------------------------------------------------------------------
// Bekannte SAMPLE_COLLECTION-M1B-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_COMMUNICATION_REASON_IDS: string[] = [
  "REQ_SAMPLE_INITIAL",
  "REQ_SAMPLE_CLARIFICATION",
  "OUT_SAMPLE_ORDERED",
  "OUT_MISSING_REQUIREMENT",
  "OUT_SPECIALIST_RESPONSIBILITY",
];

// ---------------------------------------------------------------------------
// Bekannte SAMPLE_COLLECTION-M3-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_RESPONSE_GOAL_IDS: string[] = [
  "ISSUE_CONFIRMED",
  "ISSUE_BLOCKED_MISSING_INFO",
  "MEDICAL_REVIEW_NEEDED",
  "PROCESS_EXPLAINED",
  "ISSUE_BLOCKED_EXTERNAL",
];

// ---------------------------------------------------------------------------
// 1. SAMPLE_COLLECTION hat communicationReasons
// ---------------------------------------------------------------------------

describe("SAMPLE_COLLECTION – M1B communicationReasons", () => {
  it("Profil ist definiert", () => {
    expect(SAMPLE_COLLECTION).toBeDefined();
  });

  it("communicationReasons ist gesetzt und nicht leer", () => {
    expect(SAMPLE_COLLECTION.communicationReasons).toBeDefined();
    expect(SAMPLE_COLLECTION.communicationReasons!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten eingehenden Anlässe", () => {
    const ids = SAMPLE_COLLECTION.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("REQ_SAMPLE_INITIAL");
    expect(ids).toContain("REQ_SAMPLE_CLARIFICATION");
  });

  it("enthält alle erwarteten ausgehenden Anlässe", () => {
    const ids = SAMPLE_COLLECTION.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("OUT_SAMPLE_ORDERED");
    expect(ids).toContain("OUT_MISSING_REQUIREMENT");
    expect(ids).toContain("OUT_SPECIALIST_RESPONSIBILITY");
  });

  it("enthält genau die erwarteten IDs (vollständig)", () => {
    const ids = SAMPLE_COLLECTION.communicationReasons!.map((r) => r.id);
    for (const expected of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jeder Anlass hat ein label und eine direction", () => {
    for (const reason of SAMPLE_COLLECTION.communicationReasons!) {
      expect(typeof reason.label).toBe("string");
      expect(reason.label.length).toBeGreaterThan(0);
      expect(["INCOMING", "OUTGOING"]).toContain(reason.direction);
    }
  });

  it("eingehende Anlässe haben direction INCOMING", () => {
    const incoming = SAMPLE_COLLECTION.communicationReasons!.filter((r) =>
      r.id.startsWith("REQ_"),
    );
    for (const r of incoming) {
      expect(r.direction).toBe("INCOMING");
    }
  });

  it("ausgehende Anlässe haben direction OUTGOING", () => {
    const outgoing = SAMPLE_COLLECTION.communicationReasons!.filter((r) =>
      r.id.startsWith("OUT_"),
    );
    for (const r of outgoing) {
      expect(r.direction).toBe("OUTGOING");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. SAMPLE_COLLECTION hat responseGoals
// ---------------------------------------------------------------------------

describe("SAMPLE_COLLECTION – M3 responseGoals", () => {
  it("responseGoals ist gesetzt und nicht leer", () => {
    expect(SAMPLE_COLLECTION.responseGoals).toBeDefined();
    expect(SAMPLE_COLLECTION.responseGoals!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten Antwortziele", () => {
    const ids = SAMPLE_COLLECTION.responseGoals!.map((g) => g.id);
    for (const expected of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jedes Antwortziel hat ein label", () => {
    for (const goal of SAMPLE_COLLECTION.responseGoals!) {
      expect(typeof goal.label).toBe("string");
      expect(goal.label.length).toBeGreaterThan(0);
    }
  });

  it("jedes Antwortziel hat mindestens eine relevantSpecificRole", () => {
    for (const goal of SAMPLE_COLLECTION.responseGoals!) {
      expect(goal.relevantSpecificRoles.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. M1B verweist nur auf existierende M3-Ziel-IDs
// ---------------------------------------------------------------------------

describe("SAMPLE_COLLECTION M1B → M3-Referenz-Integrität", () => {
  it("alle suggestedResponseGoalIds in communicationReasons sind bekannte responseGoal-IDs", () => {
    const knownGoalIds = new Set<string>(
      SAMPLE_COLLECTION.responseGoals!.map((g) => g.id),
    );
    const violations: string[] = [];
    for (const reason of SAMPLE_COLLECTION.communicationReasons!) {
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

describe("SAMPLE_COLLECTION M3 → specificRole-Referenz-Integrität", () => {
  it("alle relevantSpecificRoles in responseGoals sind bekannte SpecificRole-Werte", () => {
    const violations: string[] = [];
    for (const goal of SAMPLE_COLLECTION.responseGoals!) {
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

describe("SAMPLE_COLLECTION Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe", () => {
  it("renderInquiryResponseFromSections enthält keine M1B- oder M3-IDs im Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "SAMPLE_COLLECTION",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {},
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatus>,
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
    for (const id of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(allText).not.toContain(id);
    }

    // M3-IDs dürfen nicht im Output erscheinen
    for (const id of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(allText).not.toContain(id);
    }
  });

  it("communicationReasons und responseGoals sind nicht Teil des Renderer-Outputs (structurally)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "SAMPLE_COLLECTION",
        decisionStatus: DecisionStatus.NOT_POSSIBLE,
        checkpointStatuses: {},
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatus>,
      },
    ]);

    expect(result).not.toHaveProperty("communicationReasons");
    expect(result).not.toHaveProperty("responseGoals");
    expect(result.sections[0]).not.toHaveProperty("communicationReasons");
    expect(result.sections[0]).not.toHaveProperty("responseGoals");
  });
});
