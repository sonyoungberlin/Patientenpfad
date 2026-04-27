/**
 * Tests für den M1B/M3-Pilot am IMMUNIZATION-Profil.
 *
 * 1. IMMUNIZATION hat M1B-Optionen (communicationReasons).
 * 2. IMMUNIZATION hat M3-Ziele (responseGoals).
 * 3. M1B verweist nur auf existierende M3-Ziel-IDs.
 * 4. M3 verweist nur auf existierende specificRoles.
 * 5. Renderer bleibt unverändert (communicationReasons/responseGoals tauchen nicht im Output auf).
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

const IMMUNIZATION = INQUIRY_PROFILE_CATALOG_V2["IMMUNIZATION"];

// ---------------------------------------------------------------------------
// Bekannte IMMUNIZATION-M1B-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_COMMUNICATION_REASON_IDS: string[] = [
  "REQ_IMMUNIZATION_INITIAL",
  "REQ_IMMUNIZATION_CLARIFICATION",
  "OUT_IMMUNIZATION_OFFERED",
  "OUT_MISSING_REQUIREMENT",
  "OUT_SPECIALIST_RESPONSIBILITY",
];

// ---------------------------------------------------------------------------
// Bekannte IMMUNIZATION-M3-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_RESPONSE_GOAL_IDS: string[] = [
  "ISSUE_CONFIRMED",
  "ISSUE_BLOCKED_EXTERNAL",
  "ISSUE_BLOCKED_MISSING_INFO",
  "MEDICAL_REVIEW_NEEDED",
  "PROCESS_EXPLAINED",
];

// ---------------------------------------------------------------------------
// 1. IMMUNIZATION hat communicationReasons
// ---------------------------------------------------------------------------

describe("IMMUNIZATION – M1B communicationReasons", () => {
  it("Profil ist definiert", () => {
    expect(IMMUNIZATION).toBeDefined();
  });

  it("communicationReasons ist gesetzt und nicht leer", () => {
    expect(IMMUNIZATION.communicationReasons).toBeDefined();
    expect(IMMUNIZATION.communicationReasons!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten eingehenden Anlässe", () => {
    const ids = IMMUNIZATION.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("REQ_IMMUNIZATION_INITIAL");
    expect(ids).toContain("REQ_IMMUNIZATION_CLARIFICATION");
  });

  it("enthält alle erwarteten ausgehenden Anlässe", () => {
    const ids = IMMUNIZATION.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("OUT_IMMUNIZATION_OFFERED");
    expect(ids).toContain("OUT_MISSING_REQUIREMENT");
    expect(ids).toContain("OUT_SPECIALIST_RESPONSIBILITY");
  });

  it("enthält genau die erwarteten IDs (vollständig)", () => {
    const ids = IMMUNIZATION.communicationReasons!.map((r) => r.id);
    for (const expected of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jeder Anlass hat ein label und eine direction", () => {
    for (const reason of IMMUNIZATION.communicationReasons!) {
      expect(typeof reason.label).toBe("string");
      expect(reason.label.length).toBeGreaterThan(0);
      expect(["INCOMING", "OUTGOING"]).toContain(reason.direction);
    }
  });

  it("eingehende Anlässe haben direction INCOMING", () => {
    const incoming = IMMUNIZATION.communicationReasons!.filter((r) =>
      r.id.startsWith("REQ_"),
    );
    for (const r of incoming) {
      expect(r.direction).toBe("INCOMING");
    }
  });

  it("ausgehende Anlässe haben direction OUTGOING", () => {
    const outgoing = IMMUNIZATION.communicationReasons!.filter((r) =>
      r.id.startsWith("OUT_"),
    );
    for (const r of outgoing) {
      expect(r.direction).toBe("OUTGOING");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. IMMUNIZATION hat responseGoals
// ---------------------------------------------------------------------------

describe("IMMUNIZATION – M3 responseGoals", () => {
  it("responseGoals ist gesetzt und nicht leer", () => {
    expect(IMMUNIZATION.responseGoals).toBeDefined();
    expect(IMMUNIZATION.responseGoals!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten Antwortziele", () => {
    const ids = IMMUNIZATION.responseGoals!.map((g) => g.id);
    for (const expected of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jedes Antwortziel hat ein label", () => {
    for (const goal of IMMUNIZATION.responseGoals!) {
      expect(typeof goal.label).toBe("string");
      expect(goal.label.length).toBeGreaterThan(0);
    }
  });

  it("jedes Antwortziel hat mindestens eine relevantSpecificRole", () => {
    for (const goal of IMMUNIZATION.responseGoals!) {
      expect(goal.relevantSpecificRoles.length).toBeGreaterThan(0);
    }
  });

  it("Impfpass / Impfstatus unklar ist über ISSUE_BLOCKED_MISSING_INFO abgebildet (MISSING_INFORMATION, MISSING_DOCUMENT)", () => {
    const blockedMissingInfo = IMMUNIZATION.responseGoals!.find(
      (g) => g.id === "ISSUE_BLOCKED_MISSING_INFO",
    );
    expect(blockedMissingInfo).toBeDefined();
    expect(blockedMissingInfo!.relevantSpecificRoles).toContain("MISSING_INFORMATION");
    expect(blockedMissingInfo!.relevantSpecificRoles).toContain("MISSING_DOCUMENT");
  });

  it("Reiseimpfung / externe Zuständigkeit ist über ISSUE_BLOCKED_EXTERNAL abgebildet (EXTERNAL_RESPONSIBILITY)", () => {
    const blockedExternal = IMMUNIZATION.responseGoals!.find(
      (g) => g.id === "ISSUE_BLOCKED_EXTERNAL",
    );
    expect(blockedExternal).toBeDefined();
    expect(blockedExternal!.relevantSpecificRoles).toContain("EXTERNAL_RESPONSIBILITY");
  });

  it("Risikogruppe / Vorerkrankung ist über MEDICAL_REVIEW_NEEDED abgebildet (MEDICAL_REVIEW_REQUIRED)", () => {
    const medicalReview = IMMUNIZATION.responseGoals!.find(
      (g) => g.id === "MEDICAL_REVIEW_NEEDED",
    );
    expect(medicalReview).toBeDefined();
    expect(medicalReview!.relevantSpecificRoles).toContain("MEDICAL_REVIEW_REQUIRED");
  });

  it("Ablauf / Termin / Impfhinweise ist über PROCESS_EXPLAINED abgebildet (PROCESS_INFO)", () => {
    const processExplained = IMMUNIZATION.responseGoals!.find(
      (g) => g.id === "PROCESS_EXPLAINED",
    );
    expect(processExplained).toBeDefined();
    expect(processExplained!.relevantSpecificRoles).toContain("PROCESS_INFO");
  });
});

// ---------------------------------------------------------------------------
// 3. M1B verweist nur auf existierende M3-Ziel-IDs
// ---------------------------------------------------------------------------

describe("IMMUNIZATION M1B → M3-Referenz-Integrität", () => {
  it("alle suggestedResponseGoalIds in communicationReasons sind bekannte responseGoal-IDs", () => {
    const knownGoalIds = new Set<string>(
      IMMUNIZATION.responseGoals!.map((g) => g.id),
    );
    const violations: string[] = [];
    for (const reason of IMMUNIZATION.communicationReasons!) {
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

describe("IMMUNIZATION M3 → specificRole-Referenz-Integrität", () => {
  it("alle relevantSpecificRoles in responseGoals sind bekannte SpecificRole-Werte", () => {
    const violations: string[] = [];
    for (const goal of IMMUNIZATION.responseGoals!) {
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

describe("IMMUNIZATION Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe", () => {
  it("renderInquiryResponseFromSections enthält keine M1B- oder M3-IDs im Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "IMMUNIZATION",
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
        inquiryId: "IMMUNIZATION",
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

// ---------------------------------------------------------------------------
// 6. IMMUNIZATION_DECISION Checkpoint
// ---------------------------------------------------------------------------

describe("IMMUNIZATION_DECISION Checkpoint", () => {
  it("IMMUNIZATION_DECISION existiert im Katalog", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["IMMUNIZATION_DECISION"]).toBeDefined();
  });

  it("IMMUNIZATION_DECISION hat kind DECISION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["IMMUNIZATION_DECISION"].kind).toBe(InquiryCheckpointKind.DECISION);
  });

  it("IMMUNIZATION_DECISION hat scope SPECIFIC", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["IMMUNIZATION_DECISION"].scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("IMMUNIZATION-Profil referenziert IMMUNIZATION_DECISION als decisionCheckpointId", () => {
    expect(IMMUNIZATION.decisionCheckpointId).toBe("IMMUNIZATION_DECISION");
  });

  it("IMMUNIZATION_DECISION hat textByStatus für POSSIBLE", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["IMMUNIZATION_DECISION"];
    expect(cp.textByStatus[DecisionStatus.POSSIBLE]).toBeTruthy();
  });

  it("IMMUNIZATION_DECISION hat textByStatus für NOT_POSSIBLE", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["IMMUNIZATION_DECISION"];
    expect(cp.textByStatus[DecisionStatus.NOT_POSSIBLE]).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 7. Neue Specific-Checkpoints
// ---------------------------------------------------------------------------

const EXPECTED_SPECIFIC_CHECKPOINT_IDS = [
  "IMMUNIZATION_STATUS_UNCLEAR",
  "IMMUNIZATION_PASS_MISSING",
  "IMMUNIZATION_TRAVEL_MEDICINE",
  "IMMUNIZATION_RISK_REVIEW_REQUIRED",
] as const;

describe("IMMUNIZATION Specific-Checkpoints – Existenz und Struktur", () => {
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

  it("IMMUNIZATION_STATUS_UNCLEAR hat specificRole MISSING_INFORMATION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["IMMUNIZATION_STATUS_UNCLEAR"].specificRole).toBe("MISSING_INFORMATION");
  });

  it("IMMUNIZATION_PASS_MISSING hat specificRole MISSING_DOCUMENT", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["IMMUNIZATION_PASS_MISSING"].specificRole).toBe("MISSING_DOCUMENT");
  });

  it("IMMUNIZATION_TRAVEL_MEDICINE hat specificRole EXTERNAL_RESPONSIBILITY", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["IMMUNIZATION_TRAVEL_MEDICINE"].specificRole).toBe("EXTERNAL_RESPONSIBILITY");
  });

  it("IMMUNIZATION_RISK_REVIEW_REQUIRED hat specificRole MEDICAL_REVIEW_REQUIRED", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["IMMUNIZATION_RISK_REVIEW_REQUIRED"].specificRole).toBe("MEDICAL_REVIEW_REQUIRED");
  });

  it("IMMUNIZATION-Profil referenziert alle vier neuen Specific-Checkpoints", () => {
    for (const id of EXPECTED_SPECIFIC_CHECKPOINT_IDS) {
      expect(IMMUNIZATION.specificCheckpointIds).toContain(id);
    }
  });
});

// ---------------------------------------------------------------------------
// 8. Renderer – mainDecision und Specific-Texte
// ---------------------------------------------------------------------------

describe("IMMUNIZATION Renderer – mainDecision", () => {
  it("Renderer erzeugt mainDecision-Text bei decisionStatus POSSIBLE", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "IMMUNIZATION",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {},
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatus>,
      },
    ]);
    expect(result.sections[0].mainDecision).toBeTruthy();
    expect(result.sections[0].mainDecision).toContain("durchgeführt");
  });

  it("Renderer erzeugt mainDecision-Text bei decisionStatus NOT_POSSIBLE", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "IMMUNIZATION",
        decisionStatus: DecisionStatus.NOT_POSSIBLE,
        checkpointStatuses: {},
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatus>,
      },
    ]);
    expect(result.sections[0].mainDecision).toBeTruthy();
    expect(result.sections[0].mainDecision).toContain("nicht durchgeführt");
  });
});

describe("IMMUNIZATION Renderer – Specific-Checkpoint-Texte", () => {
  it("IMMUNIZATION_STATUS_UNCLEAR YES + SHOW → Impfstatus-Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "IMMUNIZATION",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { IMMUNIZATION_STATUS_UNCLEAR: ExplanationStatus.YES },
        explanationOutputStatuses: { IMMUNIZATION_STATUS_UNCLEAR: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("bisher durchgeführten Impfungen");
  });

  it("IMMUNIZATION_PASS_MISSING YES + SHOW → Impfpass-Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "IMMUNIZATION",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { IMMUNIZATION_PASS_MISSING: ExplanationStatus.YES },
        explanationOutputStatuses: { IMMUNIZATION_PASS_MISSING: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Impfpass");
  });

  it("IMMUNIZATION_TRAVEL_MEDICINE YES + SHOW → Reiseimpfung-Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "IMMUNIZATION",
        decisionStatus: DecisionStatus.NOT_POSSIBLE,
        checkpointStatuses: { IMMUNIZATION_TRAVEL_MEDICINE: ExplanationStatus.YES },
        explanationOutputStatuses: { IMMUNIZATION_TRAVEL_MEDICINE: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("reisemedizinisch");
  });

  it("IMMUNIZATION_RISK_REVIEW_REQUIRED YES + SHOW → Risikoabwägungs-Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "IMMUNIZATION",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { IMMUNIZATION_RISK_REVIEW_REQUIRED: ExplanationStatus.YES },
        explanationOutputStatuses: { IMMUNIZATION_RISK_REVIEW_REQUIRED: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("ärztliche Einschätzung");
  });

  it("IMMUNIZATION_STATUS_UNCLEAR HIDE → kein Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "IMMUNIZATION",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { IMMUNIZATION_STATUS_UNCLEAR: ExplanationStatus.YES },
        explanationOutputStatuses: { IMMUNIZATION_STATUS_UNCLEAR: ExplanationOutputStatus.HIDE } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("bisher durchgeführten Impfungen");
  });
});
