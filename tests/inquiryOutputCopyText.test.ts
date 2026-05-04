import {
  inquiryOutputToPlainText,
  inquiryDocumentationToPlainText,
} from "@/lib/inquiries/formatInquiryOutput";
import type {
  InquiryResponseV2Output,
  InquirySectionOutput,
} from "@/lib/inquiries/types";

function makeSection(
  partial: Partial<InquirySectionOutput> & { inquiryId: string },
): InquirySectionOutput {
  return {
    label: partial.label ?? partial.inquiryId,
    mainDecision: partial.mainDecision ?? null,
    attachedParagraphs: partial.attachedParagraphs ?? [],
    documentation: partial.documentation ?? [],
    inquiryId: partial.inquiryId,
  };
}

describe("inquiryOutputToPlainText", () => {
  it("setzt intro, sections (mainDecision + attachedParagraphs) und sharedBottom in UI-Reihenfolge zusammen", () => {
    const output: InquiryResponseV2Output = {
      intro: "Guten Tag, …",
      sections: [
        makeSection({
          inquiryId: "A",
          mainDecision: "Hauptaussage A.",
          attachedParagraphs: ["A-Detail 1.", "A-Detail 2."],
        }),
        makeSection({
          inquiryId: "B",
          mainDecision: "Hauptaussage B.",
          attachedParagraphs: ["B-Detail."],
        }),
      ],
      sharedBottom: ["Bitte beachten Sie …", "Mit freundlichen Grüßen"],
      documentation: [],
    };

    const text = inquiryOutputToPlainText(output);

    expect(text).toBe(
      [
        "Guten Tag, …",
        "Hauptaussage A.",
        "A-Detail 1.",
        "A-Detail 2.",
        "Hauptaussage B.",
        "B-Detail.",
        "Bitte beachten Sie …",
        "Mit freundlichen Grüßen",
      ].join("\n\n"),
    );
  });

  it("überspringt fehlendes intro, null mainDecision, leere attachedParagraphs/sharedBottom und whitespace-only Werte", () => {
    const output: InquiryResponseV2Output = {
      // intro absichtlich weggelassen
      sections: [
        makeSection({
          inquiryId: "A",
          mainDecision: null,
          attachedParagraphs: ["", "   ", "Echter Absatz."],
        }),
        makeSection({
          inquiryId: "B",
          mainDecision: "  ", // whitespace-only
          attachedParagraphs: [],
        }),
      ],
      sharedBottom: ["", "Footer."],
      documentation: [],
    };

    const text = inquiryOutputToPlainText(output);

    expect(text).toBe(["Echter Absatz.", "Footer."].join("\n\n"));
  });

  it("liefert leeren String, wenn keine Inhalte vorhanden sind", () => {
    const output: InquiryResponseV2Output = {
      sections: [],
      sharedBottom: [],
      documentation: [],
    };
    expect(inquiryOutputToPlainText(output)).toBe("");
  });

  it("trennt Absätze konsistent mit einer Leerzeile", () => {
    const output: InquiryResponseV2Output = {
      intro: "Eins",
      sections: [
        makeSection({
          inquiryId: "X",
          mainDecision: "Zwei",
          attachedParagraphs: ["Drei"],
        }),
      ],
      sharedBottom: ["Vier"],
      documentation: [],
    };
    expect(inquiryOutputToPlainText(output)).toBe("Eins\n\nZwei\n\nDrei\n\nVier");
  });
});

describe("inquiryDocumentationToPlainText", () => {
  it("verbindet Zeilen mit \\n", () => {
    expect(inquiryDocumentationToPlainText(["a", "b", "c"])).toBe("a\nb\nc");
  });

  it("liefert leeren String für leere Liste", () => {
    expect(inquiryDocumentationToPlainText([])).toBe("");
  });

  it("filtert leere und whitespace-only Zeilen", () => {
    expect(inquiryDocumentationToPlainText(["", "  ", "x", "", "y"])).toBe("x\ny");
  });

  it("liefert leeren String, wenn nur leere Zeilen enthalten sind", () => {
    expect(inquiryDocumentationToPlainText(["", "   ", ""])).toBe("");
  });
});
