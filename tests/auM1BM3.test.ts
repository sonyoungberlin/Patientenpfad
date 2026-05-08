/**
 * Tests für den M1B/M3-Pilot am AU-Profil.
 *
 * 1. AU hat M1B-Optionen (communicationReasons).
 * 2. AU hat M3-Ziele (responseGoals).
 * 3. M1B verweist nur auf existierende M3-Ziel-IDs.
 * 4. M3 verweist nur auf existierende specificRoles.
 * 5. Renderer bleibt unverändert (communicationReasons/responseGoals tauchen nicht im Output auf).
 * 6. Neue AU-Checkpoints (AU_NEW_PATIENT_LIMIT, AU_DIGITAL_AU_PROCESS) und
 *    ACUTE_OPEN_CONSULTATION_INFO sind korrekt definiert und im AU-Profil referenziert.
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

const AU = INQUIRY_PROFILE_CATALOG_V2["AU"];

// ---------------------------------------------------------------------------
// Bekannte AU-M1B-IDs (lokal definiert, kein Import aus types.ts nötig)
// ---------------------------------------------------------------------------
const EXPECTED_COMMUNICATION_REASON_IDS: string[] = [
  "REQ_AU_INITIAL",
  "REQ_AU_EXTENSION",
  "REQ_AU_BACKDATE",
  "REQ_AU_CLARIFICATION",
  "OUT_AU_ISSUED",
  "OUT_AU_DECLINED",
  "OUT_MISSING_REQUIREMENT",
  "OUT_SPECIALIST_RESPONSIBILITY",
];

// ---------------------------------------------------------------------------
// Bekannte AU-M3-IDs (lokal definiert)
// ---------------------------------------------------------------------------
const EXPECTED_RESPONSE_GOAL_IDS: string[] = [
  "ISSUE_CONFIRMED",
  "ISSUE_BLOCKED_TIME_LIMIT",
  "ISSUE_BLOCKED_EXTERNAL",
  "ISSUE_BLOCKED_MISSING_INFO",
  "MEDICAL_REVIEW_NEEDED",
  "PROCESS_EXPLAINED",
];

// ---------------------------------------------------------------------------
// 1. AU hat communicationReasons
// ---------------------------------------------------------------------------

describe("AU – M1B communicationReasons", () => {
  it("Profil ist definiert", () => {
    expect(AU).toBeDefined();
  });

  it("communicationReasons ist gesetzt und nicht leer", () => {
    expect(AU.communicationReasons).toBeDefined();
    expect(AU.communicationReasons!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten eingehenden Anlässe", () => {
    const ids = AU.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("REQ_AU_INITIAL");
    expect(ids).toContain("REQ_AU_EXTENSION");
    expect(ids).toContain("REQ_AU_BACKDATE");
    expect(ids).toContain("REQ_AU_CLARIFICATION");
  });

  it("enthält alle erwarteten ausgehenden Anlässe", () => {
    const ids = AU.communicationReasons!.map((r) => r.id);
    expect(ids).toContain("OUT_AU_ISSUED");
    expect(ids).toContain("OUT_AU_DECLINED");
    expect(ids).toContain("OUT_MISSING_REQUIREMENT");
    expect(ids).toContain("OUT_SPECIALIST_RESPONSIBILITY");
  });

  it("enthält genau die erwarteten IDs (vollständig)", () => {
    const ids = AU.communicationReasons!.map((r) => r.id);
    for (const expected of EXPECTED_COMMUNICATION_REASON_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jeder Anlass hat ein label und eine direction", () => {
    for (const reason of AU.communicationReasons!) {
      expect(typeof reason.label).toBe("string");
      expect(reason.label.length).toBeGreaterThan(0);
      expect(["INCOMING", "OUTGOING"]).toContain(reason.direction);
    }
  });

  it("eingehende Anlässe haben direction INCOMING", () => {
    const incoming = AU.communicationReasons!.filter((r) =>
      r.id.startsWith("REQ_"),
    );
    for (const r of incoming) {
      expect(r.direction).toBe("INCOMING");
    }
  });

  it("ausgehende Anlässe haben direction OUTGOING", () => {
    const outgoing = AU.communicationReasons!.filter((r) =>
      r.id.startsWith("OUT_"),
    );
    for (const r of outgoing) {
      expect(r.direction).toBe("OUTGOING");
    }
  });
});

// ---------------------------------------------------------------------------
// 2. AU hat responseGoals
// ---------------------------------------------------------------------------

describe("AU – M3 responseGoals", () => {
  it("responseGoals ist gesetzt und nicht leer", () => {
    expect(AU.responseGoals).toBeDefined();
    expect(AU.responseGoals!.length).toBeGreaterThan(0);
  });

  it("enthält alle erwarteten Antwortziele", () => {
    const ids = AU.responseGoals!.map((g) => g.id);
    for (const expected of EXPECTED_RESPONSE_GOAL_IDS) {
      expect(ids).toContain(expected);
    }
  });

  it("jedes Antwortziel hat ein label", () => {
    for (const goal of AU.responseGoals!) {
      expect(typeof goal.label).toBe("string");
      expect(goal.label.length).toBeGreaterThan(0);
    }
  });

  it("jedes Antwortziel hat mindestens eine relevantSpecificRole", () => {
    for (const goal of AU.responseGoals!) {
      expect(goal.relevantSpecificRoles.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. M1B verweist nur auf existierende M3-Ziel-IDs
// ---------------------------------------------------------------------------

describe("AU M1B → M3-Referenz-Integrität", () => {
  it("alle suggestedResponseGoalIds in communicationReasons sind bekannte responseGoal-IDs", () => {
    const knownGoalIds = new Set<string>(
      AU.responseGoals!.map((g) => g.id),
    );
    const violations: string[] = [];
    for (const reason of AU.communicationReasons!) {
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

describe("AU M3 → specificRole-Referenz-Integrität", () => {
  it("alle relevantSpecificRoles in responseGoals sind bekannte SpecificRole-Werte", () => {
    const violations: string[] = [];
    for (const goal of AU.responseGoals!) {
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

describe("AU Renderer – communicationReasons/responseGoals haben keinen Einfluss auf Ausgabe", () => {
  it("renderInquiryResponseFromSections enthält keine M1B- oder M3-IDs im Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "AU",
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
        inquiryId: "AU",
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
// 6. Neue AU-Checkpoints – Struktur und Profil-Referenz
// ---------------------------------------------------------------------------

describe("AU_NEW_PATIENT_LIMIT – Checkpoint-Struktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["AU_NEW_PATIENT_LIMIT"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind EXPLANATION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.EXPLANATION);
  });

  it("hat scope SPECIFIC", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("hat specificRole RULE_TIME_LIMIT", () => {
    expect((cp as any).specificRole).toBe("RULE_TIME_LIMIT");
  });

  it("hat keinen YES-Text (reiner M2-Schalter)", () => {
    const text = (cp.textByStatus as Record<string, string>)[ExplanationStatus.YES];
    expect(!text || text.length === 0).toBe(true);
  });

  it("ist in AU.specificCheckpointIds referenziert", () => {
    expect(AU.specificCheckpointIds).toContain("AU_NEW_PATIENT_LIMIT");
  });
});

describe("AU_NEW_PATIENT_3DAY_LIMIT – Checkpoint-Struktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["AU_NEW_PATIENT_3DAY_LIMIT"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("hat scope SPECIFIC", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("hat ACTIVE-Text mit 3-Tage-Inhalt", () => {
    const text = (cp.textByStatus as Record<string, string>)["ACTIVE"];
    expect(text).toContain("3 Tage");
  });

  it("ist in AU.boundActionCheckpointIds referenziert", () => {
    expect((AU as any).boundActionCheckpointIds).toContain("AU_NEW_PATIENT_3DAY_LIMIT");
  });

  it("wird bei AU_NEW_PATIENT_LIMIT = YES freigeschaltet", () => {
    const conditions = (AU as any).boundActionConditions;
    expect(conditions?.AU_NEW_PATIENT_3DAY_LIMIT?.showWhenAny).toEqual(
      expect.arrayContaining([{ AU_NEW_PATIENT_LIMIT: "YES" }])
    );
  });
});

describe("AU_FOLLOWUP_REQUIRES_VISIT – Checkpoint-Struktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["AU_FOLLOWUP_REQUIRES_VISIT"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind EXPLANATION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.EXPLANATION);
  });

  it("hat scope SPECIFIC", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("hat YES-Text mit Folgebescheinigung-Inhalt", () => {
    const text = (cp.textByStatus as Record<string, string>)[ExplanationStatus.YES];
    expect(text).toContain("Folgebescheinigung");
    expect(text).toContain("persönliche Vorstellung");
  });

  it("ist in AU.specificCheckpointIds referenziert", () => {
    expect(AU.specificCheckpointIds).toContain("AU_FOLLOWUP_REQUIRES_VISIT");
  });

  it("hat specificRole MEDICAL_REVIEW_REQUIRED", () => {
    expect((cp as any).specificRole).toBe("MEDICAL_REVIEW_REQUIRED");
  });

  it("hat m5Code NEED_VISIT", () => {
    expect((cp as any).m5Code).toBe("NEED_VISIT");
  });
});

describe("AU_DIGITAL_AU_PROCESS – Checkpoint-Struktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["AU_DIGITAL_AU_PROCESS"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind EXPLANATION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.EXPLANATION);
  });

  it("hat scope SPECIFIC", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("hat specificRole PROCESS_INFO", () => {
    expect((cp as any).specificRole).toBe("PROCESS_INFO");
  });

  it("hat keinen YES-Text (reiner M2-Schalter, Inhalte kommen über boundActionCheckpointIds)", () => {
    const text = (cp.textByStatus as Record<string, string>)[ExplanationStatus.YES];
    expect(!text || text.length === 0).toBe(true);
  });

  it("ist in AU.specificCheckpointIds referenziert", () => {
    expect(AU.specificCheckpointIds).toContain("AU_DIGITAL_AU_PROCESS");
  });
});

describe("ACUTE_OPEN_CONSULTATION_INFO – weiterhin im Katalog vorhanden (für andere Profile)", () => {
  it("ACUTE_OPEN_CONSULTATION_INFO existiert im Checkpoint-Katalog", () => {
    expect(INQUIRY_CHECKPOINT_CATALOG_V2["ACUTE_OPEN_CONSULTATION_INFO"]).toBeDefined();
  });

  it("ist NICHT mehr in AU.boundGlobalCheckpointIds (wurde durch ACUTE_OPEN_CONSULTATION_ACTION abgelöst)", () => {
    expect(AU.boundGlobalCheckpointIds).not.toContain("ACUTE_OPEN_CONSULTATION_INFO");
  });

  it("ist NICHT in AU.boundActionCheckpointIds (wurde durch ACUTE_OPEN_CONSULTATION_ACTION abgelöst)", () => {
    expect((AU as any).boundActionCheckpointIds).not.toContain("ACUTE_OPEN_CONSULTATION_INFO");
  });
});

describe("ACUTE_OPEN_CONSULTATION_ACTION – neuer ACTION-Baustein", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ACUTE_OPEN_CONSULTATION_ACTION"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("hat scope GLOBAL", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
  });

  it("hat actionCategory INFO", () => {
    expect((cp as any).actionCategory).toBe("INFO");
  });

  it("hat ACTIVE-Text mit Sprechstunden-Inhalt", () => {
    const text = (cp.textByStatus as Record<string, string>)["ACTIVE"];
    expect(text).toContain("offene Sprechstunde");
    expect(text).toContain("9–10 Uhr");
  });

  it("ist in AU.boundActionCheckpointIds referenziert", () => {
    expect((AU as any).boundActionCheckpointIds).toContain("ACUTE_OPEN_CONSULTATION_ACTION");
  });

  it("wird bei AU_NO_APPOINTMENT_ACUTE = YES freigeschaltet", () => {
    const conditions = (AU as any).boundActionConditions;
    expect(conditions?.ACUTE_OPEN_CONSULTATION_ACTION?.showWhenAny).toEqual(
      expect.arrayContaining([{ AU_NO_APPOINTMENT_ACUTE: "YES" }])
    );
  });
});

// ---------------------------------------------------------------------------
// 11. AU_NO_APPOINTMENT_ACUTE – Checkpoint-Struktur und Profil-Referenz
// ---------------------------------------------------------------------------

describe("AU_NO_APPOINTMENT_ACUTE – Checkpoint-Struktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["AU_NO_APPOINTMENT_ACUTE"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind EXPLANATION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.EXPLANATION);
  });

  it("hat scope SPECIFIC", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
  });

  it("hat eine Frage", () => {
    expect(cp.questions?.length).toBeGreaterThan(0);
    expect(cp.questions?.[0].text).toContain("akute Beschwerden");
  });

  it("hat keinen YES-Text (reiner M2-Schalter)", () => {
    const text = (cp.textByStatus as Record<string, string>)[ExplanationStatus.YES];
    expect(!text || text.length === 0).toBe(true);
  });

  it("hat keinen NO-Text (reiner M2-Schalter)", () => {
    const text = (cp.textByStatus as Record<string, string>)[ExplanationStatus.NO];
    expect(!text || text.length === 0).toBe(true);
  });

  it("ist in AU.specificCheckpointIds referenziert", () => {
    expect(AU.specificCheckpointIds).toContain("AU_NO_APPOINTMENT_ACUTE");
  });

  it("ist NICHT in AU.boundGlobalCheckpointIds", () => {
    expect(AU.boundGlobalCheckpointIds).not.toContain("AU_NO_APPOINTMENT_ACUTE");
  });
});

// ---------------------------------------------------------------------------
// 12. AU – AU_NO_APPOINTMENT_ACUTE Triggerweg über boundActionCheckpointIds
// ---------------------------------------------------------------------------

describe("AU – AU_NO_APPOINTMENT_ACUTE Triggerweg", () => {
  it("ONLINE_ANAMNESIS ist nicht in AU.boundActionConditions", () => {
    const conditions = (AU as any).boundActionConditions;
    expect(conditions?.ONLINE_ANAMNESIS).toBeUndefined();
  });

  it("DIGITAL_REQUEST wird auch bei AU_NO_APPOINTMENT_ACUTE = YES freigeschaltet", () => {
    const conditions = (AU as any).boundActionConditions;
    expect(conditions?.DIGITAL_REQUEST?.showWhenAny).toEqual(
      expect.arrayContaining([{ AU_NO_APPOINTMENT_ACUTE: "YES" }])
    );
  });

  it("DIGITAL_REQUEST_PROCESSING_TIME wird auch bei AU_NO_APPOINTMENT_ACUTE = YES freigeschaltet", () => {
    const conditions = (AU as any).boundActionConditions;
    expect(conditions?.DIGITAL_REQUEST_PROCESSING_TIME?.showWhenAny).toEqual(
      expect.arrayContaining([{ AU_NO_APPOINTMENT_ACUTE: "YES" }])
    );
  });

  it("ACUTE_OPEN_CONSULTATION_ACTION ist in AU.boundActionCheckpointIds", () => {
    expect((AU as any).boundActionCheckpointIds).toContain("ACUTE_OPEN_CONSULTATION_ACTION");
  });

  it("ACUTE_OPEN_CONSULTATION_ACTION hat Condition auf AU_NO_APPOINTMENT_ACUTE = YES", () => {
    const conditions = (AU as any).boundActionConditions;
    expect(conditions?.ACUTE_OPEN_CONSULTATION_ACTION?.showWhenAny).toEqual(
      expect.arrayContaining([{ AU_NO_APPOINTMENT_ACUTE: "YES" }])
    );
  });

  it("DIGITAL_REQUEST behält weiterhin AU_DIGITAL_AU_PROCESS = YES als Trigger", () => {
    const conditions = (AU as any).boundActionConditions;
    expect(conditions?.DIGITAL_REQUEST?.showWhenAny).toEqual(
      expect.arrayContaining([{ AU_DIGITAL_AU_PROCESS: "YES" }])
    );
  });

  it("DIGITAL_REQUEST_PROCESSING_TIME behält weiterhin AU_DIGITAL_AU_PROCESS = YES als Trigger", () => {
    const conditions = (AU as any).boundActionConditions;
    expect(conditions?.DIGITAL_REQUEST_PROCESSING_TIME?.showWhenAny).toEqual(
      expect.arrayContaining([{ AU_DIGITAL_AU_PROCESS: "YES" }])
    );
  });
});

// ---------------------------------------------------------------------------
// 7. Renderer – neue Checkpoints erscheinen korrekt im Output
// ---------------------------------------------------------------------------

describe("AU Renderer – neue AU-Checkpoints", () => {
  it("AU_NEW_PATIENT_LIMIT YES + SHOW liefert keinen Text mehr (reiner Schalter)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "AU",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          AU_NEW_PATIENT_LIMIT: ExplanationStatus.YES,
        },
        explanationOutputStatuses: {
          AU_NEW_PATIENT_LIMIT: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);

    const allText = result.sections.flatMap((s) => s.attachedParagraphs).join(" ");
    expect(allText).not.toContain("3 Tage");
    expect(allText).not.toContain("Folgebescheinigung");
  });

  it("AU_NEW_PATIENT_LIMIT HIDE liefert keinen Text", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "AU",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          AU_NEW_PATIENT_LIMIT: ExplanationStatus.YES,
        },
        explanationOutputStatuses: {
          AU_NEW_PATIENT_LIMIT: ExplanationOutputStatus.HIDE,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);

    const allText = result.sections.flatMap((s) => s.attachedParagraphs).join(" ");
    expect(allText).not.toContain("3 Tage");
    expect(allText).not.toContain("Folgebescheinigung");
  });

  it("AU_DIGITAL_AU_PROCESS YES + SHOW liefert keinen Text mehr (reiner M2-Schalter)", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "AU",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          AU_DIGITAL_AU_PROCESS: ExplanationStatus.YES,
        },
        explanationOutputStatuses: {
          AU_DIGITAL_AU_PROCESS: ExplanationOutputStatus.SHOW,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);

    const allText = result.sections.flatMap((s) => s.attachedParagraphs).join(" ");
    // Nach Refactoring: kein Text mehr im Checkpoint selbst
    expect(allText).not.toContain("kurz-anamnese");
    expect(allText).not.toContain("8–12 Stunden");
    expect(allText).not.toContain("digitaleanfrage");
  });

  it("AU_DIGITAL_AU_PROCESS HIDE liefert keinen Text", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "AU",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          AU_DIGITAL_AU_PROCESS: ExplanationStatus.YES,
        },
        explanationOutputStatuses: {
          AU_DIGITAL_AU_PROCESS: ExplanationOutputStatus.HIDE,
        } as Record<string, ExplanationOutputStatus>,
      },
    ]);

    const allText = result.sections.flatMap((s) => s.attachedParagraphs).join(" ");
    expect(allText).not.toContain("kurz-anamnese");
  });
});

// ---------------------------------------------------------------------------
// 8. DIGITAL_REQUEST – aktualisierter Text mit URL
// ---------------------------------------------------------------------------

describe("DIGITAL_REQUEST – aktualisierter Text ohne URL", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["DIGITAL_REQUEST"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat ACTIVE-Text mit Hinweis auf den Link und die Fragen", () => {
    const text = (cp.textByStatus as Record<string, string>)["ACTIVE"];
    expect(text).toBe(
      "Bitte stellen Sie eine digitale Anfrage über den folgenden Link und beantworten Sie die Fragen.",
    );
  });

  it("enthält keinen Link mehr", () => {
    const text = (cp.textByStatus as Record<string, string>)["ACTIVE"];
    expect(text).not.toContain("http");
    expect(text).not.toContain("Formular");
  });

  it("hat scope GLOBAL", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
  });
});

// ---------------------------------------------------------------------------
// 9. DIGITAL_REQUEST_PROCESSING_TIME – neuer globaler Baustein
// ---------------------------------------------------------------------------

describe("DIGITAL_REQUEST_PROCESSING_TIME – Checkpoint-Struktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["DIGITAL_REQUEST_PROCESSING_TIME"];

  it("ist definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("hat scope GLOBAL", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
  });

  it("hat actionCategory INFO", () => {
    expect((cp as any).actionCategory).toBe("INFO");
  });

  it("hat ACTIVE-Text mit 8–12 Stunden und Nachfragen-Hinweis", () => {
    const text = (cp.textByStatus as Record<string, string>)["ACTIVE"];
    expect(text).toContain("8–12 Stunden");
    expect(text).toContain("Nachfragen");
  });
});

// ---------------------------------------------------------------------------
// 10. AU-Profil – AU_DIGITAL_AU_PROCESS Triggerweg über boundActionCheckpointIds
// ---------------------------------------------------------------------------

describe("AU – AU_DIGITAL_AU_PROCESS Triggerweg", () => {
  it("ONLINE_ANAMNESIS ist nicht in AU.boundActionCheckpointIds", () => {
    expect((AU as any).boundActionCheckpointIds).not.toContain("ONLINE_ANAMNESIS");
  });

  it("DIGITAL_REQUEST ist in AU.boundActionCheckpointIds", () => {
    expect((AU as any).boundActionCheckpointIds).toContain("DIGITAL_REQUEST");
  });

  it("DIGITAL_REQUEST_PROCESSING_TIME ist in AU.boundActionCheckpointIds", () => {
    expect((AU as any).boundActionCheckpointIds).toContain("DIGITAL_REQUEST_PROCESSING_TIME");
  });

  it("DIGITAL_REQUEST wird bei AU_DIGITAL_AU_PROCESS = YES freigeschaltet", () => {
    const conditions = (AU as any).boundActionConditions;
    expect(conditions?.DIGITAL_REQUEST?.showWhenAny).toEqual(
      expect.arrayContaining([{ AU_DIGITAL_AU_PROCESS: "YES" }])
    );
  });

  it("DIGITAL_REQUEST_PROCESSING_TIME wird bei AU_DIGITAL_AU_PROCESS = YES freigeschaltet", () => {
    const conditions = (AU as any).boundActionConditions;
    expect(conditions?.DIGITAL_REQUEST_PROCESSING_TIME?.showWhenAny).toEqual(
      expect.arrayContaining([{ AU_DIGITAL_AU_PROCESS: "YES" }])
    );
  });

  it("ONLINE_ANAMNESIS ist nicht mehr in AU.availableActionIds (kein Duplikat)", () => {
    expect(AU.availableActionIds).not.toContain("ONLINE_ANAMNESIS");
  });

  it("DIGITAL_REQUEST ist nicht mehr in AU.availableActionIds (kein Duplikat)", () => {
    expect(AU.availableActionIds).not.toContain("DIGITAL_REQUEST");
  });
});
