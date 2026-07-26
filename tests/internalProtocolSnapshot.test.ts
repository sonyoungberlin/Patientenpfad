/**
 * Tests für lib/workflow/internalProtocol/snapshot.ts
 */

import {
  createProtocolSnapshot,
  cloneProtocolSnapshot,
} from "@/lib/workflow/internalProtocol/snapshot";
import type { InternalProtocolSnapshot } from "@/lib/workflow/internalProtocol/snapshot";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import type { ProtocolSection } from "@/lib/workflow/internalProtocol/questions";
import type { OfficialRule } from "@/lib/workflow/internalProtocol/officialContent";

// ---------------------------------------------------------------------------
// Grundstruktur
// ---------------------------------------------------------------------------

describe("createProtocolSnapshot() – Grundstruktur", () => {
  let snapshot: InternalProtocolSnapshot;

  beforeEach(() => {
    snapshot = createProtocolSnapshot(getPatientWithoutAppointmentSections());
  });

  it("gibt ein Objekt zurück", () => {
    expect(typeof snapshot).toBe("object");
    expect(snapshot).not.toBeNull();
  });

  it("protocolId ist ein nichtleerer String", () => {
    expect(typeof snapshot.protocolId).toBe("string");
    expect(snapshot.protocolId.length).toBeGreaterThan(0);
  });

  it("protocolId hat UUID-v4-Format", () => {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(snapshot.protocolId).toMatch(uuidPattern);
  });

  it("version ist 1", () => {
    expect(snapshot.version).toBe(1);
  });

  it("createdAt ist ein nichtleerer ISO-8601-String", () => {
    expect(typeof snapshot.createdAt).toBe("string");
    expect(snapshot.createdAt.length).toBeGreaterThan(0);
    expect(() => new Date(snapshot.createdAt)).not.toThrow();
    expect(new Date(snapshot.createdAt).toISOString()).toBe(snapshot.createdAt);
  });

  it("sections ist ein Array", () => {
    expect(Array.isArray(snapshot.sections)).toBe(true);
  });

  it("answers ist ein Objekt (kein Array)", () => {
    expect(typeof snapshot.answers).toBe("object");
    expect(Array.isArray(snapshot.answers)).toBe(false);
    expect(snapshot.answers).not.toBeNull();
  });

  it("zwei Aufrufe erzeugen verschiedene protocolIds (UUID-Eindeutigkeit)", () => {
    const a = createProtocolSnapshot(getPatientWithoutAppointmentSections());
    const b = createProtocolSnapshot(getPatientWithoutAppointmentSections());
    expect(a.protocolId).not.toBe(b.protocolId);
  });
});

// ---------------------------------------------------------------------------
// 5 Sections für patientWithoutAppointment
// ---------------------------------------------------------------------------

describe("createProtocolSnapshot() – genau 5 Sections für patientWithoutAppointment", () => {
  let snapshot: InternalProtocolSnapshot;

  beforeEach(() => {
    snapshot = createProtocolSnapshot(getPatientWithoutAppointmentSections());
  });

  it("enthält genau 5 Sections", () => {
    expect(snapshot.sections).toHaveLength(5);
  });

  it("Section-IDs sind PC-C01 bis PC-C05 in der richtigen Reihenfolge", () => {
    const ids = snapshot.sections.map((s) => s.id);
    expect(ids).toEqual(["PC-C01", "PC-C02", "PC-C03", "PC-C04", "PC-C05"]);
  });

  it.each([
    ["PC-C01", "Geltungsbereich"],
    ["PC-C02", "Zuständigkeit und Entscheidungsbefugnis"],
    ["PC-C03", "Standardablauf"],
    ["PC-C04", "Ausnahmen und Eskalation"],
    ["PC-C05", "Dokumentation und Überprüfung"],
  ])("Section %s hat den Titel '%s'", (id, expectedTitle) => {
    const section = snapshot.sections.find((s) => s.id === id);
    expect(section?.title).toBe(expectedTitle);
  });
});

// ---------------------------------------------------------------------------
// IDs unverändert
// ---------------------------------------------------------------------------

describe("createProtocolSnapshot() – IDs unverändert", () => {
  it("Section-IDs stimmen mit der Quelle überein", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);
    const sourceIds = source.map((s) => s.id);
    const snapshotIds = snapshot.sections.map((s) => s.id);
    expect(snapshotIds).toEqual(sourceIds);
  });

  it("Frage-IDs stimmen mit der Quelle überein (alle Sections)", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);

    for (let i = 0; i < source.length; i++) {
      const sourceQIds = source[i].questions.map((q) => q.id);
      const snapQIds = snapshot.sections[i].questions.map((q) => q.id);
      expect(snapQIds).toEqual(sourceQIds);
    }
  });

  it("Regel-IDs stimmen mit der Quelle überein (alle Sections)", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);

    for (let i = 0; i < source.length; i++) {
      const sourceRIds = source[i].officialRules.map((r) => r.id);
      const snapRIds = snapshot.sections[i].officialRules.map((r) => r.id);
      expect(snapRIds).toEqual(sourceRIds);
    }
  });

  it("Option-IDs in SELECT-Fragen stimmen mit der Quelle überein", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);

    for (let i = 0; i < source.length; i++) {
      for (let j = 0; j < source[i].questions.length; j++) {
        const srcQ = source[i].questions[j];
        const snapQ = snapshot.sections[i].questions[j];
        if (
          (srcQ.kind === "SINGLE_SELECT" || srcQ.kind === "MULTI_SELECT") &&
          (snapQ.kind === "SINGLE_SELECT" || snapQ.kind === "MULTI_SELECT")
        ) {
          const srcOptIds = srcQ.options.map((o) => o.id);
          const snapOptIds = snapQ.options.map((o) => o.id);
          expect(snapOptIds).toEqual(srcOptIds);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Antworten leer
// ---------------------------------------------------------------------------

describe("createProtocolSnapshot() – Antworten leer", () => {
  let snapshot: InternalProtocolSnapshot;

  beforeEach(() => {
    snapshot = createProtocolSnapshot(getPatientWithoutAppointmentSections());
  });

  it("alle Frage-IDs aus den Sections sind im answers-Objekt vorhanden", () => {
    const allQuestionIds = snapshot.sections.flatMap((s) =>
      s.questions.map((q) => q.id),
    );
    for (const id of allQuestionIds) {
      expect(Object.prototype.hasOwnProperty.call(snapshot.answers, id)).toBe(
        true,
      );
    }
  });

  it("answers enthält genau so viele Einträge wie Fragen in allen Sections", () => {
    const totalQuestions = snapshot.sections.reduce(
      (sum, s) => sum + s.questions.length,
      0,
    );
    expect(Object.keys(snapshot.answers).length).toBe(totalQuestions);
  });

  it("YES_NO_UNCLEAR-Fragen haben null als Antwortwert", () => {
    for (const section of snapshot.sections) {
      for (const q of section.questions) {
        if (q.kind === "YES_NO_UNCLEAR") {
          expect(snapshot.answers[q.id]).toBeNull();
        }
      }
    }
  });

  it("SINGLE_SELECT-Fragen haben null als Antwortwert", () => {
    for (const section of snapshot.sections) {
      for (const q of section.questions) {
        if (q.kind === "SINGLE_SELECT") {
          expect(snapshot.answers[q.id]).toBeNull();
        }
      }
    }
  });

  it("FREE_TEXT-Fragen haben null als Antwortwert", () => {
    for (const section of snapshot.sections) {
      for (const q of section.questions) {
        if (q.kind === "FREE_TEXT") {
          expect(snapshot.answers[q.id]).toBeNull();
        }
      }
    }
  });

  it("alle Antwortwerte sind null (kein Antwortformat vorgegeben)", () => {
    for (const section of snapshot.sections) {
      for (const q of section.questions) {
        expect(snapshot.answers[q.id]).toBeNull();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Tiefe Kopien auf allen Ebenen
// ---------------------------------------------------------------------------

describe("createProtocolSnapshot() – Tiefe Kopien", () => {
  it("sections-Array ist eine neue Instanz (nicht die Eingabe)", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);
    expect(snapshot.sections).not.toBe(source);
  });

  it("Section-Objekte sind neue Instanzen", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);
    for (let i = 0; i < source.length; i++) {
      expect(snapshot.sections[i]).not.toBe(source[i]);
    }
  });

  it("officialRules-Arrays sind neue Instanzen", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);
    for (let i = 0; i < source.length; i++) {
      expect(snapshot.sections[i].officialRules).not.toBe(
        source[i].officialRules,
      );
    }
  });

  it("OfficialRule-Objekte sind neue Instanzen", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);
    for (let i = 0; i < source.length; i++) {
      for (let j = 0; j < source[i].officialRules.length; j++) {
        expect(snapshot.sections[i].officialRules[j]).not.toBe(
          source[i].officialRules[j],
        );
      }
    }
  });

  it("source-Objekte in Regeln sind neue Instanzen", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);
    for (let i = 0; i < source.length; i++) {
      for (let j = 0; j < source[i].officialRules.length; j++) {
        expect(snapshot.sections[i].officialRules[j].source).not.toBe(
          source[i].officialRules[j].source,
        );
      }
    }
  });

  it("questions-Arrays sind neue Instanzen", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);
    for (let i = 0; i < source.length; i++) {
      expect(snapshot.sections[i].questions).not.toBe(source[i].questions);
    }
  });

  it("Frage-Objekte sind neue Instanzen", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);
    for (let i = 0; i < source.length; i++) {
      for (let j = 0; j < source[i].questions.length; j++) {
        expect(snapshot.sections[i].questions[j]).not.toBe(
          source[i].questions[j],
        );
      }
    }
  });

  it("options-Arrays in SELECT-Fragen sind neue Instanzen", () => {
    const source = getPatientWithoutAppointmentSections();
    const snapshot = createProtocolSnapshot(source);
    for (let i = 0; i < source.length; i++) {
      for (let j = 0; j < source[i].questions.length; j++) {
        const srcQ = source[i].questions[j];
        const snapQ = snapshot.sections[i].questions[j];
        if (
          (srcQ.kind === "SINGLE_SELECT" || srcQ.kind === "MULTI_SELECT") &&
          (snapQ.kind === "SINGLE_SELECT" || snapQ.kind === "MULTI_SELECT")
        ) {
          expect(snapQ.options).not.toBe(srcQ.options);
        }
      }
    }
  });

  it("Mutation einer Eingabe-Section beeinflusst den Snapshot nicht", () => {
    const source = getPatientWithoutAppointmentSections();
    const originalTitle = source[0].title;
    const snapshot = createProtocolSnapshot(source);
    (source[0] as { title: string }).title = "MUTIERT";
    expect(snapshot.sections[0].title).toBe(originalTitle);
  });

  it("Mutation eines source.author-Felds beeinflusst den Snapshot nicht", () => {
    const source = getPatientWithoutAppointmentSections();
    const originalAuthor = source[0].officialRules[0].source.author;
    const snapshot = createProtocolSnapshot(source);
    source[0].officialRules[0].source.author = "MUTIERT";
    expect(snapshot.sections[0].officialRules[0].source.author).toBe(
      originalAuthor,
    );
  });

  it("Mutation der answers ändert nicht die answers eines zweiten Snapshots aus gleicher Quelle", () => {
    const a = createProtocolSnapshot(getPatientWithoutAppointmentSections());
    const b = createProtocolSnapshot(getPatientWithoutAppointmentSections());
    // Schreibe einen Wert in a.answers
    const firstKey = Object.keys(a.answers)[0];
    a.answers[firstKey] = "MUTIERT";
    // b.answers soll unberührt bleiben
    expect(b.answers[firstKey]).not.toBe("MUTIERT");
  });
});

// ---------------------------------------------------------------------------
// cloneProtocolSnapshot – vollständig unabhängig
// ---------------------------------------------------------------------------

describe("cloneProtocolSnapshot() – vollständig unabhängig", () => {
  let original: InternalProtocolSnapshot;
  let clone: InternalProtocolSnapshot;

  beforeEach(() => {
    original = createProtocolSnapshot(getPatientWithoutAppointmentSections());
    clone = cloneProtocolSnapshot(original);
  });

  it("gibt ein neues Objekt zurück (nicht das Original)", () => {
    expect(clone).not.toBe(original);
  });

  it("Metadaten (protocolId, version, createdAt) werden übernommen", () => {
    expect(clone.protocolId).toBe(original.protocolId);
    expect(clone.version).toBe(original.version);
    expect(clone.createdAt).toBe(original.createdAt);
  });

  it("sections-Array ist eine neue Instanz", () => {
    expect(clone.sections).not.toBe(original.sections);
  });

  it("Section-Objekte sind neue Instanzen", () => {
    for (let i = 0; i < original.sections.length; i++) {
      expect(clone.sections[i]).not.toBe(original.sections[i]);
    }
  });

  it("officialRules-Arrays sind neue Instanzen", () => {
    for (let i = 0; i < original.sections.length; i++) {
      expect(clone.sections[i].officialRules).not.toBe(
        original.sections[i].officialRules,
      );
    }
  });

  it("source-Objekte in Regeln sind neue Instanzen", () => {
    for (let i = 0; i < original.sections.length; i++) {
      for (let j = 0; j < original.sections[i].officialRules.length; j++) {
        expect(clone.sections[i].officialRules[j].source).not.toBe(
          original.sections[i].officialRules[j].source,
        );
      }
    }
  });

  it("answers-Objekt ist eine neue Instanz", () => {
    expect(clone.answers).not.toBe(original.answers);
  });

  it("Mutation von clone.sections beeinflusst original.sections nicht", () => {
    const originalTitle = original.sections[0].title;
    (clone.sections[0] as { title: string }).title = "MUTIERT";
    expect(original.sections[0].title).toBe(originalTitle);
  });

  it("Mutation von clone.answers beeinflusst original.answers nicht", () => {
    const firstKey = Object.keys(clone.answers)[0];
    const originalValue = original.answers[firstKey];
    clone.answers[firstKey] = "MUTIERT";
    expect(original.answers[firstKey]).toBe(originalValue);
  });

  it("clone enthält dieselben Section-IDs wie das Original", () => {
    const cloneIds = clone.sections.map((s) => s.id);
    const origIds = original.sections.map((s) => s.id);
    expect(cloneIds).toEqual(origIds);
  });

  it("clone enthält dieselben answers-Keys wie das Original", () => {
    const cloneKeys = Object.keys(clone.answers).sort();
    const origKeys = Object.keys(original.answers).sort();
    expect(cloneKeys).toEqual(origKeys);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe("createProtocolSnapshot() – Edge Cases", () => {
  it("leeres Sections-Array → sections ist leer, answers ist leer", () => {
    const snapshot = createProtocolSnapshot([]);
    expect(snapshot.sections).toHaveLength(0);
    expect(Object.keys(snapshot.answers)).toHaveLength(0);
  });

  it("leeres Sections-Array → protocolId und version sind trotzdem gesetzt", () => {
    const snapshot = createProtocolSnapshot([]);
    expect(snapshot.protocolId.length).toBeGreaterThan(0);
    expect(snapshot.version).toBe(1);
  });

  it("einzelne Section ohne Fragen → keine answers-Einträge für diese Section", () => {
    const singleSection: ProtocolSection = {
      id: "TEST-C01",
      title: "Testabschnitt",
      officialRules: [
        {
          id: "TEST-R-01",
          text: "Testregel",
          bindingLevel: "MANDATORY",
          source: {
            id: "SRC-TEST",
            author: "Testautor",
            title: "Testquelle",
            reviewedAt: "2026-01-01",
          },
        } satisfies OfficialRule,
      ],
      questions: [],
    };
    const snapshot = createProtocolSnapshot([singleSection]);
    expect(snapshot.sections).toHaveLength(1);
    expect(Object.keys(snapshot.answers)).toHaveLength(0);
    expect(snapshot.sections[0].officialRules[0].source).not.toBe(
      singleSection.officialRules[0].source,
    );
  });
});
