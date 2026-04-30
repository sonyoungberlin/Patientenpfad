/**
 * Guard-Tests für renderInquiryResponseFromSections.
 *
 * Prüft, dass scope/kind/placement-Guards im Renderer greifen,
 * wenn Checkpoints falsch in boundGlobalCheckpointIds oder availableActionIds
 * einsortiert werden.
 */

import {
  InquiryCheckpointKind,
  InquiryCheckpointScope,
  InquiryCheckpointPlacement,
  DecisionStatus,
  ExplanationStatus,
  ActionStatus,
} from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Gemeinsame Katalog-Fixtures
// ---------------------------------------------------------------------------

const SPECIFIC_EXPLANATION_CHECKPOINT = {
  id: "SPECIFIC_EXPL",
  label: "Spezifischer Erklärungsblock",
  kind: InquiryCheckpointKind.EXPLANATION,
  scope: InquiryCheckpointScope.SPECIFIC, // SPECIFIC, nicht GLOBAL → Guard greift
  placement: InquiryCheckpointPlacement.ATTACHED,
  question: undefined,
  textByStatus: {},
};

const GLOBAL_EXPLANATION_CHECKPOINT = {
  id: "GLOBAL_EXPL",
  label: "Globaler Schalter",
  kind: InquiryCheckpointKind.EXPLANATION,
  scope: InquiryCheckpointScope.GLOBAL,
  placement: InquiryCheckpointPlacement.ATTACHED,
  question: "Gilt das für dieses Anliegen?",
  textByStatus: {},
};

const DECISION_CHECKPOINT = {
  id: "TEST_DECISION",
  label: "Testentscheidung",
  kind: InquiryCheckpointKind.DECISION,
  scope: InquiryCheckpointScope.SPECIFIC,
  placement: InquiryCheckpointPlacement.ATTACHED,
  textByStatus: {
    [DecisionStatus.POSSIBLE]: "Möglich.",
  },
};

// Ein EXPLANATION-Checkpoint (kein ACTION) der fälschlicherweise in availableActionIds landet.
const NON_ACTION_CHECKPOINT = {
  id: "NON_ACTION",
  label: "Kein Action-Checkpoint",
  kind: InquiryCheckpointKind.EXPLANATION, // falsch für availableActionIds
  scope: InquiryCheckpointScope.GLOBAL,
  placement: InquiryCheckpointPlacement.SHARED_BOTTOM,
  question: "Irgendeine Frage?",
  textByStatus: {
    [ActionStatus.ACTIVE]: "Dieser Text darf nicht in sharedBottom landen.",
  },
};

// ---------------------------------------------------------------------------
// Mock-Setup
// ---------------------------------------------------------------------------

jest.mock("@/lib/inquiries/inquiryCheckpointCatalog", () => ({
  INQUIRY_CHECKPOINT_CATALOG_V2: {
    TEST_DECISION: DECISION_CHECKPOINT,
    SPECIFIC_EXPL: SPECIFIC_EXPLANATION_CHECKPOINT,
    GLOBAL_EXPL: GLOBAL_EXPLANATION_CHECKPOINT,
    NON_ACTION: NON_ACTION_CHECKPOINT,
  },
  INTRO_CHECKPOINT_IDS: [],
}));

jest.mock("@/lib/inquiries/inquiryProfileCatalog", () => ({
  INQUIRY_PROFILE_CATALOG_V2: {
    TEST_PROFILE: {
      id: "TEST_PROFILE",
      label: "Testprofil",
      decisionCheckpointId: "TEST_DECISION",
      specificCheckpointIds: [],
      // SPECIFIC_EXPL ist scope=SPECIFIC – Guard muss ihn hier überspringen
      boundGlobalCheckpointIds: ["SPECIFIC_EXPL", "GLOBAL_EXPL"],
      // NON_ACTION ist kind=EXPLANATION – Guard muss ihn hier überspringen
      availableActionIds: ["NON_ACTION"],
      globalHints: {
        SPECIFIC_EXPL: "Dieser globalHint darf NICHT erscheinen.",
        GLOBAL_EXPL: "Dieser globalHint darf erscheinen.",
      },
    },
  },
}));

// Import nach den Mocks
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("renderInquiryResponseFromSections – scope-Guard (Block C)", () => {
  it("SPECIFIC EXPLANATION in boundGlobalCheckpointIds → erzeugt keinen globalHint-Output", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "TEST_PROFILE",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          SPECIFIC_EXPL: ExplanationStatus.YES, // YES, aber scope=SPECIFIC → Guard
        },
      },
    ]);
    expect(result.sections[0].attachedParagraphs).not.toContain(
      "Dieser globalHint darf NICHT erscheinen.",
    );
  });

  it("GLOBAL EXPLANATION in boundGlobalCheckpointIds mit YES → globalHint erscheint korrekt", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "TEST_PROFILE",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          GLOBAL_EXPL: ExplanationStatus.YES,
        },
      },
    ]);
    expect(result.sections[0].attachedParagraphs).toContain(
      "Dieser globalHint darf erscheinen.",
    );
  });
});

describe("renderInquiryResponseFromSections – kind-Guard (Block D)", () => {
  it("Nicht-ACTION in availableActionIds → erzeugt keinen sharedBottom-Eintrag", () => {
    const result = renderInquiryResponseFromSections([
      {
        inquiryId: "TEST_PROFILE",
        decisionStatus: DecisionStatus.POSSIBLE,
        checkpointStatuses: {
          NON_ACTION: ActionStatus.ACTIVE, // ACTIVE, aber kind=EXPLANATION → Guard
        },
      },
    ]);
    expect(result.sharedBottom).toHaveLength(0);
    expect(result.sharedBottom).not.toContain(
      "Dieser Text darf nicht in sharedBottom landen.",
    );
  });
});
