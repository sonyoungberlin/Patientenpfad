/**
 * Tests für lib/workflow/internalProtocol/clarificationState.ts
 *
 * Prüft die reine Ableitungsfunktion getProtocolSectionClarificationState()
 * sowie ihre Integration mit den echten Katalog-Daten des Pilotprozesses.
 */

import {
  getProtocolSectionClarificationState,
  type SectionClarificationState,
} from "@/lib/workflow/internalProtocol/clarificationState";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import {
  buildPrefillProtocolWorkflowCheckpoints,
  buildInitialProtocolWorkflowCheckpoints,
  type ProtocolWorkflowCheckpoint,
  type ProtocolWorkflowAnswers,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import type { ProtocolSection } from "@/lib/workflow/internalProtocol/questions";
import { resolveAnswerLabel } from "@/lib/workflow/internalProtocol/answerLabel";

// ---------------------------------------------------------------------------
// Hilfsfunktionen für Tests
// ---------------------------------------------------------------------------

/** Baut einen minimalen, vollständig benutzbaren Test-Checkpoint. */
function makeCheckpoint(opts: {
  id?: string;
  title?: string;
  status?: ProtocolWorkflowCheckpoint["status"];
  answers?: ProtocolWorkflowAnswers;
}): ProtocolWorkflowCheckpoint {
  return {
    id: opts.id ?? "PC-C02",
    title: opts.title ?? "Zuständigkeit und Entscheidungsbefugnis",
    status: opts.status ?? "OPEN",
    answers: opts.answers ?? {},
  };
}

/** Holt die Section PC-C02 aus dem Katalog (hat SINGLE_SELECT + YES_NO_UNCLEAR). */
function getC02Section(): ProtocolSection {
  const sections = getPatientWithoutAppointmentSections();
  const s = sections.find((s) => s.id === "PC-C02");
  if (!s) throw new Error("PC-C02 nicht gefunden");
  return s;
}

/** Holt die Section PC-C01 aus dem Katalog (hat MULTI_SELECT + YES_NO_UNCLEAR). */
function getC01Section(): ProtocolSection {
  const sections = getPatientWithoutAppointmentSections();
  const s = sections.find((s) => s.id === "PC-C01");
  if (!s) throw new Error("PC-C01 nicht gefunden");
  return s;
}

/** Holt die Section PC-C04 aus dem Katalog (hat FREE_TEXT + YES_NO_UNCLEAR). */
function getC04Section(): ProtocolSection {
  const sections = getPatientWithoutAppointmentSections();
  const s = sections.find((s) => s.id === "PC-C04");
  if (!s) throw new Error("PC-C04 nicht gefunden");
  return s;
}

// ---------------------------------------------------------------------------
// Grundlegende Status-Regeln
// ---------------------------------------------------------------------------

describe("getProtocolSectionClarificationState – Status-Regeln", () => {
  const section = getC02Section();

  it("OPEN → needsClarification, nicht isClarified", () => {
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "OPEN", answers: {} }),
    );
    expect(state.needsClarification).toBe(true);
    expect(state.isClarified).toBe(false);
  });

  it("CONFIRMED → isClarified, kein needsClarification", () => {
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "CONFIRMED", answers: {} }),
    );
    expect(state.isClarified).toBe(true);
    expect(state.needsClarification).toBe(false);
  });

  it("NOT_APPLICABLE → isClarified, kein needsClarification", () => {
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "NOT_APPLICABLE", answers: {} }),
    );
    expect(state.isClarified).toBe(true);
    expect(state.needsClarification).toBe(false);
  });

  it("vollständig beantwortete Section mit Status OPEN bleibt offen", () => {
    const section = getC02Section();
    const answers: ProtocolWorkflowAnswers = {};
    for (const q of section.questions) {
      if (q.kind === "SINGLE_SELECT") answers[q.id] = q.options[0].id;
      if (q.kind === "YES_NO_UNCLEAR") answers[q.id] = "YES";
    }
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "OPEN", answers }),
    );
    expect(state.needsClarification).toBe(true);
    expect(state.isClarified).toBe(false);
  });

  it("vollständig beantwortete Section mit Status CONFIRMED → festgelegt", () => {
    const answers: ProtocolWorkflowAnswers = {};
    for (const q of section.questions) {
      if (q.kind === "SINGLE_SELECT") answers[q.id] = q.options[0].id;
      if (q.kind === "YES_NO_UNCLEAR") answers[q.id] = "YES";
    }
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "CONFIRMED", answers }),
    );
    expect(state.isClarified).toBe(true);
    expect(state.needsClarification).toBe(false);
  });

  it("checkpointId im Ergebnis stimmt mit checkpoint.id überein", () => {
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "OPEN", answers: {} }),
    );
    expect(state.checkpointId).toBe("PC-C02");
  });

  it("status im Ergebnis spiegelt den Checkpoint-Status wider", () => {
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "NOT_APPLICABLE", answers: {} }),
    );
    expect(state.status).toBe("NOT_APPLICABLE");
  });
});

// ---------------------------------------------------------------------------
// Fehlende Pflichtantworten (missing)
// ---------------------------------------------------------------------------

describe("getProtocolSectionClarificationState – fehlende Pflichtantworten", () => {
  it("Pflichtfrage ohne Antwort erscheint als 'missing' in openIssues", () => {
    const section = getC02Section();
    // POT-Q-C02-01 ist required, keine Antwort gesetzt
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "OPEN", answers: {} }),
    );
    const missingIds = state.openIssues
      .filter((i) => i.reason === "missing")
      .map((i) => i.question.id);
    expect(missingIds).toContain("POT-Q-C02-01");
  });

  it("Pflichtfrage ohne Antwort erscheint in unansweredRequiredQuestions", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "OPEN", answers: {} }),
    );
    const ids = state.unansweredRequiredQuestions.map((q) => q.id);
    expect(ids).toContain("POT-Q-C02-01");
  });

  it("allRequiredAnswered ist false wenn Pflichtfrage fehlt", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "OPEN", answers: {} }),
    );
    expect(state.allRequiredAnswered).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Optionale unbeantwortete Fragen
// ---------------------------------------------------------------------------

describe("getProtocolSectionClarificationState – optionale Fragen", () => {
  it("optionale unbeantwortete Frage erzeugt kein 'missing'-Issue", () => {
    // PC-C01: POT-Q-C01-03 ist optional (kein required: true)
    const section = getC01Section();
    const answers: ProtocolWorkflowAnswers = {
      "POT-Q-C01-01": ["POT-Q-C01-01-A"],
      "POT-Q-C01-02": "YES",
      // POT-Q-C01-03 bleibt absichtlich leer
    };
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C01", status: "OPEN", answers }),
    );
    const missingIds = state.openIssues
      .filter((i) => i.reason === "missing")
      .map((i) => i.question.id);
    expect(missingIds).not.toContain("POT-Q-C01-03");
  });

  it("optionale unbeantwortete Frage blockiert allRequiredAnswered nicht", () => {
    const section = getC01Section();
    const answers: ProtocolWorkflowAnswers = {
      "POT-Q-C01-01": ["POT-Q-C01-01-A"],
      "POT-Q-C01-02": "YES",
      // POT-Q-C01-03 offen (optional)
    };
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C01", status: "OPEN", answers }),
    );
    expect(state.allRequiredAnswered).toBe(true);
  });

  it("FREE_TEXT optionale Frage ohne Antwort erzeugt kein Issue", () => {
    // PC-C04: POT-Q-C04-03 ist optional FREE_TEXT
    const section = getC04Section();
    const answers: ProtocolWorkflowAnswers = {
      "POT-Q-C04-01": ["POT-Q-C04-01-A"],
      "POT-Q-C04-02": "POT-Q-C04-02-A",
      // POT-Q-C04-03 leer (optional FREE_TEXT)
      "POT-Q-C04-04": "YES",
    };
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C04", status: "OPEN", answers }),
    );
    const missingIds = state.openIssues.map((i) => i.question.id);
    expect(missingIds).not.toContain("POT-Q-C04-03");
  });
});

// ---------------------------------------------------------------------------
// UNCLEAR-Antworten
// ---------------------------------------------------------------------------

describe("getProtocolSectionClarificationState – UNCLEAR", () => {
  it("UNCLEAR erscheint als 'unclear' in openIssues", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({
        id: "PC-C02",
        status: "OPEN",
        answers: { "POT-Q-C02-03": "UNCLEAR" },
      }),
    );
    const unclearIds = state.openIssues
      .filter((i) => i.reason === "unclear")
      .map((i) => i.question.id);
    expect(unclearIds).toContain("POT-Q-C02-03");
  });

  it("UNCLEAR erscheint in unclearQuestions", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({
        id: "PC-C02",
        status: "OPEN",
        answers: { "POT-Q-C02-03": "UNCLEAR" },
      }),
    );
    const ids = state.unclearQuestions.map((q) => q.id);
    expect(ids).toContain("POT-Q-C02-03");
  });

  it("UNCLEAR-Frage wird trotzdem als beantwortet gezählt", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({
        id: "PC-C02",
        status: "OPEN",
        answers: { "POT-Q-C02-03": "UNCLEAR" },
      }),
    );
    const ids = state.answeredQuestions.map((q) => q.id);
    expect(ids).toContain("POT-Q-C02-03");
  });

  it("UNCLEAR mit currentAnswer === 'UNCLEAR' im Issue gespeichert", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({
        id: "PC-C02",
        status: "OPEN",
        answers: { "POT-Q-C02-03": "UNCLEAR" },
      }),
    );
    const issue = state.openIssues.find(
      (i) => i.reason === "unclear" && i.question.id === "POT-Q-C02-03",
    );
    expect(issue?.currentAnswer).toBe("UNCLEAR");
  });
});

// ---------------------------------------------------------------------------
// Unbekannte/ungültige Option-ID
// ---------------------------------------------------------------------------

describe("getProtocolSectionClarificationState – unbekannte Option-ID", () => {
  it("unbekannte SINGLE_SELECT-Option-ID erscheint als 'unresolvable' in openIssues", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({
        id: "PC-C02",
        status: "OPEN",
        answers: { "POT-Q-C02-01": "UNBEKANNTE-OPTION-ID" },
      }),
    );
    const ids = state.openIssues
      .filter((i) => i.reason === "unresolvable")
      .map((i) => i.question.id);
    expect(ids).toContain("POT-Q-C02-01");
  });

  it("unbekannte MULTI_SELECT-Option-ID erscheint als 'unresolvable'", () => {
    const section = getC01Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({
        id: "PC-C01",
        status: "OPEN",
        answers: { "POT-Q-C01-01": ["POT-Q-C01-01-A", "UNBEKANNTE-ID"] },
      }),
    );
    const ids = state.openIssues
      .filter((i) => i.reason === "unresolvable")
      .map((i) => i.question.id);
    expect(ids).toContain("POT-Q-C01-01");
  });

  it("bekannte Option-ID erzeugt kein 'unresolvable'", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({
        id: "PC-C02",
        status: "OPEN",
        answers: { "POT-Q-C02-01": "POT-Q-C02-01-A" },
      }),
    );
    const unresolvable = state.openIssues.filter(
      (i) => i.reason === "unresolvable" && i.question.id === "POT-Q-C02-01",
    );
    expect(unresolvable).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// hasTeamConfirmationPending
// ---------------------------------------------------------------------------

describe("getProtocolSectionClarificationState – hasTeamConfirmationPending", () => {
  it("ist true wenn keine openIssues aber Status OPEN", () => {
    const section = getC02Section();
    // Alle required Fragen beantworten
    const answers: ProtocolWorkflowAnswers = {};
    for (const q of section.questions) {
      if (q.required !== true) continue;
      if (q.kind === "SINGLE_SELECT") answers[q.id] = q.options[0].id;
      if (q.kind === "YES_NO_UNCLEAR") answers[q.id] = "YES";
    }
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "OPEN", answers }),
    );
    expect(state.openIssues).toHaveLength(0);
    expect(state.hasTeamConfirmationPending).toBe(true);
  });

  it("ist false wenn openIssues vorhanden", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "OPEN", answers: {} }),
    );
    expect(state.openIssues.length).toBeGreaterThan(0);
    expect(state.hasTeamConfirmationPending).toBe(false);
  });

  it("ist false wenn CONFIRMED (kein pending mehr)", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "CONFIRMED", answers: {} }),
    );
    expect(state.hasTeamConfirmationPending).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Zusammenfassungszahlen
// ---------------------------------------------------------------------------

describe("getProtocolSectionClarificationState – Zusammenfassungszahlen", () => {
  it("answeredQuestions zählt nur Fragen mit Antwort", () => {
    const section = getC02Section();
    const answers: ProtocolWorkflowAnswers = {
      "POT-Q-C02-01": "POT-Q-C02-01-A",
      "POT-Q-C02-02": "POT-Q-C02-02-B",
      // Rest leer
    };
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "OPEN", answers }),
    );
    expect(state.answeredQuestions).toHaveLength(2);
  });

  it("openIssues zählt pro Frage einen Issue-Eintrag", () => {
    const section = getC02Section();
    // POT-Q-C02-01 (required) leer → missing
    // POT-Q-C02-03 (required) UNCLEAR → unclear
    const answers: ProtocolWorkflowAnswers = {
      "POT-Q-C02-03": "UNCLEAR",
    };
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({ id: "PC-C02", status: "OPEN", answers }),
    );
    // POT-Q-C02-01 und POT-Q-C02-02 fehlen (required) → 2 missing
    // POT-Q-C02-03 UNCLEAR → 1 unclear
    // POT-Q-C02-04 fehlt (required) → 1 missing
    const missing = state.openIssues.filter((i) => i.reason === "missing").length;
    const unclear = state.openIssues.filter((i) => i.reason === "unclear").length;
    expect(missing).toBeGreaterThanOrEqual(3); // C02-01, C02-02, C02-04
    expect(unclear).toBe(1);
  });

  it("bei Prefill-Checkpoint haben alle Sections mindestens einige Antworten", () => {
    const sections = getPatientWithoutAppointmentSections();
    const checkpoints = buildPrefillProtocolWorkflowCheckpoints();

    for (const section of sections) {
      const cp = checkpoints.find((c) => c.id === section.id);
      if (!cp) continue;
      const state = getProtocolSectionClarificationState(section, cp);
      expect(state.answeredQuestions.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Integration mit echtem Katalog: Alle Sections
// ---------------------------------------------------------------------------

describe("Integration – alle Sections des Pilotprozesses", () => {
  it("leere Checkpoints haben für jede required-Frage ein missing-Issue", () => {
    const sections = getPatientWithoutAppointmentSections();
    const checkpoints = buildInitialProtocolWorkflowCheckpoints();

    for (const section of sections) {
      const cp = checkpoints.find((c) => c.id === section.id)!;
      const state = getProtocolSectionClarificationState(section, cp);

      const requiredCount = section.questions.filter((q) => q.required === true).length;
      const missingCount = state.openIssues.filter((i) => i.reason === "missing").length;
      expect(missingCount).toBe(requiredCount);
    }
  });

  it("Prefill-Checkpoints haben weniger missing-Issues als leere Checkpoints", () => {
    const sections = getPatientWithoutAppointmentSections();
    const emptyCps = buildInitialProtocolWorkflowCheckpoints();
    const prefillCps = buildPrefillProtocolWorkflowCheckpoints();

    let emptyMissing = 0;
    let prefillMissing = 0;

    for (const section of sections) {
      const emptyCp = emptyCps.find((c) => c.id === section.id)!;
      const prefillCp = prefillCps.find((c) => c.id === section.id)!;
      const emptyState = getProtocolSectionClarificationState(section, emptyCp);
      const prefillState = getProtocolSectionClarificationState(section, prefillCp);
      emptyMissing += emptyState.openIssues.filter((i) => i.reason === "missing").length;
      prefillMissing += prefillState.openIssues.filter((i) => i.reason === "missing").length;
    }

    // Prefill deckt die wichtigsten Fragen ab – deutlich weniger offene Punkte
    expect(prefillMissing).toBeLessThan(emptyMissing);
  });

  it("Prefill-Checkpoints sind trotzdem needsClarification (Status OPEN)", () => {
    const sections = getPatientWithoutAppointmentSections();
    const checkpoints = buildPrefillProtocolWorkflowCheckpoints();

    for (const section of sections) {
      const cp = checkpoints.find((c) => c.id === section.id)!;
      const state = getProtocolSectionClarificationState(section, cp);
      expect(state.needsClarification).toBe(true);
      expect(state.status).toBe("OPEN");
    }
  });
});

// ---------------------------------------------------------------------------
// resolveAnswerLabel-Integration: keine technischen IDs sichtbar
// ---------------------------------------------------------------------------

describe("Integration resolveAnswerLabel – keine technischen IDs in openIssues", () => {
  it("UNCLEAR-Issue: currentAnswer 'UNCLEAR' → resolveAnswerLabel gibt 'Unklar' zurück", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({
        id: "PC-C02",
        status: "OPEN",
        answers: { "POT-Q-C02-03": "UNCLEAR" },
      }),
    );
    const issue = state.openIssues.find(
      (i) => i.reason === "unclear" && i.question.id === "POT-Q-C02-03",
    )!;
    const label = resolveAnswerLabel(issue.question, issue.currentAnswer);
    expect(label).toBe("Unklar");
    expect(label).not.toMatch(/^POT-Q-/);
  });

  it("bekannte Option-ID in answeredQuestions: resolveAnswerLabel gibt lesbares Label zurück", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({
        id: "PC-C02",
        status: "OPEN",
        answers: { "POT-Q-C02-01": "POT-Q-C02-01-A" },
      }),
    );
    const q = state.answeredQuestions.find((q) => q.id === "POT-Q-C02-01")!;
    const label = resolveAnswerLabel(q, "POT-Q-C02-01-A");
    expect(label).toBe("MFA am Empfang");
    expect(label).not.toMatch(/^POT-Q-/);
  });

  it("unbekannte Option-ID: resolveAnswerLabel gibt 'Unbekannte Auswahl' zurück", () => {
    const section = getC02Section();
    const state = getProtocolSectionClarificationState(
      section,
      makeCheckpoint({
        id: "PC-C02",
        status: "OPEN",
        answers: { "POT-Q-C02-01": "UNBEKANNTE-OPTION-999" },
      }),
    );
    const issue = state.openIssues.find(
      (i) => i.reason === "unresolvable" && i.question.id === "POT-Q-C02-01",
    )!;
    const label = resolveAnswerLabel(issue.question, issue.currentAnswer);
    expect(label).toBe("Unbekannte Auswahl");
    expect(label).not.toMatch(/^POT-Q-/);
  });

  it("alle Prefill-Antworten in answeredQuestions geben lesbare Labels zurück", () => {
    const sections = getPatientWithoutAppointmentSections();
    const checkpoints = buildPrefillProtocolWorkflowCheckpoints();

    for (const section of sections) {
      const cp = checkpoints.find((c) => c.id === section.id)!;
      const state = getProtocolSectionClarificationState(section, cp);

      for (const q of state.answeredQuestions) {
        const answer = cp.answers[q.id] ?? null;
        const label = resolveAnswerLabel(q, answer);
        // Kein Rohwert in der Form POT-Q-...
        expect(label).not.toMatch(/^POT-Q-/);
        // Label ist nicht leer
        expect(label.length).toBeGreaterThan(0);
        expect(label).not.toBe("—");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Statusänderung und Persistenz (Datenfluss-Garantie)
// ---------------------------------------------------------------------------

describe("Statusänderung – Datenfluss-Garantie", () => {
  it("Statusänderung wird im Checkpoint-Objekt gespeichert (kein auto-confirm)", () => {
    const section = getC02Section();

    // Initial OPEN
    const cp: ProtocolWorkflowCheckpoint = {
      id: "PC-C02",
      title: "Zuständigkeit und Entscheidungsbefugnis",
      status: "OPEN",
      answers: { "POT-Q-C02-01": "POT-Q-C02-01-A", "POT-Q-C02-02": "POT-Q-C02-02-B" },
    };

    const stateBefore = getProtocolSectionClarificationState(section, cp);
    expect(stateBefore.status).toBe("OPEN");
    expect(stateBefore.needsClarification).toBe(true);

    // Manuell zu CONFIRMED setzen (wie nach handleStatusChange → save → reload)
    const cpConfirmed: ProtocolWorkflowCheckpoint = { ...cp, status: "CONFIRMED" };
    const stateAfter = getProtocolSectionClarificationState(section, cpConfirmed);
    expect(stateAfter.status).toBe("CONFIRMED");
    expect(stateAfter.isClarified).toBe(true);
    expect(stateAfter.needsClarification).toBe(false);
  });

  it("Statusänderung zu NOT_APPLICABLE setzt isClarified auf true", () => {
    const section = getC02Section();
    const cp: ProtocolWorkflowCheckpoint = {
      id: "PC-C02",
      title: "Zuständigkeit und Entscheidungsbefugnis",
      status: "NOT_APPLICABLE",
      answers: {},
    };
    const state = getProtocolSectionClarificationState(section, cp);
    expect(state.isClarified).toBe(true);
    expect(state.needsClarification).toBe(false);
  });

  it("getProtocolSectionClarificationState verändert Checkpoint-Daten nicht (pure function)", () => {
    const section = getC02Section();
    const cp: ProtocolWorkflowCheckpoint = {
      id: "PC-C02",
      title: "Zuständigkeit und Entscheidungsbefugnis",
      status: "OPEN",
      answers: { "POT-Q-C02-01": "POT-Q-C02-01-A" },
    };

    // Vor dem Aufruf
    const originalStatus = cp.status;
    const originalAnswers = JSON.stringify(cp.answers);

    getProtocolSectionClarificationState(section, cp);

    // Nach dem Aufruf – keine Mutation
    expect(cp.status).toBe(originalStatus);
    expect(JSON.stringify(cp.answers)).toBe(originalAnswers);
  });
});

// ---------------------------------------------------------------------------
// M3-Quelltext: keine technischen Präfixe sichtbar
// ---------------------------------------------------------------------------

describe("M3-Quelltext – keine technischen Präfixe sichtbar", () => {
  it("InternalProtocolEditorClient: kein 'PC-C' in sichtbaren Texten gerendert", () => {
    const fs = require("fs") as { readFileSync: (p: string, e: string) => string };
    const path = require("path") as { join: (...args: string[]) => string };
    const src = fs.readFileSync(
      path.join(__dirname, "../app/workflow-cases/[id]/protocol/InternalProtocolEditorClient.tsx"),
      "utf-8",
    );
    // M3View darf keinen hartcodierten PC-C... Text als JSX ausgeben
    expect(src).not.toMatch(/>\s*PC-C\d+\s*</);
    // Auch kein POT-Q-... hardcodiert
    expect(src).not.toMatch(/>\s*POT-Q-[A-Z0-9-]+\s*</);
  });

  it("M3View verwendet getProtocolSectionClarificationState (importiert)", () => {
    const fs = require("fs") as { readFileSync: (p: string, e: string) => string };
    const path = require("path") as { join: (...args: string[]) => string };
    const src = fs.readFileSync(
      path.join(__dirname, "../app/workflow-cases/[id]/protocol/InternalProtocolEditorClient.tsx"),
      "utf-8",
    );
    expect(src).toContain("getProtocolSectionClarificationState");
    expect(src).toContain("issueReasonLabel");
  });

  it("M3View enthält 'Status dieser Entscheidung'-Label", () => {
    const fs = require("fs") as { readFileSync: (p: string, e: string) => string };
    const path = require("path") as { join: (...args: string[]) => string };
    const src = fs.readFileSync(
      path.join(__dirname, "../app/workflow-cases/[id]/protocol/InternalProtocolEditorClient.tsx"),
      "utf-8",
    );
    expect(src).toContain("Status dieser Entscheidung");
  });

  it("M3View enthält 'Teamentscheidung noch nicht bestätigt'", () => {
    const fs = require("fs") as { readFileSync: (p: string, e: string) => string };
    const path = require("path") as { join: (...args: string[]) => string };
    const src = fs.readFileSync(
      path.join(__dirname, "../app/workflow-cases/[id]/protocol/InternalProtocolEditorClient.tsx"),
      "utf-8",
    );
    expect(src).toContain("Teamentscheidung noch nicht best");
  });

  it("M3View enthält Zusammenfassungszeile mit 'Noch zu klären' und 'Festgelegt'", () => {
    const fs = require("fs") as { readFileSync: (p: string, e: string) => string };
    const path = require("path") as { join: (...args: string[]) => string };
    const src = fs.readFileSync(
      path.join(__dirname, "../app/workflow-cases/[id]/protocol/InternalProtocolEditorClient.tsx"),
      "utf-8",
    );
    expect(src).toContain("Noch zu kl");
    expect(src).toContain("Festgelegt");
  });
});
