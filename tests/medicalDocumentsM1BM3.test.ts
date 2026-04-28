/**
 * Tests für den M1B/M3-Pilot am MEDICAL_DOCUMENTS-Profil
 * (Atteste, Bescheinigungen, Sportatteste, Reise-/Schul-/Arbeitgeberbescheinigungen).
 *
 * 1. MEDICAL_DOCUMENTS hat M1B-Optionen (communicationReasons).
 * 2. MEDICAL_DOCUMENTS hat M3-Ziele (responseGoals).
 * 3. M1B verweist nur auf existierende M3-Ziel-IDs.
 * 4. M3 verweist nur auf existierende specificRoles.
 * 5. Renderer bleibt unverändert (communicationReasons/responseGoals tauchen nicht im Output auf).
 * 6. MEDICAL_DOCUMENTS_DECISION Checkpoint.
 * 7. Neue Specific-Checkpoints.
 * 8. Renderer – mainDecision und Specific-Texte.
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
  type ExplanationOutputStatus as ExplanationOutputStatusType,
} from "@/lib/inquiries/types";

const MEDICAL_DOCUMENTS = INQUIRY_PROFILE_CATALOG_V2["MEDICAL_DOCUMENTS"];

// ---------------------------------------------------------------------------
// Bekannte MEDICAL_DOCUMENTS-M1B-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_COMMUNICATION_REASON_IDS: string[] = [
  "REQ_DOCUMENT_INITIAL",
  "REQ_DOCUMENT_CLARIFICATION",
  "OUT_DOCUMENT_READY",
  "OUT_MISSING_REQUIREMENT",
  "OUT_BILLING_INFO",
];

// ---------------------------------------------------------------------------
// Bekannte MEDICAL_DOCUMENTS-M3-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_RESPONSE_GOAL_IDS: string[] = [
  "ISSUE_CONFIRMED",
  "ISSUE_BLOCKED_MISSING_INFO",
  "ISSUE_BLOCKED_COST_COVERAGE",
  "MEDICAL_REVIEW_NEEDED",
  "PROCESS_EXPLAINED",
];

// ---------------------------------------------------------------------------
// 1. MEDICAL_DOCUMENTS hat communicationReasons
// ---------------------------------------------------------------------------

describe("MEDICAL_DOCUMENTS – M1B communicationReasons", () => {
  it("Profil ist definiert", () => {
    expect(MEDICAL_DOCUMENTS).toBeDefined();
  });

  it("communicationReasons ist gesetzt und nicht leer", () => {
    expect(MEDICAL_DOCUMENTS.communicationReasons).toBeDefined();
    expect(MEDICAL_DOCUMENTS.communicationReasons!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten eingehenden Anlässe", () => {
    const ids = MEDICAL_DOCUMENTS.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("REQ_DOCUMENT_INITIAL");
    expect(ids).toContain("REQ_DOCUMENT_CLARIFICATION");
  });

  it("enthält alle erwarteten ausgehenden Anlässe", () => {
    const ids = MEDICAL_DOCUMENTS.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("OUT_DOCUMENT_READY");
    expect(ids).toContain("OUT_MISSING_REQUIREMENT");
    expect(ids).toContain("OUT_BILLING_INFO");
  });

  it("enthält genau die erwarteten IDs (vollständig)", () => {
    const ids = MEDICAL_DOCUMENTS.communicationReasons!.map((r) => r.id);
    for (const expected of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jeder Anlass hat ein label und eine direction", () => {
    for (const reason of MEDICAL_DOCUMENTS.communicationReasons!) {
      expect(typeof reason.label).toBe("string");
      expect(reason.label.length).toBeGreaterThan(0);
      expect(["INCOMING", "OUTGOING"]).toContain(reason.direction);
    }
  });

  it("eingehende Anlässe haben direction INCOMING", () => {
    const incoming = MEDICAL_DOCUMENTS.communicationReasons!.filter((r) =>
      r.id.startsWith("REQ_"),
    );
    for (const r of incoming) {
      expect(r.direction).toBe("INCOMING");
    }
  });

  it("ausgehende Anlässe haben direction OUTGOING", () => {
    const outgoing = MEDICAL_DOCUMENTS.communicationReasons!.filter((r) =>
      r.id.startsWith("OUT_"),
    );
    for (const r of outgoing) {
      expect(r.direction).toBe("OUTGOING");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. MEDICAL_DOCUMENTS hat responseGoals
// ---------------------------------------------------------------------------

describe("MEDICAL_DOCUMENTS – M3 responseGoals", () => {
  it("responseGoals ist gesetzt und nicht leer", () => {
    expect(MEDICAL_DOCUMENTS.responseGoals).toBeDefined();
    expect(MEDICAL_DOCUMENTS.responseGoals!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten Antwortziele", () => {
    const ids = MEDICAL_DOCUMENTS.responseGoals!.map((g) => g.id);
    for (const expected of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jedes Antwortziel hat ein label", () => {
    for (const goal of MEDICAL_DOCUMENTS.responseGoals!) {
      expect(typeof goal.label).toBe("string");
      expect(goal.label.length).toBeGreaterThan(0);
    }
  });

  it("jedes Antwortziel hat mindestens eine relevantSpecificRole", () => {
    for (const goal of MEDICAL_DOCUMENTS.responseGoals!) {
      expect(goal.relevantSpecificRoles.length).toBeGreaterThan(0);
    }
  });

  it("ISSUE_CONFIRMED ist über OUTCOME_INFO abgebildet", () => {
    const confirmed = MEDICAL_DOCUMENTS.responseGoals!.find(
      (g) => g.id === "ISSUE_CONFIRMED",
    );
    expect(confirmed).toBeDefined();
    expect(confirmed!.relevantSpecificRoles).toContain("OUTCOME_INFO");
  });

  it("ISSUE_BLOCKED_MISSING_INFO enthält MISSING_INFORMATION und MISSING_DOCUMENT", () => {
    const missingInfo = MEDICAL_DOCUMENTS.responseGoals!.find(
      (g) => g.id === "ISSUE_BLOCKED_MISSING_INFO",
    );
    expect(missingInfo).toBeDefined();
    expect(missingInfo!.relevantSpecificRoles).toContain("MISSING_INFORMATION");
    expect(missingInfo!.relevantSpecificRoles).toContain("MISSING_DOCUMENT");
  });

  it("ISSUE_BLOCKED_COST_COVERAGE ist über RULE_COST_COVERAGE abgebildet", () => {
    const costCoverage = MEDICAL_DOCUMENTS.responseGoals!.find(
      (g) => g.id === "ISSUE_BLOCKED_COST_COVERAGE",
    );
    expect(costCoverage).toBeDefined();
    expect(costCoverage!.relevantSpecificRoles).toContain("RULE_COST_COVERAGE");
  });

  it("MEDICAL_REVIEW_NEEDED ist über MEDICAL_REVIEW_REQUIRED abgebildet", () => {
    const medicalReview = MEDICAL_DOCUMENTS.responseGoals!.find(
      (g) => g.id === "MEDICAL_REVIEW_NEEDED",
    );
    expect(medicalReview).toBeDefined();
    expect(medicalReview!.relevantSpecificRoles).toContain("MEDICAL_REVIEW_REQUIRED");
  });

  it("PROCESS_EXPLAINED ist über PROCESS_INFO abgebildet", () => {
    const processExplained = MEDICAL_DOCUMENTS.responseGoals!.find(
      (g) => g.id === "PROCESS_EXPLAINED",
    );
    expect(processExplained).toBeDefined();
    expect(processExplained!.relevantSpecificRoles).toContain("PROCESS_INFO");
  });
});

// ---------------------------------------------------------------------------
// 3. M1B verweist nur auf existierende M3-Ziel-IDs
// ---------------------------------------------------------------------------

describe("MEDICAL_DOCUMENTS M1B → M3-Referenz-Integrität", () => {
  it("alle suggestedResponseGoalIds in communicationReasons sind bekannte responseGoal-IDs", () => {
    const knownGoalIds = new Set<string>(
      MEDICAL_DOCUMENTS.responseGoals!.map((g) => g.id),
    );
    const violations: string[] = [];
    for (const reason of MEDICAL_DOCUMENTS.communicationReasons!) {
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

describe("MEDICAL_DOCUMENTS M3 → specificRole-Referenz-Integrität", () => {
  it("alle relevantSpecificRoles in responseGoals sind bekannte SpecificRole-Werte", () => {
    const violations: string[] = [];
    for (const goal of MEDICAL_DOCUMENTS.responseGoals!) {
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

describe("MEDICAL_DOCUMENTS Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe", () => {
  it("renderInquiryResponseFromSections enthält keine M1B- oder M3-IDs im Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "MEDICAL_DOCUMENTS",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {},
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatusType>,
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
        inquiryId: "MEDICAL_DOCUMENTS",
        decisionStatus: DecisionStatus.NOT_POSSIBLE,
        checkpointStatuses: {},
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatusType>,
      },
    ]);

    expect(result).not.toHaveProperty("communicationReasons");
    expect(result).not.toHaveProperty("responseGoals");
    expect(result.sections[0]).not.toHaveProperty("communicationReasons");
    expect(result.sections[0]).not.toHaveProperty("responseGoals");
  });
});

// ---------------------------------------------------------------------------
// 6. MEDICAL_DOCUMENTS_DECISION Checkpoint
// ---------------------------------------------------------------------------

describe("MEDICAL_DOCUMENTS_DECISION Checkpoint", () => {
  it("MEDICAL_DOCUMENTS_DECISION existiert im Katalog", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_DOCUMENTS_DECISION"]).toBeDefined();
  });

  it("MEDICAL_DOCUMENTS_DECISION hat kind DECISION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_DOCUMENTS_DECISION"].kind).toBe(
      InquiryCheckpointKind.DECISION,
    );
  });

  it("MEDICAL_DOCUMENTS_DECISION hat scope SPECIFIC", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_DOCUMENTS_DECISION"].scope).toBe(
      InquiryCheckpointScope.SPECIFIC,
    );
  });

  it("MEDICAL_DOCUMENTS-Profil referenziert MEDICAL_DOCUMENTS_DECISION als decisionCheckpointId", () => {
    expect(MEDICAL_DOCUMENTS.decisionCheckpointId).toBe("MEDICAL_DOCUMENTS_DECISION");
  });

  it("MEDICAL_DOCUMENTS_DECISION hat textByStatus für POSSIBLE", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_DOCUMENTS_DECISION"];
    expect(cp.textByStatus[DecisionStatus.POSSIBLE]).toBeTruthy();
  });

  it("MEDICAL_DOCUMENTS_DECISION hat textByStatus für NOT_POSSIBLE", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_DOCUMENTS_DECISION"];
    expect(cp.textByStatus[DecisionStatus.NOT_POSSIBLE]).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 7. Neue Specific-Checkpoints
// ---------------------------------------------------------------------------

const EXPECTED_SPECIFIC_CHECKPOINT_IDS = [
  "MEDICAL_DOCUMENT_INFO_MISSING",
  "MEDICAL_DOCUMENT_DOCUMENTATION_MISSING",
  "MEDICAL_DOCUMENT_PRIVATE_SERVICE",
  "MEDICAL_DOCUMENT_PROCESS_INFO",
] as const;

describe("MEDICAL_DOCUMENTS Specific-Checkpoints – Existenz und Struktur", () => {
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

  it("MEDICAL_DOCUMENT_REVIEW_REQUIRED ist im Katalog noch vorhanden (deprecated, aber nicht gelöscht)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_DOCUMENT_REVIEW_REQUIRED"]).toBeDefined();
  });

  it("MEDICAL_DOCUMENT_REVIEW_REQUIRED hat specificRole MEDICAL_REVIEW_REQUIRED", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_DOCUMENT_REVIEW_REQUIRED"].specificRole).toBe(
      "MEDICAL_REVIEW_REQUIRED",
    );
  });

  it("MEDICAL_DOCUMENT_REVIEW_REQUIRED ist nicht mehr in specificCheckpointIds des Profils (deprecated)", () => {
    expect(MEDICAL_DOCUMENTS.specificCheckpointIds).not.toContain("MEDICAL_DOCUMENT_REVIEW_REQUIRED");
  });

  it("MEDICAL_DOCUMENT_INFO_MISSING hat specificRole MISSING_INFORMATION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_DOCUMENT_INFO_MISSING"].specificRole).toBe(
      "MISSING_INFORMATION",
    );
  });

  it("MEDICAL_DOCUMENT_DOCUMENTATION_MISSING hat specificRole MISSING_DOCUMENT", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_DOCUMENT_DOCUMENTATION_MISSING"].specificRole).toBe(
      "MISSING_DOCUMENT",
    );
  });

  it("MEDICAL_DOCUMENT_PRIVATE_SERVICE hat specificRole RULE_COST_COVERAGE", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_DOCUMENT_PRIVATE_SERVICE"].specificRole).toBe(
      "RULE_COST_COVERAGE",
    );
  });

  it("MEDICAL_DOCUMENT_PROCESS_INFO hat specificRole PROCESS_INFO", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["MEDICAL_DOCUMENT_PROCESS_INFO"].specificRole).toBe(
      "PROCESS_INFO",
    );
  });

  it("MEDICAL_DOCUMENTS-Profil referenziert alle vier verbleibenden Specific-Checkpoints", () => {
    for (const id of EXPECTED_SPECIFIC_CHECKPOINT_IDS) {
      expect(MEDICAL_DOCUMENTS.specificCheckpointIds).toContain(id);
    }
  });
});

// ---------------------------------------------------------------------------
// 8. Renderer – mainDecision und Specific-Texte
// ---------------------------------------------------------------------------

describe("MEDICAL_DOCUMENTS Renderer – mainDecision", () => {
  it("Renderer erzeugt mainDecision-Text bei decisionStatus POSSIBLE", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "MEDICAL_DOCUMENTS",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {},
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatusType>,
      },
    ]);
    expect(result.sections[0].mainDecision).toBeTruthy();
    expect(result.sections[0].mainDecision).toContain("erstellt werden");
  });

  it("Renderer erzeugt mainDecision-Text bei decisionStatus NOT_POSSIBLE", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "MEDICAL_DOCUMENTS",
        decisionStatus: DecisionStatus.NOT_POSSIBLE,
        checkpointStatuses: {},
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatusType>,
      },
    ]);
    expect(result.sections[0].mainDecision).toBeTruthy();
    expect(result.sections[0].mainDecision).toContain("derzeit nicht erstellt werden");
  });
});

describe("MEDICAL_DOCUMENTS Renderer – Specific-Checkpoint-Texte", () => {
  it("MEDICAL_CONSULTATION_REQUIRED YES + SHOW → Konsultations-Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "MEDICAL_DOCUMENTS",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { MEDICAL_CONSULTATION_REQUIRED: ExplanationStatus.YES },
        explanationOutputStatuses: {
          MEDICAL_CONSULTATION_REQUIRED: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatusType>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("ärztliche Konsultation");
  });

  it("MEDICAL_CONSULTATION_REQUIRED YES + HIDE → kein Konsultations-Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "MEDICAL_DOCUMENTS",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { MEDICAL_CONSULTATION_REQUIRED: ExplanationStatus.YES },
        explanationOutputStatuses: {
          MEDICAL_CONSULTATION_REQUIRED: ExplanationOutputStatus.HIDE,
        } as Record<string, ExplanationOutputStatusType>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("ärztliche Konsultation");
  });

  it("MEDICAL_DOCUMENT_INFO_MISSING YES + SHOW → Angaben-fehlen-Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "MEDICAL_DOCUMENTS",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { MEDICAL_DOCUMENT_INFO_MISSING: ExplanationStatus.YES },
        explanationOutputStatuses: {
          MEDICAL_DOCUMENT_INFO_MISSING: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatusType>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("wofür das Attest benötigt wird");
  });

  it("MEDICAL_DOCUMENT_DOCUMENTATION_MISSING YES + SHOW → Befunde-fehlen-Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "MEDICAL_DOCUMENTS",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { MEDICAL_DOCUMENT_DOCUMENTATION_MISSING: ExplanationStatus.YES },
        explanationOutputStatuses: {
          MEDICAL_DOCUMENT_DOCUMENTATION_MISSING: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatusType>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Befunde oder Nachweise");
  });

  it("MEDICAL_DOCUMENT_PRIVATE_SERVICE YES + SHOW → Selbstzahler-Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "MEDICAL_DOCUMENTS",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { MEDICAL_DOCUMENT_PRIVATE_SERVICE: ExplanationStatus.YES },
        explanationOutputStatuses: {
          MEDICAL_DOCUMENT_PRIVATE_SERVICE: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatusType>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Selbstzahlerleistung");
  });

  it("MEDICAL_DOCUMENT_PROCESS_INFO YES + SHOW → Prozess-Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "MEDICAL_DOCUMENTS",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { MEDICAL_DOCUMENT_PROCESS_INFO: ExplanationStatus.YES },
        explanationOutputStatuses: {
          MEDICAL_DOCUMENT_PROCESS_INFO: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatusType>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Erstellung, Abholung");
  });
});
