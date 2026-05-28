/**
 * Tests für praxisbezogene Info-Checkpoints (PRACTICE_INFO_1/2/3).
 *
 * Abgedeckte Teile:
 *  - PILOT_PRACTICE_INQUIRY_CONFIG enthält leere Strings als Defaults
 *  - inquiryOutputToPlainText rendert practiceInfoTexts mit Überschrift
 *  - inquiryOutputToPlainText ohne practiceInfoTexts hat keine Überschrift
 *  - Whitespace-only practiceInfoTexts werden übersprungen
 *  - Persistenz-Simulation: generateOutputFromSections + manuelle
 *    practiceInfoTexts-Zusammenführung (analog zu confirmInquirySession)
 */

import {
  inquiryOutputToPlainText,
  inquiryDocumentationToPlainText,
} from "@/lib/inquiries/formatInquiryOutput";
import type { InquiryResponseV2Output } from "@/lib/inquiries/types";
import {
  PILOT_PRACTICE_INQUIRY_CONFIG,
  type PracticeInquiryConfig,
} from "@/lib/inquiries/practiceConfig";

// ---------------------------------------------------------------------------
// Hilfsfunktionen (analog zu InquiryM3Client / confirmInquirySession)
// ---------------------------------------------------------------------------

const PRACTICE_INFO_IDS = [
  "PRACTICE_INFO_1",
  "PRACTICE_INFO_2",
  "PRACTICE_INFO_3",
] as const;

function buildActiveInfoTexts(
  actionStatuses: Record<string, string>,
  config: PracticeInquiryConfig,
): string[] {
  return PRACTICE_INFO_IDS
    .filter((id) => actionStatuses[id] === "ACTIVE")
    .map((id) => {
      if (id === "PRACTICE_INFO_1") return config.inqInfoText1.trim();
      if (id === "PRACTICE_INFO_2") return config.inqInfoText2.trim();
      return config.inqInfoText3.trim();
    })
    .filter((t) => t.length > 0);
}

function makeBaseOutput(): InquiryResponseV2Output {
  return {
    intro: undefined,
    sections: [
      {
        inquiryId: "TEST",
        label: "Test",
        mainDecision: "Testentscheidung",
        attachedParagraphs: ["Erster Absatz"],
        documentation: [],
      },
    ],
    sharedBottom: ["Guter Abschluss"],
    documentation: [],
  };
}

// ---------------------------------------------------------------------------
// Tests: PILOT_PRACTICE_INQUIRY_CONFIG Defaults
// ---------------------------------------------------------------------------

describe("PILOT_PRACTICE_INQUIRY_CONFIG – inqInfoText Defaults", () => {
  it("inqInfoText1 ist standardmäßig ein leerer String", () => {
    expect(PILOT_PRACTICE_INQUIRY_CONFIG.inqInfoText1).toBe("");
  });

  it("inqInfoText2 ist standardmäßig ein leerer String", () => {
    expect(PILOT_PRACTICE_INQUIRY_CONFIG.inqInfoText2).toBe("");
  });

  it("inqInfoText3 ist standardmäßig ein leerer String", () => {
    expect(PILOT_PRACTICE_INQUIRY_CONFIG.inqInfoText3).toBe("");
  });

  it("inqInfoText-Felder sind vom Typ string", () => {
    expect(typeof PILOT_PRACTICE_INQUIRY_CONFIG.inqInfoText1).toBe("string");
    expect(typeof PILOT_PRACTICE_INQUIRY_CONFIG.inqInfoText2).toBe("string");
    expect(typeof PILOT_PRACTICE_INQUIRY_CONFIG.inqInfoText3).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Tests: inquiryOutputToPlainText mit practiceInfoTexts
// ---------------------------------------------------------------------------

describe("inquiryOutputToPlainText – practiceInfoTexts", () => {
  it("rendert practiceInfoTexts mit Überschrift nach sharedBottom", () => {
    const output: InquiryResponseV2Output = {
      ...makeBaseOutput(),
      practiceInfoTexts: ["Bitte bringen Sie Ihre Versichertenkarte mit."],
    };
    const text = inquiryOutputToPlainText(output);

    expect(text).toContain("Zusätzliche Praxisinformationen");
    expect(text).toContain("Bitte bringen Sie Ihre Versichertenkarte mit.");
    // Überschrift muss nach sharedBottom erscheinen
    const posBottom = text.indexOf("Guter Abschluss");
    const posHeader = text.indexOf("Zusätzliche Praxisinformationen");
    expect(posHeader).toBeGreaterThan(posBottom);
  });

  it("rendert mehrere practiceInfoTexts nacheinander", () => {
    const output: InquiryResponseV2Output = {
      ...makeBaseOutput(),
      practiceInfoTexts: ["Info Eins", "Info Zwei"],
    };
    const text = inquiryOutputToPlainText(output);

    expect(text).toContain("Info Eins");
    expect(text).toContain("Info Zwei");
    expect(text.indexOf("Info Eins")).toBeLessThan(text.indexOf("Info Zwei"));
  });

  it("enthält KEINE Überschrift wenn practiceInfoTexts fehlt", () => {
    const output = makeBaseOutput();
    const text = inquiryOutputToPlainText(output);
    expect(text).not.toContain("Zusätzliche Praxisinformationen");
  });

  it("enthält KEINE Überschrift wenn practiceInfoTexts leer ist", () => {
    const output: InquiryResponseV2Output = {
      ...makeBaseOutput(),
      practiceInfoTexts: [],
    };
    const text = inquiryOutputToPlainText(output);
    expect(text).not.toContain("Zusätzliche Praxisinformationen");
  });

  it("überspringt whitespace-only practiceInfoTexts", () => {
    const output: InquiryResponseV2Output = {
      ...makeBaseOutput(),
      practiceInfoTexts: ["  ", "\t", "  Echter Inhalt  "],
    };
    const text = inquiryOutputToPlainText(output);
    // Whitespace-only wird übersprungen – Überschrift aber nur wenn ≥1 echter Text
    expect(text).toContain("Zusätzliche Praxisinformationen");
    expect(text).toContain("Echter Inhalt");
    // Whitespace-only darf nicht als eigener Absatz erscheinen
    const parts = text.split("\n\n");
    for (const part of parts) {
      if (part !== "Zusätzliche Praxisinformationen" && part !== "Echter Inhalt") {
        expect(part.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: buildActiveInfoTexts (Persistenz-Logik, analog confirmInquirySession)
// ---------------------------------------------------------------------------

describe("buildActiveInfoTexts – Persistenz-Simulation", () => {
  const config: PracticeInquiryConfig = {
    ...PILOT_PRACTICE_INQUIRY_CONFIG,
    inqInfoText1: "Bitte Impfpass mitbringen.",
    inqInfoText2: "Parken kostenlos im Hof.",
    inqInfoText3: "  ",
  };

  it("gibt aktive, nicht-leere Texte zurück", () => {
    const result = buildActiveInfoTexts(
      { PRACTICE_INFO_1: "ACTIVE", PRACTICE_INFO_2: "INACTIVE" },
      config,
    );
    expect(result).toEqual(["Bitte Impfpass mitbringen."]);
  });

  it("gibt mehrere aktive Texte in Reihenfolge zurück", () => {
    const result = buildActiveInfoTexts(
      {
        PRACTICE_INFO_1: "ACTIVE",
        PRACTICE_INFO_2: "ACTIVE",
        PRACTICE_INFO_3: "ACTIVE",
      },
      config,
    );
    // PRACTICE_INFO_3 ist whitespace-only → wird gefiltert
    expect(result).toEqual([
      "Bitte Impfpass mitbringen.",
      "Parken kostenlos im Hof.",
    ]);
  });

  it("gibt leeres Array zurück wenn alle INACTIVE", () => {
    const result = buildActiveInfoTexts(
      {
        PRACTICE_INFO_1: "INACTIVE",
        PRACTICE_INFO_2: "INACTIVE",
        PRACTICE_INFO_3: "INACTIVE",
      },
      config,
    );
    expect(result).toEqual([]);
  });

  it("gibt leeres Array zurück wenn kein actionStatus gesetzt ist", () => {
    const result = buildActiveInfoTexts({}, config);
    expect(result).toEqual([]);
  });

  it("ignoriert ACTIVE-Status wenn Text whitespace-only ist", () => {
    const result = buildActiveInfoTexts({ PRACTICE_INFO_3: "ACTIVE" }, config);
    expect(result).toEqual([]);
  });

  it("integriert in InquiryResponseV2Output korrekt", () => {
    const base = makeBaseOutput();
    const activeInfoTexts = buildActiveInfoTexts(
      { PRACTICE_INFO_1: "ACTIVE", PRACTICE_INFO_2: "ACTIVE" },
      config,
    );
    const finalOutput: InquiryResponseV2Output =
      activeInfoTexts.length > 0
        ? { ...base, practiceInfoTexts: activeInfoTexts }
        : base;

    expect(finalOutput.practiceInfoTexts).toEqual([
      "Bitte Impfpass mitbringen.",
      "Parken kostenlos im Hof.",
    ]);

    const text = inquiryOutputToPlainText(finalOutput);
    expect(text).toContain("Zusätzliche Praxisinformationen");
    expect(text).toContain("Bitte Impfpass mitbringen.");
  });

  it("lässt Output unverändert wenn kein Text aktiv ist", () => {
    const base = makeBaseOutput();
    const activeInfoTexts = buildActiveInfoTexts({}, config);
    const finalOutput: InquiryResponseV2Output =
      activeInfoTexts.length > 0
        ? { ...base, practiceInfoTexts: activeInfoTexts }
        : base;

    expect(finalOutput.practiceInfoTexts).toBeUndefined();
    expect(inquiryOutputToPlainText(finalOutput)).not.toContain(
      "Zusätzliche Praxisinformationen",
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: inquiryDocumentationToPlainText – nicht betroffen
// ---------------------------------------------------------------------------

describe("inquiryDocumentationToPlainText – unverändert durch Feature", () => {
  it("verbindet Zeilen mit \\n", () => {
    const result = inquiryDocumentationToPlainText(["Zeile 1", "Zeile 2"]);
    expect(result).toBe("Zeile 1\nZeile 2");
  });

  it("ignoriert leere Zeilen", () => {
    const result = inquiryDocumentationToPlainText(["A", "", "B"]);
    expect(result).toBe("A\nB");
  });
});
