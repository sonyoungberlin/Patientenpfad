/**
 * Tests für lib/workflow/internalProtocol/document.ts
 */

import {
  createProtocolDocument,
} from "@/lib/workflow/internalProtocol/document";
import type {
  ProtocolDocument,
  ProtocolDocumentSection,
  ProtocolDocumentQuestion,
} from "@/lib/workflow/internalProtocol/document";
import {
  createProtocolSnapshot,
} from "@/lib/workflow/internalProtocol/snapshot";
import type { InternalProtocolSnapshot } from "@/lib/workflow/internalProtocol/snapshot";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import type { OfficialRule } from "@/lib/workflow/internalProtocol/officialContent";

// ---------------------------------------------------------------------------
// Hilfsfunktion: Standard-Snapshot für Tests
// ---------------------------------------------------------------------------

function makeSnapshot(): InternalProtocolSnapshot {
  return createProtocolSnapshot(getPatientWithoutAppointmentSections());
}

// ---------------------------------------------------------------------------
// Grundstruktur
// ---------------------------------------------------------------------------

describe("createProtocolDocument() – Grundstruktur", () => {
  let doc: ProtocolDocument;
  let snapshot: InternalProtocolSnapshot;

  beforeEach(() => {
    snapshot = makeSnapshot();
    doc = createProtocolDocument(snapshot, "Test-Dokument");
  });

  it("gibt ein Objekt zurück", () => {
    expect(typeof doc).toBe("object");
    expect(doc).not.toBeNull();
  });

  it("protocolId stammt aus dem Snapshot", () => {
    expect(doc.protocolId).toBe(snapshot.protocolId);
  });

  it("version stammt aus dem Snapshot", () => {
    expect(doc.version).toBe(snapshot.version);
  });

  it("createdAt stammt aus dem Snapshot", () => {
    expect(doc.createdAt).toBe(snapshot.createdAt);
  });

  it("title ist ein nichtleerer String", () => {
    expect(typeof doc.title).toBe("string");
    expect(doc.title.length).toBeGreaterThan(0);
  });

  it("sections ist ein Array", () => {
    expect(Array.isArray(doc.sections)).toBe(true);
  });

  it("Titel wird korrekt übernommen", () => {
    const custom = createProtocolDocument(snapshot, "Mein SOP-Dokument");
    expect(custom.title).toBe("Mein SOP-Dokument");
  });
});

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

describe("createProtocolDocument() – Sections", () => {
  let doc: ProtocolDocument;
  let snapshot: InternalProtocolSnapshot;

  beforeEach(() => {
    snapshot = makeSnapshot();
    doc = createProtocolDocument(snapshot, "Test-Dokument");
  });

  it("enthält genau 5 Sections für patientWithoutAppointment", () => {
    expect(doc.sections).toHaveLength(5);
  });

  it("Reihenfolge der Sections bleibt erhalten", () => {
    const docIds = doc.sections.map((s) => s.id);
    const snapIds = snapshot.sections.map((s) => s.id);
    expect(docIds).toEqual(snapIds);
  });

  it("Section-IDs sind PC-C01 bis PC-C05", () => {
    expect(doc.sections.map((s) => s.id)).toEqual([
      "PC-C01",
      "PC-C02",
      "PC-C03",
      "PC-C04",
      "PC-C05",
    ]);
  });

  it.each([
    ["PC-C01", "Geltungsbereich"],
    ["PC-C02", "Zuständigkeit und Entscheidungsbefugnis"],
    ["PC-C03", "Standardablauf"],
    ["PC-C04", "Ausnahmen und Eskalation"],
    ["PC-C05", "Dokumentation und Überprüfung"],
  ])("Section %s hat Titel '%s'", (id, expectedTitle) => {
    const section = doc.sections.find((s) => s.id === id);
    expect(section?.title).toBe(expectedTitle);
  });
});

// ---------------------------------------------------------------------------
// Offizielle Regeln
// ---------------------------------------------------------------------------

describe("createProtocolDocument() – Regeln", () => {
  let doc: ProtocolDocument;
  let snapshot: InternalProtocolSnapshot;

  beforeEach(() => {
    snapshot = makeSnapshot();
    doc = createProtocolDocument(snapshot, "Test-Dokument");
  });

  it("jede Section enthält alle Regeln aus dem Snapshot", () => {
    for (let i = 0; i < snapshot.sections.length; i++) {
      const snapRuleCount = snapshot.sections[i].officialRules.length;
      const docRuleCount = doc.sections[i].officialRules.length;
      expect(docRuleCount).toBe(snapRuleCount);
    }
  });

  it("Regel-IDs werden korrekt übertragen (alle Sections)", () => {
    for (let i = 0; i < snapshot.sections.length; i++) {
      const snapIds = snapshot.sections[i].officialRules.map((r) => r.id);
      const docIds = doc.sections[i].officialRules.map((r) => r.id);
      expect(docIds).toEqual(snapIds);
    }
  });

  it("Reihenfolge der Regeln bleibt erhalten", () => {
    for (let i = 0; i < snapshot.sections.length; i++) {
      const snapIds = snapshot.sections[i].officialRules.map((r) => r.id);
      const docIds = doc.sections[i].officialRules.map((r) => r.id);
      expect(docIds).toEqual(snapIds);
    }
  });

  it("Regeltext ist bei allen Regeln nichtleer", () => {
    for (const section of doc.sections) {
      for (const rule of section.officialRules) {
        expect(rule.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("source.author ist bei allen Regeln nichtleer", () => {
    for (const section of doc.sections) {
      for (const rule of section.officialRules) {
        expect(rule.source.author.length).toBeGreaterThan(0);
      }
    }
  });

  it("bindingLevel ist bei allen Regeln ein gültiger Wert", () => {
    const validLevels = new Set(["MANDATORY", "RECOMMENDED", "ORIENTATION"]);
    for (const section of doc.sections) {
      for (const rule of section.officialRules) {
        expect(validLevels.has(rule.bindingLevel)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Fragen
// ---------------------------------------------------------------------------

describe("createProtocolDocument() – Fragen", () => {
  let doc: ProtocolDocument;
  let snapshot: InternalProtocolSnapshot;

  beforeEach(() => {
    snapshot = makeSnapshot();
    doc = createProtocolDocument(snapshot, "Test-Dokument");
  });

  it("jede Section enthält alle Fragen aus dem Snapshot", () => {
    for (let i = 0; i < snapshot.sections.length; i++) {
      const snapQCount = snapshot.sections[i].questions.length;
      const docQCount = doc.sections[i].questions.length;
      expect(docQCount).toBe(snapQCount);
    }
  });

  it("Frage-IDs werden korrekt übertragen (alle Sections)", () => {
    for (let i = 0; i < snapshot.sections.length; i++) {
      const snapIds = snapshot.sections[i].questions.map((q) => q.id);
      const docIds = doc.sections[i].questions.map((q) => q.id);
      expect(docIds).toEqual(snapIds);
    }
  });

  it("Reihenfolge der Fragen bleibt erhalten", () => {
    for (let i = 0; i < snapshot.sections.length; i++) {
      const snapIds = snapshot.sections[i].questions.map((q) => q.id);
      const docIds = doc.sections[i].questions.map((q) => q.id);
      expect(docIds).toEqual(snapIds);
    }
  });

  it("alle Fragen haben das Feld answer", () => {
    for (const section of doc.sections) {
      for (const q of section.questions) {
        expect(Object.prototype.hasOwnProperty.call(q, "answer")).toBe(true);
      }
    }
  });

  it("answer ist initial null (Snapshot ohne gesetzte Antworten)", () => {
    for (const section of doc.sections) {
      for (const q of section.questions) {
        expect(q.answer).toBeNull();
      }
    }
  });

  it("SELECT-Fragen haben options im Dokument", () => {
    let found = false;
    for (const section of doc.sections) {
      for (const q of section.questions) {
        if (q.kind === "SINGLE_SELECT" || q.kind === "MULTI_SELECT") {
          found = true;
          expect(Array.isArray(q.options)).toBe(true);
          expect((q.options ?? []).length).toBeGreaterThan(0);
        }
      }
    }
    expect(found).toBe(true);
  });

  it("YES_NO_UNCLEAR- und FREE_TEXT-Fragen haben kein options-Feld", () => {
    for (const section of doc.sections) {
      for (const q of section.questions) {
        if (q.kind === "YES_NO_UNCLEAR" || q.kind === "FREE_TEXT") {
          expect(q.options).toBeUndefined();
        }
      }
    }
  });

  it("Fragetext ist bei allen Fragen nichtleer", () => {
    for (const section of doc.sections) {
      for (const q of section.questions) {
        expect(q.text.length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Antworten werden übernommen
// ---------------------------------------------------------------------------

describe("createProtocolDocument() – Antworten werden übernommen", () => {
  it("answer ist null wenn Snapshot-Antworteintrag null ist", () => {
    const snapshot = makeSnapshot();
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    for (const section of doc.sections) {
      for (const q of section.questions) {
        if (snapshot.answers[q.id] === null) {
          expect(q.answer).toBeNull();
        }
      }
    }
  });

  it("gesetzte Antwort wird in answer übernommen", () => {
    const snapshot = makeSnapshot();
    // Setze einen Antwortwert für die erste Frage der ersten Section
    const firstQ = snapshot.sections[0].questions[0];
    snapshot.answers[firstQ.id] = "TEST-ANTWORT";
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    const docFirstQ = doc.sections[0].questions[0];
    expect(docFirstQ.answer).toBe("TEST-ANTWORT");
  });

  it("mehrere gesetzte Antworten werden korrekt zugeordnet", () => {
    const snapshot = makeSnapshot();
    // Setze Antworten für Fragen aus verschiedenen Sections
    const q0 = snapshot.sections[0].questions[0];
    const q1 = snapshot.sections[1].questions[0];
    snapshot.answers[q0.id] = "ANTWORT-A";
    snapshot.answers[q1.id] = "ANTWORT-B";
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    expect(doc.sections[0].questions[0].answer).toBe("ANTWORT-A");
    expect(doc.sections[1].questions[0].answer).toBe("ANTWORT-B");
    // Alle anderen Fragen sind weiterhin null
    expect(doc.sections[2].questions[0].answer).toBeNull();
  });

  it("Antworten werden den richtigen Fragen zugeordnet (keine ID-Verwechslung)", () => {
    const snapshot = makeSnapshot();
    // Setze nur für PC-C03-Fragen Antworten
    for (const q of snapshot.sections[2].questions) {
      snapshot.answers[q.id] = "SECTION-3-ANSWER";
    }
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    for (const q of doc.sections[2].questions) {
      expect(q.answer).toBe("SECTION-3-ANSWER");
    }
    // Andere Sections bleiben null
    for (const q of doc.sections[0].questions) {
      expect(q.answer).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Tiefe Kopien
// ---------------------------------------------------------------------------

describe("createProtocolDocument() – Tiefe Kopien", () => {
  it("sections-Array ist eine neue Instanz (nicht aus dem Snapshot)", () => {
    const snapshot = makeSnapshot();
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    expect(doc.sections).not.toBe(snapshot.sections);
  });

  it("Section-Objekte sind neue Instanzen", () => {
    const snapshot = makeSnapshot();
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    for (let i = 0; i < snapshot.sections.length; i++) {
      expect(doc.sections[i]).not.toBe(snapshot.sections[i]);
    }
  });

  it("officialRules-Arrays sind neue Instanzen", () => {
    const snapshot = makeSnapshot();
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    for (let i = 0; i < snapshot.sections.length; i++) {
      expect(doc.sections[i].officialRules).not.toBe(
        snapshot.sections[i].officialRules,
      );
    }
  });

  it("OfficialRule-Objekte sind neue Instanzen", () => {
    const snapshot = makeSnapshot();
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    for (let i = 0; i < snapshot.sections.length; i++) {
      for (let j = 0; j < snapshot.sections[i].officialRules.length; j++) {
        expect(doc.sections[i].officialRules[j]).not.toBe(
          snapshot.sections[i].officialRules[j],
        );
      }
    }
  });

  it("source-Objekte in Regeln sind neue Instanzen", () => {
    const snapshot = makeSnapshot();
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    for (let i = 0; i < snapshot.sections.length; i++) {
      for (let j = 0; j < snapshot.sections[i].officialRules.length; j++) {
        expect(doc.sections[i].officialRules[j].source).not.toBe(
          snapshot.sections[i].officialRules[j].source,
        );
      }
    }
  });

  it("questions-Arrays sind neue Instanzen", () => {
    const snapshot = makeSnapshot();
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    for (let i = 0; i < snapshot.sections.length; i++) {
      expect(doc.sections[i].questions).not.toBe(snapshot.sections[i].questions);
    }
  });

  it("Frage-Objekte sind neue Instanzen (ProtocolDocumentQuestion ≠ ProtocolQuestion)", () => {
    const snapshot = makeSnapshot();
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    for (let i = 0; i < snapshot.sections.length; i++) {
      for (let j = 0; j < snapshot.sections[i].questions.length; j++) {
        expect(doc.sections[i].questions[j]).not.toBe(
          snapshot.sections[i].questions[j],
        );
      }
    }
  });

  it("options-Arrays in SELECT-Fragen sind neue Instanzen", () => {
    const snapshot = makeSnapshot();
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    for (let i = 0; i < snapshot.sections.length; i++) {
      for (let j = 0; j < snapshot.sections[i].questions.length; j++) {
        const srcQ = snapshot.sections[i].questions[j];
        const docQ = doc.sections[i].questions[j];
        if (
          (srcQ.kind === "SINGLE_SELECT" || srcQ.kind === "MULTI_SELECT") &&
          docQ.options !== undefined
        ) {
          expect(docQ.options).not.toBe(srcQ.options);
        }
      }
    }
  });

  it("Mutation eines Dokument-Section-Titels beeinflusst den Snapshot nicht", () => {
    const snapshot = makeSnapshot();
    const originalTitle = snapshot.sections[0].title;
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    (doc.sections[0] as { title: string }).title = "MUTIERT";
    expect(snapshot.sections[0].title).toBe(originalTitle);
  });

  it("Mutation einer Dokument-Regel beeinflusst den Snapshot nicht", () => {
    const snapshot = makeSnapshot();
    const originalText = snapshot.sections[0].officialRules[0].text;
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    (doc.sections[0].officialRules[0] as { text: string }).text = "MUTIERT";
    expect(snapshot.sections[0].officialRules[0].text).toBe(originalText);
  });

  it("Mutation eines source.author im Dokument beeinflusst den Snapshot nicht", () => {
    const snapshot = makeSnapshot();
    const originalAuthor = snapshot.sections[0].officialRules[0].source.author;
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    doc.sections[0].officialRules[0].source.author = "MUTIERT";
    expect(snapshot.sections[0].officialRules[0].source.author).toBe(
      originalAuthor,
    );
  });

  it("Mutation eines Dokument-Fragentexts beeinflusst den Snapshot nicht", () => {
    const snapshot = makeSnapshot();
    const originalText = snapshot.sections[0].questions[0].text;
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    (doc.sections[0].questions[0] as { text: string }).text = "MUTIERT";
    expect(snapshot.sections[0].questions[0].text).toBe(originalText);
  });
});

// ---------------------------------------------------------------------------
// Snapshot bleibt unverändert
// ---------------------------------------------------------------------------

describe("createProtocolDocument() – Snapshot bleibt unverändert", () => {
  it("Snapshot-sections nach createProtocolDocument unverändert (Anzahl)", () => {
    const snapshot = makeSnapshot();
    const sectionCount = snapshot.sections.length;
    createProtocolDocument(snapshot, "Test-Dokument");
    expect(snapshot.sections.length).toBe(sectionCount);
  });

  it("Snapshot-section-IDs nach createProtocolDocument unverändert", () => {
    const snapshot = makeSnapshot();
    const originalIds = snapshot.sections.map((s) => s.id);
    createProtocolDocument(snapshot, "Test-Dokument");
    expect(snapshot.sections.map((s) => s.id)).toEqual(originalIds);
  });

  it("Snapshot-answers nach createProtocolDocument unverändert", () => {
    const snapshot = makeSnapshot();
    const answerKeys = Object.keys(snapshot.answers).sort();
    const answerValues = answerKeys.map((k) => snapshot.answers[k]);
    createProtocolDocument(snapshot, "Test-Dokument");
    expect(Object.keys(snapshot.answers).sort()).toEqual(answerKeys);
    expect(answerKeys.map((k) => snapshot.answers[k])).toEqual(answerValues);
  });

  it("Snapshot-protocolId nach createProtocolDocument unverändert", () => {
    const snapshot = makeSnapshot();
    const originalId = snapshot.protocolId;
    createProtocolDocument(snapshot, "Test-Dokument");
    expect(snapshot.protocolId).toBe(originalId);
  });

  it("Snapshot-version nach createProtocolDocument unverändert", () => {
    const snapshot = makeSnapshot();
    createProtocolDocument(snapshot, "Test-Dokument");
    expect(snapshot.version).toBe(1);
  });

  it("Snapshot-createdAt nach createProtocolDocument unverändert", () => {
    const snapshot = makeSnapshot();
    const originalCreatedAt = snapshot.createdAt;
    createProtocolDocument(snapshot, "Test-Dokument");
    expect(snapshot.createdAt).toBe(originalCreatedAt);
  });

  it("Snapshot-Regeltext nach createProtocolDocument unverändert", () => {
    const snapshot = makeSnapshot();
    const originalText = snapshot.sections[0].officialRules[0].text;
    createProtocolDocument(snapshot, "Test-Dokument");
    expect(snapshot.sections[0].officialRules[0].text).toBe(originalText);
  });

  it("Snapshot-Fragetext nach createProtocolDocument unverändert", () => {
    const snapshot = makeSnapshot();
    const originalText = snapshot.sections[0].questions[0].text;
    createProtocolDocument(snapshot, "Test-Dokument");
    expect(snapshot.sections[0].questions[0].text).toBe(originalText);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe("createProtocolDocument() – Edge Cases", () => {
  it("leerer Snapshot → leeres sections-Array im Dokument", () => {
    const snapshot = createProtocolSnapshot([]);
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    expect(doc.sections).toHaveLength(0);
  });

  it("leerer Snapshot → Metadaten werden übernommen", () => {
    const snapshot = createProtocolSnapshot([]);
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    expect(doc.protocolId).toBe(snapshot.protocolId);
    expect(doc.version).toBe(snapshot.version);
    expect(doc.createdAt).toBe(snapshot.createdAt);
  });

  it("Frage ohne Snapshot-Antwort-Eintrag erhält null als answer", () => {
    // Erzeuge Snapshot, lösche dann einen answer-Eintrag manuell
    const snapshot = makeSnapshot();
    const firstQ = snapshot.sections[0].questions[0];
    delete (snapshot.answers as Record<string, unknown>)[firstQ.id];
    const doc = createProtocolDocument(snapshot, "Test-Dokument");
    expect(doc.sections[0].questions[0].answer).toBeNull();
  });
});
