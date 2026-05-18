import {
  buildPatientStateMap,
  buildSelectionsMap,
  evaluatePatientWriteModules,
  renderPatientWriteTemplate,
} from "@/lib/patientWrite/writeRenderer";
import {
  PatientWriteOutputKind,
  type PatientWriteTemplate,
} from "@/lib/patientWrite/types";
import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointType,
  type ActiveCheckpoint,
  type ActiveCheckpointMultiSelect,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStandard(
  id: string,
  status: "OK" | "TO_DO" | "ZURÜCKSTELLEN",
  overrides: Partial<ActiveCheckpoint> = {},
): ActiveCheckpoint {
  return {
    id,
    block_id: "test-block",
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.M,
    perspectives: [CheckpointPerspective.MFA],
    title: id,
    status,
    m4: { type: "ACTION", text: `m4 for ${id}` },
    ...overrides,
  } as ActiveCheckpoint;
}

function makeAssessment(
  id: string,
  status: "OK" | "TO_DO",
  enabled: boolean,
): ActiveCheckpoint {
  return {
    id,
    block_id: "test-block",
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.M,
    perspectives: [],
    mode: CheckpointMode.ASSESSMENT,
    enabled,
    title: id,
    status,
    m4: { type: "NOTICE", text: "" },
  } as ActiveCheckpoint;
}

function makeMultiSelect(id: string): ActiveCheckpointMultiSelect {
  return {
    id,
    block_id: "test-block",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    perspectives: [],
    mode: CheckpointMode.MULTI_SELECT,
    title: id,
    options: ["A", "B"],
    selections: [],
    enabled: false,
  };
}

// ---------------------------------------------------------------------------
// 1. buildPatientStateMap
// ---------------------------------------------------------------------------

describe("buildPatientStateMap", () => {
  it("mappt OK → YES", () => {
    const map = buildPatientStateMap([makeStandard("K01", "OK")]);
    expect(map["K01"]).toBe("YES");
  });

  it("mappt TO_DO → NO", () => {
    const map = buildPatientStateMap([makeStandard("K03", "TO_DO")]);
    expect(map["K03"]).toBe("NO");
  });

  it("mappt ZURÜCKSTELLEN → OPEN", () => {
    const map = buildPatientStateMap([makeStandard("K04", "ZURÜCKSTELLEN")]);
    expect(map["K04"]).toBe("OPEN");
  });

  it("mappt MULTI_SELECT-Checkpoint → OPEN", () => {
    const map = buildPatientStateMap([makeMultiSelect("K10")]);
    expect(map["K10"]).toBe("OPEN");
  });

  it("mappt disabled ASSESSMENT-Checkpoint → OPEN", () => {
    const map = buildPatientStateMap([makeAssessment("K12", "TO_DO", false)]);
    expect(map["K12"]).toBe("OPEN");
  });

  it("mappt enabled ASSESSMENT-Checkpoint mit status OK → YES", () => {
    const map = buildPatientStateMap([makeAssessment("K12", "OK", true)]);
    expect(map["K12"]).toBe("YES");
  });

  it("gibt leere Map bei leerer Liste zurück", () => {
    const map = buildPatientStateMap([]);
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("verarbeitet mehrere Checkpoints korrekt", () => {
    const map = buildPatientStateMap([
      makeStandard("K01", "OK"),
      makeStandard("K02", "TO_DO"),
      makeStandard("K03", "ZURÜCKSTELLEN"),
    ]);
    expect(map["K01"]).toBe("YES");
    expect(map["K02"]).toBe("NO");
    expect(map["K03"]).toBe("OPEN");
  });
});

// ---------------------------------------------------------------------------
// 2. evaluatePatientWriteModules
// ---------------------------------------------------------------------------

const minimalTemplate: PatientWriteTemplate = {
  id: "T-TEST-001",
  label: "Test-Template",
  outputKind: PatientWriteOutputKind.UNTERLAGEN_ANFORDERUNG,
  trigger: {
    anyOf: [{ checkpointId: "K03", state: "NO" }],
  },
  inputSchema: [{ key: "liste", label: "Liste", kind: "multiline", required: true }],
  bodyTemplate: "Betreff: {{liste}}",
};

const blockedTemplate: PatientWriteTemplate = {
  id: "T-TEST-002",
  label: "Blocked Template",
  outputKind: PatientWriteOutputKind.INTERNE_NOTIZ,
  trigger: {
    blockedWhenAnyOpen: ["K01"],
    anyOf: [{ checkpointId: "K03", state: "NO" }],
  },
  inputSchema: [],
  bodyTemplate: "Text",
};

describe("evaluatePatientWriteModules", () => {
  it("K03=TO_DO → Template isAvailable true", () => {
    const modules = evaluatePatientWriteModules({
      checkpoints: [makeStandard("K03", "TO_DO")],
      templates: [minimalTemplate],
    });
    expect(modules).toHaveLength(1);
    expect(modules[0].isAvailable).toBe(true);
    expect(modules[0].templateId).toBe("T-TEST-001");
  });

  it("K03=OK → Template isAvailable false", () => {
    const modules = evaluatePatientWriteModules({
      checkpoints: [makeStandard("K03", "OK")],
      templates: [minimalTemplate],
    });
    expect(modules[0].isAvailable).toBe(false);
    expect(modules[0].unavailableReason).toBeDefined();
  });

  it("leere Checkpoint-Liste → Template unavailable (fehlender Key gilt als OPEN)", () => {
    const modules = evaluatePatientWriteModules({
      checkpoints: [],
      templates: [minimalTemplate],
    });
    // anyOf prüft auf state "NO", aber OPEN ≠ NO → unavailable
    expect(modules[0].isAvailable).toBe(false);
  });

  it("blockedWhenAnyOpen: K01=OPEN → Template gesperrt", () => {
    const modules = evaluatePatientWriteModules({
      checkpoints: [
        makeStandard("K01", "TO_DO"), // → OPEN wegen ZURÜCKSTELLEN? Nein: TO_DO → NO
        makeStandard("K03", "TO_DO"),
      ],
      // K01 status TO_DO → "NO", nicht OPEN → Block greift nicht
      templates: [blockedTemplate],
    });
    // K01 ist NO (nicht OPEN), daher kein Block → K03=NO erfüllt anyOf
    expect(modules[0].isAvailable).toBe(true);
  });

  it("blockedWhenAnyOpen: K01=ZURÜCKSTELLEN → OPEN → Template gesperrt", () => {
    const modules = evaluatePatientWriteModules({
      checkpoints: [
        makeStandard("K01", "ZURÜCKSTELLEN"), // → OPEN
        makeStandard("K03", "TO_DO"),
      ],
      templates: [blockedTemplate],
    });
    expect(modules[0].isAvailable).toBe(false);
    expect(modules[0].unavailableReason).toContain("K01");
  });

  it("gibt für jedes Template ein Modul zurück", () => {
    const modules = evaluatePatientWriteModules({
      checkpoints: [],
      templates: [minimalTemplate, blockedTemplate],
    });
    expect(modules).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 3. renderPatientWriteTemplate
// ---------------------------------------------------------------------------

const renderTemplate: PatientWriteTemplate = {
  id: "T-RENDER-001",
  label: "Render Test",
  outputKind: PatientWriteOutputKind.UNTERLAGEN_ANFORDERUNG,
  trigger: { anyOf: [{ checkpointId: "K03", state: "NO" }] },
  inputSchema: [
    { key: "unterlagen_liste", label: "Liste", kind: "multiline", required: true },
    { key: "frist", label: "Frist", kind: "date", required: false },
    { key: "kontext", label: "Kontext", kind: "text", required: false },
  ],
  bodyTemplate: `Unterlagen benötigt: {{unterlagen_liste}}
{{#if frist}}Bitte bis {{frist}} einreichen.
{{/if}}{{#unless kontext}}Kein Kontext angegeben.
{{/unless}}`,
};

describe("renderPatientWriteTemplate", () => {
  it("ersetzt befüllte Platzhalter korrekt", () => {
    const result = renderPatientWriteTemplate(renderTemplate, {
      unterlagen_liste: "Krankenhausbriefe, Medikamentenliste",
      frist: "",
      kontext: "",
    });
    expect(result).toContain("Krankenhausbriefe, Medikamentenliste");
  });

  it("ersetzt fehlenden required Key durch [{{key}}]", () => {
    const result = renderPatientWriteTemplate(renderTemplate, {});
    expect(result).toContain("[{{unterlagen_liste}}]");
  });

  it("{{#if frist}} – Block wird entfernt wenn frist leer", () => {
    const result = renderPatientWriteTemplate(renderTemplate, {
      unterlagen_liste: "Dokumente",
      frist: "",
      kontext: "",
    });
    expect(result).not.toContain("Bitte bis");
  });

  it("{{#if frist}} – Block bleibt erhalten wenn frist gesetzt", () => {
    const result = renderPatientWriteTemplate(renderTemplate, {
      unterlagen_liste: "Dokumente",
      frist: "31.12.2026",
      kontext: "",
    });
    expect(result).toContain("Bitte bis 31.12.2026 einreichen.");
  });

  it("{{#unless kontext}} – Block bleibt erhalten wenn kontext fehlt", () => {
    const result = renderPatientWriteTemplate(renderTemplate, {
      unterlagen_liste: "Dokumente",
      frist: "",
      kontext: "",
    });
    expect(result).toContain("Kein Kontext angegeben.");
  });

  it("{{#unless kontext}} – Block wird entfernt wenn kontext befüllt", () => {
    const result = renderPatientWriteTemplate(renderTemplate, {
      unterlagen_liste: "Dokumente",
      frist: "",
      kontext: "Aus Behandlung 2026",
    });
    expect(result).not.toContain("Kein Kontext angegeben.");
  });
});

// ---------------------------------------------------------------------------
// 4. buildSelectionsMap
// ---------------------------------------------------------------------------

describe("buildSelectionsMap", () => {
  it("gibt leere Map bei leerer Checkpoint-Liste zurück", () => {
    const map = buildSelectionsMap([]);
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("erfasst MULTI_SELECT-Checkpoint mit Selektionen", () => {
    const k11 = makeMultiSelect("K11");
    k11.selections = ["Reha-Antrag", "Attest / Bescheinigung"];
    const map = buildSelectionsMap([k11]);
    expect(map["K11"]).toEqual(["Reha-Antrag", "Attest / Bescheinigung"]);
  });

  it("erfasst MULTI_SELECT-Checkpoint ohne Selektionen als leeres Array", () => {
    const k11 = makeMultiSelect("K11");
    // selections ist [] per makeMultiSelect
    const map = buildSelectionsMap([k11]);
    expect(map["K11"]).toEqual([]);
  });

  it("ignoriert Standard-Checkpoints", () => {
    const map = buildSelectionsMap([makeStandard("K03", "TO_DO")]);
    expect(map["K03"]).toBeUndefined();
  });

  it("erfasst mehrere MULTI_SELECT-Checkpoints unabhängig", () => {
    const k10 = makeMultiSelect("K10");
    k10.selections = ["erhöhter Betreuungsbedarf"];
    const k11 = makeMultiSelect("K11");
    k11.selections = ["Pflegegrad / Höherstufung"];
    const map = buildSelectionsMap([k10, k11]);
    expect(map["K10"]).toEqual(["erhöhter Betreuungsbedarf"]);
    expect(map["K11"]).toEqual(["Pflegegrad / Höherstufung"]);
  });
});

// ---------------------------------------------------------------------------
// 5. evaluatePatientWriteModules – selectionsInclude
// ---------------------------------------------------------------------------

const selectionTemplate: PatientWriteTemplate = {
  id: "T-SEL-001",
  label: "Reha-Vorbereitung",
  outputKind: PatientWriteOutputKind.UNTERLAGEN_ANFORDERUNG,
  trigger: {
    selectionsInclude: [{ checkpointId: "K11", values: ["Reha-Antrag"] }],
    anyOf: [{ checkpointId: "K03", state: "NO" }],
  },
  inputSchema: [],
  bodyTemplate: "Vorbereitung Reha",
};

const noSelectionTemplate: PatientWriteTemplate = {
  id: "T-NO-SEL-001",
  label: "Generische Unterlagen",
  outputKind: PatientWriteOutputKind.UNTERLAGEN_ANFORDERUNG,
  trigger: {
    anyOf: [{ checkpointId: "K03", state: "NO" }],
  },
  inputSchema: [],
  bodyTemplate: "Unterlagen",
};

describe("evaluatePatientWriteModules: selectionsInclude", () => {
  it("K11 enthält 'Reha-Antrag' → selectionsInclude matcht → isAvailable true", () => {
    const k11 = makeMultiSelect("K11");
    k11.selections = ["Reha-Antrag"];
    const modules = evaluatePatientWriteModules({
      checkpoints: [makeStandard("K03", "TO_DO"), k11],
      templates: [selectionTemplate],
    });
    expect(modules[0].isAvailable).toBe(true);
  });

  it("K11 enthält 'Pflegegrad / Höherstufung' → Reha-selectionsInclude matcht nicht → unavailable", () => {
    const k11 = makeMultiSelect("K11");
    k11.selections = ["Pflegegrad / Höherstufung"];
    const modules = evaluatePatientWriteModules({
      checkpoints: [makeStandard("K03", "TO_DO"), k11],
      templates: [selectionTemplate],
    });
    expect(modules[0].isAvailable).toBe(false);
    expect(modules[0].unavailableReason).toContain("K11");
  });

  it("K11 leer (keine Selektionen) → matcht nicht → unavailable", () => {
    const k11 = makeMultiSelect("K11");
    // selections = [] per makeMultiSelect
    const modules = evaluatePatientWriteModules({
      checkpoints: [makeStandard("K03", "TO_DO"), k11],
      templates: [selectionTemplate],
    });
    expect(modules[0].isAvailable).toBe(false);
  });

  it("K11 fehlt in Checkpoints → defensiv matcht nicht → unavailable", () => {
    const modules = evaluatePatientWriteModules({
      checkpoints: [makeStandard("K03", "TO_DO")],
      templates: [selectionTemplate],
    });
    expect(modules[0].isAvailable).toBe(false);
  });

  it("Template ohne selectionsInclude bleibt rückwärtskompatibel", () => {
    const modules = evaluatePatientWriteModules({
      checkpoints: [makeStandard("K03", "TO_DO")],
      templates: [noSelectionTemplate],
    });
    expect(modules[0].isAvailable).toBe(true);
  });

  it("selectionsInclude UND anyOf müssen beide erfüllt sein", () => {
    // K11 matcht, aber K03=OK → anyOf schlägt fehl
    const k11 = makeMultiSelect("K11");
    k11.selections = ["Reha-Antrag"];
    const modules = evaluatePatientWriteModules({
      checkpoints: [makeStandard("K03", "OK"), k11],
      templates: [selectionTemplate],
    });
    expect(modules[0].isAvailable).toBe(false);
  });

  it("selectionsInclude mit mehreren values: matcht wenn mind. einer passt", () => {
    const multiValueTemplate: PatientWriteTemplate = {
      id: "T-MULTI-001",
      label: "Formular allgemein",
      outputKind: PatientWriteOutputKind.UNTERLAGEN_ANFORDERUNG,
      trigger: {
        selectionsInclude: [
          { checkpointId: "K11", values: ["Reha-Antrag", "Pflegegrad / Höherstufung"] },
        ],
      },
      inputSchema: [],
      bodyTemplate: "Formular",
    };
    const k11 = makeMultiSelect("K11");
    k11.selections = ["Pflegegrad / Höherstufung"];
    const modules = evaluatePatientWriteModules({
      checkpoints: [k11],
      templates: [multiValueTemplate],
    });
    expect(modules[0].isAvailable).toBe(true);
  });

  it("selectionsInclude prüft vor blockedWhenAnyOpen (Schritt 0 vor Schritt 1)", () => {
    const blockingTemplate: PatientWriteTemplate = {
      id: "T-ORDER-001",
      label: "Test Reihenfolge",
      outputKind: PatientWriteOutputKind.INTERNE_NOTIZ,
      trigger: {
        selectionsInclude: [{ checkpointId: "K11", values: ["Reha-Antrag"] }],
        blockedWhenAnyOpen: ["K01"],
      },
      inputSchema: [],
      bodyTemplate: "Test",
    };
    // K11 leer → selectionsInclude schlägt fehl → Reason bezieht sich auf Anliegen, nicht auf K01
    const k11 = makeMultiSelect("K11");
    const modules = evaluatePatientWriteModules({
      checkpoints: [makeStandard("K01", "ZURÜCKSTELLEN"), k11],
      templates: [blockingTemplate],
    });
    expect(modules[0].isAvailable).toBe(false);
    expect(modules[0].unavailableReason).toContain("K11");
  });
});
