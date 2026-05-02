/**
 * Tests für neutrale contact_person-Texte für die in der Audit-Runde ergänzten
 * Checkpoints / Actions.
 *
 * Erwartung: Bei audience="contact_person" werden die textByAudience.contact_person
 * Varianten genutzt; sie enthalten weder "Sie/Ihr/Ihre/Ihren/Ihnen" noch
 * "Patient" oder "Angehörige". Die ursprünglichen Patiententexte (textByStatus)
 * bleiben unverändert und werden bei audience="patient" weiterhin ausgegeben.
 */

import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import {
  ActionStatus,
  ExplanationStatus,
  type AudienceText,
} from "@/lib/inquiries/types";

// IDs and the status under which the contact_person variant must be defined.
const EXPLANATION_IDS_YES = [
  "APPOINTMENT_CAN_BE_BOOKED",
  "APPOINTMENT_CANCEL_OR_RESCHEDULE",
  "IMMUNIZATION_VACCINATION_RECORD_MISSING",
  "MEDICAL_DOCUMENT_POSSIBLE",
  "ONBOARDING_DOCTOLIB_INFO",
  "ONBOARDING_GKV_DOCUMENT_MISSING",
] as const;

const ACTION_IDS_ACTIVE = [
  "APPOINTMENT_BOOK_FINDINGS_REVIEW",
  "APPOINTMENT_BOOK_CHECKUP_SECOND",
  "APPOINTMENT_BOOK_CHRONIC_CONTROL",
  "ONBOARDING_IDENTITY_CLARIFICATION_REQUIRED",
  "ONBOARDING_DATA_MISSING_CONTEXT",
  "LAB_APPOINTMENT_INTERNAL",
  "LAB_APPOINTMENT_INDIVIDUAL",
] as const;

// Verbotene Begriffe – Kontaktperson-Texte sollen weder direkt anreden
// noch eine konkrete Rolle wie "Patient" oder "Angehörige" benennen.
const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bSie\b/,
  /\bIhr(?:e|en|em|er|es)?\b/,
  /\bIhnen\b/,
  /Patient(?:in|en)?/i,
  /Angeh\u00F6rig/i,
];

function resolveContactText(
  override: AudienceText | undefined,
  status: string,
): string | undefined {
  if (override === undefined) return undefined;
  if (typeof override === "string") return override;
  return (override as Record<string, string>)[status];
}

describe("contact_person – neutrale Texte (Audit-Ergänzungen)", () => {
  for (const id of EXPLANATION_IDS_YES) {
    describe(id, () => {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];

      it("hat textByAudience.contact_person mit Eintrag für ExplanationStatus.YES", () => {
        const text = resolveContactText(
          cp.textByAudience?.contact_person,
          ExplanationStatus.YES,
        );
        expect(typeof text).toBe("string");
        expect(text && text.length).toBeGreaterThan(0);
      });

      it("contact_person-Text enthält keine direkten Anreden / Rollenbezeichnungen", () => {
        const text =
          resolveContactText(
            cp.textByAudience?.contact_person,
            ExplanationStatus.YES,
          ) ?? "";
        for (const pattern of FORBIDDEN_PATTERNS) {
          expect(text).not.toMatch(pattern);
        }
      });

      it("ursprünglicher Patiententext (textByStatus.YES) bleibt unverändert vorhanden", () => {
        expect(typeof cp.textByStatus[ExplanationStatus.YES]).toBe("string");
        expect((cp.textByStatus[ExplanationStatus.YES] ?? "").length).toBeGreaterThan(0);
      });
    });
  }

  for (const id of ACTION_IDS_ACTIVE) {
    describe(id, () => {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2[id];

      it("hat textByAudience.contact_person mit Eintrag für ActionStatus.ACTIVE", () => {
        const text = resolveContactText(
          cp.textByAudience?.contact_person,
          ActionStatus.ACTIVE,
        );
        expect(typeof text).toBe("string");
        expect(text && text.length).toBeGreaterThan(0);
      });

      it("contact_person-Text enthält keine direkten Anreden / Rollenbezeichnungen", () => {
        const text =
          resolveContactText(
            cp.textByAudience?.contact_person,
            ActionStatus.ACTIVE,
          ) ?? "";
        for (const pattern of FORBIDDEN_PATTERNS) {
          expect(text).not.toMatch(pattern);
        }
      });

      it("ursprünglicher Patiententext (textByStatus.ACTIVE) bleibt unverändert vorhanden", () => {
        expect(typeof cp.textByStatus[ActionStatus.ACTIVE]).toBe("string");
        expect((cp.textByStatus[ActionStatus.ACTIVE] ?? "").length).toBeGreaterThan(0);
      });
    });
  }

  // Stichprobe: konkrete Texte aus Vorgabe – wortwörtlich.
  describe("konkrete Vorgabetexte", () => {
    it("APPOINTMENT_CAN_BE_BOOKED contact_person-Text", () => {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_CAN_BE_BOOKED"];
      expect(
        resolveContactText(cp.textByAudience?.contact_person, ExplanationStatus.YES),
      ).toBe("Für das Anliegen kann grundsätzlich ein Termin vereinbart werden.");
    });

    it("APPOINTMENT_CANCEL_OR_RESCHEDULE contact_person-Text", () => {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2["APPOINTMENT_CANCEL_OR_RESCHEDULE"];
      expect(
        resolveContactText(cp.textByAudience?.contact_person, ExplanationStatus.YES),
      ).toBe(
        "Der Termin kann jederzeit über den Online-Kalender abgesagt oder verschoben werden.",
      );
    });

    it("LAB_APPOINTMENT_INDIVIDUAL contact_person-Text", () => {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2["LAB_APPOINTMENT_INDIVIDUAL"];
      expect(
        resolveContactText(cp.textByAudience?.contact_person, ActionStatus.ACTIVE),
      ).toBe("Bitte einen Termin für individuelle Laborwerte vereinbaren.");
    });

    it("ONBOARDING_DOCTOLIB_INFO contact_person-Text", () => {
      const cp = INQUIRY_CHECKPOINT_CATALOG_V2["ONBOARDING_DOCTOLIB_INFO"];
      expect(
        resolveContactText(cp.textByAudience?.contact_person, ExplanationStatus.YES),
      ).toBe(
        "Für die Kommunikation mit unserer Praxis wird Doctolib genutzt.\n\nDort können Termine online gebucht und verwaltet sowie Rezepte oder Bescheinigungen digital angefragt werden.\n\nBitte dafür den Doctolib-Account nutzen.",
      );
    });
  });
});
