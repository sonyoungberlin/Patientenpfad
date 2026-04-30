/**
 * Unit-Tests für buildQuestionnaireMessageText
 * (QuestionnaireRequestSection – InquiryM3Client / Patientenkommunikation).
 *
 * Prüft:
 * - Generierter Link ist im Nachrichtentext enthalten
 * - Intro-Text ist vorhanden
 * - Signatur wird angehängt wenn vorhanden
 * - Signatur wird weggelassen wenn leer oder nur Whitespace
 */

import { buildQuestionnaireMessageText } from "@/app/inquiries/[id]/m3/InquiryM3Client";

const EXAMPLE_LINK = "https://example.com/q/abc-token-123";

describe("buildQuestionnaireMessageText", () => {
  it("enthält den generierten /q/-Link im Nachrichtentext", () => {
    const result = buildQuestionnaireMessageText(EXAMPLE_LINK, "");
    expect(result).toContain(EXAMPLE_LINK);
  });

  it("enthält die Intro-Zeile", () => {
    const result = buildQuestionnaireMessageText(EXAMPLE_LINK, "");
    expect(result).toContain("Liebe Patientin, lieber Patient");
  });

  it("fügt die Signatur an wenn vorhanden", () => {
    const sig = "Mit freundlichen Grüßen\nIhre Praxis";
    const result = buildQuestionnaireMessageText(EXAMPLE_LINK, sig);
    expect(result).toContain(sig);
  });

  it("lässt die Signatur weg wenn leer", () => {
    const result = buildQuestionnaireMessageText(EXAMPLE_LINK, "");
    expect(result.trimEnd()).toMatch(
      new RegExp(EXAMPLE_LINK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"),
    );
  });

  it("lässt die Signatur weg wenn nur Whitespace", () => {
    const result = buildQuestionnaireMessageText(EXAMPLE_LINK, "   ");
    expect(result.trimEnd()).toMatch(
      new RegExp(EXAMPLE_LINK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"),
    );
  });
});
