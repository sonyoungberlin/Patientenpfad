/**
 * Tests für den neuen globalen ACTION-Baustein DIGITAL_REQUEST_REQUIRED.
 *
 * 1. Katalogstruktur: kind, scope, placement, actionCategory, textByStatus
 * 2. Einbindung in AU, PRESCRIPTION und REFERRAL
 * 3. DISABLED-Decision + DIGITAL_REQUEST_REQUIRED ACTIVE → attachedParagraphs, kein mainDecision
 * 4. DIGITAL_REQUEST_REQUIRED und DIGITAL_REQUEST können gleichzeitig im Output erscheinen
 */

import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import {
  ActionStatus,
  DecisionStatus,
  InquiryCheckpointKind,
  InquiryCheckpointPlacement,
  InquiryCheckpointScope,
} from "@/lib/inquiries/types";

const AU = INQUIRY_PROFILE_CATALOG_V2["AU"];
const PRESCRIPTION = INQUIRY_PROFILE_CATALOG_V2["PRESCRIPTION"];
const REFERRAL = INQUIRY_PROFILE_CATALOG_V2["REFERRAL"];

const EXPECTED_TEXT =
  "Für die Prüfung Ihres Anliegens benötigen wir noch einige Angaben.\nBitte stellen Sie dazu eine digitale Anfrage über den folgenden Link und beantworten Sie die Fragen.";

// ---------------------------------------------------------------------------
// 1. Katalogstruktur
// ---------------------------------------------------------------------------

describe("DIGITAL_REQUEST_REQUIRED – Katalogstruktur", () => {
  const cp = INQUIRY_CHECKPOINT_CATALOG_V2["DIGITAL_REQUEST_REQUIRED"];

  it("ist im Katalog definiert", () => {
    expect(cp).toBeDefined();
  });

  it("hat kind ACTION", () => {
    expect(cp.kind).toBe(InquiryCheckpointKind.ACTION);
  });

  it("hat scope GLOBAL", () => {
    expect(cp.scope).toBe(InquiryCheckpointScope.GLOBAL);
  });

  it("hat placement ATTACHED", () => {
    expect(cp.placement).toBe(InquiryCheckpointPlacement.ATTACHED);
  });

  it("hat actionCategory INFO", () => {
    expect((cp as any).actionCategory).toBe("INFO");
  });

  it("hat ACTIVE-Text mit erwartetem Inhalt", () => {
    const text = (cp.textByStatus as Record<string, string | undefined>)[
      ActionStatus.ACTIVE
    ];
    expect(typeof text).toBe("string");
    expect(text).toBe(EXPECTED_TEXT);
  });

  it("hat INACTIVE-Text nicht gesetzt", () => {
    const text = (cp.textByStatus as Record<string, string | undefined>)[
      ActionStatus.INACTIVE
    ];
    expect(text).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Einbindung in AU, PRESCRIPTION, REFERRAL
// ---------------------------------------------------------------------------

describe("DIGITAL_REQUEST_REQUIRED – Einbindung in AU", () => {
  it("ist in AU.boundActionCheckpointIds enthalten", () => {
    expect(AU.boundActionCheckpointIds).toContain("DIGITAL_REQUEST_REQUIRED");
  });

  it("hat Condition hideWhenAny: [] in AU.boundActionConditions", () => {
    const condition = AU.boundActionConditions?.["DIGITAL_REQUEST_REQUIRED"];
    expect(condition).toBeDefined();
    expect(condition?.hideWhenAny).toEqual([]);
  });
});

describe("DIGITAL_REQUEST_REQUIRED – Einbindung in PRESCRIPTION", () => {
  it("ist in PRESCRIPTION.boundActionCheckpointIds enthalten", () => {
    expect(PRESCRIPTION.boundActionCheckpointIds).toContain(
      "DIGITAL_REQUEST_REQUIRED"
    );
  });

  it("hat Condition hideWhenAny: [] in PRESCRIPTION.boundActionConditions", () => {
    const condition =
      PRESCRIPTION.boundActionConditions?.["DIGITAL_REQUEST_REQUIRED"];
    expect(condition).toBeDefined();
    expect(condition?.hideWhenAny).toEqual([]);
  });
});

describe("DIGITAL_REQUEST_REQUIRED – Einbindung in REFERRAL", () => {
  it("ist in REFERRAL.boundActionCheckpointIds enthalten", () => {
    expect(REFERRAL.boundActionCheckpointIds).toContain(
      "DIGITAL_REQUEST_REQUIRED"
    );
  });

  it("hat Condition hideWhenAny: [] in REFERRAL.boundActionConditions", () => {
    const condition =
      REFERRAL.boundActionConditions?.["DIGITAL_REQUEST_REQUIRED"];
    expect(condition).toBeDefined();
    expect(condition?.hideWhenAny).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. DISABLED-Decision + DIGITAL_REQUEST_REQUIRED ACTIVE
//    → Text erscheint in attachedParagraphs, mainDecision ist null
// ---------------------------------------------------------------------------

describe(
  "DIGITAL_REQUEST_REQUIRED – DISABLED-Decision ergibt keinen Entscheidungstext",
  () => {
    for (const profileId of ["AU", "PRESCRIPTION", "REFERRAL"] as const) {
      describe(`Profil: ${profileId}`, () => {
        it("mainDecision ist null bei DecisionStatus.DISABLED", () => {
          const result = renderInquiryResponseFromSections([
            {
              inquiryId: profileId,
              decisionStatus: DecisionStatus.DISABLED,
              checkpointStatuses: {
                DIGITAL_REQUEST_REQUIRED: ActionStatus.ACTIVE,
              },
              explanationOutputStatuses: {},
            },
          ]);

          expect(result.sections[0].mainDecision).toBeNull();
        });

        it("DIGITAL_REQUEST_REQUIRED-Text erscheint in attachedParagraphs", () => {
          const result = renderInquiryResponseFromSections([
            {
              inquiryId: profileId,
              decisionStatus: DecisionStatus.DISABLED,
              checkpointStatuses: {
                DIGITAL_REQUEST_REQUIRED: ActionStatus.ACTIVE,
              },
              explanationOutputStatuses: {},
            },
          ]);

          expect(result.sections[0].attachedParagraphs).toContain(
            EXPECTED_TEXT
          );
        });

        it("sharedBottom enthält den Text nicht (ATTACHED placement)", () => {
          const result = renderInquiryResponseFromSections([
            {
              inquiryId: profileId,
              decisionStatus: DecisionStatus.DISABLED,
              checkpointStatuses: {
                DIGITAL_REQUEST_REQUIRED: ActionStatus.ACTIVE,
              },
              explanationOutputStatuses: {},
            },
          ]);

          expect(result.sharedBottom).not.toContain(EXPECTED_TEXT);
        });
      });
    }
  }
);

// ---------------------------------------------------------------------------
// 4. DIGITAL_REQUEST_REQUIRED und DIGITAL_REQUEST können gemeinsam erscheinen
// ---------------------------------------------------------------------------

describe(
  "DIGITAL_REQUEST_REQUIRED + DIGITAL_REQUEST – gemeinsamer Output",
  () => {
    const DIGITAL_REQUEST_TEXT =
      "Bitte stellen Sie eine digitale Anfrage über den folgenden Link und beantworten Sie die Fragen.";

    it("AU: beide Texte erscheinen bei gleichzeitiger Aktivierung", () => {
      const result = renderInquiryResponseFromSections([
        {
          inquiryId: "AU",
          decisionStatus: DecisionStatus.DISABLED,
          checkpointStatuses: {
            DIGITAL_REQUEST_REQUIRED: ActionStatus.ACTIVE,
            DIGITAL_REQUEST: ActionStatus.ACTIVE,
          },
          explanationOutputStatuses: {},
        },
      ]);

      const attached = result.sections[0].attachedParagraphs;
      const shared = result.sharedBottom;

      // DIGITAL_REQUEST_REQUIRED → ATTACHED → attachedParagraphs
      expect(attached).toContain(EXPECTED_TEXT);
      // DIGITAL_REQUEST → SHARED_BOTTOM → sharedBottom
      expect(shared).toContain(DIGITAL_REQUEST_TEXT);
    });

    it("PRESCRIPTION: beide Texte erscheinen bei gleichzeitiger Aktivierung", () => {
      const result = renderInquiryResponseFromSections([
        {
          inquiryId: "PRESCRIPTION",
          decisionStatus: DecisionStatus.DISABLED,
          checkpointStatuses: {
            DIGITAL_REQUEST_REQUIRED: ActionStatus.ACTIVE,
            DIGITAL_REQUEST: ActionStatus.ACTIVE,
          },
          explanationOutputStatuses: {},
        },
      ]);

      const attached = result.sections[0].attachedParagraphs;
      const shared = result.sharedBottom;

      expect(attached).toContain(EXPECTED_TEXT);
      expect(shared).toContain(DIGITAL_REQUEST_TEXT);
    });

    it("REFERRAL: beide Texte erscheinen bei gleichzeitiger Aktivierung", () => {
      const result = renderInquiryResponseFromSections([
        {
          inquiryId: "REFERRAL",
          decisionStatus: DecisionStatus.DISABLED,
          checkpointStatuses: {
            DIGITAL_REQUEST_REQUIRED: ActionStatus.ACTIVE,
            DIGITAL_REQUEST: ActionStatus.ACTIVE,
          },
          explanationOutputStatuses: {},
        },
      ]);

      const attached = result.sections[0].attachedParagraphs;
      const shared = result.sharedBottom;

      expect(attached).toContain(EXPECTED_TEXT);
      expect(shared).toContain(DIGITAL_REQUEST_TEXT);
    });

    it("DIGITAL_REQUEST_REQUIRED INACTIVE → kein Text im Output", () => {
      const result = renderInquiryResponseFromSections([
        {
          inquiryId: "AU",
          decisionStatus: DecisionStatus.DISABLED,
          checkpointStatuses: {
            DIGITAL_REQUEST_REQUIRED: ActionStatus.INACTIVE,
          },
          explanationOutputStatuses: {},
        },
      ]);

      const allText = [
        ...result.sections.flatMap((s) => s.attachedParagraphs),
        ...result.sharedBottom,
      ].join(" ");

      expect(allText).not.toContain(EXPECTED_TEXT);
    });
  }
);
