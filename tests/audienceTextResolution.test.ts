/**
 * Tests für die Audience-Dimension der Textausgabe.
 *
 * Prüft:
 * - textByAudience.patient überschreibt textByStatus bei audience="patient"
 * - textByAudience.contact_person überschreibt textByStatus bei audience="contact_person"
 * - Fehlendes textByAudience fällt auf textByStatus zurück (Default-Verhalten)
 * - Default audience ("patient") ohne expliziten Parameter
 * - Audience-Auflösung für Intro-Checkpoints (section F)
 * - Audience-Auflösung für specificCheckpoints (section B)
 */

import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { DecisionStatus, ActionStatus, ExplanationStatus } from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimale AU-Section mit gegebenen extra checkpointStatuses. */
function makeAuSection(extra: Record<string, string> = {}) {
  return {
    inquiryId: "AU",
    decisionStatus: DecisionStatus.POSSIBLE,
    checkpointStatuses: { ...extra },
  };
}

// ---------------------------------------------------------------------------
// Intro-Checkpoints – audience-Auflösung (section F)
// ---------------------------------------------------------------------------

describe("Audience – Intro-Checkpoints (MESSAGE_INTRO_PATIENT_REQUEST_RECEIVED)", () => {
  const INTRO_ID = "MESSAGE_INTRO_PATIENT_REQUEST_RECEIVED";
  const section = makeAuSection({ [INTRO_ID]: ActionStatus.ACTIVE });

  it("Default (kein options) → textByStatus-Text (patient-äquivalent)", () => {
    const result = renderInquiryResponseFromSections([section]);
    expect(result.intro).toBe("Ihre Nachricht ist bei uns eingegangen.");
  });

  it("audience='patient' → textByStatus-Text (kein patient-Override definiert)", () => {
    const result = renderInquiryResponseFromSections([section], { audience: "patient" });
    expect(result.intro).toBe("Ihre Nachricht ist bei uns eingegangen.");
  });

  it("audience='contact_person' → textByAudience.contact_person-Text", () => {
    const result = renderInquiryResponseFromSections([section], { audience: "contact_person" });
    expect(result.intro).toContain("Angehörige");
    expect(result.intro).not.toBe("Ihre Nachricht ist bei uns eingegangen.");
  });

  it("Intro-Catalog enthält textByAudience.contact_person", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2[INTRO_ID];
    expect(cp.textByAudience?.contact_person).toBeDefined();
  });
});

describe("Audience – MESSAGE_INTRO_QUESTIONNAIRE_RECEIVED", () => {
  const INTRO_ID = "MESSAGE_INTRO_QUESTIONNAIRE_RECEIVED";
  const section = makeAuSection({ [INTRO_ID]: ActionStatus.ACTIVE });

  it("audience='contact_person' → Angehörigen-Formulierung", () => {
    const result = renderInquiryResponseFromSections([section], { audience: "contact_person" });
    expect(result.intro).toContain("Angehörigen");
  });

  it("audience='patient' → Standard-Formulierung", () => {
    const result = renderInquiryResponseFromSections([section], { audience: "patient" });
    expect(result.intro).toBe("Vielen Dank für das Ausfüllen des Fragebogens.");
  });
});

describe("Audience – MESSAGE_INTRO_PRACTICE_FOLLOWUP", () => {
  const INTRO_ID = "MESSAGE_INTRO_PRACTICE_FOLLOWUP";
  const section = makeAuSection({ [INTRO_ID]: ActionStatus.ACTIVE });

  it("audience='contact_person' → Angehörigen-Formulierung", () => {
    const result = renderInquiryResponseFromSections([section], { audience: "contact_person" });
    expect(result.intro).toContain("Angehörigen");
  });
});

describe("Audience – MESSAGE_INTRO_MISSING_INFO", () => {
  const INTRO_ID = "MESSAGE_INTRO_MISSING_INFO";
  const section = makeAuSection({ [INTRO_ID]: ActionStatus.ACTIVE });

  it("audience='contact_person' → Angehörigen-Formulierung", () => {
    const result = renderInquiryResponseFromSections([section], { audience: "contact_person" });
    expect(result.intro).toContain("Angehörigen");
  });
});

// ---------------------------------------------------------------------------
// Fallback: kein textByAudience → textByStatus bleibt aktiv
// ---------------------------------------------------------------------------

describe("Audience – Fallback auf textByStatus wenn kein textByAudience definiert", () => {
  it("AU-Profil: contact_person ohne textByAudience gibt textByStatus-Text aus", () => {
    // AU_POSSIBLE hat kein textByAudience – muss auf textByStatus zurückfallen.
    const section = {
      inquiryId: "AU",
      decisionStatus: DecisionStatus.POSSIBLE,
      checkpointStatuses: {},
    };
    const withPatient = renderInquiryResponseFromSections([section], { audience: "patient" });
    const withContact = renderInquiryResponseFromSections([section], { audience: "contact_person" });
    // Beide müssen denselben Text liefern (kein textByAudience-Override)
    expect(withPatient.sections[0].mainDecision).toBe(withContact.sections[0].mainDecision);
    expect(withPatient.sections[0].mainDecision).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Audience-Auflösung für SPECIFIC EXPLANATION-Checkpoints (section B)
// ---------------------------------------------------------------------------

describe("Audience – specificCheckpointIds EXPLANATION (AU_MEDICAL_CONSULTATION_REQUIRED)", () => {
  const SPECIFIC_ID = "AU_MEDICAL_CONSULTATION_REQUIRED";

  it("audience='patient' → textByStatus-Text (kein patient-Override)", () => {
    const section = {
      inquiryId: "AU",
      decisionStatus: DecisionStatus.POSSIBLE,
      checkpointStatuses: { [SPECIFIC_ID]: ExplanationStatus.YES },
    };
    const result = renderInquiryResponseFromSections([section], { audience: "patient" });
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2[SPECIFIC_ID];
    const expected = cp.textByStatus[ExplanationStatus.YES];
    expect(result.sections[0].attachedParagraphs).toContain(expected);
  });

  it("audience='contact_person' ohne textByAudience → textByStatus-Text (Fallback)", () => {
    const section = {
      inquiryId: "AU",
      decisionStatus: DecisionStatus.POSSIBLE,
      checkpointStatuses: { [SPECIFIC_ID]: ExplanationStatus.YES },
    };
    const withPatient = renderInquiryResponseFromSections([section], { audience: "patient" });
    const withContact = renderInquiryResponseFromSections([section], { audience: "contact_person" });
    expect(withPatient.sections[0].attachedParagraphs).toEqual(withContact.sections[0].attachedParagraphs);
  });
});
