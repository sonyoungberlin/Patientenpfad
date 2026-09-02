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
      CONTACT_PERSON_INFO: ActionStatus.ACTIVE,
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

  it("hält Kontaktperson dokumentieren in den vorgesehenen Profilen verfügbar", () => {
    const expectedProfiles = ["AU", "PRESCRIPTION", "REFERRAL", "ONBOARDING"];
    const actualProfiles = Object.values(INQUIRY_PROFILE_CATALOG_V2)
      .filter((profile) => profile.availableActionIds.includes("CONTACT_PERSON_INFO"))
      .map((profile) => profile.id);
    expect(actualProfiles.sort()).toEqual([...expectedProfiles].sort());
  });

  it("bindet Facharzt-Information nur an Patientenaufnahme, Rezept, Überweisung und Termin", () => {
    const expectedProfiles = ["ONBOARDING", "PRESCRIPTION", "REFERRAL", "APPOINTMENT"];
    const actualProfiles = Object.values(INQUIRY_PROFILE_CATALOG_V2)
      .filter((profile) => profile.availableActionIds.includes("SPECIALIST_PRACTICES_INFO"))
      .map((profile) => profile.id);
    expect(actualProfiles.sort()).toEqual([...expectedProfiles].sort());
  });

  it("bindet Kontaktpersonen-Support an kein aktives Profil", () => {
    const actualProfiles = Object.values(INQUIRY_PROFILE_CATALOG_V2)
      .filter((profile) => profile.availableActionIds.includes("CONTACT_PERSON_SUPPORT"))
      .map((profile) => profile.id);
    expect(actualProfiles).toEqual([]);
  });

  it("rendert die Kontaktperson-Dokumentation bei Mehrfachzuordnung nur einmal", () => {
    const result = renderInquiryResponseFromSections([
      section("ONBOARDING"),
      section("REFERRAL"),
      section("APPOINTMENT"),
    ]);
    expect(
      result.sharedBottom.filter((text) =>
        text.includes("Wenn eine andere Person organisatorische Anliegen für Sie übernehmen"),
      ),
    ).toHaveLength(1);
    expect(
      result.sharedBottom.filter((text) =>
        text.includes("Bitte informieren Sie uns über Facharztpraxen"),
      ),
    ).toHaveLength(1);
  });

  it("löst Kontaktperson-Dokumentation audience-abhängig auf", () => {
    const patient = renderInquiryResponseFromSections([section("REFERRAL")], {
      audience: "patient",
    });
    const contact = renderInquiryResponseFromSections([section("REFERRAL")], {
      audience: "contact_person",
    });
    expect(patient.sharedBottom).toContain(
      "Wenn eine andere Person organisatorische Anliegen für Sie übernehmen oder Rezepte/Unterlagen abholen soll, möchten wir das kurz dokumentieren.",
    );
    expect(contact.sharedBottom).toContain(
      "Wenn Sie organisatorische Anliegen für die Patientin / den Patienten übernehmen oder Rezepte/Unterlagen abholen möchten, bitten wir um eine kurze Dokumentation.",
    );
    expect(patient.sharedBottom).toContain(
      "Bitte informieren Sie uns über Facharztpraxen, bei denen Sie regelmäßig behandelt werden.",
    );
    expect(contact.sharedBottom).toContain(
      "Bitte informieren Sie uns über Facharztpraxen, bei denen die Patientin / der Patient regelmäßig behandelt wird.",
    );
  });

  it("aktiviert keine Kontaktpersonen-Action automatisch", () => {
    const result = renderInquiryResponseFromSections([{
      inquiryId: "AU",
      decisionStatus: DecisionStatus.DISABLED,
      checkpointStatuses: {},
    }]);
    expect(result.sharedBottom).toEqual([]);
  });
});