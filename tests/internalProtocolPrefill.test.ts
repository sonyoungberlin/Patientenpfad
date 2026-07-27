/**
 * Tests für die M2-Anpassung „Patienten ohne Termin":
 *
 * 1. Prefill-Datenfluss: buildPrefillProtocolWorkflowCheckpoints()
 * 2. Prefill-Isolation: nur für den Pilotprozess, buildInitialProtocolWorkflowCheckpoints bleibt null
 * 3. Prefill-Validierung: alle Optionen existieren im Katalog, Typen stimmen
 * 4. Prefill-Persistenz: bestehende Antworten werden nicht überschrieben
 * 5. resolveAnswerLabel: Option-ID → Label, Mehrfachauswahl, Unbekannte Auswahl
 * 6. Strukturelle Darstellungsregeln: Section-Header und Leitplanken-Reihenfolge
 */

import {
  buildInitialProtocolWorkflowCheckpoints,
  buildPrefillProtocolWorkflowCheckpoints,
  buildInitialInternalProtocolWorkflowSnapshot,
  type ProtocolWorkflowCheckpoint,
  type ProtocolWorkflowAnswerValue,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import { resolveAnswerLabel } from "@/lib/workflow/internalProtocol/answerLabel";
import type { ProtocolQuestion } from "@/lib/workflow/internalProtocol/questions";

// ─────────────────────────────────────────────────────────────────────────────
// 1. buildInitialProtocolWorkflowCheckpoints – bleibt null (Regression)
// ─────────────────────────────────────────────────────────────────────────────

describe("buildInitialProtocolWorkflowCheckpoints – alle Antworten null (Regression)", () => {
  it("alle Antworten sind null", () => {
    const checkpoints = buildInitialProtocolWorkflowCheckpoints();
    for (const cp of checkpoints) {
      for (const val of Object.values(cp.answers)) {
        expect(val).toBeNull();
      }
    }
  });

  it("status ist OPEN für alle Checkpoints", () => {
    const checkpoints = buildInitialProtocolWorkflowCheckpoints();
    for (const cp of checkpoints) {
      expect(cp.status).toBe("OPEN");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. buildPrefillProtocolWorkflowCheckpoints – neue Sitzung erhält Prefill
// ─────────────────────────────────────────────────────────────────────────────

describe("buildPrefillProtocolWorkflowCheckpoints – neue Sitzung erhält Prefill", () => {
  let checkpoints: ProtocolWorkflowCheckpoint[];

  beforeEach(() => {
    checkpoints = buildPrefillProtocolWorkflowCheckpoints();
  });

  it("liefert genau 5 Checkpoints (eine pro Section)", () => {
    expect(checkpoints).toHaveLength(5);
  });

  it("Checkpoint-Reihenfolge stimmt mit Sections überein", () => {
    const sectionIds = getPatientWithoutAppointmentSections().map((s) => s.id);
    const checkpointIds = checkpoints.map((cp) => cp.id);
    expect(checkpointIds).toEqual(sectionIds);
  });

  it("alle Checkpoints starten mit status OPEN", () => {
    for (const cp of checkpoints) {
      expect(cp.status).toBe("OPEN");
    }
  });

  it("mindestens eine Antwort pro Checkpoint ist nicht null", () => {
    for (const cp of checkpoints) {
      const answered = Object.values(cp.answers).filter((v) => v !== null);
      expect(answered.length).toBeGreaterThan(0);
    }
  });

  it("enthält mehr beantwortete Fragen als buildInitialProtocolWorkflowCheckpoints", () => {
    const emptyTotal = buildInitialProtocolWorkflowCheckpoints()
      .flatMap((cp) => Object.values(cp.answers))
      .filter((v) => v !== null).length;
    const prefillTotal = checkpoints
      .flatMap((cp) => Object.values(cp.answers))
      .filter((v) => v !== null).length;
    expect(prefillTotal).toBeGreaterThan(emptyTotal);
  });

  it("POT-Q-C01-01 erhält MULTI_SELECT-Prefill (Array)", () => {
    const c01 = checkpoints.find((cp) => cp.id === "PC-C01");
    expect(Array.isArray(c01?.answers["POT-Q-C01-01"])).toBe(true);
  });

  it("POT-Q-C02-01 erhält SINGLE_SELECT-Prefill (String, kein Array)", () => {
    const c02 = checkpoints.find((cp) => cp.id === "PC-C02");
    const answer = c02?.answers["POT-Q-C02-01"];
    expect(typeof answer).toBe("string");
    expect(Array.isArray(answer)).toBe(false);
  });

  it("POT-Q-C01-02 erhält YES_NO_UNCLEAR-Prefill", () => {
    const c01 = checkpoints.find((cp) => cp.id === "PC-C01");
    const answer = c01?.answers["POT-Q-C01-02"];
    expect(["YES", "NO", "UNCLEAR"]).toContain(answer);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Prefill-Validierung: alle Options-IDs existieren im Katalog
// ─────────────────────────────────────────────────────────────────────────────

describe("Prefill-Validierung – alle Option-IDs existieren im Katalog", () => {
  const sections = getPatientWithoutAppointmentSections();
  const checkpoints = buildPrefillProtocolWorkflowCheckpoints();

  it("alle Frage-IDs im Prefill existieren in der Prozessdefinition", () => {
    const allQuestionIds = new Set(
      sections.flatMap((s) => s.questions.map((q) => q.id)),
    );
    for (const cp of checkpoints) {
      for (const [qId, answer] of Object.entries(cp.answers)) {
        if (answer !== null) {
          expect(allQuestionIds.has(qId)).toBe(true);
        }
      }
    }
  });

  it("MULTI_SELECT-Prefills enthalten ausschließlich gültige Option-IDs", () => {
    for (const section of sections) {
      const cp = checkpoints.find((c) => c.id === section.id);
      if (!cp) continue;
      for (const question of section.questions) {
        if (question.kind !== "MULTI_SELECT") continue;
        const answer = cp.answers[question.id];
        if (!Array.isArray(answer)) continue;
        const validOptionIds = new Set(question.options.map((o) => o.id));
        for (const optId of answer) {
          expect(validOptionIds.has(optId)).toBe(true);
        }
      }
    }
  });

  it("SINGLE_SELECT-Prefills enthalten gültige Option-IDs", () => {
    for (const section of sections) {
      const cp = checkpoints.find((c) => c.id === section.id);
      if (!cp) continue;
      for (const question of section.questions) {
        if (question.kind !== "SINGLE_SELECT") continue;
        const answer = cp.answers[question.id];
        if (typeof answer !== "string") continue;
        const validOptionIds = new Set(question.options.map((o) => o.id));
        expect(validOptionIds.has(answer)).toBe(true);
      }
    }
  });

  it("SINGLE_SELECT-Prefills sind kein Array (Typ-Korrektheit)", () => {
    for (const section of sections) {
      const cp = checkpoints.find((c) => c.id === section.id);
      if (!cp) continue;
      for (const question of section.questions) {
        if (question.kind !== "SINGLE_SELECT") continue;
        const answer = cp.answers[question.id];
        if (answer === null) continue;
        expect(Array.isArray(answer)).toBe(false);
      }
    }
  });

  it("YES_NO_UNCLEAR-Prefills sind 'YES', 'NO' oder 'UNCLEAR'", () => {
    const validValues = new Set(["YES", "NO", "UNCLEAR"]);
    for (const section of sections) {
      const cp = checkpoints.find((c) => c.id === section.id);
      if (!cp) continue;
      for (const question of section.questions) {
        if (question.kind !== "YES_NO_UNCLEAR") continue;
        const answer = cp.answers[question.id];
        if (answer === null) continue;
        expect(validValues.has(answer as string)).toBe(true);
      }
    }
  });

  it("MULTI_SELECT-Prefills sind Arrays (nicht einzelne Strings)", () => {
    for (const section of sections) {
      const cp = checkpoints.find((c) => c.id === section.id);
      if (!cp) continue;
      for (const question of section.questions) {
        if (question.kind !== "MULTI_SELECT") continue;
        const answer = cp.answers[question.id];
        if (answer === null) continue;
        expect(Array.isArray(answer)).toBe(true);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. buildInitialInternalProtocolWorkflowSnapshot – nutzt Prefill
// ─────────────────────────────────────────────────────────────────────────────

describe("buildInitialInternalProtocolWorkflowSnapshot – nutzt Prefill für neue Sitzungen", () => {
  it("topicId ist 'patienten-ohne-termin' (Scope-Isolation)", () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot();
    expect(snapshot.topicId).toBe("patienten-ohne-termin");
  });

  it("processKind ist 'internal-protocol'", () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot();
    expect(snapshot.processKind).toBe("internal-protocol");
  });

  it("enthält dieselben Prefill-Antworten wie buildPrefillProtocolWorkflowCheckpoints", () => {
    const snapshotCheckpoints = buildInitialInternalProtocolWorkflowSnapshot().checkpoints;
    const prefillCheckpoints = buildPrefillProtocolWorkflowCheckpoints();

    for (let i = 0; i < snapshotCheckpoints.length; i++) {
      expect(snapshotCheckpoints[i].answers).toEqual(prefillCheckpoints[i].answers);
    }
  });

  it("gibt bei jedem Aufruf eine unabhängige Kopie zurück (kein shared state)", () => {
    const snap1 = buildInitialInternalProtocolWorkflowSnapshot();
    const snap2 = buildInitialInternalProtocolWorkflowSnapshot();
    // Mutation von snap1 darf snap2 nicht verändern
    snap1.checkpoints[0].answers["POT-Q-C01-01"] = ["MUTIERT"];
    expect(snap2.checkpoints[0].answers["POT-Q-C01-01"]).not.toEqual(["MUTIERT"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Prefill-Persistenz: bestehende Antworten nicht überschreiben
// ─────────────────────────────────────────────────────────────────────────────

describe("Prefill-Persistenz – bestehende Antworten werden nicht überschrieben", () => {
  it("gespeicherte Antworten unterscheiden sich von Prefill, wenn der Nutzer sie geändert hat", () => {
    // Simuliert: neue Sitzung anlegen → Prefill anwenden
    const savedSnapshot = buildInitialInternalProtocolWorkflowSnapshot();

    // Nutzer ändert eine Antwort
    savedSnapshot.checkpoints[0].answers["POT-Q-C01-01"] = ["POT-Q-C01-01-B", "POT-Q-C01-01-C"];

    // Beim Laden würde nur der DB-Snapshot zurückgegeben – kein erneutes Prefill
    // → Die geänderte Antwort bleibt erhalten
    const loadedAnswer = savedSnapshot.checkpoints[0].answers["POT-Q-C01-01"];
    expect(loadedAnswer).toEqual(["POT-Q-C01-01-B", "POT-Q-C01-01-C"]);

    // buildPrefillProtocolWorkflowCheckpoints() erzeugt einen neuen unabhängigen Snapshot
    // und überschreibt savedSnapshot nicht
    const freshPrefill = buildPrefillProtocolWorkflowCheckpoints();
    expect(freshPrefill[0].answers["POT-Q-C01-01"]).not.toEqual(["POT-Q-C01-01-B", "POT-Q-C01-01-C"]);
    expect(savedSnapshot.checkpoints[0].answers["POT-Q-C01-01"]).toEqual(["POT-Q-C01-01-B", "POT-Q-C01-01-C"]);
  });

  it("buildPrefillProtocolWorkflowCheckpoints erzeugt jedes Mal eine unabhängige Kopie", () => {
    const cp1 = buildPrefillProtocolWorkflowCheckpoints();
    const cp2 = buildPrefillProtocolWorkflowCheckpoints();

    // Mutation cp1 darf cp2 nicht ändern
    cp1[0].answers["POT-Q-C01-02"] = "NO";
    expect(cp2[0].answers["POT-Q-C01-02"]).not.toBe("NO");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. resolveAnswerLabel – Option-ID → lesbares Label
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveAnswerLabel – null und leere Werte", () => {
  it("gibt '—' für null zurück", () => {
    expect(resolveAnswerLabel(undefined, null)).toBe("—");
  });

  it("gibt '—' für leeres Array zurück", () => {
    expect(resolveAnswerLabel(undefined, [])).toBe("—");
  });
});

describe("resolveAnswerLabel – YES/NO/UNCLEAR", () => {
  it.each([
    ["YES", "Ja"],
    ["NO", "Nein"],
    ["UNCLEAR", "Unklar"],
  ] as const)("'%s' → '%s'", (input, expected) => {
    expect(resolveAnswerLabel(undefined, input)).toBe(expected);
  });
});

describe("resolveAnswerLabel – SINGLE_SELECT", () => {
  const singleSelectQuestion: ProtocolQuestion = {
    id: "POT-Q-C02-01",
    text: "Wer ist primär zuständig?",
    kind: "SINGLE_SELECT",
    required: true,
    options: [
      { id: "POT-Q-C02-01-A", label: "MFA am Empfang", outputText: "" },
      { id: "POT-Q-C02-01-B", label: "Erfahrene MFA oder Teamlead", outputText: "" },
    ],
  };

  it("bekannte Option-ID → Label", () => {
    expect(resolveAnswerLabel(singleSelectQuestion, "POT-Q-C02-01-A")).toBe("MFA am Empfang");
  });

  it("zweite bekannte Option-ID → zugehöriges Label", () => {
    expect(resolveAnswerLabel(singleSelectQuestion, "POT-Q-C02-01-B")).toBe("Erfahrene MFA oder Teamlead");
  });

  it("unbekannte Option-ID → 'Unbekannte Auswahl' (kein Absturz)", () => {
    expect(resolveAnswerLabel(singleSelectQuestion, "POT-Q-UNBEKANNT")).toBe("Unbekannte Auswahl");
  });

  it("technisch aussehende Option-ID ohne Kontext → 'Unbekannte Auswahl'", () => {
    expect(resolveAnswerLabel(undefined, "POT-Q-C02-01-A")).toBe("Unbekannte Auswahl");
  });

  it("normaler Freitext ohne Kontext → Rohwert unverändert", () => {
    expect(resolveAnswerLabel(undefined, "Patient wurde an 116 117 verwiesen.")).toBe(
      "Patient wurde an 116 117 verwiesen.",
    );
  });

  it("FREE_TEXT mit Kontext → Rohwert immer unverändert", () => {
    const freeTextQuestion: ProtocolQuestion = {
      id: "POT-Q-C04-03",
      text: "Verweis-Beschreibung",
      kind: "FREE_TEXT",
    };
    expect(resolveAnswerLabel(freeTextQuestion, "Verweis bei nicht dringlichen Fällen.")).toBe(
      "Verweis bei nicht dringlichen Fällen.",
    );
  });
});

describe("resolveAnswerLabel – MULTI_SELECT", () => {
  const multiSelectQuestion: ProtocolQuestion = {
    id: "POT-Q-C03-01",
    text: "Welche Informationen werden erhoben?",
    kind: "MULTI_SELECT",
    required: true,
    options: [
      { id: "POT-Q-C03-01-A", label: "Name und Geburtsdatum", outputText: "" },
      { id: "POT-Q-C03-01-B", label: "Art und Schwere der Beschwerden", outputText: "" },
      { id: "POT-Q-C03-01-C", label: "Dringlichkeits-Selbsteinschätzung des Patienten", outputText: "" },
    ],
  };

  it("ein bekannter Wert → Label", () => {
    expect(resolveAnswerLabel(multiSelectQuestion, ["POT-Q-C03-01-A"])).toBe("Name und Geburtsdatum");
  });

  it("mehrere bekannte Werte → Labels komma-getrennt", () => {
    const result = resolveAnswerLabel(multiSelectQuestion, [
      "POT-Q-C03-01-A",
      "POT-Q-C03-01-B",
    ]);
    expect(result).toBe("Name und Geburtsdatum, Art und Schwere der Beschwerden");
  });

  it("alle drei Prefill-Optionen → drei komma-getrennte Labels", () => {
    const result = resolveAnswerLabel(multiSelectQuestion, [
      "POT-Q-C03-01-A",
      "POT-Q-C03-01-B",
      "POT-Q-C03-01-C",
    ]);
    expect(result).toBe(
      "Name und Geburtsdatum, Art und Schwere der Beschwerden, Dringlichkeits-Selbsteinschätzung des Patienten",
    );
  });

  it("unbekannte Option-ID in Array → 'Unbekannte Auswahl' für diese Position", () => {
    const result = resolveAnswerLabel(multiSelectQuestion, [
      "POT-Q-C03-01-A",
      "POT-Q-UNBEKANNT",
    ]);
    expect(result).toBe("Name und Geburtsdatum, Unbekannte Auswahl");
  });

  it("vollständig unbekannte IDs → alle 'Unbekannte Auswahl'", () => {
    const result = resolveAnswerLabel(multiSelectQuestion, [
      "POT-Q-UNBEKANNT-1",
      "POT-Q-UNBEKANNT-2",
    ]);
    expect(result).toBe("Unbekannte Auswahl, Unbekannte Auswahl");
  });

  it("technisch aussehende IDs ohne MULTI_SELECT-Kontext → defensiv 'Unbekannte Auswahl'", () => {
    const result = resolveAnswerLabel(undefined, ["POT-Q-C03-01-A", "POT-Q-C03-01-B"]);
    expect(result).toBe("Unbekannte Auswahl, Unbekannte Auswahl");
  });

  it("normaler Freitext in Array ohne Kontext → Rohwert", () => {
    const result = resolveAnswerLabel(undefined, ["normaler Text", "weitere Angabe"]);
    expect(result).toBe("normaler Text, weitere Angabe");
  });
});

describe("resolveAnswerLabel – mit echten Katalog-Daten", () => {
  it("POT-Q-C02-01-A → 'MFA am Empfang' (Prefill-Standardwert)", () => {
    const sections = getPatientWithoutAppointmentSections();
    const question = sections
      .find((s) => s.id === "PC-C02")
      ?.questions.find((q) => q.id === "POT-Q-C02-01");
    expect(resolveAnswerLabel(question, "POT-Q-C02-01-A")).toBe("MFA am Empfang");
  });

  it("POT-Q-C03-02-D → 'Situationsabhängige Entscheidung nach Einschätzung des Anliegens'", () => {
    const sections = getPatientWithoutAppointmentSections();
    const question = sections
      .find((s) => s.id === "PC-C03")
      ?.questions.find((q) => q.id === "POT-Q-C03-02");
    expect(resolveAnswerLabel(question, "POT-Q-C03-02-D")).toBe(
      "Situationsabhängige Entscheidung nach Einschätzung des Anliegens",
    );
  });

  it("POT-Q-C05-03-D → 'Gemeinsam im gesamten Praxisteam'", () => {
    const sections = getPatientWithoutAppointmentSections();
    const question = sections
      .find((s) => s.id === "PC-C05")
      ?.questions.find((q) => q.id === "POT-Q-C05-03");
    expect(resolveAnswerLabel(question, "POT-Q-C05-03-D")).toBe("Gemeinsam im gesamten Praxisteam");
  });

  it("alle Prefill-Werte lösen sich zu lesbaren Labels auf (kein Rohwert sichtbar)", () => {
    const sections = getPatientWithoutAppointmentSections();
    const checkpoints = buildPrefillProtocolWorkflowCheckpoints();

    for (const section of sections) {
      const cp = checkpoints.find((c) => c.id === section.id);
      if (!cp) continue;
      for (const question of section.questions) {
        const answer = cp.answers[question.id] as ProtocolWorkflowAnswerValue;
        if (answer === null) continue;

        const label = resolveAnswerLabel(question, answer);

        // Das Label darf keine rohe Option-ID der Form POT-Q-... enthalten
        expect(label).not.toMatch(/^POT-Q-/);

        // Das Label darf nie leer sein wenn eine Antwort gesetzt ist
        expect(label).not.toBe("—");
        expect(label.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Strukturelle Darstellungsregeln
// ─────────────────────────────────────────────────────────────────────────────

describe("Strukturelle Darstellungsregeln – Section-Titel ohne ID-Präfix", () => {
  it("Section-Titel enthält kein 'PC-C' Präfix", () => {
    const sections = getPatientWithoutAppointmentSections();
    for (const section of sections) {
      expect(section.title).not.toMatch(/^PC-C/);
    }
  });

  it("Section-Titel sind für Endnutzer verständlich (kein Technikkürzel)", () => {
    const sections = getPatientWithoutAppointmentSections();
    for (const section of sections) {
      // Titel enthält kein reines ID-Muster wie "PC-C01"
      expect(section.title).not.toMatch(/^PC-C\d+$/);
    }
  });
});

describe("Strukturelle Darstellungsregeln – officialRules als optionaler Hintergrundbereich", () => {
  it("jede Section hat das Feld officialRules (Array)", () => {
    const sections = getPatientWithoutAppointmentSections();
    for (const section of sections) {
      expect(Array.isArray(section.officialRules)).toBe(true);
    }
  });

  it("Sections haben mindestens eine officialRule (Inhalt für Hintergrundbereich)", () => {
    const sections = getPatientWithoutAppointmentSections();
    for (const section of sections) {
      expect(section.officialRules.length).toBeGreaterThan(0);
    }
  });

  it("questions ist ein separates Array (Fragen und Leitplanken sind getrennt)", () => {
    const sections = getPatientWithoutAppointmentSections();
    for (const section of sections) {
      expect(Array.isArray(section.questions)).toBe(true);
      // Fragen und Leitplanken sind disjunkte Arrays im Datenmodell
      expect(section.questions).not.toBe(section.officialRules);
    }
  });
});

describe("Strukturelle Darstellungsregeln – QuestionInput-Quelltext: Fragen vor Leitplanken", () => {
  it("InternalProtocolEditorClient: QuestionInput rendert Fragen vor dem Hintergrundbereich", () => {
    const fs = require("fs") as { readFileSync: (p: string, e: string) => string };
    const path = require("path") as { join: (...args: string[]) => string };
    const src = fs.readFileSync(
      path.join(__dirname, "../app/workflow-cases/[id]/protocol/InternalProtocolEditorClient.tsx"),
      "utf-8",
    );

    // QuestionInput: Fragen (section.questions.map) müssen VOR officialRules erscheinen
    const questionsPos = src.indexOf("section.questions.map");
    const rulesPos = src.indexOf("section.officialRules.length > 0");

    expect(questionsPos).toBeGreaterThan(0);
    expect(rulesPos).toBeGreaterThan(0);
    // In QuestionInput: questions.map kommt vor officialRules (erste Vorkommnisse)
    expect(questionsPos).toBeLessThan(rulesPos);
  });

  it("Hintergrundbereich ist standardmäßig eingeklappt: <details> ohne open-Attribut", () => {
    const fs = require("fs") as { readFileSync: (p: string, e: string) => string };
    const path = require("path") as { join: (...args: string[]) => string };
    const src = fs.readFileSync(
      path.join(__dirname, "../app/workflow-cases/[id]/protocol/InternalProtocolEditorClient.tsx"),
      "utf-8",
    );

    // Kein <details open> für Hintergrundbereich (würde ihn standardmäßig öffnen)
    expect(src).not.toMatch(/<details\s+open/);
    // <details> ist vorhanden
    expect(src).toMatch(/<details/);
  });

  it("Sektionsheader zeigt nur den Titel, nicht die technische ID", () => {
    const fs = require("fs") as { readFileSync: (p: string, e: string) => string };
    const path = require("path") as { join: (...args: string[]) => string };
    const src = fs.readFileSync(
      path.join(__dirname, "../app/workflow-cases/[id]/protocol/InternalProtocolEditorClient.tsx"),
      "utf-8",
    );

    // Das Muster {checkpoint.id}: {checkpoint.title} darf nicht mehr vorkommen
    expect(src).not.toMatch(/\{checkpoint\.id\}:\s*\{checkpoint\.title\}/);
    // Das Muster {section.id}: {section.title} darf nicht mehr vorkommen
    expect(src).not.toMatch(/\{section\.id\}:\s*\{section\.title\}/);
  });
});
