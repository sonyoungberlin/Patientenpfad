import {
  isProtocolCheckpointStatus,
  isProtocolWorkflowAnswerValue,
  isProtocolWorkflowCheckpoint,
  isInternalProtocolWorkflowSnapshot,
  buildInitialProtocolWorkflowCheckpoints,
  buildInitialInternalProtocolWorkflowSnapshot,
  countAnsweredQuestions,
  countUnansweredQuestions,
  type ProtocolWorkflowCheckpoint,
  type InternalProtocolWorkflowSnapshot,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import { createProtocolSnapshot } from "@/lib/workflow/internalProtocol/snapshot";
import { createProtocolDocument } from "@/lib/workflow/internalProtocol/document";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";

// ─────────────────────────────────────────────────────────────────────────────
// isProtocolCheckpointStatus
// ─────────────────────────────────────────────────────────────────────────────

describe("isProtocolCheckpointStatus", () => {
  it.each(["OPEN", "CONFIRMED", "NOT_APPLICABLE"] as const)(
    "akzeptiert '%s' als gültigen Status",
    (status) => {
      expect(isProtocolCheckpointStatus(status)).toBe(true);
    },
  );

  it.each([null, undefined, "", "UNKLAR", "ERKENNBAR", 0, false, {}, []])(
    "lehnt %p als ungültig ab",
    (val) => {
      expect(isProtocolCheckpointStatus(val)).toBe(false);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// isProtocolWorkflowAnswerValue
// ─────────────────────────────────────────────────────────────────────────────

describe("isProtocolWorkflowAnswerValue", () => {
  it("akzeptiert null", () => {
    expect(isProtocolWorkflowAnswerValue(null)).toBe(true);
  });

  it("akzeptiert leeren String", () => {
    expect(isProtocolWorkflowAnswerValue("")).toBe(true);
  });

  it("akzeptiert YES / NO / UNCLEAR", () => {
    expect(isProtocolWorkflowAnswerValue("YES")).toBe(true);
    expect(isProtocolWorkflowAnswerValue("NO")).toBe(true);
    expect(isProtocolWorkflowAnswerValue("UNCLEAR")).toBe(true);
  });

  it("akzeptiert beliebigen String (FREE_TEXT)", () => {
    expect(isProtocolWorkflowAnswerValue("Freitext-Antwort")).toBe(true);
  });

  it("akzeptiert leeres Array", () => {
    expect(isProtocolWorkflowAnswerValue([])).toBe(true);
  });

  it("akzeptiert Array von Strings (MULTI_SELECT)", () => {
    expect(isProtocolWorkflowAnswerValue(["OPT-A", "OPT-B"])).toBe(true);
  });

  it("lehnt Array mit nicht-Strings ab", () => {
    expect(isProtocolWorkflowAnswerValue([1, 2])).toBe(false);
  });

  it.each([undefined, 0, false, {}])("lehnt %p ab", (val) => {
    expect(isProtocolWorkflowAnswerValue(val)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isProtocolWorkflowCheckpoint
// ─────────────────────────────────────────────────────────────────────────────

describe("isProtocolWorkflowCheckpoint", () => {
  const valid: ProtocolWorkflowCheckpoint = {
    id: "PC-C01",
    title: "Geltungsbereich",
    status: "OPEN",
    answers: { "POT-Q-C01-01": null, "POT-Q-C01-02": "YES" },
  };

  it("akzeptiert gültigen Checkpoint", () => {
    expect(isProtocolWorkflowCheckpoint(valid)).toBe(true);
  });

  it("akzeptiert Checkpoint mit leerem answers-Objekt", () => {
    expect(isProtocolWorkflowCheckpoint({ ...valid, answers: {} })).toBe(true);
  });

  it("akzeptiert MULTI_SELECT-Antworten", () => {
    const cp = { ...valid, answers: { q1: ["OPT-A", "OPT-B"] } };
    expect(isProtocolWorkflowCheckpoint(cp)).toBe(true);
  });

  it("lehnt fehlende id ab", () => {
    expect(isProtocolWorkflowCheckpoint({ ...valid, id: "" })).toBe(false);
  });

  it("lehnt ungültigen Status ab", () => {
    expect(isProtocolWorkflowCheckpoint({ ...valid, status: "UNKLAR" })).toBe(false);
  });

  it("lehnt ungültigen answers-Wert ab", () => {
    expect(isProtocolWorkflowCheckpoint({ ...valid, answers: { q1: 42 } })).toBe(false);
  });

  it.each([null, undefined, [], "", 0])("lehnt %p ab", (val) => {
    expect(isProtocolWorkflowCheckpoint(val)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isInternalProtocolWorkflowSnapshot
// ─────────────────────────────────────────────────────────────────────────────

describe("isInternalProtocolWorkflowSnapshot", () => {
  const validCheckpoint: ProtocolWorkflowCheckpoint = {
    id: "PC-C01",
    title: "Geltungsbereich",
    status: "OPEN",
    answers: {},
  };

  const validSnapshot: InternalProtocolWorkflowSnapshot = {
    processKind: "internal-protocol",
    topicId: "patienten-ohne-termin",
    checkpoints: [validCheckpoint],
  };

  it("akzeptiert gültigen Snapshot", () => {
    expect(isInternalProtocolWorkflowSnapshot(validSnapshot)).toBe(true);
  });

  it("akzeptiert Snapshot mit leerer checkpoints-Liste", () => {
    expect(
      isInternalProtocolWorkflowSnapshot({ ...validSnapshot, checkpoints: [] }),
    ).toBe(true);
  });

  it("lehnt falschen processKind ab", () => {
    expect(
      isInternalProtocolWorkflowSnapshot({ ...validSnapshot, processKind: "clinical" }),
    ).toBe(false);
  });

  it("lehnt falschen topicId ab", () => {
    expect(
      isInternalProtocolWorkflowSnapshot({
        ...validSnapshot,
        topicId: "unbekannt",
      }),
    ).toBe(false);
  });

  it("lehnt ungültigen Checkpoint im Array ab", () => {
    expect(
      isInternalProtocolWorkflowSnapshot({
        ...validSnapshot,
        checkpoints: [{ id: "", title: "", status: "OPEN", answers: {} }],
      }),
    ).toBe(false);
  });

  it("lehnt fehlende checkpoints-Liste ab", () => {
    expect(
      isInternalProtocolWorkflowSnapshot({ processKind: "internal-protocol", topicId: "patienten-ohne-termin" }),
    ).toBe(false);
  });

  it.each([null, undefined, [], "", 0])("lehnt %p ab", (val) => {
    expect(isInternalProtocolWorkflowSnapshot(val)).toBe(false);
  });

  it("lehnt klinischen WorkflowProcessSnapshot ab", () => {
    const clinicalSnapshot = {
      topicId: "hauskrankenpflege",
      role: "MFA",
      processPoints: [],
    };
    expect(isInternalProtocolWorkflowSnapshot(clinicalSnapshot)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildInitialProtocolWorkflowCheckpoints
// ─────────────────────────────────────────────────────────────────────────────

describe("buildInitialProtocolWorkflowCheckpoints", () => {
  let checkpoints: ProtocolWorkflowCheckpoint[];

  beforeEach(() => {
    checkpoints = buildInitialProtocolWorkflowCheckpoints();
  });

  it("liefert genau 5 Checkpoints", () => {
    expect(checkpoints).toHaveLength(5);
  });

  it("erster Checkpoint hat ID 'PC-C01'", () => {
    expect(checkpoints[0].id).toBe("PC-C01");
  });

  it("letzter Checkpoint hat ID 'PC-C05'", () => {
    expect(checkpoints[4].id).toBe("PC-C05");
  });

  it("alle Checkpoints starten mit status OPEN", () => {
    for (const cp of checkpoints) {
      expect(cp.status).toBe("OPEN");
    }
  });

  it("alle Antworten sind initial null", () => {
    for (const cp of checkpoints) {
      for (const val of Object.values(cp.answers)) {
        expect(val).toBeNull();
      }
    }
  });

  it("alle Checkpoints haben mindestens eine Frage", () => {
    for (const cp of checkpoints) {
      expect(Object.keys(cp.answers).length).toBeGreaterThan(0);
    }
  });

  it("Checkpoint-IDs sind eindeutig", () => {
    const ids = checkpoints.map((cp) => cp.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("alle Checkpoints bestehen den Guard-Test", () => {
    for (const cp of checkpoints) {
      expect(isProtocolWorkflowCheckpoint(cp)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildInitialInternalProtocolWorkflowSnapshot
// ─────────────────────────────────────────────────────────────────────────────

describe("buildInitialInternalProtocolWorkflowSnapshot", () => {
  let snapshot: InternalProtocolWorkflowSnapshot;

  beforeEach(() => {
    snapshot = buildInitialInternalProtocolWorkflowSnapshot();
  });

  it("hat processKind 'internal-protocol'", () => {
    expect(snapshot.processKind).toBe("internal-protocol");
  });

  it("hat topicId 'patienten-ohne-termin'", () => {
    expect(snapshot.topicId).toBe("patienten-ohne-termin");
  });

  it("besteht den Snapshot-Guard-Test", () => {
    expect(isInternalProtocolWorkflowSnapshot(snapshot)).toBe(true);
  });

  it("enthält 5 Checkpoints", () => {
    expect(snapshot.checkpoints).toHaveLength(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// countAnsweredQuestions / countUnansweredQuestions
// ─────────────────────────────────────────────────────────────────────────────

describe("countAnsweredQuestions", () => {
  it("zählt null-Antworten nicht", () => {
    const cp: ProtocolWorkflowCheckpoint = {
      id: "PC-C01", title: "", status: "OPEN",
      answers: { q1: null, q2: null },
    };
    expect(countAnsweredQuestions(cp)).toBe(0);
  });

  it("zählt nicht-leere Strings als beantwortet", () => {
    const cp: ProtocolWorkflowCheckpoint = {
      id: "PC-C01", title: "", status: "OPEN",
      answers: { q1: "YES", q2: null, q3: "Freitext" },
    };
    expect(countAnsweredQuestions(cp)).toBe(2);
  });

  it("zählt nicht-leere Arrays als beantwortet", () => {
    const cp: ProtocolWorkflowCheckpoint = {
      id: "PC-C01", title: "", status: "OPEN",
      answers: { q1: ["OPT-A"], q2: [] },
    };
    expect(countAnsweredQuestions(cp)).toBe(1);
  });

  it("zählt leere Strings nicht", () => {
    const cp: ProtocolWorkflowCheckpoint = {
      id: "PC-C01", title: "", status: "OPEN",
      answers: { q1: "" },
    };
    expect(countAnsweredQuestions(cp)).toBe(0);
  });
});

describe("countUnansweredQuestions", () => {
  it("gibt 0 zurück wenn alle beantwortet", () => {
    const cp: ProtocolWorkflowCheckpoint = {
      id: "PC-C01", title: "", status: "OPEN",
      answers: { q1: "YES", q2: ["OPT-A"] },
    };
    expect(countUnansweredQuestions(cp)).toBe(0);
  });

  it("gibt korrekte Anzahl unbeantworteter Fragen zurück", () => {
    const cp: ProtocolWorkflowCheckpoint = {
      id: "PC-C01", title: "", status: "OPEN",
      answers: { q1: null, q2: "YES", q3: null, q4: [] },
    };
    expect(countUnansweredQuestions(cp)).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integrations-Test: Adapter → ProtocolDocument
// ─────────────────────────────────────────────────────────────────────────────

describe("Integration: InternalProtocolWorkflowSnapshot → ProtocolDocument", () => {
  it("erzeugt ein vollständiges ProtocolDocument aus einem gespeicherten Snapshot", () => {
    // 1. Initialen Snapshot aufbauen
    const wfSnapshot = buildInitialInternalProtocolWorkflowSnapshot();
    const sections = getPatientWithoutAppointmentSections();

    // 2. Einige Antworten simulieren
    const firstCheckpoint = wfSnapshot.checkpoints[0];
    const firstQuestionId = Object.keys(firstCheckpoint.answers)[0];
    firstCheckpoint.answers[firstQuestionId] = "YES";

    // 3. ProtocolSnapshot aus IP-Snapshot extrahieren
    const ipSnapshot = createProtocolSnapshot(sections);
    for (const cp of wfSnapshot.checkpoints) {
      for (const [qId, answer] of Object.entries(cp.answers)) {
        if (answer !== null) {
          ipSnapshot.answers[qId] = Array.isArray(answer) ? [...answer] : answer;
        }
      }
    }

    // 4. ProtocolDocument erzeugen
    const doc = createProtocolDocument(ipSnapshot, "Patienten ohne Termin – Test");

    expect(doc.title).toBe("Patienten ohne Termin – Test");
    expect(doc.sections).toHaveLength(5);
    expect(doc.sections[0].id).toBe("PC-C01");

    // Die simulierte Antwort soll im Dokument erscheinen
    const firstSection = doc.sections[0];
    const answeredQuestion = firstSection.questions.find(
      (q) => q.id === firstQuestionId,
    );
    expect(answeredQuestion).toBeDefined();
    expect(answeredQuestion?.answer).toBe("YES");
  });

  it("hat keine Antworten wenn alle null", () => {
    const wfSnapshot = buildInitialInternalProtocolWorkflowSnapshot();
    const sections = getPatientWithoutAppointmentSections();
    const ipSnapshot = createProtocolSnapshot(sections);
    const doc = createProtocolDocument(ipSnapshot, "Test");

    let foundAnswer = false;
    for (const section of doc.sections) {
      for (const q of section.questions) {
        if (q.answer !== null && q.answer !== undefined) {
          foundAnswer = true;
        }
      }
    }
    expect(foundAnswer).toBe(false);
  });

  it("Snapshot besteht nach Änderungen weiterhin den Guard-Test", () => {
    const snapshot = buildInitialInternalProtocolWorkflowSnapshot();
    // Antworten setzen
    snapshot.checkpoints[0].answers[
      Object.keys(snapshot.checkpoints[0].answers)[0]
    ] = "YES";
    snapshot.checkpoints[0].status = "CONFIRMED";
    expect(isInternalProtocolWorkflowSnapshot(snapshot)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Kein Node-crypto-Import in snapshot.ts (browser-Kompatibilität)
// ─────────────────────────────────────────────────────────────────────────────

describe("snapshot.ts – kein Node-only-Import", () => {
  it("snapshot.ts enthält keinen 'import { randomUUID } from \"crypto\"'-Import", () => {
    const fs = require("fs") as { readFileSync: (p: string, e: string) => string };
    const path = require("path") as { join: (...args: string[]) => string };
    const src = fs.readFileSync(
      path.join(__dirname, "../lib/workflow/internalProtocol/snapshot.ts"),
      "utf-8",
    );
    // Kein direkter Node-crypto-Import erlaubt
    expect(src).not.toMatch(/from\s+['"]crypto['"]/);
    expect(src).not.toMatch(/from\s+['"]node:crypto['"]/);
    expect(src).not.toMatch(/require\(['"]crypto['"]\)/);
    expect(src).not.toMatch(/require\(['"]node:crypto['"]\)/);
  });

  it("globalThis.crypto.randomUUID ist in der Testumgebung verfügbar", () => {
    expect(typeof (globalThis as Record<string, unknown>).crypto).toBe("object");
    const webCrypto = (globalThis as Record<string, unknown>).crypto as {
      randomUUID?: () => string;
    };
    expect(typeof webCrypto.randomUUID).toBe("function");
  });

  it("createProtocolSnapshot erzeugt eine UUID-v4-protocolId ohne Node-Import", () => {
    const sections = getPatientWithoutAppointmentSections();
    const snap = createProtocolSnapshot(sections);
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(snap.protocolId).toMatch(uuidPattern);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stabile Metadaten: protocolId und createdAt bei Antwortänderungen
// ─────────────────────────────────────────────────────────────────────────────

describe("Stabile Snapshot-Metadaten über Antwortänderungen hinweg", () => {
  const sections = getPatientWithoutAppointmentSections();
  const STABLE_ID = "session-abc-123";
  const STABLE_TS = "2025-03-10T08:00:00.000Z";

  it("injizierte protocolId bleibt bei erneutem createProtocolSnapshot gleich", () => {
    const snap1 = createProtocolSnapshot(sections, { protocolId: STABLE_ID, createdAt: STABLE_TS });
    const snap2 = createProtocolSnapshot(sections, { protocolId: STABLE_ID, createdAt: STABLE_TS });
    expect(snap1.protocolId).toBe(STABLE_ID);
    expect(snap2.protocolId).toBe(STABLE_ID);
  });

  it("injiziertes createdAt bleibt bei erneutem createProtocolSnapshot gleich", () => {
    const snap1 = createProtocolSnapshot(sections, { protocolId: STABLE_ID, createdAt: STABLE_TS });
    const snap2 = createProtocolSnapshot(sections, { protocolId: STABLE_ID, createdAt: STABLE_TS });
    expect(snap1.createdAt).toBe(STABLE_TS);
    expect(snap2.createdAt).toBe(STABLE_TS);
  });

  it("Antworten in einen Snapshot einzutragen ändert protocolId nicht", () => {
    const snap = createProtocolSnapshot(sections, { protocolId: STABLE_ID, createdAt: STABLE_TS });
    const originalId = snap.protocolId;
    // Antworten simulieren
    const firstKey = Object.keys(snap.answers)[0];
    snap.answers[firstKey] = "YES";
    expect(snap.protocolId).toBe(originalId);
  });

  it("createProtocolDocument übernimmt protocolId und createdAt unverändert", () => {
    const snap = createProtocolSnapshot(sections, { protocolId: STABLE_ID, createdAt: STABLE_TS });
    snap.answers[Object.keys(snap.answers)[0]] = "YES";
    const doc = createProtocolDocument(snap, "Testiteldokument");
    expect(doc.protocolId).toBe(STABLE_ID);
    expect(doc.createdAt).toBe(STABLE_TS);
  });
});
