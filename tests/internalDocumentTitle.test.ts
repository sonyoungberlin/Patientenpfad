import {
  INTERNAL_DOCUMENT_TITLE_OPTIONS,
  InternalDocumentTitleValidationError,
  resolveInternalDocumentTitle,
} from "@/lib/questionnaire/internalDocumentTitle";

describe("internal document title", () => {
  it.each([
    ["arztbrief", "Arztbrief"],
    ["stellungnahme", "Stellungnahme"],
    ["bescheinigung", "Bescheinigung"],
    ["attest", "Attest"],
    ["bericht", "Bericht"],
    ["rueckmeldung", "Rückmeldung"],
    ["patienteninformation", "Patienteninformation"],
  ])("löst %s zum festen Titel auf", (option, documentTitle) => {
    expect(resolveInternalDocumentTitle(option, undefined)).toEqual({
      documentTitleOption: option,
      documentTitle,
    });
  });

  it("enthält genau die acht freigegebenen Optionen", () => {
    expect(INTERNAL_DOCUMENT_TITLE_OPTIONS.map((option) => option.value)).toEqual([
      "arztbrief",
      "stellungnahme",
      "bescheinigung",
      "attest",
      "bericht",
      "rueckmeldung",
      "patienteninformation",
      "andere",
    ]);
  });

  it("trimmt einen gültigen individuellen Titel", () => {
    expect(resolveInternalDocumentTitle("andere", "  Individueller Titel  ")).toEqual({
      documentTitleOption: "andere",
      documentTitle: "Individueller Titel",
    });
  });

  it.each([
    [undefined, undefined],
    ["unbekannt", undefined],
    ["andere", undefined],
    ["andere", "   "],
    ["andere", "a".repeat(121)],
    ["andere", "Titel\nzweite Zeile"],
    ["andere", "Titel\u0007"],
    ["arztbrief", "Inkonsistenter Freitext"],
  ])("weist ungültige oder inkonsistente Eingaben ab: %p / %p", (option, customTitle) => {
    expect(() => resolveInternalDocumentTitle(option, customTitle))
      .toThrow(InternalDocumentTitleValidationError);
  });
});