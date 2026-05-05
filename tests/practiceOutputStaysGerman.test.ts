/**
 * Sicherungsnetz: Praxis-Output bleibt deutsch, auch wenn die Patient:in
 * den Fragebogen auf Englisch ausgefüllt hat.
 *
 * Ablauf des realen Flows:
 *   1. Patient:in wählt im EN-Fragebogen z. B. "Cough, Fever".
 *   2. /api/q/[token] ruft sanitizeAnswers(..., language="en") auf und
 *      mappt die EN-Optionen auf die kanonischen DE-Originallabels zurück.
 *   3. Praxis-Output (Krankenblatt, PDF, M3-Übersicht) verwendet weiterhin
 *      QUESTION_CATALOG[id].text und SHORT_LABELS — also Deutsch.
 *
 * Dieser Test simuliert genau diese Kette für den Krankenblatt-Output.
 */

import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";

describe("Praxis-Output bleibt deutsch trotz EN-Patienteneingabe", () => {
  it("Krankenblatt zeigt deutsche Symptome nach EN-Reverse-Mapping", () => {
    const sanitized = sanitizeAnswers(
      { AU_SYMPTOMS: "Cough, Fever, Other", AU_START_DATE: "2024-01-10" },
      [{ id: "AU_SYMPTOMS" }, { id: "AU_START_DATE" }],
      "en",
    );

    // Reverse-Mapping in sanitizeAnswers hat bereits stattgefunden.
    expect(sanitized.AU_SYMPTOMS).toBe("Husten, Fieber, Sonstiges");

    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["ARBEITSUNFAEHIGKEIT"],
    });

    // Krankenblatt enthält die deutschen Originallabels und keine EN-Texte.
    expect(note).toContain("Husten");
    expect(note).toContain("Fieber");
    expect(note).toContain("Sonstiges");
    expect(note).not.toContain("Cough");
    expect(note).not.toContain("Fever");
    // Block-Überschrift bleibt DE
    expect(note).toContain("Arbeitsunfähigkeitsbescheinigung");
    expect(note).not.toContain("Sick leave certificate");
  });
});
