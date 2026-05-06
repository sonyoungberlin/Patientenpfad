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
  ActionStatus,
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
// Bekannte Specific-Checkpoint-IDs (BILLING_PROCESS_EXTERNAL, BILLING_DATA_MISSING und BILLING_ONSITE_PAYMENT sind @deprecated und entfernt)
// ---------------------------------------------------------------------------
const EXPECTED_SPECIFIC_CHECKPOINT_IDS = [
  "BILLING_COST_NOT_COVERED",
  "BILLING_EXTERNAL_PROVIDER",
  "BILLING_ADDRESS_MISSING",
  "BILLING_DOCUMENT_MISSING",
  "BILLING_EXTERNAL_RESPONSIBILITY",
  "BILLING_INVOICE_TIMING",
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

  it("BILLING_EXTERNAL_PROVIDER hat specificRole PROCESS_INFO", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_EXTERNAL_PROVIDER"].specificRole).toBe("PROCESS_INFO");
  });

  it("BILLING_ADDRESS_MISSING hat specificRole MISSING_INFORMATION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ADDRESS_MISSING"].specificRole).toBe("MISSING_INFORMATION");
  });

  it("BILLING_DOCUMENT_MISSING hat specificRole MISSING_DOCUMENT", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_DOCUMENT_MISSING"].specificRole).toBe("MISSING_DOCUMENT");
  });

  it("BILLING_EXTERNAL_RESPONSIBILITY hat specificRole EXTERNAL_RESPONSIBILITY", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_EXTERNAL_RESPONSIBILITY"].specificRole).toBe("EXTERNAL_RESPONSIBILITY");
  });

  it("BILLING_INVOICE_TIMING ist im Katalog noch vorhanden (@deprecated, aber nicht gelöscht)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_INVOICE_TIMING"]).toBeDefined();
  });

  it("BILLING_ONSITE_PAYMENT ist im Katalog vorhanden (reaktiviert als ACTION-Baustein, nicht mehr in specificCheckpointIds)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ONSITE_PAYMENT"]).toBeDefined();
  });

  it("BILLING_PROCESS_EXTERNAL ist im Katalog noch vorhanden (@deprecated, aber nicht gelöscht)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_PROCESS_EXTERNAL"]).toBeDefined();
  });

  it("BILLING_DATA_MISSING ist im Katalog noch vorhanden (@deprecated, aber nicht gelöscht)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_DATA_MISSING"]).toBeDefined();
  });

  it("BILLING-Profil referenziert genau sechs Specific-Checkpoints (PROCESS_EXTERNAL, DATA_MISSING und ONSITE_PAYMENT nicht in specificCheckpointIds)", () => {
    for (const id of EXPECTED_SPECIFIC_CHECKPOINT_IDS) {
      expect(BILLING.specificCheckpointIds).toContain(id);
    }
    expect(BILLING.specificCheckpointIds).not.toContain("BILLING_PROCESS_EXTERNAL");
    expect(BILLING.specificCheckpointIds).not.toContain("BILLING_DATA_MISSING");
    expect(BILLING.specificCheckpointIds).not.toContain("BILLING_ONSITE_PAYMENT");
  });
});

// ---------------------------------------------------------------------------
// 7. Renderer – Specific-Checkpoint-Texte
// ---------------------------------------------------------------------------

describe("BILLING Renderer – Specific-Checkpoint-Texte", () => {
  it("BILLING_COST_NOT_COVERED YES + SHOW → M2-Schalter hat keinen eigenen Patiententext (leer)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_COST_NOT_COVERED: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_COST_NOT_COVERED: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    // textByStatus.YES ist leer – der M2-Schalter trägt keinen Patiententext.
    // Der Inhalt wird stattdessen über ACTION-Bausteine (BILLING_NOT_COVERED_BY_STATUTORY etc.) geliefert.
    expect(paragraphs).not.toContain("gesetzlichen Krankenkasse");
  });

  it("BILLING_EXTERNAL_PROVIDER YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_EXTERNAL_PROVIDER: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_EXTERNAL_PROVIDER: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Abrechnungsdienstleister");
  });

  it("BILLING_EXTERNAL_PROVIDER YES + SHOW → Text enthält 'Rechnung erhalten Sie'", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_EXTERNAL_PROVIDER: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_EXTERNAL_PROVIDER: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Rechnung erhalten Sie");
    expect(paragraphs).not.toContain("Abrechnung erfolgt");
  });

  it("BILLING_ADDRESS_MISSING YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_ADDRESS_MISSING: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_ADDRESS_MISSING: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Postadresse");
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
    expect(paragraphs).toContain("privatärztlicher Abrechnungsschein");
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

  it("BILLING_INVOICE_TIMING YES + SHOW → Text erscheint (wiederhergestellt)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_INVOICE_TIMING: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_INVOICE_TIMING: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("quartalsweise");
  });

  it("BILLING_ONSITE_PAYMENT als ACTION nicht über Renderer sichtbar (nicht in specificCheckpointIds)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_ONSITE_PAYMENT: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_ONSITE_PAYMENT: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    // BILLING_ONSITE_PAYMENT ist kein EXPLANATION-Checkpoint mehr und nicht in specificCheckpointIds →
    // der Renderer ignoriert es. Anzeige erfolgt nur über boundActionConditions in M3.
    expect(paragraphs).not.toContain("per Karte");
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

  it("BILLING_PROCESS_EXTERNAL ist @deprecated und nicht mehr im Profil – kein Renderer-Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_PROCESS_EXTERNAL: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_PROCESS_EXTERNAL: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    // BILLING_PROCESS_EXTERNAL not in profile → renderer ignores it
    expect(paragraphs).not.toContain("beauftragte Labor");
  });

  it("BILLING_DATA_MISSING ist @deprecated und nicht mehr im Profil – kein Renderer-Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { BILLING_DATA_MISSING: ExplanationStatus.YES },
        explanationOutputStatuses: { BILLING_DATA_MISSING: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    // BILLING_DATA_MISSING not in profile → renderer ignores it
    expect(paragraphs).not.toContain("vollständige Angaben");
  });
});

// ---------------------------------------------------------------------------
// 8. docByStatus – interne Aktennotizen für BILLING-Checkpoints
// ---------------------------------------------------------------------------

describe("BILLING Specific-Checkpoints – docByStatus", () => {
  it("BILLING_EXTERNAL_PROVIDER hat docByStatus[YES] befüllt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_EXTERNAL_PROVIDER"];
    expect(cp.docByStatus).toBeDefined();
    expect(cp.docByStatus![ExplanationStatus.YES]).toBeTruthy();
  });

  it("BILLING_EXTERNAL_PROVIDER docByStatus[YES] ist kürzer als textByStatus[YES]", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_EXTERNAL_PROVIDER"];
    expect(cp.docByStatus![ExplanationStatus.YES]!.length).toBeLessThan(
      cp.textByStatus[ExplanationStatus.YES]!.length,
    );
  });

  it("BILLING_EXTERNAL_PROVIDER docByStatus[YES] enthält 'externe Abrechnung'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_EXTERNAL_PROVIDER"];
    expect(cp.docByStatus![ExplanationStatus.YES]).toContain("externe Abrechnung");
  });

  it("BILLING_ADDRESS_MISSING hat docByStatus[YES] befüllt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ADDRESS_MISSING"];
    expect(cp.docByStatus).toBeDefined();
    expect(cp.docByStatus![ExplanationStatus.YES]).toBeTruthy();
  });

  it("BILLING_ADDRESS_MISSING docByStatus[YES] ist kürzer als textByStatus[YES]", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ADDRESS_MISSING"];
    expect(cp.docByStatus![ExplanationStatus.YES]!.length).toBeLessThan(
      cp.textByStatus[ExplanationStatus.YES]!.length,
    );
  });

  it("BILLING_ADDRESS_MISSING docByStatus[YES] enthält 'Adresse'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ADDRESS_MISSING"];
    expect(cp.docByStatus![ExplanationStatus.YES]).toContain("Adresse");
  });

  it("BILLING_COST_NOT_COVERED hat docByStatus[YES] befüllt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_COST_NOT_COVERED"];
    expect(cp.docByStatus).toBeDefined();
    expect(cp.docByStatus![ExplanationStatus.YES]).toBeTruthy();
  });

  it("BILLING_DOCUMENT_MISSING hat docByStatus[YES] befüllt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_DOCUMENT_MISSING"];
    expect(cp.docByStatus).toBeDefined();
    expect(cp.docByStatus![ExplanationStatus.YES]).toBeTruthy();
  });

  it("BILLING_EXTERNAL_RESPONSIBILITY hat docByStatus[YES] befüllt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_EXTERNAL_RESPONSIBILITY"];
    expect(cp.docByStatus).toBeDefined();
    expect(cp.docByStatus![ExplanationStatus.YES]).toBeTruthy();
  });

  it("docByStatus-Texte sind kürzer als Patiententexte (kein langer Text in Dokumentation)", () => {
    // BILLING_COST_NOT_COVERED ausgenommen: textByStatus.YES ist leer (M2-Schalter),
    // docByStatus.YES enthält aber weiterhin eine interne Aktennotiz.
    const idsToCheck = [
      "BILLING_EXTERNAL_PROVIDER",
      "BILLING_ADDRESS_MISSING",
      "BILLING_DOCUMENT_MISSING",
      "BILLING_EXTERNAL_RESPONSIBILITY",
    ] as const;
    for (const id of idsToCheck) {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];
      expect(cp.docByStatus![ExplanationStatus.YES]!.length).toBeLessThan(
        cp.textByStatus[ExplanationStatus.YES]!.length,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 9. BILLING_COST_NOT_COVERED – M2-Schalter ohne Patiententext (Inhalt in ACTION-Bausteinen)
// ---------------------------------------------------------------------------

describe("BILLING_COST_NOT_COVERED – Patiententext für LAB-Kontext", () => {
  it("BILLING_COST_NOT_COVERED textByStatus.YES enthält LAB-Selbstzahler-Erklärung", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_COST_NOT_COVERED"];
    expect(cp.textByStatus[ExplanationStatus.YES]).toContain("Kassenleistung");
  });

  it("BILLING_COST_NOT_COVERED docByStatus[YES] enthält 'IGeL' (interne Aktennotiz bleibt erhalten)", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_COST_NOT_COVERED"];
    expect(cp.docByStatus![ExplanationStatus.YES]).toContain("IGeL");
  });

  it("Labor-Selbstzahler-Kombination → enthält Partnerlabor-Hinweis (über BILLING_EXTERNAL_PROVIDER)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          BILLING_COST_NOT_COVERED: ExplanationStatus.YES,
          BILLING_EXTERNAL_PROVIDER: ExplanationStatus.YES,
        },
        explanationOutputStatuses: {
          BILLING_COST_NOT_COVERED: ExplanationOutputStatus.SHOW,
          BILLING_EXTERNAL_PROVIDER: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sections[0].attachedParagraphs.join(" ");
    expect(allText).toContain("Partnerlabor");
  });
});

// ---------------------------------------------------------------------------
// 10. BILLING boundActionCheckpointIds und boundActionConditions
// ---------------------------------------------------------------------------

describe("BILLING – boundActionCheckpointIds", () => {
  it("BILLING hat ein boundActionCheckpointIds-Array", () => {
    expect(BILLING.boundActionCheckpointIds).toBeDefined();
    expect(Array.isArray(BILLING.boundActionCheckpointIds)).toBe(true);
  });

  it("enthält BILLING_NOT_COVERED_BY_STATUTORY", () => {
    expect(BILLING.boundActionCheckpointIds).toContain("BILLING_NOT_COVERED_BY_STATUTORY");
  });

  it("enthält BILLING_GOA_BILLING", () => {
    expect(BILLING.boundActionCheckpointIds).toContain("BILLING_GOA_BILLING");
  });

  it("enthält BILLING_ONSITE_PAYMENT", () => {
    expect(BILLING.boundActionCheckpointIds).toContain("BILLING_ONSITE_PAYMENT");
  });
});

describe("BILLING – boundActionConditions showWhenAny für BILLING_COST_NOT_COVERED", () => {
  it("BILLING hat boundActionConditions definiert", () => {
    expect(BILLING.boundActionConditions).toBeDefined();
  });

  it("BILLING_NOT_COVERED_BY_STATUTORY: showWhenAny enthält { BILLING_COST_NOT_COVERED: 'YES' }", () => {
    const condition = BILLING.boundActionConditions?.["BILLING_NOT_COVERED_BY_STATUTORY"];
    expect(condition).toBeDefined();
    expect(condition!.showWhenAny).toBeDefined();
    expect(condition!.showWhenAny).toContainEqual({ BILLING_COST_NOT_COVERED: "YES" });
    expect(condition!.hideWhenAny).toBeUndefined();
  });

  it("BILLING_GOA_BILLING: showWhenAny enthält { BILLING_COST_NOT_COVERED: 'YES' }", () => {
    const condition = BILLING.boundActionConditions?.["BILLING_GOA_BILLING"];
    expect(condition).toBeDefined();
    expect(condition!.showWhenAny).toBeDefined();
    expect(condition!.showWhenAny).toContainEqual({ BILLING_COST_NOT_COVERED: "YES" });
    expect(condition!.hideWhenAny).toBeUndefined();
  });

  it("BILLING_ONSITE_PAYMENT: showWhenAny enthält { BILLING_COST_NOT_COVERED: 'YES' }", () => {
    const condition = BILLING.boundActionConditions?.["BILLING_ONSITE_PAYMENT"];
    expect(condition).toBeDefined();
    expect(condition!.showWhenAny).toBeDefined();
    expect(condition!.showWhenAny).toContainEqual({ BILLING_COST_NOT_COVERED: "YES" });
    expect(condition!.hideWhenAny).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 11. Neue ACTION-Checkpoints im Katalog
// ---------------------------------------------------------------------------

describe("BILLING – neue ACTION-Checkpoints im Katalog", () => {
  it("BILLING_NOT_COVERED_BY_STATUTORY existiert im Katalog", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_NOT_COVERED_BY_STATUTORY"]).toBeDefined();
  });

  it("BILLING_NOT_COVERED_BY_STATUTORY hat kind ACTION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_NOT_COVERED_BY_STATUTORY"].kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("BILLING_NOT_COVERED_BY_STATUTORY hat scope SPECIFIC", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_NOT_COVERED_BY_STATUTORY"].scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("BILLING_NOT_COVERED_BY_STATUTORY Text enthält 'gesetzlichen Krankenkasse'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_NOT_COVERED_BY_STATUTORY"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("gesetzlichen Krankenkasse");
  });

  it("BILLING_GOA_BILLING existiert im Katalog", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_GOA_BILLING"]).toBeDefined();
  });

  it("BILLING_GOA_BILLING hat kind ACTION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_GOA_BILLING"].kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("BILLING_GOA_BILLING Text enthält 'GOÄ'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_GOA_BILLING"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("GOÄ");
  });

  it("BILLING_ONSITE_PAYMENT hat jetzt kind ACTION (reaktiviert)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ONSITE_PAYMENT"].kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("BILLING_ONSITE_PAYMENT Text enthält 'per Karte'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ONSITE_PAYMENT"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("per Karte");
  });
});

// ---------------------------------------------------------------------------
// 12. Neue ACTION-Bausteine BILLING_CONTACT_EXTERNAL_PARTY + BILLING_ADDRESS_UPDATE_REQUESTED
//     (M2/M3-Bereinigung – ehemals Handlungstext in EXPLANATION-Checkpoints)
// ---------------------------------------------------------------------------

describe("BILLING – neue ACTION-Bausteine BILLING_CONTACT_EXTERNAL_PARTY und BILLING_ADDRESS_UPDATE_REQUESTED", () => {
  it("BILLING_CONTACT_EXTERNAL_PARTY existiert im Katalog", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_CONTACT_EXTERNAL_PARTY"]).toBeDefined();
  });

  it("BILLING_CONTACT_EXTERNAL_PARTY hat kind ACTION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_CONTACT_EXTERNAL_PARTY"].kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("BILLING_CONTACT_EXTERNAL_PARTY hat scope SPECIFIC", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_CONTACT_EXTERNAL_PARTY"].scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("BILLING_CONTACT_EXTERNAL_PARTY ACTIVE-Text enthält 'Krankenkasse'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_CONTACT_EXTERNAL_PARTY"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("Krankenkasse");
  });

  it("BILLING_CONTACT_EXTERNAL_PARTY hat actionCategory NEXT_STEP", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_CONTACT_EXTERNAL_PARTY"].actionCategory).toBe("NEXT_STEP");
  });

  it("BILLING_CONTACT_EXTERNAL_PARTY ist in boundActionCheckpointIds des BILLING-Profils", () => {
    expect(BILLING.boundActionCheckpointIds).toContain("BILLING_CONTACT_EXTERNAL_PARTY");
  });

  it("BILLING_CONTACT_EXTERNAL_PARTY hat showWhenAny [BILLING_EXTERNAL_RESPONSIBILITY=YES]", () => {
    const condition = BILLING.boundActionConditions?.["BILLING_CONTACT_EXTERNAL_PARTY"];
    expect(condition).toBeDefined();
    expect(condition!.showWhenAny).toEqual([{ BILLING_EXTERNAL_RESPONSIBILITY: "YES" }]);
  });

  it("BILLING_ADDRESS_UPDATE_REQUESTED existiert im Katalog", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ADDRESS_UPDATE_REQUESTED"]).toBeDefined();
  });

  it("BILLING_ADDRESS_UPDATE_REQUESTED hat kind ACTION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ADDRESS_UPDATE_REQUESTED"].kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("BILLING_ADDRESS_UPDATE_REQUESTED hat scope SPECIFIC", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ADDRESS_UPDATE_REQUESTED"].scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("BILLING_ADDRESS_UPDATE_REQUESTED ACTIVE-Text enthält 'Postadresse'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ADDRESS_UPDATE_REQUESTED"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("Postadresse");
  });

  it("BILLING_ADDRESS_UPDATE_REQUESTED hat actionCategory NEXT_STEP", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["BILLING_ADDRESS_UPDATE_REQUESTED"].actionCategory).toBe("NEXT_STEP");
  });

  it("BILLING_ADDRESS_UPDATE_REQUESTED ist in boundActionCheckpointIds des BILLING-Profils", () => {
    expect(BILLING.boundActionCheckpointIds).toContain("BILLING_ADDRESS_UPDATE_REQUESTED");
  });

  it("BILLING_ADDRESS_UPDATE_REQUESTED hat showWhenAny [BILLING_ADDRESS_MISSING=YES]", () => {
    const condition = BILLING.boundActionConditions?.["BILLING_ADDRESS_UPDATE_REQUESTED"];
    expect(condition).toBeDefined();
    expect(condition!.showWhenAny).toEqual([{ BILLING_ADDRESS_MISSING: "YES" }]);
  });
});

// ---------------------------------------------------------------------------
// 13. Renderer – neue BILLING ACTION-Bausteine erscheinen bei ACTIVE
// ---------------------------------------------------------------------------

describe("BILLING Renderer – neue ACTION-Bausteine ACTIVE/INACTIVE", () => {
  it("BILLING_CONTACT_EXTERNAL_PARTY ACTIVE → 'Krankenkasse'-Text erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          BILLING_EXTERNAL_RESPONSIBILITY: ExplanationStatus.YES,
          BILLING_CONTACT_EXTERNAL_PARTY: ActionStatus.ACTIVE,
        },
        explanationOutputStatuses: {
          BILLING_EXTERNAL_RESPONSIBILITY: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Krankenkasse");
    expect(paragraphs).toContain("wenden Sie sich");
  });

  it("BILLING_CONTACT_EXTERNAL_PARTY INACTIVE → Weiterleitungstext erscheint NICHT", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          BILLING_EXTERNAL_RESPONSIBILITY: ExplanationStatus.YES,
          BILLING_CONTACT_EXTERNAL_PARTY: ActionStatus.INACTIVE,
        },
        explanationOutputStatuses: {
          BILLING_EXTERNAL_RESPONSIBILITY: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("wenden Sie sich");
  });

  it("BILLING_ADDRESS_UPDATE_REQUESTED ACTIVE → 'Postadresse'-Aufforderungstext erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          BILLING_ADDRESS_MISSING: ExplanationStatus.YES,
          BILLING_ADDRESS_UPDATE_REQUESTED: ActionStatus.ACTIVE,
        },
        explanationOutputStatuses: {
          BILLING_ADDRESS_MISSING: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Postadresse");
    expect(paragraphs).toContain("Bitte teilen Sie uns");
  });

  it("BILLING_ADDRESS_UPDATE_REQUESTED INACTIVE → Adressaufforderung erscheint NICHT", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "BILLING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          BILLING_ADDRESS_MISSING: ExplanationStatus.YES,
          BILLING_ADDRESS_UPDATE_REQUESTED: ActionStatus.INACTIVE,
        },
        explanationOutputStatuses: {
          BILLING_ADDRESS_MISSING: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Bitte teilen Sie uns");
  });
});
