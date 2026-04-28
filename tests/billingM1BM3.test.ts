/**
 * Tests für den M1B/M3-Pilot am BILLING-Profil.
 *
 * 1. BILLING hat M1B-Optionen (communicationReasons).
 * 2. BILLING hat M3-Ziele (responseGoals).
 * 3. M1B verweist nur auf existierende M3-Ziel-IDs.
 * 4. M3 verweist nur auf existierende specificRoles.
 * 5. Renderer bleibt unverändert (communicationReasons/responseGoals tauchen nicht im Output auf).
 * 6. Specific-Checkpoints: Existenz, Struktur, specificRole.
 * 7. Renderer rendert Specific-Texte bei YES + SHOW.
 */

import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import {
  DecisionStatus,
  ExplanationStatus,
  ExplanationOutputStatus,
  InquiryCheckpointKind,
  InquiryCheckpointScope,
  type SpecificRole,
} from "@/lib/inquiries/types";

const BILLING = INQUIRY_PROFILE_CATALOG_V2["BILLING"];

// ---------------------------------------------------------------------------
// Bekannte BILLING-M1B-IDs
// ---------------------------------------------------------------------------
const EXPECTED_COMMUNICATION_REASON_IDS: string[] = [
  "REQ_BILLING_INITIAL",
  "REQ_BILLING_CLARIFICATION",
  "OUT_BILLING_INFO",
  "OUT_MISSING_REQUIREMENT",
  "OUT_SPECIALIST_RESPONSIBILITY",
];

// ---------------------------------------------------------------------------
// Bekannte BILLING-M3-IDs
// ---------------------------------------------------------------------------
const EXPECTED_RESPONSE_GOAL_IDS: string[] = [
  "ISSUE_BLOCKED_EXTERNAL",
  "ISSUE_BLOCKED_MISSING_INFO",
  "MEDICAL_REVIEW_NEEDED",
  "PROCESS_EXPLAINED",
];

// ---------------------------------------------------------------------------
// Bekannte Specific-Checkpoint-IDs
// ---------------------------------------------------------------------------
const EXPECTED_SPECIFIC_CHECKPOINT_IDS = [
  "BILLING_COST_NOT_COVERED",
  "BILLING_PROCESS_EXTERNAL",
  "BILLING_DATA_MISSING",
  "BILLING_DOCUMENT_MISSING",
  "BILLING_EXTERNAL_RESPONSIBILITY",
] as const;

// ---------------------------------------------------------------------------
// 1. BILLING hat communicationReasons
// ---------------------------------------------------------------------------

describe("BILLING – M1B communicationReasons", () => {
  it("Profil ist definiert", () => {
    expect(BILLING).toBeDefined();
  });

  it("communicationReasons ist gesetzt und nicht leer", () => {
    expect(BILLING.communicationReasons).toBeDefined();
    expect(BILLING.communicationReasons!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten eingehenden Anlässe", () => {
    const ids = BILLING.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("REQ_BILLING_INITIAL");
    expect(ids).toContain("REQ_BILLING_CLARIFICATION");
  });

  it("enthält alle erwarteten ausgehenden Anlässe", () => {
    const ids = BILLING.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("OUT_BILLING_INFO");
    expect(ids).toContain("OUT_MISSING_REQUIREMENT");
    expect(ids).toContain("OUT_SPECIALIST_RESPONSIBILITY");
  });

  it("enthält genau die erwarteten IDs (vollständig)", () => {
    const ids = BILLING.communicationReasons!.map((r) => r.id);
    for (const expected of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jeder Anlass hat ein label und eine direction", () => {
    for (const reason of BILLING.communicationReasons!) {
      expect(typeof reason.label).toBe("string");
      expect(reason.label.length).toBeGreaterThan(0);
      expect(["INCOMING", "OUTGOING"]).toContain(reason.direction);
    }
  });

  it("eingehende Anlässe haben direction INCOMING", () => {
    const incoming = BILLING.communicationReasons!.filter((r) =>
      r.id.startsWith("REQ_"),
    );
    for (const r of incoming) {
      expect(r.direction).toBe("INCOMING");
    }
  });

  it("ausgehende Anlässe haben direction OUTGOING", () => {
    const outgoing = BILLING.communicationReasons!.filter((r) =>
      r.id.startsWith("OUT_"),
    );
    for (const r of outgoing) {
      expect(r.direction).toBe("OUTGOING");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. BILLING hat responseGoals
// ---------------------------------------------------------------------------

describe("BILLING – M3 responseGoals", () => {
  it("responseGoals ist gesetzt und nicht leer", () => {
    expect(BILLING.responseGoals).toBeDefined();
    expect(BILLING.responseGoals!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten Antwortziele", () => {
    const ids = BILLING.responseGoals!.map((g) => g.id);
    for (const expected of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jedes Antwortziel hat ein label", () => {
    for (const goal of BILLING.responseGoals!) {
      expect(typeof goal.label).toBe("string");
      expect(goal.label.length).toBeGreaterThan(0);
    }
  });

  it("jedes Antwortziel hat mindestens eine relevantSpecificRole", () => {
    for (const goal of BILLING.responseGoals!) {
      expect(goal.relevantSpecificRoles.length).toBeGreaterThan(0);
    }
  });

  it("ISSUE_CONFIRMED ist nicht im Profil (kein echtes Erfolgsergebnis)", () => {
    const ids = BILLING.responseGoals!.map((g) => g.id);
    expect(ids).not.toContain("ISSUE_CONFIRMED");
  });

  it("IGeL / Selbstzahler ist über PROCESS_EXPLAINED mit RULE_COST_COVERAGE abgebildet", () => {
    const process = BILLING.responseGoals!.find((g) => g.id === "PROCESS_EXPLAINED");
    expect(process).toBeDefined();
    expect(process!.relevantSpecificRoles).toContain("RULE_COST_COVERAGE");
    expect(process!.relevantSpecificRoles).toContain("PROCESS_INFO");
  });

  it("externe Zuständigkeit ist über ISSUE_BLOCKED_EXTERNAL mit EXTERNAL_RESPONSIBILITY abgebildet", () => {
    const blocked = BILLING.responseGoals!.find((g) => g.id === "ISSUE_BLOCKED_EXTERNAL");
    expect(blocked).toBeDefined();
    expect(blocked!.relevantSpecificRoles).toContain("EXTERNAL_RESPONSIBILITY");
  });

  it("fehlende Daten sind über ISSUE_BLOCKED_MISSING_INFO mit MISSING_INFORMATION und MISSING_DOCUMENT abgebildet", () => {
    const missing = BILLING.responseGoals!.find((g) => g.id === "ISSUE_BLOCKED_MISSING_INFO");
    expect(missing).toBeDefined();
    expect(missing!.relevantSpecificRoles).toContain("MISSING_INFORMATION");
    expect(missing!.relevantSpecificRoles).toContain("MISSING_DOCUMENT");
  });
});

// ---------------------------------------------------------------------------
// 3. M1B verweist nur auf existierende M3-Ziel-IDs
// ---------------------------------------------------------------------------

describe("BILLING M1B → M3-Referenz-Integrität", () => {
  it("alle suggestedResponseGoalIds in communicationReasons sind bekannte responseGoal-IDs", () => {
    const knownGoalIds = new Set<string>(
      BILLING.responseGoals!.map((g) => g.id),
    );
    const violations: string[] = [];
    for (const reason of BILLING.communicationReasons!) {
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

describe("BILLING M3 → specificRole-Referenz-Integrität", () => {
  it("alle relevantSpecificRoles in responseGoals sind bekannte SpecificRole-Werte", () => {
    const violations: string[] = [];
    for (const goal of BILLING.responseGoals!) {
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
// 5. Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe
// ---------------------------------------------------------------------------

describe("BILLING Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe", () => {
  it("renderInquiryResponseFromSections enthält keine M1B- oder M3-IDs im Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
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

    for (const id of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(allText).not.toContain(id);
    }
    for (const id of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(allText).not.toContain(id);
    }
  });

  it("communicationReasons und responseGoals sind nicht Teil des Renderer-Outputs (structurally)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
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

// ---------------------------------------------------------------------------
// 6. Specific-Checkpoints – Existenz, Struktur und specificRole
// ---------------------------------------------------------------------------

describe("BILLING Specific-Checkpoints – Existenz und Struktur", () => {
  for (const id of EXPECTED_SPECIFIC_CHECKPOINT_IDS) {
    it(`${id} existiert im Katalog`, () => {
      expect(INQUIRY_CHECKPOINT_CATALOG_V2[id]).toBeDefined();
    });

    it(`${id} hat kind EXPLANATION`, () => {
      expect(INQUIRY_CHECKPOINT_CATALOG_V2[id].kind).toBe(InquiryCheckpointKind.EXPLANATION);
    });

    it(`${id} hat scope SPECIFIC`, () => {
      expect(INQUIRY_CHECKPOINT_CATALOG_V2[id].scope).toBe(InquiryCheckpointScope.SPECIFIC);
    });
  }

  it("BILLING_COST_NOT_COVERED hat specificRole RULE_COST_COVERAGE", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_COST_NOT_COVERED"].specificRole).toBe("RULE_COST_COVERAGE");
  });

  it("BILLING_PROCESS_EXTERNAL hat specificRole PROCESS_INFO", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_PROCESS_EXTERNAL"].specificRole).toBe("PROCESS_INFO");
  });

  it("BILLING_DATA_MISSING hat specificRole MISSING_INFORMATION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_DATA_MISSING"].specificRole).toBe("MISSING_INFORMATION");
  });

  it("BILLING_DOCUMENT_MISSING hat specificRole MISSING_DOCUMENT", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_DOCUMENT_MISSING"].specificRole).toBe("MISSING_DOCUMENT");
  });

  it("BILLING_EXTERNAL_RESPONSIBILITY hat specificRole EXTERNAL_RESPONSIBILITY", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_EXTERNAL_RESPONSIBILITY"].specificRole).toBe("EXTERNAL_RESPONSIBILITY");
  });

  it("BILLING-Profil referenziert alle fünf Specific-Checkpoints", () => {
    for (const id of EXPECTED_SPECIFIC_CHECKPOINT_IDS) {
      expect(BILLING.specificCheckpointIds).toContain(id);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Renderer – Specific-Checkpoint-Texte
// ---------------------------------------------------------------------------

describe("BILLING Renderer – Specific-Checkpoint-Texte", () => {
  it("BILLING_COST_NOT_COVERED YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_COST_NOT_COVERED: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_COST_NOT_COVERED: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("gesetzlichen Krankenkasse");
  });

  it("BILLING_PROCESS_EXTERNAL YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_PROCESS_EXTERNAL: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_PROCESS_EXTERNAL: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("externen Dienstleister");
  });

  it("BILLING_DATA_MISSING YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_DATA_MISSING: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_DATA_MISSING: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("vollständige Angaben");
  });

  it("BILLING_DOCUMENT_MISSING YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_DOCUMENT_MISSING: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_DOCUMENT_MISSING: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Unterlagen benötigt");
  });

  it("BILLING_EXTERNAL_RESPONSIBILITY YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_EXTERNAL_RESPONSIBILITY: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_EXTERNAL_RESPONSIBILITY: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Krankenkasse");
  });

  it("BILLING_COST_NOT_COVERED HIDE → kein Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_COST_NOT_COVERED: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_COST_NOT_COVERED: ExplanationOutputStatus.HIDE } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("gesetzlichen Krankenkasse");
  });
});
