/**
 * Tests für den M1B/M3-Pilot am ACUTE_CARE-Profil.
 *
 * 1. ACUTE_CARE hat M1B-Optionen (communicationReasons).
 * 2. ACUTE_CARE hat M3-Ziele (responseGoals).
 * 3. M1B verweist nur auf existierende M3-Ziel-IDs.
 * 4. M3 verweist nur auf existierende specificRoles.
 * 5. Renderer bleibt unverändert (communicationReasons/responseGoals tauchen nicht im Output auf).
 */

import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import {
  DecisionStatus,
  ExplanationStatus,
  ActionStatus,
  type SpecificRole,
  type ExplanationOutputStatus,
} from "@/lib/inquiries/types";

const ACUTE_CARE = INQUIRY_PROFILE_CATALOG_V2["ACUTE_CARE"];

// ---------------------------------------------------------------------------
// Bekannte ACUTE_CARE-M1B-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_COMMUNICATION_REASON_IDS: string[] = [
  "REQ_ACUTE_INITIAL",
  "REQ_ACUTE_CLARIFICATION",
  "OUT_ACUTE_OFFERED",
  "OUT_MISSING_REQUIREMENT",
  "OUT_SPECIALIST_RESPONSIBILITY",
];

// ---------------------------------------------------------------------------
// Bekannte ACUTE_CARE-M3-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_RESPONSE_GOAL_IDS: string[] = [
  "ISSUE_CONFIRMED",
  "ISSUE_BLOCKED_EXTERNAL",
  "MEDICAL_REVIEW_NEEDED",
  "PROCESS_EXPLAINED",
];

// ---------------------------------------------------------------------------
// 1. ACUTE_CARE hat communicationReasons
// ---------------------------------------------------------------------------

describe("ACUTE_CARE – M1B communicationReasons", () => {
  it("Profil ist definiert", () => {
    expect(ACUTE_CARE).toBeDefined();
  });

  it("communicationReasons ist gesetzt und nicht leer", () => {
    expect(ACUTE_CARE.communicationReasons).toBeDefined();
    expect(ACUTE_CARE.communicationReasons!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten eingehenden Anlässe", () => {
    const ids = ACUTE_CARE.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("REQ_ACUTE_INITIAL");
    expect(ids).toContain("REQ_ACUTE_CLARIFICATION");
  });

  it("enthält alle erwarteten ausgehenden Anlässe", () => {
    const ids = ACUTE_CARE.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("OUT_ACUTE_OFFERED");
    expect(ids).toContain("OUT_MISSING_REQUIREMENT");
    expect(ids).toContain("OUT_SPECIALIST_RESPONSIBILITY");
  });

  it("enthält genau die erwarteten IDs (vollständig)", () => {
    const ids = ACUTE_CARE.communicationReasons!.map((r) => r.id);
    for (const expected of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jeder Anlass hat ein label und eine direction", () => {
    for (const reason of ACUTE_CARE.communicationReasons!) {
      expect(typeof reason.label).toBe("string");
      expect(reason.label.length).toBeGreaterThan(0);
      expect(["INCOMING", "OUTGOING"]).toContain(reason.direction);
    }
  });

  it("eingehende Anlässe haben direction INCOMING", () => {
    const incoming = ACUTE_CARE.communicationReasons!.filter((r) =>
      r.id.startsWith("REQ_"),
    );
    for (const r of incoming) {
      expect(r.direction).toBe("INCOMING");
    }
  });

  it("ausgehende Anlässe haben direction OUTGOING", () => {
    const outgoing = ACUTE_CARE.communicationReasons!.filter((r) =>
      r.id.startsWith("OUT_"),
    );
    for (const r of outgoing) {
      expect(r.direction).toBe("OUTGOING");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. ACUTE_CARE hat responseGoals
// ---------------------------------------------------------------------------

describe("ACUTE_CARE – M3 responseGoals", () => {
  it("responseGoals ist gesetzt und nicht leer", () => {
    expect(ACUTE_CARE.responseGoals).toBeDefined();
    expect(ACUTE_CARE.responseGoals!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten Antwortziele", () => {
    const ids = ACUTE_CARE.responseGoals!.map((g) => g.id);
    for (const expected of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jedes Antwortziel hat ein label", () => {
    for (const goal of ACUTE_CARE.responseGoals!) {
      expect(typeof goal.label).toBe("string");
      expect(goal.label.length).toBeGreaterThan(0);
    }
  });

  it("jedes Antwortziel hat mindestens eine relevantSpecificRole", () => {
    for (const goal of ACUTE_CARE.responseGoals!) {
      expect(goal.relevantSpecificRoles.length).toBeGreaterThan(0);
    }
  });

  it("ACUTE_EXCLUSION und CHRONIC_EXCLUSION sind über ISSUE_BLOCKED_EXTERNAL abgebildet (CHANNEL_NOT_SUITABLE)", () => {
    const blockedExternal = ACUTE_CARE.responseGoals!.find(
      (g) => g.id === "ISSUE_BLOCKED_EXTERNAL",
    );
    expect(blockedExternal).toBeDefined();
    expect(blockedExternal!.relevantSpecificRoles).toContain("CHANNEL_NOT_SUITABLE");
  });

  it("ACUTE_PURPOSE ist über PROCESS_EXPLAINED abgebildet (PROCESS_INFO)", () => {
    const processExplained = ACUTE_CARE.responseGoals!.find(
      (g) => g.id === "PROCESS_EXPLAINED",
    );
    expect(processExplained).toBeDefined();
    expect(processExplained!.relevantSpecificRoles).toContain("PROCESS_INFO");
  });

  it("MEDICAL_CONSULTATION_REQUIRED ist über MEDICAL_REVIEW_NEEDED abgebildet", () => {
    const medicalReview = ACUTE_CARE.responseGoals!.find(
      (g) => g.id === "MEDICAL_REVIEW_NEEDED",
    );
    expect(medicalReview).toBeDefined();
    expect(medicalReview!.relevantSpecificRoles).toContain("MEDICAL_REVIEW_REQUIRED");
  });
});

// ---------------------------------------------------------------------------
// 3. M1B verweist nur auf existierende M3-Ziel-IDs
// ---------------------------------------------------------------------------

describe("ACUTE_CARE M1B → M3-Referenz-Integrität", () => {
  it("alle suggestedResponseGoalIds in communicationReasons sind bekannte responseGoal-IDs", () => {
    const knownGoalIds = new Set<string>(
      ACUTE_CARE.responseGoals!.map((g) => g.id),
    );
    const violations: string[] = [];
    for (const reason of ACUTE_CARE.communicationReasons!) {
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

describe("ACUTE_CARE M3 → specificRole-Referenz-Integrität", () => {
  it("alle relevantSpecificRoles in responseGoals sind bekannte SpecificRole-Werte", () => {
    const violations: string[] = [];
    for (const goal of ACUTE_CARE.responseGoals!) {
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

describe("ACUTE_CARE Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe", () => {
  it("renderInquiryResponseFromSections enthält keine M1B- oder M3-IDs im Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ACUTE_CARE",
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
        inquiryId: "ACUTE_CARE",
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
// ACUTE_OPEN_CONSULTATION_ACTION – immer sichtbarer ACTION-Baustein in ACUTE_CARE
// ---------------------------------------------------------------------------

import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { InquiryCheckpointKind, InquiryCheckpointScope } from "@/lib/inquiries/types";

describe("ACUTE_CARE – ACUTE_OPEN_CONSULTATION_ACTION (ersetzt INFO)", () => {
  it("ACUTE_OPEN_CONSULTATION_ACTION ist in boundActionCheckpointIds", () => {
    expect((ACUTE_CARE as any).boundActionCheckpointIds).toContain("ACUTE_OPEN_CONSULTATION_ACTION");
  });

  it("ACUTE_OPEN_CONSULTATION_ACTION hat hideWhenAny: [] (immer sichtbar)", () => {
    const conditions = (ACUTE_CARE as any).boundActionConditions;
    expect(conditions?.ACUTE_OPEN_CONSULTATION_ACTION?.hideWhenAny).toEqual([]);
  });

  it("ACUTE_OPEN_CONSULTATION_INFO ist NICHT mehr in boundGlobalCheckpointIds", () => {
    expect(ACUTE_CARE.boundGlobalCheckpointIds).not.toContain("ACUTE_OPEN_CONSULTATION_INFO");
  });

  it("ACUTE_OPEN_CONSULTATION_INFO ist NICHT in boundActionCheckpointIds", () => {
    expect((ACUTE_CARE as any).boundActionCheckpointIds).not.toContain("ACUTE_OPEN_CONSULTATION_INFO");
  });

  it("ACUTE_OPEN_CONSULTATION_ACTION Checkpoint existiert im Katalog", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ACUTE_OPEN_CONSULTATION_ACTION"]).toBeDefined();
  });

  it("ACUTE_OPEN_CONSULTATION_ACTION ist kind ACTION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ACUTE_OPEN_CONSULTATION_ACTION"].kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("ACUTE_OPEN_CONSULTATION_ACTION ist scope GLOBAL", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ACUTE_OPEN_CONSULTATION_ACTION"].scope).toBe(InquiryCheckpointScope.GLOBAL);
  });

  it("ACUTE_OPEN_CONSULTATION_INFO bleibt im Katalog (Legacy)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ACUTE_OPEN_CONSULTATION_INFO"]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// INFECTIOUS_PROTOCOL – Bereinigung: Kontext-Text + drei neue ACTION-Bausteine
// ---------------------------------------------------------------------------

describe("INFECTIOUS_PROTOCOL – kein Handlungstext mehr im EXPLANATION-Checkpoint", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["INFECTIOUS_PROTOCOL"];

  it("INFECTIOUS_PROTOCOL existiert im Katalog", () => {
    expect(cp).toBeDefined();
  });

  it("YES-Text ist reiner Kontext ohne Handlungsaufforderung", () => {
    const text = (cp.textByStatus as Record<string, string>)[ExplanationStatus.YES];
    expect(text).toBe("Es besteht der Verdacht auf eine ansteckende Erkrankung.");
  });

  it("YES-Text enthält kein 'melden Sie sich'", () => {
    const text = (cp.textByStatus as Record<string, string>)[ExplanationStatus.YES];
    expect(text).not.toContain("melden Sie sich");
  });

  it("YES-Text enthält kein 'wählen Sie'", () => {
    const text = (cp.textByStatus as Record<string, string>)[ExplanationStatus.YES];
    expect(text).not.toContain("wählen Sie");
  });

  it("YES-Text enthält kein 'kommen nicht unangemeldet'", () => {
    const text = (cp.textByStatus as Record<string, string>)[ExplanationStatus.YES];
    expect(text).not.toContain("kommen nicht unangemeldet");
  });

  it("YES-Text enthält kein 'Bitte'", () => {
    const text = (cp.textByStatus as Record<string, string>)[ExplanationStatus.YES];
    expect(text).not.toContain("Bitte");
  });
});

describe("INFECTIOUS_PROTOCOL – globalHints-Redundanz entfernt", () => {
  it("ACUTE_CARE.globalHints enthält keinen Eintrag für INFECTIOUS_PROTOCOL", () => {
    const hints = (ACUTE_CARE as any).globalHints ?? {};
    expect(hints).not.toHaveProperty("INFECTIOUS_PROTOCOL");
  });
});

describe("INFECTIOUS_CONTACT_DIGITALLY – neuer ACTION-Baustein", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["INFECTIOUS_CONTACT_DIGITALLY"];

  it("existiert im Katalog", () => {
    expect(cp).toBeDefined();
  });

  it("ist kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("ist scope GLOBAL", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
  });

  it("hat actionCategory NEXT_STEP", () => {
    expect((cp as any).actionCategory).toBe("NEXT_STEP");
  });

  it("hat korrekten ACTIVE-Text", () => {
    const text = (cp.textByStatus as Record<string, string>)[ActionStatus.ACTIVE];
    expect(text).toBe("Bitte melden Sie sich vorab digital bei uns.");
  });
});

describe("INFECTIOUS_VIDEO_CONSULTATION – neuer ACTION-Baustein", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["INFECTIOUS_VIDEO_CONSULTATION"];

  it("existiert im Katalog", () => {
    expect(cp).toBeDefined();
  });

  it("ist kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("ist scope GLOBAL", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
  });

  it("hat actionCategory NEXT_STEP", () => {
    expect((cp as any).actionCategory).toBe("NEXT_STEP");
  });

  it("hat korrekten ACTIVE-Text", () => {
    const text = (cp.textByStatus as Record<string, string>)[ActionStatus.ACTIVE];
    expect(text).toBe("Alternativ können Sie eine Videosprechstunde wählen.");
  });
});

describe("INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED – neuer ACTION-Baustein", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED"];

  it("existiert im Katalog", () => {
    expect(cp).toBeDefined();
  });

  it("ist kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("ist scope GLOBAL", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
  });

  it("hat actionCategory INFO", () => {
    expect((cp as any).actionCategory).toBe("INFO");
  });

  it("hat korrekten ACTIVE-Text", () => {
    const text = (cp.textByStatus as Record<string, string>)[ActionStatus.ACTIVE];
    expect(text).toBe("Bitte kommen Sie bei Verdacht auf eine ansteckende Erkrankung nicht unangemeldet in die Praxis.");
  });
});

describe("ACUTE_CARE – neue INFECTIOUS ACTION-Bausteine in boundActionCheckpointIds + showWhenAny", () => {
  const conditions = (ACUTE_CARE as any).boundActionConditions;

  it("INFECTIOUS_CONTACT_DIGITALLY ist in boundActionCheckpointIds", () => {
    expect((ACUTE_CARE as any).boundActionCheckpointIds).toContain("INFECTIOUS_CONTACT_DIGITALLY");
  });

  it("INFECTIOUS_VIDEO_CONSULTATION ist in boundActionCheckpointIds", () => {
    expect((ACUTE_CARE as any).boundActionCheckpointIds).toContain("INFECTIOUS_VIDEO_CONSULTATION");
  });

  it("INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED ist in boundActionCheckpointIds", () => {
    expect((ACUTE_CARE as any).boundActionCheckpointIds).toContain("INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED");
  });

  it("INFECTIOUS_CONTACT_DIGITALLY hat showWhenAny [{ INFECTIOUS_PROTOCOL: 'YES' }]", () => {
    expect(conditions?.INFECTIOUS_CONTACT_DIGITALLY?.showWhenAny).toEqual(
      expect.arrayContaining([{ INFECTIOUS_PROTOCOL: "YES" }])
    );
  });

  it("INFECTIOUS_VIDEO_CONSULTATION hat showWhenAny [{ INFECTIOUS_PROTOCOL: 'YES' }]", () => {
    expect(conditions?.INFECTIOUS_VIDEO_CONSULTATION?.showWhenAny).toEqual(
      expect.arrayContaining([{ INFECTIOUS_PROTOCOL: "YES" }])
    );
  });

  it("INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED hat showWhenAny [{ INFECTIOUS_PROTOCOL: 'YES' }]", () => {
    expect(conditions?.INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED?.showWhenAny).toEqual(
      expect.arrayContaining([{ INFECTIOUS_PROTOCOL: "YES" }])
    );
  });
});

describe("ACUTE_CARE Renderer – INFECTIOUS ACTION-Bausteine bei ACTIVE erscheinen", () => {
  it("alle drei INFECTIOUS-ACTIONs erscheinen in attachedParagraphs wenn ACTIVE", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ACUTE_CARE",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          INFECTIOUS_CONTACT_DIGITALLY: ActionStatus.ACTIVE,
          INFECTIOUS_VIDEO_CONSULTATION: ActionStatus.ACTIVE,
          INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED: ActionStatus.ACTIVE,
        },
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatus>,
      },
    ]);

    const allText = result.sections.flatMap((s) => s.attachedParagraphs).join(" ");
    expect(allText).toContain("Bitte melden Sie sich vorab digital bei uns.");
    expect(allText).toContain("Alternativ können Sie eine Videosprechstunde wählen.");
    expect(allText).toContain("Bitte kommen Sie bei Verdacht auf eine ansteckende Erkrankung nicht unangemeldet in die Praxis.");
  });

  it("INFECTIOUS-ACTIONs erscheinen NICHT wenn kein Status gesetzt (INFECTIOUS_PROTOCOL = NO / nicht gesetzt)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ACUTE_CARE",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {},
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatus>,
      },
    ]);

    const allText = result.sections.flatMap((s) => s.attachedParagraphs).join(" ");
    expect(allText).not.toContain("vorab digital bei uns");
    expect(allText).not.toContain("Videosprechstunde wählen");
    expect(allText).not.toContain("nicht unangemeldet in die Praxis");
  });

  it("INFECTIOUS-ACTIONs erscheinen NICHT wenn INACTIVE", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "ACUTE_CARE",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          INFECTIOUS_CONTACT_DIGITALLY: ActionStatus.INACTIVE,
          INFECTIOUS_VIDEO_CONSULTATION: ActionStatus.INACTIVE,
          INFECTIOUS_DO_NOT_ENTER_UNANNOUNCED: ActionStatus.INACTIVE,
        },
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatus>,
      },
    ]);

    const allText = result.sections.flatMap((s) => s.attachedParagraphs).join(" ");
    expect(allText).not.toContain("vorab digital bei uns");
    expect(allText).not.toContain("Videosprechstunde wählen");
    expect(allText).not.toContain("nicht unangemeldet in die Praxis");
  });
});
