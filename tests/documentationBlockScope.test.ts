import {
  buildPracticeDocumentationBlockDefinition,
  parsePracticeDocumentationBlockDefinition,
  validatePracticeDocumentationBlock,
} from "@/lib/practice/documentationBlocks";
import { PRACTICE_DOCUMENTATION_PROFILE_BLOCKS } from "@/lib/practice/documentationProfileBlocks";

describe("PracticeDocumentationBlock scopes", () => {
  it("defaults missing scope to documentation", () => {
    const validation = validatePracticeDocumentationBlock({
      title: "Legacy",
      blockType: "text",
      text: "Text",
    });
    expect(validation).toMatchObject({ ok: true, value: { allowedTemplateCategories: ["documentation"] } });
  });

  it("roundtrips profile-only and shared scopes", () => {
    const profile = buildPracticeDocumentationBlockDefinition({
      title: "Profil",
      blockType: "text",
      text: "Profiltext",
      allowedTemplateCategories: ["profile"],
    });
    const shared = buildPracticeDocumentationBlockDefinition({
      title: "Gemeinsam",
      blockType: "text",
      text: "Gemeinsamer Text",
      allowedTemplateCategories: ["documentation", "profile"],
    });

    expect(parsePracticeDocumentationBlockDefinition(profile).allowedTemplateCategories).toEqual(["profile"]);
    expect(parsePracticeDocumentationBlockDefinition(shared).allowedTemplateCategories)
      .toEqual(["documentation", "profile"]);
  });

  it("definiert neun normale profilgeeignete Bibliotheksbausteine", () => {
    expect(PRACTICE_DOCUMENTATION_PROFILE_BLOCKS).toHaveLength(9);
    for (const input of PRACTICE_DOCUMENTATION_PROFILE_BLOCKS) {
      const validation = validatePracticeDocumentationBlock(input);
      expect(validation).toMatchObject({ ok: true });
      if (validation.ok) {
        const definition = buildPracticeDocumentationBlockDefinition(validation.value);
        expect(definition.allowedTemplateCategories).toEqual(["profile"]);
      }
    }
  });
});