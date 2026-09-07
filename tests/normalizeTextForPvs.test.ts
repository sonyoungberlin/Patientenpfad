import { normalizeTextForPvs } from "@/lib/questionnaire/normalizeTextForPvs";

describe("normalizeTextForPvs", () => {
  it.each([
    ["\u2013", "-"],
    ["\u2014", "-"],
    ["\u2026", "..."],
    ["\u201c\u201d\u201e\u201f\u00ab\u00bb", '""""""'],
    ["\u2018\u2019\u201a\u201b", "''''"],
    ["\u00a0\u202f", "  "],
    ["\u2022", "-"],
    ["Was ist das?", "Was ist das"],
  ])("mappt %j nach %j", (input, expected) => {
    expect(normalizeTextForPvs(input)).toBe(expected);
  });

  it("verändert Umlaute und ß nicht", () => {
    expect(normalizeTextForPvs("ÄÖÜ äöü ß Weiß")).toBe("ÄÖÜ äöü ß Weiß");
  });
});