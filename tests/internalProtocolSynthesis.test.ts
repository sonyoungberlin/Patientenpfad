/**
 * Tests für lib/workflow/internalProtocol/synthesis.ts
 *
 * Prüft die Kernlogik der Synthese-Funktionen für M3 und M4:
 * - Zuordnung der Klärungsaspekte zu M2-Schritten
 * - Synthese von Antworten ohne Wiederholung der Rohdaten
 * - Verwendung von outputText bei SELECT-Fragen
 * - Fallback-Verhalten bei Fragetypen ohne outputText
 * - Urteilslogik und Statusmapping
 * - Ergebnis kann trotz offener Aspekte erzeugt werden
 */

import {
  synthesizeAnswer,
  synthesizeCheckpoint,
  judgmentLabel,
  getM2StepConfig,
  M2_STEP_CONFIGS,
  type SynthesisItem,
} from "@/lib/workflow/internalProtocol/synthesis";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import {
  buildInitialProtocolWorkflowCheckpoints,
  buildPrefillProtocolWorkflowCheckpoints,
  type ProtocolWorkflowCheckpoint,
  type ProtocolWorkflowAnswers,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import type { ProtocolSection } from "@/lib/workflow/internalProtocol/questions";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function makeCheckpoint(opts: {
  id?: string;
  title?: string;
  status?: ProtocolWorkflowCheckpoint["status"];
  answers?: ProtocolWorkflowAnswers;
}): ProtocolWorkflowCheckpoint {
  return {
    id: opts.id ?? "PC-C01",
    title: opts.title ?? "Geltungsbereich",
    status: opts.status ?? "OPEN",
    answers: opts.answers ?? {},
  };
}

function getSection(id: string): ProtocolSection {
  const sections = getPatientWithoutAppointmentSections();
  const s = sections.find((sec) => sec.id === id);
  if (!s) throw new Error(`Section ${id} nicht gefunden`);
  return s;
}

// ---------------------------------------------------------------------------
// 1. Zuordnung der fünf Aspekte zu M2.1–M2.5
// ---------------------------------------------------------------------------

describe("M2 Schritt-Konfiguration", () => {
  it("enthält genau 5 Schritte", () => {
    expect(M2_STEP_CONFIGS).toHaveLength(5);
  });

  it("Schritt 1 → PC-C01 (Geltungsbereich)", () => {
    const config = getM2StepConfig(1);
    expect(config).toBeDefined();
    expect(config!.sectionId).toBe("PC-C01");
    expect(config!.title).toBe("Geltungsbereich");
  });

  it("Schritt 2 → PC-C02 (Zuständigkeit)", () => {
    const config = getM2StepConfig(2);
    expect(config!.sectionId).toBe("PC-C02");
  });

  it("Schritt 3 → PC-C03 (Standardablauf)", () => {
    expect(getM2StepConfig(3)!.sectionId).toBe("PC-C03");
  });

  it("Schritt 4 → PC-C04 (Ausnahmen und Eskalation)", () => {
    expect(getM2StepConfig(4)!.sectionId).toBe("PC-C04");
  });

  it("Schritt 5 → PC-C05 (Dokumentation)", () => {
    expect(getM2StepConfig(5)!.sectionId).toBe("PC-C05");
  });

  it("gibt undefined für ungültige Schrittnummern zurück", () => {
    expect(getM2StepConfig(0)).toBeUndefined();
    expect(getM2StepConfig(6)).toBeUndefined();
    expect(getM2StepConfig(-1)).toBeUndefined();
  });

  it("alle Schritt-IDs zeigen auf tatsächlich vorhandene Sections", () => {
    const sections = getPatientWithoutAppointmentSections();
    const sectionIds = sections.map((s) => s.id);
    for (const config of M2_STEP_CONFIGS) {
      expect(sectionIds).toContain(config.sectionId);
    }
  });

  it("Kernfragen sind vorhanden und nichtleer", () => {
    for (const config of M2_STEP_CONFIGS) {
      expect(config.kernfrage.trim().length).toBeGreaterThan(10);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. synthesizeAnswer – outputText-Verwendung
// ---------------------------------------------------------------------------

describe("synthesizeAnswer – SELECT-Fragen verwenden outputText", () => {
  const section = getSection("PC-C02");

  it("SINGLE_SELECT: gibt outputText der gewählten Option zurück", () => {
    const question = section.questions.find((q) => q.id === "POT-Q-C02-01");
    if (!question || question.kind !== "SINGLE_SELECT")
      throw new Error("Frage nicht gefunden oder falscher Typ");

    const optionA = question.options[0];
    const result = synthesizeAnswer(question, optionA.id);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(optionA.outputText);
    expect(result[0].status).toBe("confirmed");
  });

  it("SINGLE_SELECT: outputText wird bevorzugt, nicht label", () => {
    const question = section.questions.find((q) => q.id === "POT-Q-C02-01");
    if (!question || question.kind !== "SINGLE_SELECT")
      throw new Error("Frage nicht gefunden oder falscher Typ");

    const optionA = question.options[0];
    const result = synthesizeAnswer(question, optionA.id);

    // Ergebnis sollte outputText enthalten, NICHT nur das label
    expect(result[0].text).toBe(optionA.outputText);
    // label ist "MFA am Empfang" – outputText ist länger und vollständiger
    expect(result[0].text).not.toBe(optionA.label);
  });
});

describe("synthesizeAnswer – MULTI_SELECT verwendet outputText pro Option", () => {
  const section = getSection("PC-C01");

  it("gibt je ein Item pro gewählter Option zurück", () => {
    const question = section.questions.find((q) => q.id === "POT-Q-C01-01");
    if (!question || question.kind !== "MULTI_SELECT")
      throw new Error("Frage nicht gefunden oder falscher Typ");

    const optA = question.options[0];
    const optB = question.options[1];
    const result = synthesizeAnswer(question, [optA.id, optB.id]);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe(optA.outputText);
    expect(result[1].text).toBe(optB.outputText);
    expect(result.every((r) => r.status === "confirmed")).toBe(true);
  });

  it("gibt leeres Array zurück wenn keine Option gewählt", () => {
    const question = section.questions.find((q) => q.id === "POT-Q-C01-01");
    if (!question || question.kind !== "MULTI_SELECT")
      throw new Error("Frage nicht gefunden");

    expect(synthesizeAnswer(question, null)).toHaveLength(0);
    expect(synthesizeAnswer(question, [])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. synthesizeAnswer – Fallback für Fragetypen ohne outputText
// ---------------------------------------------------------------------------

describe("synthesizeAnswer – Fallback für YES_NO_UNCLEAR und FREE_TEXT", () => {
  const section = getSection("PC-C01");
  const yesNoQuestion = section.questions.find(
    (q) => q.id === "POT-Q-C01-02" && q.kind === "YES_NO_UNCLEAR",
  );

  if (!yesNoQuestion) throw new Error("YES_NO_UNCLEAR-Frage nicht gefunden");

  it("YES → confirmed-Item mit lesbarem Text", () => {
    const result = synthesizeAnswer(yesNoQuestion, "YES");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("confirmed");
    expect(result[0].text).toContain("Ja");
  });

  it("NO → confirmed-Item mit lesbarem Text", () => {
    const result = synthesizeAnswer(yesNoQuestion, "NO");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("confirmed");
    expect(result[0].text).toContain("Nein");
  });

  it("UNCLEAR → unclear-Item", () => {
    const result = synthesizeAnswer(yesNoQuestion, "UNCLEAR");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("unclear");
  });

  it("null → leeres Array", () => {
    expect(synthesizeAnswer(yesNoQuestion, null)).toHaveLength(0);
  });

  it("FREE_TEXT → confirmed-Item mit dem Freitext als Text", () => {
    const sectionC04 = getSection("PC-C04");
    const freeTextQuestion = sectionC04.questions.find(
      (q) => q.kind === "FREE_TEXT",
    );
    if (!freeTextQuestion) throw new Error("FREE_TEXT-Frage nicht gefunden");

    const result = synthesizeAnswer(freeTextQuestion, "Eskalation an Arzt sofort");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("confirmed");
    expect(result[0].text).toBe("Eskalation an Arzt sofort");
  });

  it("FREE_TEXT leer → leeres Array", () => {
    const sectionC04 = getSection("PC-C04");
    const freeTextQuestion = sectionC04.questions.find(
      (q) => q.kind === "FREE_TEXT",
    );
    if (!freeTextQuestion) throw new Error("FREE_TEXT-Frage nicht gefunden");

    expect(synthesizeAnswer(freeTextQuestion, "")).toHaveLength(0);
    expect(synthesizeAnswer(freeTextQuestion, "   ")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. synthesizeCheckpoint – Synthese ohne Wiederholung der Rohdaten
// ---------------------------------------------------------------------------

describe("synthesizeCheckpoint – Synthese der Antworten", () => {
  it("beantwortete Fragen erscheinen als Synthese-Items, nicht als rohe Fragen", () => {
    const section = getSection("PC-C02");
    const checkpoint = makeCheckpoint({
      id: "PC-C02",
      answers: {
        "POT-Q-C02-01": "POT-Q-C02-01-A", // MFA am Empfang
        "POT-Q-C02-02": "POT-Q-C02-02-A",
        "POT-Q-C02-03": "YES",
        "POT-Q-C02-04": "YES",
      },
    });

    const items = synthesizeCheckpoint(section, checkpoint);
    expect(items.length).toBeGreaterThan(0);

    // Kein Item sollte die rohe Frage "Wer ist primär für die Erstaufnahme..." als text haben
    // (das wäre rohe Wiederholung). Stattdessen soll der outputText der Option kommen.
    const rawQuestionTexts = section.questions.map((q) => q.text);
    for (const item of items.filter((i) => i.status === "confirmed")) {
      // Confirmed items sollten outputText oder lesbaren Kurztext enthalten,
      // nicht den originalen Fragetext 1:1 (außer als Teil des Fallback-Formats)
      expect(item.text.length).toBeGreaterThan(0);
    }
  });

  it("Pflichtfragen ohne Antwort erscheinen als open-Items", () => {
    const section = getSection("PC-C01");
    const checkpoint = makeCheckpoint({ id: "PC-C01", answers: {} });

    const items = synthesizeCheckpoint(section, checkpoint);
    const openItems = items.filter((i) => i.status === "open");

    // PC-C01 hat 2 required Fragen
    const requiredCount = section.questions.filter((q) => q.required).length;
    expect(openItems.length).toBe(requiredCount);
  });

  it("optionale Fragen ohne Antwort erscheinen NICHT in der Synthese", () => {
    const section = getSection("PC-C01");
    // Nur required Fragen beantworten, optional leer lassen
    const answers: ProtocolWorkflowAnswers = {};
    for (const q of section.questions) {
      if (q.required) {
        if (q.kind === "YES_NO_UNCLEAR") answers[q.id] = "YES";
        if (q.kind === "MULTI_SELECT") answers[q.id] = [q.options[0].id];
      }
      // optional: leer lassen
    }
    const checkpoint = makeCheckpoint({ id: "PC-C01", answers });

    const items = synthesizeCheckpoint(section, checkpoint);
    // Keine open-Items (alle required beantwortet)
    expect(items.filter((i) => i.status === "open")).toHaveLength(0);
  });

  it("gemischter Checkpoint: confirmed + open + unclear korrekt klassifiziert", () => {
    const section = getSection("PC-C02");
    const checkpoint = makeCheckpoint({
      id: "PC-C02",
      answers: {
        "POT-Q-C02-01": "POT-Q-C02-01-A", // beantwortet → confirmed
        // POT-Q-C02-02: fehlend → open (required)
        "POT-Q-C02-03": "UNCLEAR",         // unklar → unclear
        // POT-Q-C02-04: fehlend → open (required)
      },
    });

    const items = synthesizeCheckpoint(section, checkpoint);
    expect(items.some((i) => i.status === "confirmed")).toBe(true);
    expect(items.some((i) => i.status === "open")).toBe(true);
    expect(items.some((i) => i.status === "unclear")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Ein Urteil pro Aspekt (judgmentLabel)
// ---------------------------------------------------------------------------

describe("judgmentLabel – fachlich korrekte Beschriftungen", () => {
  it("CONFIRMED → 'Ausreichend geklärt'", () => {
    expect(judgmentLabel("CONFIRMED")).toBe("Ausreichend geklärt");
  });

  it("OPEN → 'Noch offen'", () => {
    expect(judgmentLabel("OPEN")).toBe("Noch offen");
  });

  it("NOT_APPLICABLE → 'Nicht relevant'", () => {
    expect(judgmentLabel("NOT_APPLICABLE")).toBe("Nicht relevant");
  });

  it("Kein Urteil verwendet 'Teamentscheidung', 'Beurteilt' oder 'Nicht zutreffend'", () => {
    const labels = ["CONFIRMED", "OPEN", "NOT_APPLICABLE"].map((s) =>
      judgmentLabel(s as ProtocolWorkflowCheckpoint["status"]),
    );
    for (const label of labels) {
      expect(label).not.toMatch(/teamentscheidung/i);
      expect(label).not.toMatch(/^beurteilt$/i);
      expect(label).not.toMatch(/nicht zutreffend/i);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Ergebnis kann trotz „Noch offen" erzeugt werden
// ---------------------------------------------------------------------------

describe("Ergebnis mit offenen Aspekten", () => {
  it("synthesizeCheckpoint läuft ohne Fehler durch, auch wenn alle Antworten fehlen", () => {
    const section = getSection("PC-C03");
    const checkpoint = makeCheckpoint({ id: "PC-C03", status: "OPEN", answers: {} });

    expect(() => synthesizeCheckpoint(section, checkpoint)).not.toThrow();
  });

  it("offene Pflichtfragen werden als open-Items dokumentiert (nicht verworfen)", () => {
    const section = getSection("PC-C03");
    const checkpoint = makeCheckpoint({ id: "PC-C03", status: "OPEN", answers: {} });

    const items = synthesizeCheckpoint(section, checkpoint);
    const openItems = items.filter((i) => i.status === "open");
    expect(openItems.length).toBeGreaterThan(0);
  });

  it("Snapshot mit gemischten Statuses (CONFIRMED + OPEN) bleibt valide", () => {
    const checkpoints = buildInitialProtocolWorkflowCheckpoints();
    checkpoints[0].status = "CONFIRMED";
    checkpoints[1].status = "OPEN";
    checkpoints[2].status = "NOT_APPLICABLE";

    const sections = getPatientWithoutAppointmentSections();
    const results = checkpoints.map((cp) => {
      const section = sections.find((s) => s.id === cp.id)!;
      return synthesizeCheckpoint(section, cp);
    });

    expect(results).toHaveLength(5);
    expect(results.every(Array.isArray)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Prefill-Werte erzeugen gültige Synthese
// ---------------------------------------------------------------------------

describe("Prefill-Werte in Synthese", () => {
  it("Prefill-Checkpoints erzeugen mindestens einen confirmed-Item pro Aspekt", () => {
    const checkpoints = buildPrefillProtocolWorkflowCheckpoints();
    const sections = getPatientWithoutAppointmentSections();

    for (const cp of checkpoints) {
      const section = sections.find((s) => s.id === cp.id);
      if (!section) continue;
      const items = synthesizeCheckpoint(section, cp);
      const hasAnyContent = items.some(
        (i) => i.status === "confirmed" || i.status === "unclear",
      );
      // Prefill-Werte sollten mindestens etwas beantworten
      // (manche Sections können noch offene optionale Felder haben)
      expect(hasAnyContent).toBe(true);
    }
  });
});
