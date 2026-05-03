/**
 * Tests für den M1B/M3-Pilot am LAB-Profil.
 *
 * 1. LAB hat M1B-Optionen (communicationReasons).
 * 2. LAB hat M3-Ziele (responseGoals).
 * 3. M1B verweist nur auf existierende M3-Ziel-IDs.
 * 4. M3 verweist nur auf existierende specificRoles.
 * 5. Renderer bleibt unverändert (communicationReasons/responseGoals tauchen nicht im Output auf).
 * 6. Neue Prozess-Checkpoints (LAB_INTERNAL_ORDER, LAB_EXTERNAL_REFERRAL,
 *    LAB_SELF_PAY) sind korrekt definiert und im Profil referenziert.
 *    LAB_EXTERNAL_DOCUMENT_PRESENT ist @deprecated und nicht mehr im Profil.
 */

import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import {
  DecisionStatus,
  ExplanationStatus,
  ExplanationOutputStatus,
  ActionStatus,
  InquiryCheckpointKind,
  InquiryCheckpointScope,
  type SpecificRole,
} from "@/lib/inquiries/types";

const LAB = INQUIRY_PROFILE_CATALOG_V2["LAB"];

// ---------------------------------------------------------------------------
// Bekannte LAB-M1B-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_COMMUNICATION_REASON_IDS: string[] = [
  "REQ_LAB_INITIAL",
  "REQ_LAB_CLARIFICATION",
  "OUT_LAB_ORDERED",
  "OUT_LAB_DECLINED",
  "OUT_MISSING_REQUIREMENT",
  "OUT_SPECIALIST_RESPONSIBILITY",
];

// ---------------------------------------------------------------------------
// Bekannte LAB-M3-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_RESPONSE_GOAL_IDS: string[] = [
  "ISSUE_CONFIRMED",
  "ISSUE_BLOCKED_EXTERNAL",
  "ISSUE_BLOCKED_MISSING_INFO",
  "ISSUE_BLOCKED_COST_COVERAGE",
  "MEDICAL_REVIEW_NEEDED",
  "PROCESS_EXPLAINED",
];

// ---------------------------------------------------------------------------
// 1. LAB hat communicationReasons
// ---------------------------------------------------------------------------

describe("LAB – M1B communicationReasons", () => {
  it("Profil ist definiert", () => {
    expect(LAB).toBeDefined();
  });

  it("communicationReasons ist gesetzt und nicht leer", () => {
    expect(LAB.communicationReasons).toBeDefined();
    expect(LAB.communicationReasons!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten eingehenden Anlässe", () => {
    const ids = LAB.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("REQ_LAB_INITIAL");
    expect(ids).toContain("REQ_LAB_CLARIFICATION");
  });

  it("enthält alle erwarteten ausgehenden Anlässe", () => {
    const ids = LAB.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("OUT_LAB_ORDERED");
    expect(ids).toContain("OUT_LAB_DECLINED");
    expect(ids).toContain("OUT_MISSING_REQUIREMENT");
    expect(ids).toContain("OUT_SPECIALIST_RESPONSIBILITY");
  });

  it("enthält genau die erwarteten IDs (vollständig)", () => {
    const ids = LAB.communicationReasons!.map((r) => r.id);
    for (const expected of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jeder Anlass hat ein label und eine direction", () => {
    for (const reason of LAB.communicationReasons!) {
      expect(typeof reason.label).toBe("string");
      expect(reason.label.length).toBeGreaterThan(0);
      expect(["INCOMING", "OUTGOING"]).toContain(reason.direction);
    }
  });

  it("eingehende Anlässe haben direction INCOMING", () => {
    const incoming = LAB.communicationReasons!.filter((r) =>
      r.id.startsWith("REQ_"),
    );
    for (const r of incoming) {
      expect(r.direction).toBe("INCOMING");
    }
  });

  it("ausgehende Anlässe haben direction OUTGOING", () => {
    const outgoing = LAB.communicationReasons!.filter((r) =>
      r.id.startsWith("OUT_"),
    );
    for (const r of outgoing) {
      expect(r.direction).toBe("OUTGOING");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. LAB hat responseGoals
// ---------------------------------------------------------------------------

describe("LAB – M3 responseGoals", () => {
  it("responseGoals ist gesetzt und nicht leer", () => {
    expect(LAB.responseGoals).toBeDefined();
    expect(LAB.responseGoals!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten Antwortziele", () => {
    const ids = LAB.responseGoals!.map((g) => g.id);
    for (const expected of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jedes Antwortziel hat ein label", () => {
    for (const goal of LAB.responseGoals!) {
      expect(typeof goal.label).toBe("string");
      expect(goal.label.length).toBeGreaterThan(0);
    }
  });

  it("jedes Antwortziel hat mindestens eine relevantSpecificRole", () => {
    for (const goal of LAB.responseGoals!) {
      expect(goal.relevantSpecificRoles.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. M1B verweist nur auf existierende M3-Ziel-IDs
// ---------------------------------------------------------------------------

describe("LAB M1B → M3-Referenz-Integrität", () => {
  it("alle suggestedResponseGoalIds in communicationReasons sind bekannte responseGoal-IDs", () => {
    const knownGoalIds = new Set<string>(
      LAB.responseGoals!.map((g) => g.id),
    );
    const violations: string[] = [];
    for (const reason of LAB.communicationReasons!) {
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

describe("LAB M3 → specificRole-Referenz-Integrität", () => {
  it("alle relevantSpecificRoles in responseGoals sind bekannte SpecificRole-Werte", () => {
    const violations: string[] = [];
    for (const goal of LAB.responseGoals!) {
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

describe("LAB Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe", () => {
  it("renderInquiryResponseFromSections enthält keine M1B- oder M3-IDs im Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "LAB",
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
        inquiryId: "LAB",
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
// 6. Neue LAB-Prozess-Checkpoints: Struktur
// ---------------------------------------------------------------------------

const NEW_LAB_CHECKPOINT_IDS = [
  "LAB_INTERNAL_ORDER",
  "LAB_EXTERNAL_REFERRAL",
] as const;

describe("LAB – neue Prozess-Checkpoints existieren im Catalog", () => {
  it.each(NEW_LAB_CHECKPOINT_IDS)("%s ist im Catalog definiert", (id) => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2[id]).toBeDefined();
  });

  it.each(NEW_LAB_CHECKPOINT_IDS)("%s hat kind = EXPLANATION", (id) => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2[id]!.kind).toBe(InquiryCheckpointKind.EXPLANATION);
  });

  it.each(NEW_LAB_CHECKPOINT_IDS)("%s hat scope = SPECIFIC", (id) => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2[id]!.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("LAB_INTERNAL_ORDER hat specificRole PROCESS_INFO", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["LAB_INTERNAL_ORDER"]!.specificRole).toBe("PROCESS_INFO");
  });

  it("LAB_EXTERNAL_REFERRAL hat specificRole EXTERNAL_RESPONSIBILITY", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["LAB_EXTERNAL_REFERRAL"]!.specificRole).toBe("EXTERNAL_RESPONSIBILITY");
  });

  it("LAB_EXTERNAL_DOCUMENT_PRESENT hat specificRole MISSING_DOCUMENT", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["LAB_EXTERNAL_DOCUMENT_PRESENT"]!.specificRole).toBe("MISSING_DOCUMENT");
  });

  it("LAB_EXTERNAL_DOCUMENT_PRESENT ist im Katalog noch vorhanden (@deprecated, aber nicht gelöscht)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["LAB_EXTERNAL_DOCUMENT_PRESENT"]).toBeDefined();
  });

  it("LAB_EXTERNAL_DOCUMENT_PRESENT ist nicht mehr in specificCheckpointIds des LAB-Profils (@deprecated)", () => {
    expect(LAB.specificCheckpointIds).not.toContain("LAB_EXTERNAL_DOCUMENT_PRESENT");
  });

  it("LAB_SELF_PAYER_IGEL ist im Katalog noch vorhanden (@deprecated, aber nicht gelöscht)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["LAB_SELF_PAYER_IGEL"]).toBeDefined();
  });

  it("LAB_SELF_PAYER_IGEL hat specificRole RULE_COST_COVERAGE (@deprecated)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["LAB_SELF_PAYER_IGEL"]!.specificRole).toBe("RULE_COST_COVERAGE");
  });

  it("LAB_SELF_PAYER_IGEL ist nicht mehr in specificCheckpointIds des LAB-Profils (@deprecated)", () => {
    expect(LAB.specificCheckpointIds).not.toContain("LAB_SELF_PAYER_IGEL");
  });

  it("LAB_SELF_PAY ist im Katalog noch vorhanden (deprecated, aber nicht gelöscht)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["LAB_SELF_PAY"]).toBeDefined();
  });

  it("LAB_SELF_PAY ist nicht mehr in specificCheckpointIds des LAB-Profils (deprecated)", () => {
    expect(LAB.specificCheckpointIds).not.toContain("LAB_SELF_PAY");
  });

  it("LAB_EXTERNAL_BILLING ist im Katalog noch vorhanden (deprecated, aber nicht gelöscht)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["LAB_EXTERNAL_BILLING"]).toBeDefined();
  });

  it("LAB_EXTERNAL_BILLING ist nicht mehr in specificCheckpointIds des LAB-Profils (deprecated)", () => {
    expect(LAB.specificCheckpointIds).not.toContain("LAB_EXTERNAL_BILLING");
  });
});

// ---------------------------------------------------------------------------
// 7. Neue Checkpoints sind im LAB-Profil referenziert
// ---------------------------------------------------------------------------

describe("LAB – neue Checkpoints sind in specificCheckpointIds enthalten", () => {
  it.each(NEW_LAB_CHECKPOINT_IDS)("%s ist in LAB.specificCheckpointIds", (id) => {
    expect(LAB.specificCheckpointIds).toContain(id);
  });
});

// ---------------------------------------------------------------------------
// 8. Renderer-Verhalten für neue Checkpoints (YES+SHOW → Text, NO/HIDE → kein Text)
// ---------------------------------------------------------------------------

describe("LAB – Renderer gibt Texte der neuen Checkpoints korrekt aus", () => {
  it("LAB_INTERNAL_ORDER: YES + SHOW liefert keinen eigenen Text (Schalter-only)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "LAB",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { LAB_INTERNAL_ORDER: ExplanationStatus.YES },
        explanationOutputStatuses: {
          LAB_INTERNAL_ORDER: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    // Checkpoint ist jetzt ein reiner Schalter → kein attachedParagraph aus dem Checkpoint
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
    const allText = result.sections
      .flatMap((s) => [s.mainDecision ?? "", ...s.attachedParagraphs])
      .join(" ");
    expect(allText).not.toContain("LKBP25");
    expect(allText).not.toContain("Ärztliche Anordnung");
  });

  it("LAB_APPOINTMENT_INTERNAL enthält Buchungsanleitung mit Code LKBP25", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_APPOINTMENT_INTERNAL"];
    expect(cp).toBeDefined();
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("LKBP25");
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("Ärztliche Anordnung");
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("Blutwerte");
  });

  it("LAB_INTERNAL_ORDER: YES + HIDE liefert keinen Text", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "LAB",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { LAB_INTERNAL_ORDER: ExplanationStatus.YES },
        explanationOutputStatuses: {
          LAB_INTERNAL_ORDER: ExplanationOutputStatus.HIDE,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sections
      .flatMap((s) => [s.mainDecision ?? "", ...s.attachedParagraphs])
      .join(" ");
    expect(allText).not.toContain("LKBP25");
  });

  it("LAB_EXTERNAL_REFERRAL: YES + SHOW liefert keinen eigenen Text (Schalter-only)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "LAB",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { LAB_EXTERNAL_REFERRAL: ExplanationStatus.YES },
        explanationOutputStatuses: {
          LAB_EXTERNAL_REFERRAL: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    // Checkpoint ist jetzt ein reiner Schalter → kein attachedParagraph aus dem Checkpoint
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
    const allText = result.sections
      .flatMap((s) => [s.mainDecision ?? "", ...s.attachedParagraphs])
      .join(" ");
    expect(allText).not.toContain("Überweisung im Original");
    expect(allText).not.toContain("Bitte buchen Sie einen Termin für individuelle Laborwerte");
  });

  it("LAB_EXTERNAL_REFERRAL: NO + SHOW liefert keinen eigenen Text (Schalter-only)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "LAB",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { LAB_EXTERNAL_REFERRAL: ExplanationStatus.NO },
        explanationOutputStatuses: {
          LAB_EXTERNAL_REFERRAL: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    // NO ist silent – kein attachedParagraph
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
    const allText = result.sections
      .flatMap((s) => [s.mainDecision ?? "", ...s.attachedParagraphs])
      .join(" ");
    expect(allText).not.toContain("Original-Dokument zum Termin");
    expect(allText).not.toContain("Selbstzahler abgerechnet");
  });

  it("LAB_EXTERNAL_REFERRAL: YES-Text enthält nicht mehr den Bestätigungssatz 'Eine Überweisung Ihres Facharztes liegt vor'", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "LAB",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { LAB_EXTERNAL_REFERRAL: ExplanationStatus.YES },
        explanationOutputStatuses: {
          LAB_EXTERNAL_REFERRAL: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sections
      .flatMap((s) => [s.mainDecision ?? "", ...s.attachedParagraphs])
      .join(" ");
    expect(allText).not.toContain("Eine Überweisung Ihres Facharztes liegt vor");
  });

  it("LAB_EXTERNAL_DOCUMENT_PRESENT (@deprecated): Renderer ignoriert den Checkpoint, da er nicht mehr in LAB.specificCheckpointIds ist", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "LAB",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { LAB_EXTERNAL_DOCUMENT_PRESENT: ExplanationStatus.NO },
        explanationOutputStatuses: {
          LAB_EXTERNAL_DOCUMENT_PRESENT: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sections
      .flatMap((s) => [s.mainDecision ?? "", ...s.attachedParagraphs])
      .join(" ");
    // Checkpoint ist @deprecated und nicht mehr im Profil → kein Output
    expect(allText).not.toContain("Überweisung Ihres behandelnden Facharztes im Original");
  });

  it("LAB_SELF_PAYER_IGEL (@deprecated): Renderer ignoriert den Checkpoint, da er nicht mehr in LAB.specificCheckpointIds ist", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "LAB",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { LAB_SELF_PAYER_IGEL: ExplanationStatus.YES },
        explanationOutputStatuses: {
          LAB_SELF_PAYER_IGEL: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sections
      .flatMap((s) => [s.mainDecision ?? "", ...s.attachedParagraphs])
      .join(" ");
    // Checkpoint ist @deprecated und nicht mehr im Profil → kein Output
    expect(allText).not.toContain("Selbstzahlerleistungen (IGeL)");
  });
});

// ---------------------------------------------------------------------------
// LAB – boundActionCheckpointIds
// ---------------------------------------------------------------------------

describe("LAB – boundActionCheckpointIds", () => {
  it("LAB_RESULT_TIME ist in LAB.boundActionCheckpointIds enthalten", () => {
    expect(LAB.boundActionCheckpointIds).toContain("LAB_RESULT_TIME");
  });

  it("LAB_FASTING_REQUIRED ist weiterhin in LAB.boundActionCheckpointIds enthalten", () => {
    expect(LAB.boundActionCheckpointIds).toContain("LAB_FASTING_REQUIRED");
  });

  it("LAB_RESULT_TIME ist im Katalog als ACTION/SPECIFIC definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_RESULT_TIME"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("LAB_COST_COVERED_BY_REFERRAL ist in LAB.boundActionCheckpointIds enthalten", () => {
    expect(LAB.boundActionCheckpointIds).toContain("LAB_COST_COVERED_BY_REFERRAL");
  });

  it("LAB_SELF_PAYER_NOTE ist in LAB.boundActionCheckpointIds enthalten", () => {
    expect(LAB.boundActionCheckpointIds).toContain("LAB_SELF_PAYER_NOTE");
  });
});

// ---------------------------------------------------------------------------
// LAB – neue M3-Bausteine
// ---------------------------------------------------------------------------

describe("LAB – neue M3-Bausteine (LAB_COST_COVERED_BY_REFERRAL, LAB_SELF_PAYER_NOTE)", () => {
  it("LAB_COST_COVERED_BY_REFERRAL ist im Katalog als ACTION/SPECIFIC definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_COST_COVERED_BY_REFERRAL"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("LAB_COST_COVERED_BY_REFERRAL enthält Kostenhinweis-Text", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_COST_COVERED_BY_REFERRAL"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("Originalüberweisung");
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("Selbstzahlerleistung");
  });

  it("LAB_COST_COVERED_BY_REFERRAL: showWhenAny nur bei LAB_EXTERNAL_REFERRAL = YES", () => {
    const condition = LAB.boundActionConditions?.["LAB_COST_COVERED_BY_REFERRAL"];
    expect(condition).toBeDefined();
    expect(condition?.showWhenAny).toEqual([{ LAB_EXTERNAL_REFERRAL: "YES" }]);
    expect(condition?.hideWhenAny).toBeUndefined();
  });

  it("LAB_SELF_PAYER_NOTE ist im Katalog als ACTION/SPECIFIC definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_SELF_PAYER_NOTE"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("LAB_SELF_PAYER_NOTE enthält Selbstzahler/Wunschwert-Text", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_SELF_PAYER_NOTE"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("Selbstzahlerleistung");
  });

  it("LAB_SELF_PAYER_NOTE: hideWhenAny bei LAB_INTERNAL_ORDER=YES oder LAB_EXTERNAL_REFERRAL=YES", () => {
    const condition = LAB.boundActionConditions?.["LAB_SELF_PAYER_NOTE"];
    expect(condition).toBeDefined();
    expect(condition?.hideWhenAny).toContainEqual({ LAB_INTERNAL_ORDER: "YES" });
    expect(condition?.hideWhenAny).toContainEqual({ LAB_EXTERNAL_REFERRAL: "YES" });
    expect(condition?.showWhenAny).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// LAB – boundActionConditions (Sichtbarkeitslogik)
// ---------------------------------------------------------------------------

describe("LAB – boundActionConditions", () => {
  it("LAB_BRING_REFERRAL: showWhenAny nur noch bei LAB_EXTERNAL_REFERRAL = YES (nicht mehr bei LAB_INTERNAL_ORDER)", () => {
    const condition = LAB.boundActionConditions?.["LAB_BRING_REFERRAL"];
    expect(condition).toBeDefined();
    expect(condition?.showWhenAny).toEqual([{ LAB_EXTERNAL_REFERRAL: "YES" }]);
    // LAB_INTERNAL_ORDER darf nicht mehr in der Condition stehen
    const hasInternalOrder = condition?.showWhenAny?.some((c) => "LAB_INTERNAL_ORDER" in c);
    expect(hasInternalOrder).toBe(false);
  });

  it("LAB_APPOINTMENT_INTERNAL: showWhenAny bei LAB_INTERNAL_ORDER = YES", () => {
    const condition = LAB.boundActionConditions?.["LAB_APPOINTMENT_INTERNAL"];
    expect(condition?.showWhenAny).toEqual([{ LAB_INTERNAL_ORDER: "YES" }]);
  });

  it("LAB_APPOINTMENT_INTERNAL: hideWhenAny bei LAB_CHECKUP_RULES = YES", () => {
    const condition = LAB.boundActionConditions?.["LAB_APPOINTMENT_INTERNAL"];
    expect(condition?.hideWhenAny).toContainEqual({ LAB_CHECKUP_RULES: "YES" });
  });

  it("LAB_APPOINTMENT_CHECKUP ist in LAB.boundActionCheckpointIds enthalten", () => {
    expect(LAB.boundActionCheckpointIds).toContain("LAB_APPOINTMENT_CHECKUP");
  });

  it("LAB_APPOINTMENT_CHECKUP: showWhenAny bei LAB_CHECKUP_RULES = YES", () => {
    const condition = LAB.boundActionConditions?.["LAB_APPOINTMENT_CHECKUP"];
    expect(condition?.showWhenAny).toContainEqual({ LAB_CHECKUP_RULES: "YES" });
  });

  it("LAB_APPOINTMENT_CHECKUP ist im Katalog als ACTION/SPECIFIC definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_APPOINTMENT_CHECKUP"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("LAB_APPOINTMENT_CHECKUP enthält Check-up-Text und keinen Code", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_APPOINTMENT_CHECKUP"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("Check-Up - 1. Termin (Basiswerte Labor)");
    expect(cp.textByStatus[ActionStatus.ACTIVE]).not.toContain("LKBP25");
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("kein Code erforderlich");
  });

  it("LAB_APPOINTMENT_CHECKUP ACTIVE → enthält Check-Up Text und kein LKBP25", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "LAB",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { LAB_APPOINTMENT_CHECKUP: ActionStatus.ACTIVE },
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sections
      .flatMap((s) => [s.mainDecision ?? "", ...s.attachedParagraphs])
      .join(" ");
    expect(allText).toContain("Check-Up - 1. Termin (Basiswerte Labor)");
    expect(allText).not.toContain("LKBP25");
  });

  it("LAB_APPOINTMENT_INTERNAL ACTIVE → enthält weiterhin Code LKBP25", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "LAB",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { LAB_APPOINTMENT_INTERNAL: ActionStatus.ACTIVE },
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sections
      .flatMap((s) => [s.mainDecision ?? "", ...s.attachedParagraphs])
      .join(" ");
    expect(allText).toContain("LKBP25");
  });

  it("LAB_APPOINTMENT_INTERNAL hat hideWhenAny für LAB_CHECKUP_RULES=YES (Check-up hat Vorrang, UI-Logik)", () => {
    const condition = LAB.boundActionConditions?.["LAB_APPOINTMENT_INTERNAL"];
    expect(condition?.hideWhenAny).toContainEqual({ LAB_CHECKUP_RULES: "YES" });
  });

  it("LAB_APPOINTMENT_INDIVIDUAL: hideWhenAny bei LAB_INTERNAL_ORDER = YES", () => {
    const condition = LAB.boundActionConditions?.["LAB_APPOINTMENT_INDIVIDUAL"];
    expect(condition?.hideWhenAny).toContainEqual({ LAB_INTERNAL_ORDER: "YES" });
  });

  it("LAB_FASTING_REQUIRED: wird grundsätzlich in M3 angezeigt, außer bei LAB_MPU_EXCLUSION=YES", () => {
    const condition = LAB.boundActionConditions?.["LAB_FASTING_REQUIRED"];
    expect(condition).toBeDefined();
    expect(condition?.hideWhenAny).toEqual([{ LAB_MPU_EXCLUSION: "YES" }]);
    expect(condition?.showWhenAny).toBeUndefined();
  });

  it("LAB_RESULT_TIME: wird grundsätzlich in M3 angezeigt, außer bei LAB_MPU_EXCLUSION=YES", () => {
    const condition = LAB.boundActionConditions?.["LAB_RESULT_TIME"];
    expect(condition).toBeDefined();
    expect(condition?.hideWhenAny).toEqual([{ LAB_MPU_EXCLUSION: "YES" }]);
    expect(condition?.showWhenAny).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// LAB – LAB_RESULT_TIME Deduplizierung
// ---------------------------------------------------------------------------

describe("LAB – LAB_RESULT_TIME nicht mehr in SAMPLE_COLLECTION", () => {
  it("SAMPLE_COLLECTION enthält LAB_RESULT_TIME nicht mehr in boundActionCheckpointIds", () => {
    const sampleCollection = INQUIRY_PROFILE_CATALOG_V2["SAMPLE_COLLECTION"];
    expect(sampleCollection?.boundActionCheckpointIds).not.toContain("LAB_RESULT_TIME");
  });

  it("LAB_RESULT_TIME ist weiterhin in LAB.boundActionCheckpointIds enthalten", () => {
    expect(LAB.boundActionCheckpointIds).toContain("LAB_RESULT_TIME");
  });
});

// ---------------------------------------------------------------------------
// LAB – TERMIN_PREPARATION_REQUIRED (aus LAB entfernt, Duplikat mit LAB_FASTING_REQUIRED)
// ---------------------------------------------------------------------------

describe("LAB – TERMIN_PREPARATION_REQUIRED", () => {
  it("TERMIN_PREPARATION_REQUIRED ist NICHT mehr in LAB.boundGlobalCheckpointIds (Dopplung beseitigt)", () => {
    expect(LAB.boundGlobalCheckpointIds).not.toContain("TERMIN_PREPARATION_REQUIRED");
  });

  it("LAB.globalHints enthält keinen TERMIN_PREPARATION_REQUIRED-Eintrag mehr", () => {
    expect(LAB.globalHints["TERMIN_PREPARATION_REQUIRED"]).toBeUndefined();
  });

  it("TERMIN_PREPARATION_REQUIRED existiert weiterhin im Katalog (für andere Profile)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["TERMIN_PREPARATION_REQUIRED"]).toBeDefined();
  });

  it("TERMIN_PREPARATION_REQUIRED hat classification MODULAR", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["TERMIN_PREPARATION_REQUIRED"].classification).toBe("MODULAR");
  });

  it("TERMIN_PREPARATION_REQUIRED hat scope GLOBAL", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["TERMIN_PREPARATION_REQUIRED"].scope).toBe(InquiryCheckpointScope.GLOBAL);
  });

  it("TERMIN_PREPARATION_REQUIRED hat leeres textByStatus (kein eigener Text)", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["TERMIN_PREPARATION_REQUIRED"];
    expect(Object.keys(cp.textByStatus)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// LAB – LAB_DECISION POSSIBLE-Text
// ---------------------------------------------------------------------------

describe("LAB – LAB_DECISION POSSIBLE-Text", () => {
  it("LAB_DECISION POSSIBLE enthält 'Ein Termin für die Blutentnahme kann direkt vereinbart werden'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_DECISION"];
    expect(cp.textByStatus[DecisionStatus.POSSIBLE]).toContain("Ein Termin für die Blutentnahme kann direkt vereinbart werden");
  });

  it("LAB_DECISION POSSIBLE enthält nicht mehr den alten Text 'Kontrolle der Blutwerte kann bei uns durchgeführt werden'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_DECISION"];
    expect(cp.textByStatus[DecisionStatus.POSSIBLE]).not.toContain("Kontrolle der Blutwerte kann bei uns durchgeführt werden");
  });

  it("LAB_DECISION NOT_POSSIBLE enthält 'ärztliche Abklärung erforderlich'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_DECISION"];
    expect(cp.textByStatus[DecisionStatus.NOT_POSSIBLE]).toContain("ärztliche Abklärung erforderlich");
  });

  it("LAB_DECISION label enthält die neue Frage zur Terminvereinbarung", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_DECISION"];
    expect(cp.label).toContain("Blutentnahme");
  });
});
