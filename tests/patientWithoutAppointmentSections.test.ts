/**
 * Tests für lib/workflow/internalProtocol/patientWithoutAppointment.ts
 */

import {
  getPatientWithoutAppointmentSections,
  getPatientWithoutAppointmentSection,
} from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import { isProtocolSection } from "@/lib/workflow/internalProtocol/questions";
import type { OfficialRule } from "@/lib/workflow/internalProtocol/officialContent";

// ---------------------------------------------------------------------------
// Struktur
// ---------------------------------------------------------------------------

describe("getPatientWithoutAppointmentSections() – Struktur", () => {
  it("gibt ein nicht-leeres Array zurück", () => {
    expect(getPatientWithoutAppointmentSections().length).toBeGreaterThan(0);
  });

  it("enthält genau 5 Abschnitte", () => {
    expect(getPatientWithoutAppointmentSections()).toHaveLength(5);
  });

  it("enthält die Section-IDs PC-C01 bis PC-C05 in der richtigen Reihenfolge", () => {
    const ids = getPatientWithoutAppointmentSections().map((s) => s.id);
    expect(ids).toEqual(["PC-C01", "PC-C02", "PC-C03", "PC-C04", "PC-C05"]);
  });

  it.each([
    ["PC-C01", "Geltungsbereich"],
    ["PC-C02", "Zuständigkeit und Entscheidungsbefugnis"],
    ["PC-C03", "Standardablauf"],
    ["PC-C04", "Ausnahmen und Eskalation"],
    ["PC-C05", "Dokumentation und Überprüfung"],
  ])("Section %s hat den Titel '%s'", (id, expectedTitle) => {
    const section = getPatientWithoutAppointmentSections().find(
      (s) => s.id === id,
    );
    expect(section?.title).toBe(expectedTitle);
  });
});

// ---------------------------------------------------------------------------
// isProtocolSection Validierung
// ---------------------------------------------------------------------------

describe("getPatientWithoutAppointmentSections() – isProtocolSection Validierung", () => {
  it.each(["PC-C01", "PC-C02", "PC-C03", "PC-C04", "PC-C05"])(
    "Section %s besteht isProtocolSection()",
    (id) => {
      const section = getPatientWithoutAppointmentSections().find(
        (s) => s.id === id,
      );
      expect(isProtocolSection(section)).toBe(true);
    },
  );
});

// ---------------------------------------------------------------------------
// Offizielle Regeln
// ---------------------------------------------------------------------------

describe("getPatientWithoutAppointmentSections() – offizielle Regeln", () => {
  it("jede Section hat mindestens eine offizielle Regel", () => {
    for (const section of getPatientWithoutAppointmentSections()) {
      expect(section.officialRules.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("alle Regel-IDs sind global eindeutig", () => {
    const allIds: string[] = [];
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const rule of section.officialRules) {
        allIds.push(rule.id);
      }
    }
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("url ist bei allen Quellen nichtleer", () => {
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const rule of section.officialRules) {
        expect(rule.source.url).toBeTruthy();
      }
    }
  });

  it("reference ist bei allen Quellen nichtleer", () => {
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const rule of section.officialRules) {
        expect(rule.source.reference).toBeTruthy();
      }
    }
  });

  it("reviewedAt ist bei allen Quellen nichtleer", () => {
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const rule of section.officialRules) {
        expect(rule.source.reviewedAt.length).toBeGreaterThan(0);
      }
    }
  });

  it("bindingLevel ist bei allen Regeln ein gültiger Wert", () => {
    const validLevels = new Set(["MANDATORY", "RECOMMENDED", "ORIENTATION"]);
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const rule of section.officialRules) {
        expect(validLevels.has(rule.bindingLevel)).toBe(true);
      }
    }
  });

  it("rule.text ist bei allen Regeln nichtleer", () => {
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const rule of section.officialRules) {
        expect(rule.text.length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Fragen
// ---------------------------------------------------------------------------

describe("getPatientWithoutAppointmentSections() – Fragen", () => {
  it("jede Section hat mindestens eine Frage", () => {
    for (const section of getPatientWithoutAppointmentSections()) {
      expect(section.questions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("alle Frage-IDs sind global eindeutig", () => {
    const allIds: string[] = [];
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const q of section.questions) {
        allIds.push(q.id);
      }
    }
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("alle vier Fragetypen kommen vor", () => {
    const kinds = new Set<string>();
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const q of section.questions) {
        kinds.add(q.kind);
      }
    }
    expect(kinds.has("YES_NO_UNCLEAR")).toBe(true);
    expect(kinds.has("SINGLE_SELECT")).toBe(true);
    expect(kinds.has("MULTI_SELECT")).toBe(true);
    expect(kinds.has("FREE_TEXT")).toBe(true);
  });

  it("mindestens eine Frage ist optional (required nicht gesetzt)", () => {
    let hasOptional = false;
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const q of section.questions) {
        if (q.required === undefined || q.required === false) {
          hasOptional = true;
        }
      }
    }
    expect(hasOptional).toBe(true);
  });

  it("SELECT-Fragen haben mindestens eine Option", () => {
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const q of section.questions) {
        if (q.kind === "SINGLE_SELECT" || q.kind === "MULTI_SELECT") {
          expect(q.options.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it("alle Option-IDs sind innerhalb jeder Frage eindeutig", () => {
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const q of section.questions) {
        if (q.kind === "SINGLE_SELECT" || q.kind === "MULTI_SELECT") {
          const ids = q.options.map((o) => o.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
      }
    }
  });

  it("outputText aller Optionen ist nichtleer", () => {
    for (const section of getPatientWithoutAppointmentSections()) {
      for (const q of section.questions) {
        if (q.kind === "SINGLE_SELECT" || q.kind === "MULTI_SELECT") {
          for (const o of q.options) {
            expect(o.outputText.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Einzelabfrage getPatientWithoutAppointmentSection
// ---------------------------------------------------------------------------

describe("getPatientWithoutAppointmentSection() – Einzelabfrage", () => {
  it.each(["PC-C01", "PC-C02", "PC-C03", "PC-C04", "PC-C05"])(
    "gibt Section %s zurück",
    (id) => {
      const section = getPatientWithoutAppointmentSection(id);
      expect(section).toBeDefined();
      expect(section?.id).toBe(id);
    },
  );

  it("gibt undefined für eine unbekannte ID zurück", () => {
    expect(getPatientWithoutAppointmentSection("UNBEKANNT")).toBeUndefined();
  });

  it("gibt undefined für einen leeren String zurück", () => {
    expect(getPatientWithoutAppointmentSection("")).toBeUndefined();
  });

  it("zurückgegebene Section besteht isProtocolSection()", () => {
    const section = getPatientWithoutAppointmentSection("PC-C01");
    expect(isProtocolSection(section)).toBe(true);
  });

  it("zurückgegebene Section hat die korrekte ID", () => {
    for (const id of ["PC-C01", "PC-C02", "PC-C03", "PC-C04", "PC-C05"]) {
      expect(getPatientWithoutAppointmentSection(id)?.id).toBe(id);
    }
  });
});

// ---------------------------------------------------------------------------
// Tiefe defensive Kopie
// ---------------------------------------------------------------------------

describe("Tiefe defensive Kopie", () => {
  it("zwei Aufrufe liefern verschiedene Array-Instanzen", () => {
    const a = getPatientWithoutAppointmentSections();
    const b = getPatientWithoutAppointmentSections();
    expect(a).not.toBe(b);
  });

  it("zwei Aufrufe liefern verschiedene Section-Objekte", () => {
    const a = getPatientWithoutAppointmentSections();
    const b = getPatientWithoutAppointmentSections();
    expect(a[0]).not.toBe(b[0]);
  });

  it("zwei Aufrufe liefern verschiedene officialRules-Array-Instanzen", () => {
    const a = getPatientWithoutAppointmentSections();
    const b = getPatientWithoutAppointmentSections();
    expect(a[0].officialRules).not.toBe(b[0].officialRules);
  });

  it("zwei Aufrufe liefern verschiedene source-Objekte", () => {
    const a = getPatientWithoutAppointmentSections();
    const b = getPatientWithoutAppointmentSections();
    expect(a[0].officialRules[0].source).not.toBe(
      b[0].officialRules[0].source,
    );
  });

  it("Mutation von source.author beeinflusst nicht den internen Katalog", () => {
    const sections = getPatientWithoutAppointmentSections();
    const originalAuthor = sections[0].officialRules[0].source.author;
    sections[0].officialRules[0].source.author = "MUTIERT";
    const again = getPatientWithoutAppointmentSections();
    expect(again[0].officialRules[0].source.author).toBe(originalAuthor);
  });

  it("Mutation von source.url beeinflusst nicht den internen Katalog", () => {
    const sections = getPatientWithoutAppointmentSections();
    const originalUrl = sections[0].officialRules[0].source.url;
    sections[0].officialRules[0].source.url = "https://mutiert.example.com";
    const again = getPatientWithoutAppointmentSections();
    expect(again[0].officialRules[0].source.url).toBe(originalUrl);
  });

  it("Mutation des zurückgegebenen officialRules-Arrays beeinflusst nicht den Katalog", () => {
    const sections = getPatientWithoutAppointmentSections();
    const originalCount = sections[0].officialRules.length;
    const fakeRule: OfficialRule = {
      id: "FAKE-RULE",
      text: "Fake",
      bindingLevel: "MANDATORY",
      source: { id: "S", author: "A", title: "T", reviewedAt: "2026-01-01" },
    };
    (sections[0].officialRules as OfficialRule[]).push(fakeRule);
    const again = getPatientWithoutAppointmentSections();
    expect(again[0].officialRules.length).toBe(originalCount);
  });

  it("Mutation von question.text beeinflusst nicht den internen Katalog", () => {
    const sections = getPatientWithoutAppointmentSections();
    const originalText = sections[0].questions[0].text;
    (sections[0].questions[0] as { text: string }).text = "MUTIERT";
    const again = getPatientWithoutAppointmentSections();
    expect(again[0].questions[0].text).toBe(originalText);
  });

  it("Mutation des zurückgegebenen questions-Arrays beeinflusst nicht den Katalog", () => {
    const sections = getPatientWithoutAppointmentSections();
    const originalCount = sections[0].questions.length;
    (sections[0].questions as unknown[]).push({
      id: "FAKE-Q",
      text: "X",
      kind: "YES_NO_UNCLEAR",
    });
    const again = getPatientWithoutAppointmentSections();
    expect(again[0].questions.length).toBe(originalCount);
  });

  it("Mutation einer SELECT-Option beeinflusst nicht den internen Katalog", () => {
    const sections = getPatientWithoutAppointmentSections();
    // POT-Q-C01-01 ist MULTI_SELECT (PC-C01, erste Frage)
    const q = sections[0].questions[0];
    expect(q.kind).toBe("MULTI_SELECT");
    if (q.kind === "MULTI_SELECT") {
      const originalLabel = q.options[0].label;
      (q.options[0] as { label: string }).label = "MUTIERT";
      const again = getPatientWithoutAppointmentSections();
      const q2 = again[0].questions[0];
      if (q2.kind === "MULTI_SELECT") {
        expect(q2.options[0].label).toBe(originalLabel);
      }
    }
  });

  it("getPatientWithoutAppointmentSection liefert bei zwei Aufrufen verschiedene Objekte", () => {
    const a = getPatientWithoutAppointmentSection("PC-C01");
    const b = getPatientWithoutAppointmentSection("PC-C01");
    expect(a).not.toBe(b);
    expect(a?.officialRules).not.toBe(b?.officialRules);
    expect(a?.officialRules[0].source).not.toBe(b?.officialRules[0].source);
  });

  it("Mutation einer via getPatientWithoutAppointmentSection erhaltenen Section beeinflusst nicht den Katalog", () => {
    const section = getPatientWithoutAppointmentSection("PC-C01");
    expect(section).toBeDefined();
    if (section) {
      const originalTitle = section.title;
      (section as { title: string }).title = "MUTIERT";
      const again = getPatientWithoutAppointmentSection("PC-C01");
      expect(again?.title).toBe(originalTitle);
    }
  });
});
