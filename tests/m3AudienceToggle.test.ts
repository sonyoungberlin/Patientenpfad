/**
 * Tests für den Audience-Umschalter in M3.
 *
 * Prüft das Verhalten des Renderers, wie er in InquiryM3Client.tsx
 * für livePreview und frozenOutputByAudience verwendet wird:
 *
 * - Default audience ("patient") → textByStatus-Text
 * - audience="contact_person" → textByAudience.contact_person
 * - Fallback auf textByStatus, wenn kein textByAudience definiert ist
 * - Re-Rendering mit gewechselter audience liefert anderen Text
 */

import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { DecisionStatus, ActionStatus, ExplanationStatus, type CheckpointStatusValue } from "@/lib/inquiries/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Section für das AU-Profil (ohne weitere checkpoints). */
function makeAuSection(extra: Record<string, CheckpointStatusValue> = {}) {
  return {
    inquiryId: "AU",
    decisionStatus: DecisionStatus.POSSIBLE,
    checkpointStatuses: { ...extra },
  };
}

// ---------------------------------------------------------------------------
// Default audience = "patient"
// ---------------------------------------------------------------------------

describe("M3 Audience-Toggle – Default: patient", () => {
  it("renderInquiryResponseFromSections ohne options gibt patient-Text (= textByStatus) aus", () => {
    const INTRO_ID = "MESSAGE_INTRO_PATIENT_REQUEST_RECEIVED";
    const section = makeAuSection({ [INTRO_ID]: ActionStatus.ACTIVE });
    const result = renderInquiryResponseFromSections([section]);
    expect(result.intro).toBe("Vielen Dank für Ihre Anfrage.");
  });

  it("renderInquiryResponseFromSections mit audience='patient' gibt identischen Text aus", () => {
    const INTRO_ID = "MESSAGE_INTRO_PATIENT_REQUEST_RECEIVED";
    const section = makeAuSection({ [INTRO_ID]: ActionStatus.ACTIVE });
    const withDefault = renderInquiryResponseFromSections([section]);
    const withPatient = renderInquiryResponseFromSections([section], { audience: "patient" });
    expect(withPatient.intro).toBe(withDefault.intro);
  });
});

// ---------------------------------------------------------------------------
// Umschalten auf contact_person → textByAudience.contact_person
// ---------------------------------------------------------------------------

describe("M3 Audience-Toggle – Umschalten auf contact_person", () => {
  const INTRO_CASES = [
    "MESSAGE_INTRO_PATIENT_REQUEST_RECEIVED",
    "MESSAGE_INTRO_QUESTIONNAIRE_RECEIVED",
    "MESSAGE_INTRO_PRACTICE_FOLLOWUP",
    "MESSAGE_INTRO_MISSING_INFO",
  ] as const;

  for (const INTRO_ID of INTRO_CASES) {
    it(`${INTRO_ID}: audience='contact_person' → textByAudience.contact_person`, () => {
      const section = makeAuSection({ [INTRO_ID]: ActionStatus.ACTIVE });

      const withPatient = renderInquiryResponseFromSections([section], { audience: "patient" });
      const withContact = renderInquiryResponseFromSections([section], { audience: "contact_person" });

      // Texte müssen unterschiedlich sein
      expect(withContact.intro).not.toBe(withPatient.intro);

      // contact_person-Text muss mit textByAudience.contact_person übereinstimmen
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[INTRO_ID];
      expect(withContact.intro).toBe(cp.textByAudience?.contact_person);
    });
  }

  it("Umschalten ändert nur den Text, nicht die Section-Struktur", () => {
    const INTRO_ID = "MESSAGE_INTRO_QUESTIONNAIRE_RECEIVED";
    const section = makeAuSection({ [INTRO_ID]: ActionStatus.ACTIVE });

    const withPatient = renderInquiryResponseFromSections([section], { audience: "patient" });
    const withContact = renderInquiryResponseFromSections([section], { audience: "contact_person" });

    // Sektions-Struktur identisch
    expect(withPatient.sections).toHaveLength(withContact.sections.length);
    // Intro-Text unterschiedlich
    expect(withContact.intro).not.toBe(withPatient.intro);
  });
});

// ---------------------------------------------------------------------------
// Fallback auf textByStatus (kein textByAudience definiert)
// ---------------------------------------------------------------------------

describe("M3 Audience-Toggle – Fallback auf textByStatus", () => {
  it("Checkpoint ohne textByAudience → Umschalten ändert den Text nicht", () => {
    // AU_BACKDATE_LIMIT hat kein textByAudience – muss auf textByStatus zurückfallen.
    const section = {
      inquiryId: "AU",
      decisionStatus: DecisionStatus.POSSIBLE,
    checkpointStatuses: { AU_BACKDATE_LIMIT: ExplanationStatus.YES },
    };
    const withPatient = renderInquiryResponseFromSections([section], { audience: "patient" });
    const withContact = renderInquiryResponseFromSections([section], { audience: "contact_person" });

    // Ohne textByAudience müssen beide denselben Text liefern
    expect(withPatient.sections[0].attachedParagraphs).toEqual(
      withContact.sections[0].attachedParagraphs,
    );
  });

  it("AU_BACKDATE_LIMIT hat kein textByAudience definiert", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["AU_BACKDATE_LIMIT"];
    expect(cp?.textByAudience).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AU_DECISION hat jetzt textByAudience.contact_person (per-status)
// ---------------------------------------------------------------------------

describe("M3 Audience-Toggle – AU_DECISION mit textByAudience", () => {
  it("AU_DECISION POSSIBLE: contact_person → neutraler Text ohne 'Ihre'", () => {
    const section = {
      inquiryId: "AU",
      decisionStatus: DecisionStatus.POSSIBLE,
      checkpointStatuses: {},
    };
    const withContact = renderInquiryResponseFromSections([section], { audience: "contact_person" });
    expect(withContact.sections[0].mainDecision).toBe(
      "Die Arbeitsunfähigkeitsbescheinigung wurde ausgestellt.",
    );
  });

  it("AU_DECISION NOT_POSSIBLE: contact_person → neutraler Text ohne 'Ihnen'", () => {
    const section = {
      inquiryId: "AU",
      decisionStatus: DecisionStatus.NOT_POSSIBLE,
      checkpointStatuses: {},
    };
    const withContact = renderInquiryResponseFromSections([section], { audience: "contact_person" });
    expect(withContact.sections[0].mainDecision).toBe(
      "Die angefragte Arbeitsunfähigkeitsbescheinigung wurde nicht ausgestellt.",
    );
  });

  it("AU_DECISION POSSIBLE: patient → weiterhin ursprünglicher Text", () => {
    const section = {
      inquiryId: "AU",
      decisionStatus: DecisionStatus.POSSIBLE,
      checkpointStatuses: {},
    };
    const withPatient = renderInquiryResponseFromSections([section], { audience: "patient" });
    expect(withPatient.sections[0].mainDecision).toBe(
      "Ihre Arbeitsunfähigkeitsbescheinigung wurde ausgestellt.",
    );
  });
});

// ---------------------------------------------------------------------------
// Re-Rendering mit gewechselter audience (simuliert M3-UI-State-Wechsel)
// ---------------------------------------------------------------------------

describe("M3 Audience-Toggle – Re-Rendering bei State-Wechsel", () => {
  it("zwei identische Sections – nur audience wechselt → andere intro-Texte", () => {
    const INTRO_ID = "MESSAGE_INTRO_MISSING_INFO";
    const section = makeAuSection({ [INTRO_ID]: ActionStatus.ACTIVE });

    // Simulates what InquiryM3Client livePreview does on state change
    const renderForAudience = (aud: "patient" | "contact_person") =>
      renderInquiryResponseFromSections([section], { audience: aud });

    const r1 = renderForAudience("patient");
    const r2 = renderForAudience("contact_person");
    const r3 = renderForAudience("patient"); // Back to patient

    expect(r1.intro).toBe(r3.intro); // Patient → Contact → Patient: same as original
    expect(r1.intro).not.toBe(r2.intro); // Patient ≠ Contact
  });

  it("Wechsel beeinflusst nur intro, nicht documentation", () => {
    const INTRO_ID = "MESSAGE_INTRO_PRACTICE_FOLLOWUP";
    const section = makeAuSection({ [INTRO_ID]: ActionStatus.ACTIVE });

    const withPatient = renderInquiryResponseFromSections([section], { audience: "patient" });
    const withContact = renderInquiryResponseFromSections([section], { audience: "contact_person" });

    // Intro differs
    expect(withContact.intro).not.toBe(withPatient.intro);
    // Documentation is the same (docs use textByStatus, not textByAudience)
    expect(withPatient.documentation).toEqual(withContact.documentation);
  });
});
