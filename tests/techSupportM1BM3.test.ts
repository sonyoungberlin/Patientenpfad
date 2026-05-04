/**
 * Tests für den M1B/M3-Pilot am TECH_SUPPORT-Profil.
 *
 * 1. TECH_SUPPORT hat M1B-Optionen (communicationReasons).
 * 2. TECH_SUPPORT hat M3-Ziele (responseGoals).
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

const TECH_SUPPORT = INQUIRY_PROFILE_CATALOG_V2["TECH_SUPPORT"];

// ---------------------------------------------------------------------------
// Bekannte TECH_SUPPORT-M1B-IDs
// ---------------------------------------------------------------------------
const EXPECTED_COMMUNICATION_REASON_IDS: string[] = [
  "REQ_TECH_SUPPORT_INITIAL",
  "REQ_TECH_SUPPORT_CLARIFICATION",
  "OUT_TECH_INSTRUCTION",
  "OUT_TECH_LIMITATION",
];

// ---------------------------------------------------------------------------
// Bekannte TECH_SUPPORT-M3-IDs
// ---------------------------------------------------------------------------
const EXPECTED_RESPONSE_GOAL_IDS: string[] = [
  "PROCESS_EXPLAINED",
  "ISSUE_BLOCKED_EXTERNAL",
];

// ---------------------------------------------------------------------------
// Bekannte Specific-Checkpoint-IDs (nach Entfernung von TECH_LOGIN_PROBLEM und
// TECH_PROCESS_INSTRUCTION verbleiben nur noch zwei Specific-Checkpoints).
// ---------------------------------------------------------------------------
const EXPECTED_SPECIFIC_CHECKPOINT_IDS = [
  "TECH_VIDEO_NOT_WORKING",
  "TECH_UPLOAD_FAILED",
] as const;

// ---------------------------------------------------------------------------
// Bekannte boundAction-Checkpoint-IDs (entfernt: VIDEO/UPLOAD/LOGIN/INSTRUCTION
// _ACTION-Bausteine – siehe Profil-/Katalog-Bereinigung).
// ---------------------------------------------------------------------------
const EXPECTED_BOUND_ACTION_IDS: readonly string[] = [];

// ---------------------------------------------------------------------------
// Entfernte Checkpoint-IDs (dürfen weder im Katalog noch im Profil auftauchen)
// ---------------------------------------------------------------------------
const REMOVED_CHECKPOINT_IDS = [
  "TECH_LOGIN_PROBLEM",
  "TECH_PROCESS_INSTRUCTION",
  "TECH_LOGIN_PROBLEM_ACTION",
  "TECH_PROCESS_INSTRUCTION_ACTION",
  "TECH_VIDEO_NOT_WORKING_ACTION",
  "TECH_UPLOAD_FAILED_ACTION",
] as const;

// ---------------------------------------------------------------------------
// 1. TECH_SUPPORT hat communicationReasons
// ---------------------------------------------------------------------------

describe("TECH_SUPPORT – M1B communicationReasons", () => {
  it("Profil ist definiert", () => {
    expect(TECH_SUPPORT).toBeDefined();
  });

  it("communicationReasons ist gesetzt und nicht leer", () => {
    expect(TECH_SUPPORT.communicationReasons).toBeDefined();
    expect(TECH_SUPPORT.communicationReasons!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten eingehenden Anlässe", () => {
    const ids = TECH_SUPPORT.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("REQ_TECH_SUPPORT_INITIAL");
    expect(ids).toContain("REQ_TECH_SUPPORT_CLARIFICATION");
  });

  it("enthält alle erwarteten ausgehenden Anlässe", () => {
    const ids = TECH_SUPPORT.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("OUT_TECH_INSTRUCTION");
    expect(ids).toContain("OUT_TECH_LIMITATION");
  });

  it("enthält genau die erwarteten IDs (vollständig)", () => {
    const ids = TECH_SUPPORT.communicationReasons!.map((r) => r.id);
    for (const expected of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jeder Anlass hat ein label und eine direction", () => {
    for (const reason of TECH_SUPPORT.communicationReasons!) {
      expect(typeof reason.label).toBe("string");
      expect(reason.label.length).toBeGreaterThan(0);
      expect(["INCOMING", "OUTGOING"]).toContain(reason.direction);
    }
  });

  it("eingehende Anlässe haben direction INCOMING", () => {
    const incoming = TECH_SUPPORT.communicationReasons!.filter((r) =>
      r.id.startsWith("REQ_"),
    );
    for (const r of incoming) {
      expect(r.direction).toBe("INCOMING");
    }
  });

  it("ausgehende Anlässe haben direction OUTGOING", () => {
    const outgoing = TECH_SUPPORT.communicationReasons!.filter((r) =>
      r.id.startsWith("OUT_"),
    );
    for (const r of outgoing) {
      expect(r.direction).toBe("OUTGOING");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. TECH_SUPPORT hat responseGoals
// ---------------------------------------------------------------------------

describe("TECH_SUPPORT – M3 responseGoals", () => {
  it("responseGoals ist gesetzt und nicht leer", () => {
    expect(TECH_SUPPORT.responseGoals).toBeDefined();
    expect(TECH_SUPPORT.responseGoals!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten Antwortziele", () => {
    const ids = TECH_SUPPORT.responseGoals!.map((g) => g.id);
    for (const expected of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jedes Antwortziel hat ein label", () => {
    for (const goal of TECH_SUPPORT.responseGoals!) {
      expect(typeof goal.label).toBe("string");
      expect(goal.label.length).toBeGreaterThan(0);
    }
  });

  it("jedes Antwortziel hat mindestens eine relevantSpecificRole", () => {
    for (const goal of TECH_SUPPORT.responseGoals!) {
      expect(goal.relevantSpecificRoles.length).toBeGreaterThan(0);
    }
  });

  it("ISSUE_CONFIRMED ist nicht im Profil", () => {
    const ids = TECH_SUPPORT.responseGoals!.map((g) => g.id);
    expect(ids).not.toContain("ISSUE_CONFIRMED");
  });

  it("Anleitung ist über PROCESS_EXPLAINED mit PROCESS_INFO abgebildet", () => {
    const process = TECH_SUPPORT.responseGoals!.find((g) => g.id === "PROCESS_EXPLAINED");
    expect(process).toBeDefined();
    expect(process!.relevantSpecificRoles).toContain("PROCESS_INFO");
  });

  it("technische Sperre ist über ISSUE_BLOCKED_EXTERNAL mit CHANNEL_NOT_SUITABLE abgebildet", () => {
    const blocked = TECH_SUPPORT.responseGoals!.find((g) => g.id === "ISSUE_BLOCKED_EXTERNAL");
    expect(blocked).toBeDefined();
    expect(blocked!.relevantSpecificRoles).toContain("CHANNEL_NOT_SUITABLE");
  });
});

// ---------------------------------------------------------------------------
// 3. M1B verweist nur auf existierende M3-Ziel-IDs
// ---------------------------------------------------------------------------

describe("TECH_SUPPORT M1B → M3-Referenz-Integrität", () => {
  it("alle suggestedResponseGoalIds in communicationReasons sind bekannte responseGoal-IDs", () => {
    const knownGoalIds = new Set<string>(
      TECH_SUPPORT.responseGoals!.map((g) => g.id),
    );
    const violations: string[] = [];
    for (const reason of TECH_SUPPORT.communicationReasons!) {
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

describe("TECH_SUPPORT M3 → specificRole-Referenz-Integrität", () => {
  it("alle relevantSpecificRoles in responseGoals sind bekannte SpecificRole-Werte", () => {
    const violations: string[] = [];
    for (const goal of TECH_SUPPORT.responseGoals!) {
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

describe("TECH_SUPPORT Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe", () => {
  it("renderInquiryResponseFromSections enthält keine M1B- oder M3-IDs im Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "TECH_SUPPORT",
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
        inquiryId: "TECH_SUPPORT",
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

describe("TECH_SUPPORT Specific-Checkpoints – Existenz und Struktur", () => {
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

  it("TECH_VIDEO_NOT_WORKING hat specificRole CHANNEL_NOT_SUITABLE", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["TECH_VIDEO_NOT_WORKING"].specificRole).toBe("CHANNEL_NOT_SUITABLE");
  });

  it("TECH_UPLOAD_FAILED hat specificRole CHANNEL_NOT_SUITABLE", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["TECH_UPLOAD_FAILED"].specificRole).toBe("CHANNEL_NOT_SUITABLE");
  });

  it("TECH_SUPPORT-Profil referenziert genau die zwei verbleibenden Specific-Checkpoints", () => {
    expect(TECH_SUPPORT.specificCheckpointIds).toEqual([...EXPECTED_SPECIFIC_CHECKPOINT_IDS]);
  });

  for (const id of REMOVED_CHECKPOINT_IDS) {
    it(`${id} ist entfernt (weder im Katalog noch im TECH_SUPPORT-Profil)`, () => {
      expect(INQUIRY_CHECKPOINT_CATALOG_V2[id]).toBeUndefined();
      expect(TECH_SUPPORT.specificCheckpointIds).not.toContain(id);
      expect((TECH_SUPPORT as any).boundActionCheckpointIds).not.toContain(id);
      expect((TECH_SUPPORT as any).boundActionConditions?.[id]).toBeUndefined();
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Renderer – Specific-Checkpoint-Texte
// ---------------------------------------------------------------------------

describe("TECH_SUPPORT Renderer – Specific-Checkpoint-Texte", () => {
  it("TECH_VIDEO_NOT_WORKING YES + SHOW → Doctolib-Support-Hinweis erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "TECH_SUPPORT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { TECH_VIDEO_NOT_WORKING: ExplanationStatus.YES },
        explanationOutputStatuses: { TECH_VIDEO_NOT_WORKING: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Videosprechstunde");
    expect(paragraphs).toContain("Doctolib Support");
    // Kein Lösungsvorschlag durch die Praxis (kein Telefonkontakt-/Vor-Ort-Hinweis)
    expect(paragraphs).not.toContain("telefonisch");
    expect(paragraphs).not.toContain("persönlich in die Praxis");
  });

  it("TECH_UPLOAD_FAILED YES + SHOW → Aufforderung zum erneuten Upload erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "TECH_SUPPORT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { TECH_UPLOAD_FAILED: ExplanationStatus.YES },
        explanationOutputStatuses: { TECH_UPLOAD_FAILED: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("nicht ausreichend lesbar");
    expect(paragraphs).toContain("erneut hoch");
    // Keine Hinweise auf Post, Fax oder Vor-Ort-Abgabe
    expect(paragraphs).not.toContain("Post");
    expect(paragraphs).not.toContain("Fax");
    expect(paragraphs).not.toContain("nächsten Besuch");
  });

  it("TECH_VIDEO_NOT_WORKING HIDE → kein Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "TECH_SUPPORT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { TECH_VIDEO_NOT_WORKING: ExplanationStatus.YES },
        explanationOutputStatuses: { TECH_VIDEO_NOT_WORKING: ExplanationOutputStatus.HIDE } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Videosprechstunde");
  });

  it("TECH_UPLOAD_FAILED HIDE → kein Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "TECH_SUPPORT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { TECH_UPLOAD_FAILED: ExplanationStatus.YES },
        explanationOutputStatuses: { TECH_UPLOAD_FAILED: ExplanationOutputStatus.HIDE } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("erneut hoch");
  });
});

// ---------------------------------------------------------------------------
// TECH_SUPPORT – Action-Verfügbarkeit
// ---------------------------------------------------------------------------

describe("TECH_SUPPORT – availableActionIds", () => {
  it("PROCESSING_DELAY ist in TECH_SUPPORT.availableActionIds enthalten", () => {
    expect(TECH_SUPPORT.availableActionIds).toContain("PROCESSING_DELAY");
  });

  it("TECHNICAL_ISSUE ist in TECH_SUPPORT.availableActionIds enthalten", () => {
    expect(TECH_SUPPORT.availableActionIds).toContain("TECHNICAL_ISSUE");
  });

  it("DIGITAL_REQUEST ist in TECH_SUPPORT.availableActionIds enthalten", () => {
    expect(TECH_SUPPORT.availableActionIds).toContain("DIGITAL_REQUEST");
  });
});

// ---------------------------------------------------------------------------
// TECH_SUPPORT – boundActionCheckpointIds (nach Bereinigung leer)
// ---------------------------------------------------------------------------

describe("TECH_SUPPORT – boundActionCheckpointIds (bereinigt)", () => {
  it("TECH_SUPPORT.boundActionCheckpointIds ist nach der Bereinigung leer", () => {
    expect((TECH_SUPPORT as any).boundActionCheckpointIds).toEqual(EXPECTED_BOUND_ACTION_IDS);
  });

  it("TECH_SUPPORT.boundActionConditions ist nach der Bereinigung leer", () => {
    expect((TECH_SUPPORT as any).boundActionConditions).toEqual({});
  });
});

