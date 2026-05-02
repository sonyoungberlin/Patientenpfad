/**
 * Tests für den M1B/M3-Pilot am APPOINTMENT-Profil.
 *
 * 1. APPOINTMENT hat M1B-Optionen (communicationReasons).
 * 2. APPOINTMENT hat M3-Ziele (responseGoals).
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

const APPOINTMENT = INQUIRY_PROFILE_CATALOG_V2["APPOINTMENT"];

// ---------------------------------------------------------------------------
// Bekannte APPOINTMENT-M1B-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_COMMUNICATION_REASON_IDS: string[] = [
  "REQ_APPOINTMENT_INITIAL",
  "REQ_APPOINTMENT_CLARIFICATION",
  "REQ_WRONG_APPOINTMENT",
  "OUT_APPOINTMENT_OFFERED",
  "OUT_APPOINTMENT_RESCHEDULE",
  "OUT_MISSING_REQUIREMENT",
  "OUT_SPECIALIST_RESPONSIBILITY",
];

// ---------------------------------------------------------------------------
// Bekannte APPOINTMENT-M3-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_RESPONSE_GOAL_IDS: string[] = [
  "ISSUE_CONFIRMED",
  "ISSUE_BLOCKED_EXTERNAL",
  "ISSUE_BLOCKED_MISSING_INFO",
  "MEDICAL_REVIEW_NEEDED",
  "PROCESS_EXPLAINED",
];

// ---------------------------------------------------------------------------
// Bekannte Specific-Checkpoint-IDs
// ---------------------------------------------------------------------------
const EXPECTED_SPECIFIC_CHECKPOINT_IDS = [
  "APPOINTMENT_CAN_BE_BOOKED",
  "APPOINTMENT_CANCEL_OR_RESCHEDULE",
  "APPOINTMENT_WRONG_TYPE",
  "APPOINTMENT_BOOKING_CODE_REQUIRED",
  "APPOINTMENT_DATA_INCOMPLETE",
] as const;

// ---------------------------------------------------------------------------
// 1. APPOINTMENT hat communicationReasons
// ---------------------------------------------------------------------------

describe("APPOINTMENT – M1B communicationReasons", () => {
  it("Profil ist definiert", () => {
    expect(APPOINTMENT).toBeDefined();
  });

  it("communicationReasons ist gesetzt und nicht leer", () => {
    expect(APPOINTMENT.communicationReasons).toBeDefined();
    expect(APPOINTMENT.communicationReasons!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten eingehenden Anlässe", () => {
    const ids = APPOINTMENT.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("REQ_APPOINTMENT_INITIAL");
    expect(ids).toContain("REQ_APPOINTMENT_CLARIFICATION");
    expect(ids).toContain("REQ_WRONG_APPOINTMENT");
  });

  it("enthält alle erwarteten ausgehenden Anlässe", () => {
    const ids = APPOINTMENT.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("OUT_APPOINTMENT_OFFERED");
    expect(ids).toContain("OUT_APPOINTMENT_RESCHEDULE");
    expect(ids).toContain("OUT_MISSING_REQUIREMENT");
    expect(ids).toContain("OUT_SPECIALIST_RESPONSIBILITY");
  });

  it("enthält genau die erwarteten IDs (vollständig)", () => {
    const ids = APPOINTMENT.communicationReasons!.map((r) => r.id);
    for (const expected of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jeder Anlass hat ein label und eine direction", () => {
    for (const reason of APPOINTMENT.communicationReasons!) {
      expect(typeof reason.label).toBe("string");
      expect(reason.label.length).toBeGreaterThan(0);
      expect(["INCOMING", "OUTGOING"]).toContain(reason.direction);
    }
  });

  it("eingehende Anlässe haben direction INCOMING", () => {
    const incoming = APPOINTMENT.communicationReasons!.filter((r) =>
      r.id.startsWith("REQ_"),
    );
    for (const r of incoming) {
      expect(r.direction).toBe("INCOMING");
    }
  });

  it("ausgehende Anlässe haben direction OUTGOING", () => {
    const outgoing = APPOINTMENT.communicationReasons!.filter((r) =>
      r.id.startsWith("OUT_"),
    );
    for (const r of outgoing) {
      expect(r.direction).toBe("OUTGOING");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. APPOINTMENT hat responseGoals
// ---------------------------------------------------------------------------

describe("APPOINTMENT – M3 responseGoals", () => {
  it("responseGoals ist gesetzt und nicht leer", () => {
    expect(APPOINTMENT.responseGoals).toBeDefined();
    expect(APPOINTMENT.responseGoals!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten Antwortziele", () => {
    const ids = APPOINTMENT.responseGoals!.map((g) => g.id);
    for (const expected of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jedes Antwortziel hat ein label", () => {
    for (const goal of APPOINTMENT.responseGoals!) {
      expect(typeof goal.label).toBe("string");
      expect(goal.label.length).toBeGreaterThan(0);
    }
  });

  it("jedes Antwortziel hat mindestens eine relevantSpecificRole", () => {
    for (const goal of APPOINTMENT.responseGoals!) {
      expect(goal.relevantSpecificRoles.length).toBeGreaterThan(0);
    }
  });

  it("falscher Termin ist über ISSUE_BLOCKED_EXTERNAL abgebildet (CHANNEL_NOT_SUITABLE, EXTERNAL_RESPONSIBILITY)", () => {
    const blocked = APPOINTMENT.responseGoals!.find(
      (g) => g.id === "ISSUE_BLOCKED_EXTERNAL",
    );
    expect(blocked).toBeDefined();
    expect(blocked!.relevantSpecificRoles).toContain("CHANNEL_NOT_SUITABLE");
    expect(blocked!.relevantSpecificRoles).toContain("EXTERNAL_RESPONSIBILITY");
  });

  it("fehlende Daten sind über ISSUE_BLOCKED_MISSING_INFO abgebildet (MISSING_INFORMATION, MISSING_DOCUMENT)", () => {
    const blocked = APPOINTMENT.responseGoals!.find(
      (g) => g.id === "ISSUE_BLOCKED_MISSING_INFO",
    );
    expect(blocked).toBeDefined();
    expect(blocked!.relevantSpecificRoles).toContain("MISSING_INFORMATION");
    expect(blocked!.relevantSpecificRoles).toContain("MISSING_DOCUMENT");
  });

  it("Ablauf ist über PROCESS_EXPLAINED abgebildet (PROCESS_INFO)", () => {
    const process = APPOINTMENT.responseGoals!.find(
      (g) => g.id === "PROCESS_EXPLAINED",
    );
    expect(process).toBeDefined();
    expect(process!.relevantSpecificRoles).toContain("PROCESS_INFO");
  });
});

// ---------------------------------------------------------------------------
// 3. M1B verweist nur auf existierende M3-Ziel-IDs
// ---------------------------------------------------------------------------

describe("APPOINTMENT M1B → M3-Referenz-Integrität", () => {
  it("alle suggestedResponseGoalIds in communicationReasons sind bekannte responseGoal-IDs", () => {
    const knownGoalIds = new Set<string>(
      APPOINTMENT.responseGoals!.map((g) => g.id),
    );
    const violations: string[] = [];
    for (const reason of APPOINTMENT.communicationReasons!) {
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

describe("APPOINTMENT M3 → specificRole-Referenz-Integrität", () => {
  it("alle relevantSpecificRoles in responseGoals sind bekannte SpecificRole-Werte", () => {
    const violations: string[] = [];
    for (const goal of APPOINTMENT.responseGoals!) {
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

describe("APPOINTMENT Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe", () => {
  it("renderInquiryResponseFromSections enthält keine M1B- oder M3-IDs im Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
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
        inquiryId: "APPOINTMENT",
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

describe("APPOINTMENT Specific-Checkpoints – Existenz und Struktur", () => {
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

  it("APPOINTMENT_WRONG_TYPE hat specificRole CHANNEL_NOT_SUITABLE", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_WRONG_TYPE"].specificRole).toBe("CHANNEL_NOT_SUITABLE");
  });

  it("APPOINTMENT_CAN_BE_BOOKED hat specificRole PROCESS_INFO", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_CAN_BE_BOOKED"].specificRole).toBe("PROCESS_INFO");
  });

  it("APPOINTMENT_CAN_BE_BOOKED steht an erster Stelle in specificCheckpointIds", () => {
    expect(APPOINTMENT.specificCheckpointIds[0]).toBe("APPOINTMENT_CAN_BE_BOOKED");
  });

  it("APPOINTMENT_DATA_INCOMPLETE hat specificRole MISSING_INFORMATION", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_DATA_INCOMPLETE"].specificRole).toBe("MISSING_INFORMATION");
  });

  it("APPOINTMENT-Profil referenziert alle drei Specific-Checkpoints", () => {
    for (const id of EXPECTED_SPECIFIC_CHECKPOINT_IDS) {
      expect(APPOINTMENT.specificCheckpointIds).toContain(id);
    }
  });

  it("APPOINTMENT-Profil hat genau fünf Specific-Checkpoints", () => {
    expect(APPOINTMENT.specificCheckpointIds).toHaveLength(5);
  });

  it("APPOINTMENT_CANCEL_OR_RESCHEDULE hat specificRole PROCESS_INFO", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_CANCEL_OR_RESCHEDULE"].specificRole).toBe("PROCESS_INFO");
  });

  it("APPOINTMENT_CANCEL_OR_RESCHEDULE steht nach APPOINTMENT_CAN_BE_BOOKED in specificCheckpointIds", () => {
    const ids = APPOINTMENT.specificCheckpointIds;
    const canBeBookedIdx = ids.indexOf("APPOINTMENT_CAN_BE_BOOKED");
    const cancelIdx = ids.indexOf("APPOINTMENT_CANCEL_OR_RESCHEDULE");
    expect(cancelIdx).toBeGreaterThan(canBeBookedIdx);
  });
});

// ---------------------------------------------------------------------------
// 7. Renderer – Specific-Checkpoint-Texte
// ---------------------------------------------------------------------------

describe("APPOINTMENT Renderer – Specific-Checkpoint-Texte", () => {
  it("APPOINTMENT_WRONG_TYPE YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_WRONG_TYPE: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_WRONG_TYPE: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("gebuchte Termintyp");
  });

  it("APPOINTMENT_CAN_BE_BOOKED YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_CAN_BE_BOOKED: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_CAN_BE_BOOKED: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Für Ihr Anliegen kann grundsätzlich ein Termin vereinbart werden.");
  });

  it("APPOINTMENT_CAN_BE_BOOKED YES + SHOW → keine automatische Action im sharedBottom", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_CAN_BE_BOOKED: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_CAN_BE_BOOKED: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    expect(result.sharedBottom).toHaveLength(0);
  });

  it("APPOINTMENT_CAN_BE_BOOKED NO + SHOW → kein Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_CAN_BE_BOOKED: ExplanationStatus.NO },
        explanationOutputStatuses: { APPOINTMENT_CAN_BE_BOOKED: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("grundsätzlich ein Termin");
  });

  it("APPOINTMENT_CANCEL_OR_RESCHEDULE YES + SHOW → Absage-Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_CANCEL_OR_RESCHEDULE: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_CANCEL_OR_RESCHEDULE: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("Sie können Ihren Termin jederzeit über den Online-Kalender absagen oder verschieben.");
  });

  it("APPOINTMENT_CANCEL_OR_RESCHEDULE NO + SHOW → kein Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_CANCEL_OR_RESCHEDULE: ExplanationStatus.NO },
        explanationOutputStatuses: { APPOINTMENT_CANCEL_OR_RESCHEDULE: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("absagen oder verschieben");
  });

  it("APPOINTMENT_PROCESS_MULTI_STEP YES + SHOW → kein Text erscheint (deprecated, nicht mehr im Profil)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_PROCESS_MULTI_STEP: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_PROCESS_MULTI_STEP: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("mehrere Schritte");
  });

  it("APPOINTMENT_PREPARATION_REQUIRED YES + SHOW → kein Text erscheint (deprecated, nicht mehr im Profil)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_PREPARATION_REQUIRED: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_PREPARATION_REQUIRED: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Vorbereitungshinweise");
  });

  it("APPOINTMENT_DATA_INCOMPLETE YES + SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_DATA_INCOMPLETE: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_DATA_INCOMPLETE: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).toContain("weitere Angaben");
  });

  it("APPOINTMENT_DOCUMENT_MISSING YES + SHOW → kein Text erscheint (deprecated, nicht mehr im Profil)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_DOCUMENT_MISSING: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_DOCUMENT_MISSING: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("erforderlichen Unterlagen");
  });

  it("APPOINTMENT_WRONG_TYPE HIDE → kein Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_WRONG_TYPE: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_WRONG_TYPE: ExplanationOutputStatus.HIDE } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("gebuchte Termintyp");
  });

  it("APPOINTMENT_VIDEO_LIMITATIONS YES + SHOW → kein Text erscheint (deprecated, nicht mehr im Profil)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_VIDEO_LIMITATIONS: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_VIDEO_LIMITATIONS: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Videosprechstunde");
  });

  it("APPOINTMENT_VIDEO_REQUIREMENTS YES + SHOW → kein Text erscheint (deprecated, nicht mehr im Profil)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_VIDEO_REQUIREMENTS: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_VIDEO_REQUIREMENTS: ExplanationOutputStatus.SHOW } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Internetverbindung");
  });

  it("APPOINTMENT_VIDEO_LIMITATIONS HIDE → kein Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: { APPOINTMENT_VIDEO_LIMITATIONS: ExplanationStatus.YES },
        explanationOutputStatuses: { APPOINTMENT_VIDEO_LIMITATIONS: ExplanationOutputStatus.HIDE } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const paragraphs = result.sections[0].attachedParagraphs.join(" ");
    expect(paragraphs).not.toContain("Videosprechstunde");
  });
});

// ---------------------------------------------------------------------------
// 8. Deprecated Specific-Checkpoints (Termin-Brille-Cleanup)
//    – existieren weiterhin im Katalog, sind aber NICHT mehr im Profil.
// ---------------------------------------------------------------------------

describe("APPOINTMENT – @deprecated Checkpoints (Termin-Brille-Cleanup)", () => {
  const DEPRECATED_IDS = [
    "APPOINTMENT_PROCESS_MULTI_STEP",
    "APPOINTMENT_DOCUMENT_MISSING",
    "APPOINTMENT_VIDEO_LIMITATIONS",
    "APPOINTMENT_VIDEO_REQUIREMENTS",
    "APPOINTMENT_PREPARATION_REQUIRED",
  ] as const;

  for (const id of DEPRECATED_IDS) {
    it(`${id} existiert noch im Katalog (kein Löschen, nur Deprecation)`, () => {
      expect(INQUIRY_CHECKPOINT_CATALOG_V2[id]).toBeDefined();
    });

    it(`${id} ist NICHT mehr in APPOINTMENT.specificCheckpointIds`, () => {
      expect(APPOINTMENT.specificCheckpointIds).not.toContain(id);
    });
  }
});

// ---------------------------------------------------------------------------
// ACUTE_OPEN_CONSULTATION_ACTION – immer sichtbarer ACTION-Baustein in APPOINTMENT
// ---------------------------------------------------------------------------

describe("APPOINTMENT – ACUTE_OPEN_CONSULTATION_ACTION (ersetzt INFO)", () => {
  it("ACUTE_OPEN_CONSULTATION_ACTION ist in boundActionCheckpointIds", () => {
    expect((APPOINTMENT as any).boundActionCheckpointIds).toContain("ACUTE_OPEN_CONSULTATION_ACTION");
  });

  it("ACUTE_OPEN_CONSULTATION_ACTION hat hideWhenAny: [] (immer sichtbar)", () => {
    const conditions = (APPOINTMENT as any).boundActionConditions;
    expect(conditions?.ACUTE_OPEN_CONSULTATION_ACTION?.hideWhenAny).toEqual([]);
  });

  it("ACUTE_OPEN_CONSULTATION_INFO ist NICHT mehr in boundGlobalCheckpointIds", () => {
    expect(APPOINTMENT.boundGlobalCheckpointIds).not.toContain("ACUTE_OPEN_CONSULTATION_INFO");
  });

  it("ACUTE_OPEN_CONSULTATION_INFO ist NICHT in boundActionCheckpointIds", () => {
    expect((APPOINTMENT as any).boundActionCheckpointIds).not.toContain("ACUTE_OPEN_CONSULTATION_INFO");
  });

  it("ACUTE_OPEN_CONSULTATION_INFO bleibt im Katalog (Legacy)", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ACUTE_OPEN_CONSULTATION_INFO"]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// BOOK_APPOINTMENT – an APPOINTMENT_WRONG_TYPE gebunden (M2/M3-Binding)
// ---------------------------------------------------------------------------

describe("APPOINTMENT – BOOK_APPOINTMENT an APPOINTMENT_WRONG_TYPE gebunden", () => {
  it("BOOK_APPOINTMENT ist in boundActionCheckpointIds des APPOINTMENT-Profils", () => {
    expect((APPOINTMENT as any).boundActionCheckpointIds).toContain("BOOK_APPOINTMENT");
  });

  it("BOOK_APPOINTMENT hat showWhenAny [APPOINTMENT_WRONG_TYPE=YES] in boundActionConditions", () => {
    const conditions = (APPOINTMENT as any).boundActionConditions;
    expect(conditions?.BOOK_APPOINTMENT?.showWhenAny).toEqual([{ APPOINTMENT_WRONG_TYPE: "YES" }]);
  });

  it("BOOK_APPOINTMENT bleibt auch in availableActionIds (manuell aktivierbar)", () => {
    // BOOK_APPOINTMENT ist über boundActionCheckpointIds (condition-controlled) eingebunden.
    // Es ist NICHT mehr in availableActionIds, da beide Listen sich laut Architekturregel ausschließen.
    expect(APPOINTMENT.availableActionIds).not.toContain("BOOK_APPOINTMENT");
  });

  it("BOOK_APPOINTMENT ist weiterhin im Katalog als ACTION definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["BOOK_APPOINTMENT"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("Renderer: APPOINTMENT_WRONG_TYPE YES + SHOW, BOOK_APPOINTMENT ACTIVE → Terminbuchungstext in sharedBottom", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          APPOINTMENT_WRONG_TYPE: ExplanationStatus.YES,
          BOOK_APPOINTMENT: ActionStatus.ACTIVE,
        },
        explanationOutputStatuses: {
          APPOINTMENT_WRONG_TYPE: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    // BOOK_APPOINTMENT ist SHARED_BOTTOM → erscheint in sharedBottom, nicht in attachedParagraphs
    expect(result.sharedBottom.join(" ")).toContain("Online-Kalender");
  });

  it("Renderer: BOOK_APPOINTMENT erscheint nur einmal, auch wenn in availableActionIds und boundActionCheckpointIds (Deduplication)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          APPOINTMENT_WRONG_TYPE: ExplanationStatus.YES,
          BOOK_APPOINTMENT: ActionStatus.ACTIVE,
        },
        explanationOutputStatuses: {
          APPOINTMENT_WRONG_TYPE: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sharedBottom;
    const bookAppointmentCount = allText.filter((t) => t.includes("Online-Kalender")).length;
    expect(bookAppointmentCount).toBe(1);
  });

  it("Renderer: BOOK_APPOINTMENT INACTIVE → kein Terminbuchungstext in sharedBottom", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          APPOINTMENT_WRONG_TYPE: ExplanationStatus.YES,
          BOOK_APPOINTMENT: ActionStatus.INACTIVE,
        },
        explanationOutputStatuses: {
          APPOINTMENT_WRONG_TYPE: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    expect(result.sharedBottom.join(" ")).not.toContain("Online-Kalender");
  });
});

// ---------------------------------------------------------------------------
// Neue terminartspezifische Buchungs-Actions (APPOINTMENT M3 Buchungscodes)
// ---------------------------------------------------------------------------

describe("APPOINTMENT – terminartspezifische Buchungs-Actions im Katalog", () => {
  it("APPOINTMENT_BOOK_FINDINGS_REVIEW ist im Katalog als ACTION/SPECIFIC definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_BOOK_FINDINGS_REVIEW"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("APPOINTMENT_BOOK_FINDINGS_REVIEW enthält Code BFSP25 im ACTIVE-Text", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_BOOK_FINDINGS_REVIEW"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("BFSP25");
  });

  it("APPOINTMENT_BOOK_CHECKUP_SECOND ist im Katalog als ACTION/SPECIFIC definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_BOOK_CHECKUP_SECOND"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("APPOINTMENT_BOOK_CHECKUP_SECOND enthält Code CHECK25 im ACTIVE-Text", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_BOOK_CHECKUP_SECOND"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("CHECK25");
  });

  it("APPOINTMENT_BOOK_CHRONIC_CONTROL ist im Katalog als ACTION/SPECIFIC definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_BOOK_CHRONIC_CONTROL"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("APPOINTMENT_BOOK_CHRONIC_CONTROL enthält Code CHKT25 im ACTIVE-Text", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_BOOK_CHRONIC_CONTROL"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("CHKT25");
  });

  it("APPOINTMENT_BOOK_GENERAL ist im Katalog als ACTION/SPECIFIC definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_BOOK_GENERAL"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("APPOINTMENT_BOOK_GENERAL ACTIVE-Text enthält 'Online-Buchungskalender'", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_BOOK_GENERAL"];
    expect(cp.textByStatus[ActionStatus.ACTIVE]).toContain("Online-Buchungskalender");
  });
});

describe("APPOINTMENT – terminartspezifische Buchungs-Actions in boundActionCheckpointIds", () => {
  it("APPOINTMENT_BOOK_FINDINGS_REVIEW ist in boundActionCheckpointIds", () => {
    expect((APPOINTMENT as any).boundActionCheckpointIds).toContain("APPOINTMENT_BOOK_FINDINGS_REVIEW");
  });

  it("APPOINTMENT_BOOK_CHECKUP_SECOND ist in boundActionCheckpointIds", () => {
    expect((APPOINTMENT as any).boundActionCheckpointIds).toContain("APPOINTMENT_BOOK_CHECKUP_SECOND");
  });

  it("APPOINTMENT_BOOK_CHRONIC_CONTROL ist in boundActionCheckpointIds", () => {
    expect((APPOINTMENT as any).boundActionCheckpointIds).toContain("APPOINTMENT_BOOK_CHRONIC_CONTROL");
  });

  it("APPOINTMENT_BOOK_GENERAL ist in boundActionCheckpointIds", () => {
    expect((APPOINTMENT as any).boundActionCheckpointIds).toContain("APPOINTMENT_BOOK_GENERAL");
  });

  it("APPOINTMENT_BOOK_GENERAL hat kein boundActionCondition-Eintrag", () => {
    const conditions = (APPOINTMENT as any).boundActionConditions;
    expect(conditions?.APPOINTMENT_BOOK_GENERAL).toBeUndefined();
  });

  it("APPOINTMENT_BOOK_FINDINGS_REVIEW hat showWhenAny [APPOINTMENT_BOOKING_CODE_REQUIRED=YES] in boundActionConditions", () => {
    const conditions = (APPOINTMENT as any).boundActionConditions;
    expect(conditions?.APPOINTMENT_BOOK_FINDINGS_REVIEW?.showWhenAny).toEqual([{ APPOINTMENT_BOOKING_CODE_REQUIRED: "YES" }]);
  });

  it("APPOINTMENT_BOOK_CHECKUP_SECOND hat showWhenAny [APPOINTMENT_BOOKING_CODE_REQUIRED=YES] in boundActionConditions", () => {
    const conditions = (APPOINTMENT as any).boundActionConditions;
    expect(conditions?.APPOINTMENT_BOOK_CHECKUP_SECOND?.showWhenAny).toEqual([{ APPOINTMENT_BOOKING_CODE_REQUIRED: "YES" }]);
  });

  it("APPOINTMENT_BOOK_CHRONIC_CONTROL hat showWhenAny [APPOINTMENT_BOOKING_CODE_REQUIRED=YES] in boundActionConditions", () => {
    const conditions = (APPOINTMENT as any).boundActionConditions;
    expect(conditions?.APPOINTMENT_BOOK_CHRONIC_CONTROL?.showWhenAny).toEqual([{ APPOINTMENT_BOOKING_CODE_REQUIRED: "YES" }]);
  });
});

describe("APPOINTMENT – Renderer: terminartspezifische Buchungs-Actions", () => {
  it("APPOINTMENT_BOOK_FINDINGS_REVIEW ACTIVE → BFSP25-Text erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          APPOINTMENT_BOOKING_CODE_REQUIRED: ExplanationStatus.YES,
          APPOINTMENT_BOOK_FINDINGS_REVIEW: ActionStatus.ACTIVE,
        },
        explanationOutputStatuses: {
          APPOINTMENT_BOOKING_CODE_REQUIRED: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sections[0].attachedParagraphs.join(" ");
    expect(allText).toContain("BFSP25");
  });

  it("APPOINTMENT_BOOK_CHECKUP_SECOND ACTIVE → CHECK25-Text erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          APPOINTMENT_BOOKING_CODE_REQUIRED: ExplanationStatus.YES,
          APPOINTMENT_BOOK_CHECKUP_SECOND: ActionStatus.ACTIVE,
        },
        explanationOutputStatuses: {
          APPOINTMENT_BOOKING_CODE_REQUIRED: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sections[0].attachedParagraphs.join(" ");
    expect(allText).toContain("CHECK25");
  });

  it("APPOINTMENT_BOOK_CHRONIC_CONTROL ACTIVE → CHKT25-Text erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          APPOINTMENT_BOOKING_CODE_REQUIRED: ExplanationStatus.YES,
          APPOINTMENT_BOOK_CHRONIC_CONTROL: ActionStatus.ACTIVE,
        },
        explanationOutputStatuses: {
          APPOINTMENT_BOOKING_CODE_REQUIRED: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sections[0].attachedParagraphs.join(" ");
    expect(allText).toContain("CHKT25");
  });

  it("APPOINTMENT_BOOKING_CODE_REQUIRED YES allein → kein BFSP25/CHECK25/CHKT25 (keine Auto-Aktivierung)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          APPOINTMENT_BOOKING_CODE_REQUIRED: ExplanationStatus.YES,
        },
        explanationOutputStatuses: {
          APPOINTMENT_BOOKING_CODE_REQUIRED: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = [
      ...result.sections[0].attachedParagraphs,
      ...result.sharedBottom,
    ].join(" ");
    expect(allText).not.toContain("BFSP25");
    expect(allText).not.toContain("CHECK25");
    expect(allText).not.toContain("CHKT25");
  });

  it("APPOINTMENT_BOOK_GENERAL ACTIVE → 'Online-Buchungskalender' erscheint in attachedParagraphs", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "APPOINTMENT",
        decisionStatus: DecisionStatus.DISABLED,
        checkpointStatuses: {
          APPOINTMENT_BOOK_GENERAL: ActionStatus.ACTIVE,
        },
        explanationOutputStatuses: {} as Record<string, ExplanationOutputStatus>,
      },
    ]);
    const allText = result.sections[0].attachedParagraphs.join(" ");
    expect(allText).toContain("Online-Buchungskalender");
  });
});
