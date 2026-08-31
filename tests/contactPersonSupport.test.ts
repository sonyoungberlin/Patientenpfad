import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import { getInquiryCheckpointCatalog } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { ActionStatus, DecisionStatus } from "@/lib/inquiries/types";

const catalog = getInquiryCheckpointCatalog();

function section(inquiryId: string) {
  return {
    inquiryId,
    decisionStatus: DecisionStatus.POSSIBLE,
    checkpointStatuses: {
      CONTACT_PERSON_SUPPORT: ActionStatus.ACTIVE,
      SPECIALIST_PRACTICES_INFO: ActionStatus.ACTIVE,
    },
  };
}

describe("neutrale Kontaktpersonen- und Facharzt-Hinweise", () => {
  it("definiert beide neuen IDs als globale SHARED_BOTTOM-Actions", () => {
    for (const id of ["CONTACT_PERSON_SUPPORT", "SPECIALIST_PRACTICES_INFO"]) {
      const checkpoint = catalog[id]!;
      expect(checkpoint.id).toBe(id);
      expect(checkpoint.kind).toBe("ACTION");
      expect(checkpoint.scope).toBe("GLOBAL");
      expect(checkpoint.placement).toBe("SHARED_BOTTOM");
    }
  });

  it("lässt CONTACT_PERSON_INFO unverändert bestehen", () => {
    expect(catalog.CONTACT_PERSON_INFO.label).toBe("Kontaktperson dokumentieren");
    expect(catalog.CONTACT_PERSON_INFO.textByStatus[ActionStatus.ACTIVE]).toBe(
      "Wenn eine andere Person organisatorische Anliegen für Sie übernehmen oder Rezepte/Unterlagen abholen soll, möchten wir das kurz dokumentieren.",
    );
  });

  it("verwendet die vorgegebenen Patient- und Kontaktperson-Texte", () => {
    expect(catalog.CONTACT_PERSON_SUPPORT.textByStatus[ActionStatus.ACTIVE]).toBe(
      "Sie lassen sich bei Ihren Anliegen durch eine Kontaktperson unterstützen.",
    );
    expect(catalog.CONTACT_PERSON_SUPPORT.textByAudience?.contact_person).toBe(
      "Sie unterstützen die Patientin / den Patienten bei ihren bzw. seinen Anliegen.",
    );
    expect(catalog.SPECIALIST_PRACTICES_INFO.textByStatus[ActionStatus.ACTIVE]).toBe(
      "Bitte informieren Sie uns über Facharztpraxen, bei denen Sie regelmäßig behandelt werden.",
    );
    expect(catalog.SPECIALIST_PRACTICES_INFO.textByAudience?.contact_person).toBe(
      "Bitte informieren Sie uns über Facharztpraxen, bei denen die Patientin / der Patient regelmäßig behandelt wird.",
    );
  });

  it("bindet Support an AU, Rezept, Überweisung, Termin und Patientenaufnahme", () => {
    for (const profileId of ["AU", "PRESCRIPTION", "REFERRAL", "APPOINTMENT", "ONBOARDING"]) {
      expect(INQUIRY_PROFILE_CATALOG_V2[profileId].availableActionIds).toContain(
        "CONTACT_PERSON_SUPPORT",
      );
    }
  });

  it("bindet Facharzt-Information an Patientenaufnahme, Überweisung und Termin", () => {
    for (const profileId of ["ONBOARDING", "REFERRAL", "APPOINTMENT"]) {
      expect(INQUIRY_PROFILE_CATALOG_V2[profileId].availableActionIds).toContain(
        "SPECIALIST_PRACTICES_INFO",
      );
    }
  });

  it("rendert beide Actions bei Mehrfachzuordnung nur einmal", () => {
    const result = renderInquiryResponseFromSections([
      section("ONBOARDING"),
      section("REFERRAL"),
      section("APPOINTMENT"),
    ]);
    expect(
      result.sharedBottom.filter((text) =>
        text.includes("Sie lassen sich bei Ihren Anliegen durch eine Kontaktperson unterstützen."),
      ),
    ).toHaveLength(1);
    expect(
      result.sharedBottom.filter((text) =>
        text.includes("Bitte informieren Sie uns über Facharztpraxen"),
      ),
    ).toHaveLength(1);
  });

  it("löst beide Nachrichtentexte audience-abhängig auf", () => {
    const patient = renderInquiryResponseFromSections([section("REFERRAL")], {
      audience: "patient",
    });
    const contact = renderInquiryResponseFromSections([section("REFERRAL")], {
      audience: "contact_person",
    });
    expect(patient.sharedBottom).toContain(
      "Sie lassen sich bei Ihren Anliegen durch eine Kontaktperson unterstützen.",
    );
    expect(contact.sharedBottom).toContain(
      "Sie unterstützen die Patientin / den Patienten bei ihren bzw. seinen Anliegen.",
    );
    expect(patient.sharedBottom).toContain(
      "Bitte informieren Sie uns über Facharztpraxen, bei denen Sie regelmäßig behandelt werden.",
    );
    expect(contact.sharedBottom).toContain(
      "Bitte informieren Sie uns über Facharztpraxen, bei denen die Patientin / der Patient regelmäßig behandelt wird.",
    );
  });
});