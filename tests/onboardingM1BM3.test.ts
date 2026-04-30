/**
 * Tests für den M1B/M3-Pilot am ONBOARDING-Profil.
 *
 * 1. ONBOARDING hat M1B-Optionen (communicationReasons).
 * 2. ONBOARDING hat M3-Ziele (responseGoals).
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
  ActionStatus,
  type SpecificRole,
} from "@/lib/inquiries/types";

const ONBOARDING = INQUIRY_PROFILE_CATALOG_V2["ONBOARDING"];

// ---------------------------------------------------------------------------
// Bekannte ONBOARDING-M1B-IDs
// ---------------------------------------------------------------------------
const EXPECTED_COMMUNICATION_REASON_IDS: string[] = [
  "REQ_ONBOARDING_INITIAL",
  "REQ_ONBOARDING_CLARIFICATION",
  "OUT_ONBOARDING_REQUIRED",
  "OUT_MISSING_REQUIREMENT",
  "OUT_SPECIALIST_RESPONSIBILITY",
];

// ---------------------------------------------------------------------------
// Bekannte ONBOARDING-M3-IDs
// ---------------------------------------------------------------------------
const EXPECTED_RESPONSE_GOAL_IDS: string[] = [
  "ISSUE_BLOCKED_MISSING_INFO",
  "ISSUE_BLOCKED_EXTERNAL",
  "PROCESS_EXPLAINED",
];

// ---------------------------------------------------------------------------
// Bekannte Specific-Checkpoint-IDs (ONBOARDING_PROCESS_REQUIRED und ONBOARDING_DOCUMENT_MISSING sind @deprecated und entfernt)
// ---------------------------------------------------------------------------
const EXPECTED_SPECIFIC_CHECKPOINT_IDS = [
  "ONBOARDING_DATA_INCOMPLETE",
  "ONBOARDING_GKV_DOCUMENT_MISSING",
  "ONBOARDING_PKV_PAS_MISSING",
  "ONBOARDING_IDENTITY_MISMATCH",
  "ONBOARDING_WRONG_PRACTICE",
] as const;

// ---------------------------------------------------------------------------
// 1. ONBOARDING hat communicationReasons
// ---------------------------------------------------------------------------

describe("ONBOARDING – M1B communicationReasons", () => {
  it("Profil ist definiert", () => {
    expect(ONBOARDING).toBeDefined();
  });

  it("communicationReasons ist gesetzt und nicht leer", () => {
    expect(ONBOARDING.communicationReasons).toBeDefined();
    expect(ONBOARDING.communicationReasons!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten eingehenden Anlässe", () => {
    const ids = ONBOARDING.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("REQ_ONBOARDING_INITIAL");
    expect(ids).toContain("REQ_ONBOARDING_CLARIFICATION");
  });

  it("enthält alle erwarteten ausgehenden Anlässe", () => {
    const ids = ONBOARDING.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("OUT_ONBOARDING_REQUIRED");
    expect(ids).toContain("OUT_MISSING_REQUIREMENT");
    expect(ids).toContain("OUT_SPECIALIST_RESPONSIBILITY");
  });

  it("enthält genau die erwarteten IDs (vollständig)", () => {
    const ids = ONBOARDING.communicationReasons!.map((r) => r.id);
    for (const expected of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jeder Anlass hat ein label und eine direction", () => {
    for (const reason of ONBOARDING.communicationReasons!) {
      expect(typeof reason.label).toBe("string");
      expect(reason.label.length).toBeGreaterThan(0);
      expect(["INCOMING", "OUTGOING"]).toContain(reason.direction);
    }
  });

  it("eingehende Anlässe haben direction INCOMING", () => {
    const incoming = ONBOARDING.communicationReasons!.filter((r) =>
      r.id.startsWith("REQ_"),
    );
    for (const r of incoming) {
      expect(r.direction).toBe("INCOMING");
    }
  });

  it("ausgehende Anlässe haben direction OUTGOING", () => {
    const outgoing = ONBOARDING.communicationReasons!.filter((r) =>
      r.id.startsWith("OUT_"),
    );
    for (const r of outgoing) {
      expect(r.direction).toBe("OUTGOING");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. ONBOARDING hat responseGoals
// ---------------------------------------------------------------------------

describe("ONBOARDING – M3 responseGoals", () => {
  it("responseGoals ist gesetzt und nicht leer", () => {
    expect(ONBOARDING.responseGoals).toBeDefined();
    expect(ONBOARDING.responseGoals!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten Antwortziele", () => {
    const ids = ONBOARDING.responseGoals!.map((g) => g.id);
    for (const expected of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jedes Antwortziel hat ein label", () => {
    for (const goal of ONBOARDING.responseGoals!) {
      expect(typeof goal.label).toBe("string");
      expect(goal.label.length).toBeGreaterThan(0);
    }
  });

  it("jedes Antwortziel hat mindestens eine relevantSpecificRole", () => {
    for (const goal of ONBOARDING.responseGoals!) {
      expect(goal.relevantSpecificRoles.length).toBeGreaterThan(0);
    }
  });

  it("ISSUE_CONFIRMED ist nicht im Profil (kein binäres Erfolgsergebnis)", () => {
    const ids = ONBOARDING.responseGoals!.map((g) => g.id);
    expect(ids).not.toContain("ISSUE_CONFIRMED");
  });

  it("fehlende Daten sind über ISSUE_BLOCKED_MISSING_INFO mit MISSING_INFORMATION und MISSING_DOCUMENT abgebildet", () => {
    const missing = ONBOARDING.responseGoals!.find((g) => g.id === "ISSUE_BLOCKED_MISSING_INFO");
    expect(missing).toBeDefined();
    expect(missing!.relevantSpecificRoles).toContain("MISSING_INFORMATION");
    expect(missing!.relevantSpecificRoles).toContain("MISSING_DOCUMENT");
  });

  it("falsche Praxis ist über ISSUE_BLOCKED_EXTERNAL mit EXTERNAL_RESPONSIBILITY abgebildet", () => {
    const blocked = ONBOARDING.responseGoals!.find((g) => g.id === "ISSUE_BLOCKED_EXTERNAL");
    expect(blocked).toBeDefined();
    expect(blocked!.relevantSpecificRoles).toContain("EXTERNAL_RESPONSIBILITY");
  });

  it("Registrierungsablauf ist über PROCESS_EXPLAINED mit PROCESS_INFO abgebildet", () => {
    const process = ONBOARDING.responseGoals!.find((g) => g.id === "PROCESS_EXPLAINED");
    expect(process).toBeDefined();
    expect(process!.relevantSpecificRoles).toContain("PROCESS_INFO");
  });
});

// ---------------------------------------------------------------------------
// 3. M1B verweist nur auf existierende M3-Ziel-IDs
// ---------------------------------------------------------------------------

describe("ONBOARDING M1B → M3-Referenz-Integrität", () => {
  it("alle suggestedResponseGoalIds in communicationReasons sind bekannte responseGoal-IDs", () => {
    const knownGoalIds = new Set<string>(
      ONBOARDING.responseGoals!.map((g) => g.id),
    );
    const violations: string[] = [];
    for (const reason of ONBOARDING.communicationReasons!) {
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

describe("ONBOARDING M3 → specificRole-Referenz-Integrität", () => {
  it("alle relevantSpecificRoles in responseGoals sind bekannte SpecificRole-Werte", () => {
    const violations: string[] = [];
    for (const goal of ONBOARDING.responseGoals!) {
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

describe("ONBOARDING Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe", () => {
  it("renderInquiryResponseFromSections enthält keine M1B- oder M3-IDs im Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ONBOARDING",
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
        inquiryId: "ONBOARDING",
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

describe("ONBOARDING Specific-Checkpoints – Existenz und Struktur", () => {
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

  it("ONBOARDING_DATA_INCOMPLETE hat specificRole MISSING_INFORMATION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DATA_INCOMPLETE"].specificRole).toBe("MISSING_INFORMATION");
  });

  it("ONBOARDING_DOCUMENT_MISSING hat specificRole MISSING_DOCUMENT", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DOCUMENT_MISSING"].specificRole).toBe("MISSING_DOCUMENT");
  });

  it("ONBOARDING_GKV_DOCUMENT_MISSING hat specificRole MISSING_DOCUMENT", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_GKV_DOCUMENT_MISSING"].specificRole).toBe("MISSING_DOCUMENT");
  });

  it("ONBOARDING_PKV_PAS_MISSING hat specificRole MISSING_DOCUMENT", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_PKV_PAS_MISSING"].specificRole).toBe("MISSING_DOCUMENT");
  });

  it("ONBOARDING_IDENTITY_MISMATCH hat specificRole MISSING_INFORMATION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_IDENTITY_MISMATCH"].specificRole).toBe("MISSING_INFORMATION");
  });

  it("ONBOARDING_PROCESS_REQUIRED hat specificRole PROCESS_INFO", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_PROCESS_REQUIRED"].specificRole).toBe("PROCESS_INFO");
  });

  it("ONBOARDING_WRONG_PRACTICE hat specificRole EXTERNAL_RESPONSIBILITY", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_WRONG_PRACTICE"].specificRole).toBe("EXTERNAL_RESPONSIBILITY");
  });

  it("ONBOARDING-Profil referenziert genau fünf Specific-Checkpoints (PROCESS_REQUIRED und DOCUMENT_MISSING sind @deprecated und entfernt)", () => {
    for (const id of EXPECTED_SPECIFIC_CHECKPOINT_IDS) {
      expect(ONBOARDING.specificCheckpointIds).toContain(id);
    }
    expect(ONBOARDING.specificCheckpointIds).not.toContain("ONBOARDING_PROCESS_REQUIRED");
    expect(ONBOARDING.specificCheckpointIds).not.toContain("ONBOARDING_DOCUMENT_MISSING");
  });
});

// ---------------------------------------------------------------------------
// 7. Renderer – Specific-Checkpoint-Texte
// ---------------------------------------------------------------------------

describe("ONBOARDING Renderer – Specific-Checkpoint-Texte", () => {
  it("ONBOARDING_DATA_INCOMPLETE YES + SHOW → reiner M2-Schalter, kein Checkpoint-Text", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ONBOARDING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { ONBOARDING_DATA_INCOMPLETE: ExplanationStatus.YES },
        explanationOutputStatuses: { ONBOARDING_DATA_INCOMPLETE: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Online-Anamnese");
  });

  it("ONBOARDING_DOCUMENT_MISSING ist @deprecated und nicht mehr im Profil – kein Renderer-Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ONBOARDING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { ONBOARDING_DOCUMENT_MISSING: ExplanationStatus.YES },
        explanationOutputStatuses: { ONBOARDING_DOCUMENT_MISSING: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("PAS-Formular");
  });

  it("ONBOARDING_GKV_DOCUMENT_MISSING YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ONBOARDING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { ONBOARDING_GKV_DOCUMENT_MISSING: ExplanationStatus.YES },
        explanationOutputStatuses: { ONBOARDING_GKV_DOCUMENT_MISSING: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Gesundheitskarte");
  });

  it("ONBOARDING_PKV_PAS_MISSING YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ONBOARDING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { ONBOARDING_PKV_PAS_MISSING: ExplanationStatus.YES },
        explanationOutputStatuses: { ONBOARDING_PKV_PAS_MISSING: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("PAS-Formular");
  });

  it("ONBOARDING_IDENTITY_MISMATCH YES + SHOW → reiner M2-Schalter, kein Checkpoint-Text", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ONBOARDING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { ONBOARDING_IDENTITY_MISMATCH: ExplanationStatus.YES },
        explanationOutputStatuses: { ONBOARDING_IDENTITY_MISMATCH: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Schreibweise");
  });

  it("ONBOARDING_PROCESS_REQUIRED ist @deprecated und nicht mehr im Profil – kein Renderer-Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ONBOARDING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { ONBOARDING_PROCESS_REQUIRED: ExplanationStatus.YES },
        explanationOutputStatuses: { ONBOARDING_PROCESS_REQUIRED: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Neupatient");
  });

  it("ONBOARDING_WRONG_PRACTICE YES + SHOW → reiner M2-Schalter, kein Checkpoint-Text", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ONBOARDING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { ONBOARDING_WRONG_PRACTICE: ExplanationStatus.YES },
        explanationOutputStatuses: { ONBOARDING_WRONG_PRACTICE: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Missverständnis");
  });

  it("ONBOARDING_DATA_INCOMPLETE HIDE → kein Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ONBOARDING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { ONBOARDING_DATA_INCOMPLETE: ExplanationStatus.YES },
        explanationOutputStatuses: { ONBOARDING_DATA_INCOMPLETE: ExplanationOutputStatus.HIDE } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Online-Anamnese");
  });

  it("ONBOARDING_WRONG_PRACTICE HIDE → kein Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ONBOARDING",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { ONBOARDING_WRONG_PRACTICE: ExplanationStatus.YES },
        explanationOutputStatuses: { ONBOARDING_WRONG_PRACTICE: ExplanationOutputStatus.HIDE } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Missverständnis");
  });
});

// ---------------------------------------------------------------------------
// 8. docByStatus – kurze interne Dokumentationstexte für ONBOARDING-Checkpoints
// ---------------------------------------------------------------------------

describe("ONBOARDING Specific-Checkpoints – docByStatus", () => {
  it("ONBOARDING_DATA_INCOMPLETE hat docByStatus[YES] befüllt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DATA_INCOMPLETE"];
    expect(cp.docByStatus).toBeDefined();
    expect(cp.docByStatus![ExplanationStatus.YES]).toBeTruthy();
  });

  it("ONBOARDING_DATA_INCOMPLETE docByStatus[YES] enthält 'Online-Anamnese'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DATA_INCOMPLETE"];
    expect(cp.docByStatus![ExplanationStatus.YES]).toContain("Online-Anamnese");
  });

  it("ONBOARDING_DOCUMENT_MISSING (@deprecated) hat docByStatus[YES] befüllt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DOCUMENT_MISSING"];
    expect(cp.docByStatus).toBeDefined();
    expect(cp.docByStatus![ExplanationStatus.YES]).toBeTruthy();
  });

  it("ONBOARDING_DOCUMENT_MISSING (@deprecated) docByStatus[YES] ist kürzer als textByStatus[YES]", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DOCUMENT_MISSING"];
    expect(cp.docByStatus![ExplanationStatus.YES]!.length).toBeLessThan(
      cp.textByStatus[ExplanationStatus.YES]!.length,
    );
  });

  it("ONBOARDING_DOCUMENT_MISSING (@deprecated) docByStatus[YES] enthält 'GKV/PKV'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DOCUMENT_MISSING"];
    expect(cp.docByStatus![ExplanationStatus.YES]).toContain("GKV/PKV");
  });

  it("ONBOARDING_GKV_DOCUMENT_MISSING hat docByStatus[YES] befüllt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_GKV_DOCUMENT_MISSING"];
    expect(cp.docByStatus).toBeDefined();
    expect(cp.docByStatus![ExplanationStatus.YES]).toBeTruthy();
  });

  it("ONBOARDING_GKV_DOCUMENT_MISSING docByStatus[YES] ist kürzer als textByStatus[YES]", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_GKV_DOCUMENT_MISSING"];
    expect(cp.docByStatus![ExplanationStatus.YES]!.length).toBeLessThan(
      cp.textByStatus[ExplanationStatus.YES]!.length,
    );
  });

  it("ONBOARDING_GKV_DOCUMENT_MISSING docByStatus[YES] enthält 'GKV'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_GKV_DOCUMENT_MISSING"];
    expect(cp.docByStatus![ExplanationStatus.YES]).toContain("GKV");
  });

  it("ONBOARDING_PKV_PAS_MISSING hat docByStatus[YES] befüllt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_PKV_PAS_MISSING"];
    expect(cp.docByStatus).toBeDefined();
    expect(cp.docByStatus![ExplanationStatus.YES]).toBeTruthy();
  });

  it("ONBOARDING_PKV_PAS_MISSING docByStatus[YES] ist kürzer als textByStatus[YES]", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_PKV_PAS_MISSING"];
    expect(cp.docByStatus![ExplanationStatus.YES]!.length).toBeLessThan(
      cp.textByStatus[ExplanationStatus.YES]!.length,
    );
  });

  it("ONBOARDING_PKV_PAS_MISSING docByStatus[YES] enthält 'PAS-Formular'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_PKV_PAS_MISSING"];
    expect(cp.docByStatus![ExplanationStatus.YES]).toContain("PAS-Formular");
  });

  it("ONBOARDING_IDENTITY_MISMATCH hat docByStatus[YES] befüllt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_IDENTITY_MISMATCH"];
    expect(cp.docByStatus).toBeDefined();
    expect(cp.docByStatus![ExplanationStatus.YES]).toBeTruthy();
  });

  it("ONBOARDING_IDENTITY_MISMATCH docByStatus[YES] enthält 'Abgleich'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_IDENTITY_MISMATCH"];
    expect(cp.docByStatus![ExplanationStatus.YES]).toContain("Abgleich");
  });

  it("ONBOARDING_WRONG_PRACTICE hat docByStatus[YES] befüllt", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_WRONG_PRACTICE"];
    expect(cp.docByStatus).toBeDefined();
    expect(cp.docByStatus![ExplanationStatus.YES]).toBeTruthy();
  });

  it("ONBOARDING_WRONG_PRACTICE docByStatus[YES] enthält 'falsche Praxis'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_WRONG_PRACTICE"];
    expect(cp.docByStatus![ExplanationStatus.YES]).toContain("falsche Praxis");
  });

  it("textByStatus[YES] der drei M2-Schalter ist leer (reiner Schalter)", () => {
    const data = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DATA_INCOMPLETE"];
    expect(data.textByStatus[ExplanationStatus.YES] ?? "").toBe("");

    const identity = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_IDENTITY_MISMATCH"];
    expect(identity.textByStatus[ExplanationStatus.YES] ?? "").toBe("");

    const wrong = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_WRONG_PRACTICE"];
    expect(wrong.textByStatus[ExplanationStatus.YES] ?? "").toBe("");
  });

  it("ONBOARDING_DOCUMENT_MISSING (@deprecated) textByStatus[YES] bleibt unverändert", () => {
    const doc = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DOCUMENT_MISSING"];
    expect(doc.textByStatus[ExplanationStatus.YES]).toContain("PAS-Formular");
  });
});

// ---------------------------------------------------------------------------
// ONBOARDING – Action-Verfügbarkeit
// ---------------------------------------------------------------------------

describe("ONBOARDING – availableActionIds", () => {
  it("TECHNICAL_ISSUE ist in ONBOARDING.availableActionIds enthalten", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["ONBOARDING"];
    expect(profile.availableActionIds).toContain("TECHNICAL_ISSUE");
  });

  it("DIGITAL_REQUEST ist in ONBOARDING.availableActionIds enthalten", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["ONBOARDING"];
    expect(profile.availableActionIds).toContain("DIGITAL_REQUEST");
  });

  it("DOCUMENT_UPLOAD ist in ONBOARDING.availableActionIds enthalten", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["ONBOARDING"];
    expect(profile.availableActionIds).toContain("DOCUMENT_UPLOAD");
  });
});

// ---------------------------------------------------------------------------
// 9. Neue ONBOARDING-ACTION-Checkpoints – Kontext und Aktion (M3-Bausteine)
// ---------------------------------------------------------------------------

describe("ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED – Checkpoint-Struktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("hat scope SPECIFIC", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("hat actionCategory INFO", () => {
    expect((cp as any).actionCategory).toBe("INFO");
  });

  it("hat ACTIVE-Text mit Kontext-Inhalt", () => {
    const text = (cp.textByStatus as Record<string, string>)[ActionStatus.ACTIVE];
    expect(text).toContain("nicht eindeutig zuordnen");
  });

  it("ist in ONBOARDING.boundActionCheckpointIds referenziert", () => {
    expect(ONBOARDING.boundActionCheckpointIds).toContain("ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED");
  });

  it("wird bei ONBOARDING_IDENTITY_MISMATCH = YES freigeschaltet", () => {
    const conditions = ONBOARDING.boundActionConditions;
    expect(conditions?.ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED?.showWhenAny).toEqual(
      expect.arrayContaining([{ ONBOARDING_IDENTITY_MISMATCH: "YES" }])
    );
  });
});

describe("ONBOARDING_PROVIDE_IDENTITY_DATA – Checkpoint-Struktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_PROVIDE_IDENTITY_DATA"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("hat scope SPECIFIC", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("hat actionCategory INFO", () => {
    expect((cp as any).actionCategory).toBe("INFO");
  });

  it("hat ACTIVE-Text mit Aktionsaufforderung", () => {
    const text = (cp.textByStatus as Record<string, string>)[ActionStatus.ACTIVE];
    expect(text).toContain("vollständigen Namen");
    expect(text).toContain("Geburtsdatum");
  });

  it("ist in ONBOARDING.boundActionCheckpointIds referenziert", () => {
    expect(ONBOARDING.boundActionCheckpointIds).toContain("ONBOARDING_PROVIDE_IDENTITY_DATA");
  });

  it("wird bei ONBOARDING_IDENTITY_MISMATCH = YES freigeschaltet", () => {
    const conditions = ONBOARDING.boundActionConditions;
    expect(conditions?.ONBOARDING_PROVIDE_IDENTITY_DATA?.showWhenAny).toEqual(
      expect.arrayContaining([{ ONBOARDING_IDENTITY_MISMATCH: "YES" }])
    );
  });
});

describe("ONBOARDING_DATA_MISSING_CONTEXT – Checkpoint-Struktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DATA_MISSING_CONTEXT"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("hat scope SPECIFIC", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("hat actionCategory INFO", () => {
    expect((cp as any).actionCategory).toBe("INFO");
  });

  it("hat ACTIVE-Text mit Kontext-Inhalt", () => {
    const text = (cp.textByStatus as Record<string, string>)[ActionStatus.ACTIVE];
    expect(text).toContain("aktuelle Angaben");
  });

  it("ist in ONBOARDING.boundActionCheckpointIds referenziert", () => {
    expect(ONBOARDING.boundActionCheckpointIds).toContain("ONBOARDING_DATA_MISSING_CONTEXT");
  });

  it("wird bei ONBOARDING_DATA_INCOMPLETE = YES freigeschaltet", () => {
    const conditions = ONBOARDING.boundActionConditions;
    expect(conditions?.ONBOARDING_DATA_MISSING_CONTEXT?.showWhenAny).toEqual(
      expect.arrayContaining([{ ONBOARDING_DATA_INCOMPLETE: "YES" }])
    );
  });
});

describe("ONBOARDING_WRONG_PRACTICE_NOTICE – Checkpoint-Struktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_WRONG_PRACTICE_NOTICE"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("hat scope SPECIFIC", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("hat actionCategory INFO", () => {
    expect((cp as any).actionCategory).toBe("INFO");
  });

  it("hat ACTIVE-Text mit Hinweis-Inhalt", () => {
    const text = (cp.textByStatus as Record<string, string>)[ActionStatus.ACTIVE];
    expect(text).toContain("nicht als Patient");
  });

  it("ist in ONBOARDING.boundActionCheckpointIds referenziert", () => {
    expect(ONBOARDING.boundActionCheckpointIds).toContain("ONBOARDING_WRONG_PRACTICE_NOTICE");
  });

  it("wird bei ONBOARDING_WRONG_PRACTICE = YES freigeschaltet", () => {
    const conditions = ONBOARDING.boundActionConditions;
    expect(conditions?.ONBOARDING_WRONG_PRACTICE_NOTICE?.showWhenAny).toEqual(
      expect.arrayContaining([{ ONBOARDING_WRONG_PRACTICE: "YES" }])
    );
  });
});

// ---------------------------------------------------------------------------
// 10. ONBOARDING – ONLINE_ANAMNESIS in boundActionCheckpointIds/-Conditions
// ---------------------------------------------------------------------------

describe("ONBOARDING – ONLINE_ANAMNESIS via boundActionConditions", () => {
  it("ONLINE_ANAMNESIS ist nicht in ONBOARDING.boundActionCheckpointIds", () => {
    expect(ONBOARDING.boundActionCheckpointIds).not.toContain("ONLINE_ANAMNESIS");
  });

  it("ONLINE_ANAMNESIS ist nicht in ONBOARDING.boundActionConditions", () => {
    const conditions = ONBOARDING.boundActionConditions;
    expect(conditions?.ONLINE_ANAMNESIS).toBeUndefined();
  });

  it("ONLINE_ANAMNESIS hat keinen URL-Text mehr", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONLINE_ANAMNESIS"];
    const text = (cp.textByStatus as Record<string, string>)[ActionStatus.ACTIVE];
    expect(text).not.toContain("kurz-anamnese");
    expect(text).not.toContain("http");
  });
});

// ---------------------------------------------------------------------------
// 11. Drei M2-Schalter haben keinen YES-Text (reiner Schalter)
// ---------------------------------------------------------------------------

describe("ONBOARDING M2-Schalter – kein textByStatus.YES", () => {
  it("ONBOARDING_DATA_INCOMPLETE hat keinen YES-Text (reiner M2-Schalter)", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DATA_INCOMPLETE"];
    expect(cp.textByStatus[ExplanationStatus.YES] ?? "").toBe("");
  });

  it("ONBOARDING_IDENTITY_MISMATCH hat keinen YES-Text (reiner M2-Schalter)", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_IDENTITY_MISMATCH"];
    expect(cp.textByStatus[ExplanationStatus.YES] ?? "").toBe("");
  });

  it("ONBOARDING_WRONG_PRACTICE hat keinen YES-Text (reiner M2-Schalter)", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_WRONG_PRACTICE"];
    expect(cp.textByStatus[ExplanationStatus.YES] ?? "").toBe("");
  });
});
