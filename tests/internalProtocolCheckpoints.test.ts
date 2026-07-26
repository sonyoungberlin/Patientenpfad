/**
 * Tests für lib/workflow/internalProtocol/checkpoints.ts
 * und die Type Guards aus lib/workflow/internalProtocol/types.ts
 */

import {
  getInternalProtocolCheckpoints,
  buildInitialProtocolCheckpoints,
} from "@/lib/workflow/internalProtocol/checkpoints";

import {
  isInternalProtocolStatus,
  isInternalProtocolAnswerValue,
  isValidInternalProtocolSnapshot,
  type InternalProtocolSnapshot,
} from "@/lib/workflow/internalProtocol/types";

const PILOT_ID = "patienten-ohne-termin" as const;

// ---------------------------------------------------------------------------
// getInternalProtocolCheckpoints
// ---------------------------------------------------------------------------

describe("getInternalProtocolCheckpoints", () => {
  it("gibt exakt fünf Checkpoints zurück", () => {
    expect(getInternalProtocolCheckpoints(PILOT_ID)).toHaveLength(5);
  });

  it("Checkpoint-IDs sind in korrekter Reihenfolge", () => {
    const ids = getInternalProtocolCheckpoints(PILOT_ID).map((c) => c.id);
    expect(ids).toEqual([
      "PC-C01",
      "PC-C02",
      "PC-C03",
      "PC-C04",
      "PC-C05",
    ]);
  });

  it("Checkpoint-Titel sind vorhanden und nicht leer", () => {
    const checkpoints = getInternalProtocolCheckpoints(PILOT_ID);
    for (const cp of checkpoints) {
      expect(typeof cp.title).toBe("string");
      expect(cp.title.length).toBeGreaterThan(0);
    }
  });

  it("gibt eine defensive Kopie zurück – Mutation verändert den Katalog nicht", () => {
    const first = getInternalProtocolCheckpoints(PILOT_ID);
    first.splice(0, first.length);
    expect(getInternalProtocolCheckpoints(PILOT_ID)).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// buildInitialProtocolCheckpoints
// ---------------------------------------------------------------------------

describe("buildInitialProtocolCheckpoints", () => {
  it("gibt exakt fünf Snapshot-Objekte zurück", () => {
    expect(buildInitialProtocolCheckpoints(PILOT_ID)).toHaveLength(5);
  });

  it("alle Checkpoints starten mit status OPEN", () => {
    const snapshots = buildInitialProtocolCheckpoints(PILOT_ID);
    for (const cp of snapshots) {
      expect(cp.status).toBe("OPEN");
    }
  });

  it("m2_answers ist initial nicht gesetzt", () => {
    const snapshots = buildInitialProtocolCheckpoints(PILOT_ID);
    for (const cp of snapshots) {
      expect(cp.m2_answers).toBeUndefined();
    }
  });

  it("decision_text ist initial nicht gesetzt", () => {
    const snapshots = buildInitialProtocolCheckpoints(PILOT_ID);
    for (const cp of snapshots) {
      expect(cp.decision_text).toBeUndefined();
    }
  });

  it("IDs stimmen mit den Checkpoint-Definitionen überein", () => {
    const snapshots = buildInitialProtocolCheckpoints(PILOT_ID);
    const ids = snapshots.map((s) => s.id);
    expect(ids).toEqual(["PC-C01", "PC-C02", "PC-C03", "PC-C04", "PC-C05"]);
  });

  it("mehrere Aufrufe liefern voneinander unabhängige Arrays", () => {
    const a = buildInitialProtocolCheckpoints(PILOT_ID);
    const b = buildInitialProtocolCheckpoints(PILOT_ID);
    expect(a).not.toBe(b);
  });

  it("mehrere Aufrufe liefern voneinander unabhängige Objekte", () => {
    const a = buildInitialProtocolCheckpoints(PILOT_ID);
    const b = buildInitialProtocolCheckpoints(PILOT_ID);
    a[0].status = "CONFIRMED";
    expect(b[0].status).toBe("OPEN");
  });
});

// ---------------------------------------------------------------------------
// isInternalProtocolStatus
// ---------------------------------------------------------------------------

describe("isInternalProtocolStatus", () => {
  it.each(["CONFIRMED", "PROVISIONAL", "OPEN", "NOT_APPLICABLE"])(
    "akzeptiert '%s'",
    (value) => {
      expect(isInternalProtocolStatus(value)).toBe(true);
    },
  );

  it("lehnt bestehende klinische Statuswerte ab", () => {
    expect(isInternalProtocolStatus("ERKENNBAR")).toBe(false);
    expect(isInternalProtocolStatus("NICHT_ERFASST")).toBe(false);
    expect(isInternalProtocolStatus("UNKLAR")).toBe(false);
  });

  it.each([null, undefined, "", "OK", "TO_DO", "ZURÜCKSTELLEN", 42])(
    "lehnt '%s' ab",
    (value) => {
      expect(isInternalProtocolStatus(value)).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// isInternalProtocolAnswerValue
// ---------------------------------------------------------------------------

describe("isInternalProtocolAnswerValue", () => {
  it.each(["YES", "NO", "CONDITIONAL", "UNCLEAR", "NOT_RELEVANT"])(
    "akzeptiert '%s'",
    (value) => {
      expect(isInternalProtocolAnswerValue(value)).toBe(true);
    },
  );

  it.each([null, undefined, "", "ja", "nein", "OFFEN", 0])(
    "lehnt '%s' ab",
    (value) => {
      expect(isInternalProtocolAnswerValue(value)).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// isValidInternalProtocolSnapshot
// ---------------------------------------------------------------------------

function makeValidSnapshot(
  overrides: Partial<InternalProtocolSnapshot> = {},
): InternalProtocolSnapshot {
  return {
    processKind: "internal-protocol",
    topicId: "patienten-ohne-termin",
    protocolCheckpoints: [
      { id: "PC-C01", title: "Geltungsbereich", status: "OPEN" },
    ],
    ...overrides,
  };
}

describe("isValidInternalProtocolSnapshot", () => {
  it("akzeptiert einen vollständig gültigen Snapshot", () => {
    expect(isValidInternalProtocolSnapshot(makeValidSnapshot())).toBe(true);
  });

  it("akzeptiert Snapshot mit optionaler sessionNote", () => {
    expect(
      isValidInternalProtocolSnapshot(
        makeValidSnapshot({ sessionNote: "Teambesprechung 26.07.2026" }),
      ),
    ).toBe(true);
  });

  it("akzeptiert Snapshot mit m2_answers im Checkpoint", () => {
    const snap = makeValidSnapshot({
      protocolCheckpoints: [
        {
          id: "PC-C01",
          title: "Geltungsbereich",
          status: "CONFIRMED",
          m2_answers: { "Q-01": "YES", "Q-02": "CONDITIONAL" },
        },
      ],
    });
    expect(isValidInternalProtocolSnapshot(snap)).toBe(true);
  });

  it("akzeptiert Snapshot mit decision_text im Checkpoint", () => {
    const snap = makeValidSnapshot({
      protocolCheckpoints: [
        {
          id: "PC-C01",
          title: "Geltungsbereich",
          status: "PROVISIONAL",
          decision_text: "Gilt für alle regulären Praxistage.",
        },
      ],
    });
    expect(isValidInternalProtocolSnapshot(snap)).toBe(true);
  });

  it("akzeptiert leeres protocolCheckpoints-Array", () => {
    expect(
      isValidInternalProtocolSnapshot(
        makeValidSnapshot({ protocolCheckpoints: [] }),
      ),
    ).toBe(true);
  });

  it("lehnt null ab", () => {
    expect(isValidInternalProtocolSnapshot(null)).toBe(false);
  });

  it("lehnt Array ab", () => {
    expect(isValidInternalProtocolSnapshot([])).toBe(false);
  });

  it("lehnt String ab", () => {
    expect(isValidInternalProtocolSnapshot("internal-protocol")).toBe(false);
  });

  it("lehnt falschen processKind ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        processKind: "clinical-workflow",
        topicId: "patienten-ohne-termin",
        protocolCheckpoints: [],
      }),
    ).toBe(false);
  });

  it("lehnt fehlenden processKind ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        topicId: "patienten-ohne-termin",
        protocolCheckpoints: [],
      }),
    ).toBe(false);
  });

  it("lehnt unbekannte topicId ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        processKind: "internal-protocol",
        topicId: "au-musterprozess",
        protocolCheckpoints: [],
      }),
    ).toBe(false);
  });

  it("lehnt fehlendes protocolCheckpoints-Feld ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        processKind: "internal-protocol",
        topicId: "patienten-ohne-termin",
      }),
    ).toBe(false);
  });

  it("lehnt protocolCheckpoints als Nicht-Array ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        processKind: "internal-protocol",
        topicId: "patienten-ohne-termin",
        protocolCheckpoints: "nicht-array",
      }),
    ).toBe(false);
  });

  it("lehnt Checkpoint ohne id ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        processKind: "internal-protocol",
        topicId: "patienten-ohne-termin",
        protocolCheckpoints: [{ title: "Test", status: "OPEN" }],
      }),
    ).toBe(false);
  });

  it("lehnt Checkpoint mit leerem id ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        processKind: "internal-protocol",
        topicId: "patienten-ohne-termin",
        protocolCheckpoints: [{ id: "", title: "Test", status: "OPEN" }],
      }),
    ).toBe(false);
  });

  it("lehnt Checkpoint ohne title ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        processKind: "internal-protocol",
        topicId: "patienten-ohne-termin",
        protocolCheckpoints: [{ id: "PC-C01", status: "OPEN" }],
      }),
    ).toBe(false);
  });

  it("lehnt Checkpoint mit ungültigem status ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        processKind: "internal-protocol",
        topicId: "patienten-ohne-termin",
        protocolCheckpoints: [
          { id: "PC-C01", title: "Test", status: "ERKENNBAR" },
        ],
      }),
    ).toBe(false);
  });

  it("lehnt Checkpoint mit ungültigem Antwortwert in m2_answers ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        processKind: "internal-protocol",
        topicId: "patienten-ohne-termin",
        protocolCheckpoints: [
          {
            id: "PC-C01",
            title: "Test",
            status: "OPEN",
            m2_answers: { "Q-01": "UNGUELTIG" },
          },
        ],
      }),
    ).toBe(false);
  });

  it("lehnt Checkpoint mit decision_text als Nicht-String ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        processKind: "internal-protocol",
        topicId: "patienten-ohne-termin",
        protocolCheckpoints: [
          {
            id: "PC-C01",
            title: "Test",
            status: "OPEN",
            decision_text: 42,
          },
        ],
      }),
    ).toBe(false);
  });

  it("lehnt sessionNote als Nicht-String ab", () => {
    expect(
      isValidInternalProtocolSnapshot({
        processKind: "internal-protocol",
        topicId: "patienten-ohne-termin",
        protocolCheckpoints: [],
        sessionNote: 99,
      }),
    ).toBe(false);
  });
});
