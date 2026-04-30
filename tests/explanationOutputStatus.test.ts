/**
 * Tests für die EXPLANATION factStatus/outputStatus-Trennung (§18).
 *
 * Prüft:
 * - factStatus YES + outputStatus SHOW  → Text erscheint (M4-Output)
 * - factStatus YES + outputStatus HIDE  → kein Text
 * - factStatus NO  + outputStatus HIDE  → kein Text
 * - factStatus undefined                → nicht in M3 und nicht in M4
 * - Backward-Compat: kein explanationOutputStatuses → factStatus YES liefert Text
 * - OUTCOME-Checkpoints folgen dieser Regel nicht (§19)
 */

import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import {
  DecisionStatus,
  ExplanationStatus,
  ExplanationOutputStatus,
  type InquirySection,
} from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Mocks (Fixtures inline, da jest.mock wird über Variablendeklarationen gehoist)
// ---------------------------------------------------------------------------

jest.mock("@/lib/inquiries/inquiryCheckpointCatalog", () => ({
  INQUIRY_CHECKPOINT_CATALOG_V2: {
    TEST_DECISION: {
      id: "TEST_DECISION",
      label: "Testentscheidung",
      kind: "DECISION",
      scope: "SPECIFIC",
      placement: "ATTACHED",
      textByStatus: { POSSIBLE: "Möglich." },
    },
    EXPL_CP: {
      id: "EXPL_CP",
      label: "Erklärung A",
      kind: "EXPLANATION",
      scope: "SPECIFIC",
      placement: "ATTACHED",
      textByStatus: { YES: "Erklärender Text für YES." },
    },
    OUTCOME_CP: {
      id: "OUTCOME_CP",
      label: "Outcome-Ergebnis",
      kind: "EXPLANATION",
      scope: "SPECIFIC",
      placement: "ATTACHED",
      classification: "OUTCOME",
      textByStatus: { YES: "OUTCOME ja.", NO: "OUTCOME nein." },
    },
  },
  INTRO_CHECKPOINT_IDS: [],
}));

jest.mock("@/lib/inquiries/inquiryProfileCatalog", () => ({
  INQUIRY_PROFILE_CATALOG_V2: {
    TEST_PROFILE: {
      id: "TEST_PROFILE",
      label: "Testprofil",
      decisionCheckpointId: "TEST_DECISION",
      specificCheckpointIds: ["EXPL_CP", "OUTCOME_CP"],
      boundGlobalCheckpointIds: [],
      availableActionIds: [],
    },
  },
}));

// ---------------------------------------------------------------------------
// Hilfsfunktion
// ---------------------------------------------------------------------------

function makeSection(
  overrides: Partial<InquirySection> = {},
): InquirySection {
  return {
    inquiryId: "TEST_PROFILE",
    decisionStatus: DecisionStatus.POSSIBLE,
    checkpointStatuses: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// §18 – EXPLANATION factStatus / outputStatus
// ---------------------------------------------------------------------------

describe("EXPLANATION §18 – outputStatus vorhanden", () => {
  it("factStatus YES + outputStatus SHOW → Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        checkpointStatuses: { EXPL_CP: ExplanationStatus.YES },
        explanationOutputStatuses: { EXPL_CP: ExplanationOutputStatus.SHOW },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain("Erklärender Text für YES.");
  });

  it("factStatus YES + outputStatus HIDE → kein Text", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        checkpointStatuses: { EXPL_CP: ExplanationStatus.YES },
        explanationOutputStatuses: { EXPL_CP: ExplanationOutputStatus.HIDE },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("factStatus NO + outputStatus HIDE → kein Text", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        checkpointStatuses: { EXPL_CP: ExplanationStatus.NO },
        explanationOutputStatuses: { EXPL_CP: ExplanationOutputStatus.HIDE },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("outputStatus undefined (Eintrag fehlt) → kein Text", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        checkpointStatuses: { EXPL_CP: ExplanationStatus.YES },
        explanationOutputStatuses: {}, // kein Eintrag für EXPL_CP
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });
});

describe("EXPLANATION §18 – factStatus undefined", () => {
  it("factStatus undefined → kein Text, auch wenn outputStatus SHOW wäre", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        checkpointStatuses: {}, // kein factStatus
        explanationOutputStatuses: { EXPL_CP: ExplanationOutputStatus.SHOW },
      }),
    ]);
    // status ist undefined → status === undefined → früh skip in Block B
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §18 – Backward-Compat (kein explanationOutputStatuses)
// ---------------------------------------------------------------------------

describe("EXPLANATION §18 – Backward-Compat (kein explanationOutputStatuses)", () => {
  it("factStatus YES, kein explanationOutputStatuses → Text erscheint (factStatus-Ableitung)", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        checkpointStatuses: { EXPL_CP: ExplanationStatus.YES },
        // explanationOutputStatuses fehlt absichtlich
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain("Erklärender Text für YES.");
  });

  it("factStatus NO, kein explanationOutputStatuses → kein Text", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        checkpointStatuses: { EXPL_CP: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §19 – OUTCOME-Checkpoints folgen der EXPLANATION-Regel nicht
// ---------------------------------------------------------------------------

describe("OUTCOME §19 – unberührt von EXPLANATION-Regel", () => {
  it("OUTCOME YES + decisionStatus POSSIBLE → erscheint (ignoriert outputStatus-Regel)", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { OUTCOME_CP: ExplanationStatus.YES },
        // Kein explanationOutputStatuses – OUTCOME nutzt keine outputStatus-Regel
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain("OUTCOME ja.");
  });

  it("OUTCOME NO + decisionStatus POSSIBLE → Privatrezept-ähnlicher Text erscheint", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { OUTCOME_CP: ExplanationStatus.NO },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain("OUTCOME nein.");
  });

  it("OUTCOME YES + decisionStatus NOT_POSSIBLE → kein Text (OUTCOME-Guard)", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        decisionStatus: DecisionStatus.NOT_POSSIBLE,
        checkpointStatuses: { OUTCOME_CP: ExplanationStatus.YES },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toHaveLength(0);
  });

  it("OUTCOME YES + outputStatus HIDE → Text erscheint trotzdem (OUTCOME folgt nicht §18)", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: { OUTCOME_CP: ExplanationStatus.YES },
        explanationOutputStatuses: { OUTCOME_CP: ExplanationOutputStatus.HIDE },
      }),
    ]);
    // OUTCOME ignoriert outputStatus; HIDE hat hier keine Wirkung
    expect(result.sections[0].attachedParagraphs).toContain("OUTCOME ja.");
  });
});

// ---------------------------------------------------------------------------
// Kombination: EXPL + OUTCOME in derselben Section
// ---------------------------------------------------------------------------

describe("EXPLANATION + OUTCOME kombiniert in einer Section", () => {
  it("EXPL SHOW + OUTCOME YES → beide Texte erscheinen", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          EXPL_CP: ExplanationStatus.YES,
          OUTCOME_CP: ExplanationStatus.YES,
        },
        explanationOutputStatuses: { EXPL_CP: ExplanationOutputStatus.SHOW },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).toContain("Erklärender Text für YES.");
    expect(result.sections[0].attachedParagraphs).toContain("OUTCOME ja.");
  });

  it("EXPL HIDE + OUTCOME YES → nur OUTCOME erscheint", () => {
    const result = renderInquiryResponseFromSections([
      makeSection({
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          EXPL_CP: ExplanationStatus.YES,
          OUTCOME_CP: ExplanationStatus.YES,
        },
        explanationOutputStatuses: { EXPL_CP: ExplanationOutputStatus.HIDE },
      }),
    ]);
    expect(result.sections[0].attachedParagraphs).not.toContain("Erklärender Text für YES.");
    expect(result.sections[0].attachedParagraphs).toContain("OUTCOME ja.");
  });
});
