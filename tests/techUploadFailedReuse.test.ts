/**
 * Tests für die Wiederverwendung des Technik-Bausteins
 * `TECH_UPLOAD_FAILED` ("Dokument unleserlich – erneuter Upload erforderlich")
 * in den dokumentenbezogenen Profilen AU, PRESCRIPTION und REFERRAL.
 *
 * Anforderungen:
 * - Der Baustein wird nicht neu erstellt, sondern derselbe Checkpoint
 *   (eine ID, ein Text) ist in mehreren Profilen verfügbar.
 * - Der Baustein erscheint im Patientenoutput nur, wenn die Praxis ihn
 *   in M2 auf YES und in M3 auf SHOW gesetzt hat (Standardverhalten von
 *   SPECIFIC EXPLANATION-Checkpoints) – nicht automatisch.
 * - Profile ohne Dokumentenbezug (z. B. APPOINTMENT, BILLING) erhalten
 *   den Baustein nicht.
 * - Der bestehende TECH_SUPPORT-Flow bleibt unverändert.
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
} from "@/lib/inquiries/types";

const DOCUMENT_PROFILES = ["AU", "PRESCRIPTION", "REFERRAL"] as const;
const NON_DOCUMENT_PROFILES = ["APPOINTMENT", "BILLING"] as const;

describe("TECH_UPLOAD_FAILED – Wiederverwendung in dokumentenbezogenen Profilen", () => {
  it("Checkpoint existiert weiterhin im Katalog mit unverändertem Text und Rolle", () => {
    const cp = INQUIRY_CHECKPOINT_CATALOG_V2["TECH_UPLOAD_FAILED"];
    expect(cp).toBeDefined();
    expect(cp.kind).toBe(InquiryCheckpointKind.EXPLANATION);
    expect(cp.scope).toBe(InquiryCheckpointScope.SPECIFIC);
    // Rolle bewusst nicht generalisiert (keine Textänderung, keine
    // Verschiebung der TECH-Semantik) – siehe Aufgabenstellung.
    expect(cp.specificRole).toBe("CHANNEL_NOT_SUITABLE");
    expect(cp.textByStatus[ExplanationStatus.YES]).toContain("nicht ausreichend lesbar");
    expect(cp.textByStatus[ExplanationStatus.YES]).toContain("erneut hoch");
  });

  for (const profileId of DOCUMENT_PROFILES) {
    it(`${profileId}.specificCheckpointIds enthält TECH_UPLOAD_FAILED`, () => {
      const profile = INQUIRY_PROFILE_CATALOG_V2[profileId];
      expect(profile.specificCheckpointIds).toContain("TECH_UPLOAD_FAILED");
    });

    it(`${profileId}: TECH_UPLOAD_FAILED YES + SHOW → Aufforderung zum erneuten Upload erscheint`, () => {
      const result = renderInquiryResponseFromSections([
        {
          inquiryId: profileId,
          decisionStatus: DecisionStatus.POSSIBLE,
          checkpointStatuses: { TECH_UPLOAD_FAILED: ExplanationStatus.YES },
          explanationOutputStatuses: {
            TECH_UPLOAD_FAILED: ExplanationOutputStatus.SHOW,
          } as Record<string, ExplanationOutputStatus>,
        },
      ]);
      const paragraphs = result.sections[0].attachedParagraphs.join(" ");
      expect(paragraphs).toContain("nicht ausreichend lesbar");
      expect(paragraphs).toContain("erneut hoch");
    });

    it(`${profileId}: TECH_UPLOAD_FAILED ohne YES → kein Text (kein Auto-Output)`, () => {
      const result = renderInquiryResponseFromSections([
        {
          inquiryId: profileId,
          decisionStatus: DecisionStatus.POSSIBLE,
          checkpointStatuses: {},
          explanationOutputStatuses: {} as Record<string, ExplanationOutputStatus>,
        },
      ]);
      const paragraphs = result.sections[0].attachedParagraphs.join(" ");
      expect(paragraphs).not.toContain("erneut hoch");
    });

    it(`${profileId}: TECH_UPLOAD_FAILED YES + HIDE → kein Text`, () => {
      const result = renderInquiryResponseFromSections([
        {
          inquiryId: profileId,
          decisionStatus: DecisionStatus.POSSIBLE,
          checkpointStatuses: { TECH_UPLOAD_FAILED: ExplanationStatus.YES },
          explanationOutputStatuses: {
            TECH_UPLOAD_FAILED: ExplanationOutputStatus.HIDE,
          } as Record<string, ExplanationOutputStatus>,
        },
      ]);
      const paragraphs = result.sections[0].attachedParagraphs.join(" ");
      expect(paragraphs).not.toContain("erneut hoch");
    });
  }

  for (const profileId of NON_DOCUMENT_PROFILES) {
    it(`${profileId}.specificCheckpointIds enthält TECH_UPLOAD_FAILED NICHT`, () => {
      const profile = INQUIRY_PROFILE_CATALOG_V2[profileId];
      expect(profile.specificCheckpointIds).not.toContain("TECH_UPLOAD_FAILED");
    });
  }

  it("TECH_SUPPORT-Flow bleibt unverändert: TECH_UPLOAD_FAILED weiterhin gebunden", () => {
    const profile = INQUIRY_PROFILE_CATALOG_V2["TECH_SUPPORT"];
    expect(profile.specificCheckpointIds).toContain("TECH_UPLOAD_FAILED");
  });
});
