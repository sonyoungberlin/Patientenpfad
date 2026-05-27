/**
 * Integrationstest für FACHAERZTE repeatable group.
 * 
 * Testet den End-to-End-Flow: Client-Submit → Sanitize → Krankenblatt.
 */

import { sanitizeAnswers } from "@/lib/questionnaire/sanitizeAnswers";
import { buildMedicalRecordNote } from "@/lib/questionnaire/buildMedicalRecordNote";
import { QUESTION_CATALOG, BLOCK_CATALOG } from "@/lib/questionnaire/blockCatalog";

describe("FACHAERZTE repeatable group – Integration", () => {
  const questions = [{ id: "FACHAERZTE" }];

  it("End-to-End: Submit → Sanitize → Krankenblatt", () => {
    // Simuliere Client-Submit
    const clientData = {
      FACHAERZTE: JSON.stringify([
        {
          erkrankung: "Diabetes Typ 2",
          bereich: "Innere Medizin",
          name: "Dr. Schmidt",
          adresse: "Berliner Str. 10\n10115 Berlin",
        },
      ]),
    };

    // Sanitize
    const sanitized = sanitizeAnswers(clientData, questions);
    expect(sanitized.FACHAERZTE).toBeDefined();

    // Krankenblatt
    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["FACHAERZTE"],
    });

    expect(note).toContain("Digitale Anfrage");
    expect(note).toContain("Fachärzte");
    expect(note).toContain("Diabetes Typ 2");
    expect(note).toContain("Dr. Schmidt");
    expect(note).toContain("Berliner Str. 10");
  });

  it("Feld ist im QUESTION_CATALOG korrekt definiert", () => {
    const def = QUESTION_CATALOG.FACHAERZTE;
    expect(def).toBeDefined();
    expect(def.id).toBe("FACHAERZTE");
    expect(def.type).toBe("textarea");
    expect(def.text).toBe("Behandelnde Fachärzte");
    expect(def.text_en).toBe("Treating specialists");
  });

  it("Block ist im BLOCK_CATALOG korrekt definiert", () => {
    const block = BLOCK_CATALOG.FACHAERZTE;
    expect(block).toBeDefined();
    expect(block.id).toBe("FACHAERZTE");
    expect(block.label).toBe("Fachärzte");
    expect(block.label_en).toBe("Specialists");
    expect(block.displayOrder).toBe(85);
    expect(block.questionIds).toEqual(["FACHAERZTE"]);
  });

  it("Mehrere Einträge mit unterschiedlichen Feldern", () => {
    const clientData = {
      FACHAERZTE: JSON.stringify([
        {
          erkrankung: "Bluthochdruck",
          bereich: "Kardiologie",
          name: "Dr. Herz",
          adresse: "Herzweg 1, 10115 Berlin",
        },
        {
          erkrankung: "Knieschmerzen",
          bereich: "Orthopädie",
          name: "Praxis Orthomed",
          adresse: "",
        },
        {
          erkrankung: "Depression",
          bereich: "Psychiatrie / Psychotherapie",
          name: "Dr. Seele",
          adresse: "Seelenplatz 5\n20095 Hamburg",
        },
      ]),
    };

    const sanitized = sanitizeAnswers(clientData, questions);
    const parsed = JSON.parse(sanitized.FACHAERZTE);
    expect(parsed).toHaveLength(3);

    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["FACHAERZTE"],
    });

    expect(note).toContain("1. Eintrag");
    expect(note).toContain("2. Eintrag");
    expect(note).toContain("3. Eintrag");
    expect(note).toContain("Bluthochdruck");
    expect(note).toContain("Knieschmerzen");
    expect(note).toContain("Depression");
    expect(note).toContain("Dr. Herz");
    expect(note).toContain("Praxis Orthomed");
    expect(note).toContain("Dr. Seele");
  });

  it("Leere Felder werden korrekt behandelt", () => {
    const clientData = {
      FACHAERZTE: JSON.stringify([
        {
          erkrankung: "Test",
          bereich: "Kardiologie",
          name: "Dr. Test",
          adresse: "", // leer
        },
      ]),
    };

    const sanitized = sanitizeAnswers(clientData, questions);
    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["FACHAERZTE"],
    });

    expect(note).toContain("Dr. Test");
    expect(note).toContain("Kardiologie");
    // Adresse sollte nicht erscheinen, da leer
    const lines = note.split("\n");
    const adresseLines = lines.filter((l) => l.includes("Adresse:"));
    expect(adresseLines.length).toBe(0);
  });

  it("Kombination mit anderen Blöcken", () => {
    const clientData = {
      CONTACT_PHONE: "+49 30 12345678",
      FACHAERZTE: JSON.stringify([
        {
          erkrankung: "Asthma",
          bereich: "Pneumologie",
          name: "Dr. Lunge",
          adresse: "Atemweg 3",
        },
      ]),
    };

    const questions = [{ id: "CONTACT_PHONE" }, { id: "FACHAERZTE" }];
    const sanitized = sanitizeAnswers(clientData, questions);

    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["KONTAKT", "FACHAERZTE"],
    });

    expect(note).toContain("Kontaktdaten");
    expect(note).toContain("Tel.");
    expect(note).toContain("+49 30 12345678");
    expect(note).toContain("Fachärzte");
    expect(note).toContain("Asthma");
    expect(note).toContain("Dr. Lunge");
  });

  it("Ungültige Daten führen zu leerem Block", () => {
    const clientData = {
      FACHAERZTE: "ungültiges-json",
    };

    const sanitized = sanitizeAnswers(clientData, questions);
    expect(sanitized.FACHAERZTE).toBeUndefined();

    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["FACHAERZTE"],
    });

    // Block sollte nicht erscheinen
    expect(note).not.toContain("Fachärzte");
  });

  it("Maximal 10 Einträge werden akzeptiert", () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      erkrankung: `Erkrankung ${i + 1}`,
      bereich: "Kardiologie",
      name: `Dr. ${i + 1}`,
      adresse: "",
    }));

    const clientData = {
      FACHAERZTE: JSON.stringify(entries),
    };

    const sanitized = sanitizeAnswers(clientData, questions);
    expect(sanitized.FACHAERZTE).toBeDefined();

    const parsed = JSON.parse(sanitized.FACHAERZTE);
    expect(parsed).toHaveLength(10);

    const note = buildMedicalRecordNote({
      answers: sanitized,
      selected_block_ids: ["FACHAERZTE"],
    });

    expect(note).toContain("1. Eintrag");
    expect(note).toContain("10. Eintrag");
  });
});
