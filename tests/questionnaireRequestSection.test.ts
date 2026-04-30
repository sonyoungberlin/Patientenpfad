/**
 * Tests zur Fragebogen-Link-Integration in InquiryM3Client.
 *
 * Der generierte /q/-Link wird als Paragraph in sharedBottom der
 * InquiryResponseV2Output integriert – er ist damit Bestandteil der
 * eigentlichen Patientennachricht, kein separates UI-Element.
 *
 * Diese Datei prüft:
 * - appendQuestionnaireLinkToOutput hängt den Link korrekt an sharedBottom an
 * - Bestehende sharedBottom-Einträge bleiben erhalten
 * - Ohne Link bleibt das Output-Objekt unverändert
 * - buildQuestionnaireMessageText ist nicht mehr exportiert
 */

import {
  appendQuestionnaireLinkToOutput,
} from "@/app/inquiries/[id]/m3/InquiryM3Client";
import * as InquiryM3ClientModule from "@/app/inquiries/[id]/m3/InquiryM3Client";
import type { InquiryResponseV2Output } from "@/lib/inquiries/types";

const EXAMPLE_LINK = "https://example.com/q/abc-token-123";

function makeOutput(sharedBottom: string[] = []): InquiryResponseV2Output {
  return { sections: [], sharedBottom };
}

const EXPECTED_PREFIX =
  "Bitte füllen Sie den folgenden Fragebogen aus.\nKopieren Sie den Link in Ihren Browser:\n";
const EXPECTED_PARAGRAPH = `${EXPECTED_PREFIX}${EXAMPLE_LINK}`;

describe("appendQuestionnaireLinkToOutput", () => {
  it("hängt einen zusammenhängenden Absatz mit erklärendem Text und Link an sharedBottom an", () => {
    const result = appendQuestionnaireLinkToOutput(makeOutput(), EXAMPLE_LINK);
    expect(result.sharedBottom).toEqual([EXPECTED_PARAGRAPH]);
  });

  it("der Absatz enthält den erklärenden Einleitungstext", () => {
    const result = appendQuestionnaireLinkToOutput(makeOutput(), EXAMPLE_LINK);
    expect(result.sharedBottom[0]).toContain("Bitte füllen Sie den folgenden Fragebogen aus.");
    expect(result.sharedBottom[0]).toContain("Kopieren Sie den Link in Ihren Browser:");
  });

  it("der Absatz enthält den Link", () => {
    const result = appendQuestionnaireLinkToOutput(makeOutput(), EXAMPLE_LINK);
    expect(result.sharedBottom[0]).toContain(EXAMPLE_LINK);
  });

  it("es wird genau ein Eintrag in sharedBottom hinzugefügt (kein Split in mehrere Einträge)", () => {
    const result = appendQuestionnaireLinkToOutput(makeOutput(), EXAMPLE_LINK);
    expect(result.sharedBottom).toHaveLength(1);
  });

  it("erhält bestehende sharedBottom-Einträge", () => {
    const existing = ["Vorhandener Hinweis"];
    const result = appendQuestionnaireLinkToOutput(makeOutput(existing), EXAMPLE_LINK);
    expect(result.sharedBottom).toHaveLength(2);
    expect(result.sharedBottom[0]).toBe("Vorhandener Hinweis");
    expect(result.sharedBottom[1]).toBe(EXPECTED_PARAGRAPH);
  });

  it("gibt das unveränderte Output-Objekt zurück wenn kein Link übergeben wird (null)", () => {
    const output = makeOutput(["Hinweis"]);
    const result = appendQuestionnaireLinkToOutput(output, null);
    expect(result).toBe(output);
  });

  it("verändert das originale Output-Objekt nicht (Immutabilität)", () => {
    const output = makeOutput(["Hinweis"]);
    appendQuestionnaireLinkToOutput(output, EXAMPLE_LINK);
    expect(output.sharedBottom).toEqual(["Hinweis"]);
  });
});

describe("InquiryM3Client – Exports", () => {
  it("exportiert buildQuestionnaireMessageText NICHT mehr (separater Ansatz entfernt)", () => {
    expect(
      (InquiryM3ClientModule as Record<string, unknown>)["buildQuestionnaireMessageText"],
    ).toBeUndefined();
  });

  it("hat einen default-Export (InquiryM3Client)", () => {
    expect(typeof InquiryM3ClientModule.default).toBe("function");
  });
});
