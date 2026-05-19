import {
  OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";
import { OFFICE_WRITE_TEMPLATES } from "@/lib/office/writeModules";
import {
  evaluateOfficeWriteModules,
  renderOfficeWriteTemplate,
} from "@/lib/office/writeRenderer";
import {
  OfficeCheckpointKind,
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function makeCheckpoint(
  id: string,
  state: OfficeCheckpointState,
): OfficeCheckpointSnapshot {
  return { id, title: id, kind: OfficeCheckpointKind.FACT, state };
}

/** Alle DS-Checkpoints auf YES; einzelne States via overrides überschreibbar. */
function makeDigitalSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "DS-01": OfficeCheckpointState.YES,
    "DS-02": OfficeCheckpointState.YES,
    "DS-03": OfficeCheckpointState.YES,
    "DS-04": OfficeCheckpointState.YES,
    "DS-05": OfficeCheckpointState.YES,
    "DS-06": OfficeCheckpointState.YES,
    "DS-07": OfficeCheckpointState.YES,
    "DS-08": OfficeCheckpointState.YES,
  };
  return Object.entries({ ...defaults, ...overrides } as Record<string, OfficeCheckpointState>).map(
    ([id, state]) => makeCheckpoint(id, state),
  );
}

function findModule(id: string) {
  return OFFICE_WRITE_TEMPLATES.find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// 1. Checkpoint-Katalog
// ---------------------------------------------------------------------------

describe("officeDigitalSystemChangeTopic – Checkpoint-Katalog", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthält genau die 8 DS-Checkpoints in der richtigen Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "DS-01",
      "DS-02",
      "DS-03",
      "DS-04",
      "DS-05",
      "DS-06",
      "DS-07",
      "DS-08",
    ]);
  });

  it("alle Referenzen (legalRefs, authorityKeys, evidenceKeys) sind in den Registries vorhanden", () => {
    for (const cp of catalog) {
      for (const ref of cp.legalRefs ?? []) expect(isLegalSourceId(ref)).toBe(true);
      for (const ref of cp.authorityKeys ?? []) expect(isAuthorityId(ref)).toBe(true);
      for (const ref of cp.requiredEvidenceKeys ?? []) expect(isEvidenceId(ref)).toBe(true);
      for (const ref of cp.optionalEvidenceKeys ?? []) expect(isEvidenceId(ref)).toBe(true);
    }
  });

  it("kein DS-Checkpoint hat legalRefs (bewusst nur operative Checkliste)", () => {
    for (const cp of catalog) {
      expect(cp.legalRefs ?? []).toHaveLength(0);
    }
  });

  it("kein DS-Checkpoint hat authorityKeys", () => {
    for (const cp of catalog) {
      expect(cp.authorityKeys ?? []).toHaveLength(0);
    }
  });

  it("DS-08 hat keine externen Referenzen (interner Go-live-Entscheid)", () => {
    const cp = byId.get("DS-08");
    expect(cp?.legalRefs ?? []).toHaveLength(0);
    expect(cp?.authorityKeys ?? []).toHaveLength(0);
    expect(cp?.requiredEvidenceKeys ?? []).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. WRITE-Modul-Katalog
// ---------------------------------------------------------------------------

describe("officeDigitalSystemChangeTopic – WRITE-Modul-Katalog", () => {
  const digitalTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds.includes(OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE),
  );

  it("enthält genau 3 Digital-System-Templates", () => {
    expect(digitalTemplates).toHaveLength(3);
  });

  it("enthält die erwarteten Template-IDs", () => {
    const ids = digitalTemplates.map((t) => t.id);
    expect(ids).toContain("digitale-umstellung-checkliste");
    expect(ids).toContain("digitale-umstellung-teaminfo");
    expect(ids).toContain("digitale-umstellung-patienteninfo");
  });

  it("alle Template-IDs sind global eindeutig", () => {
    const allIds = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("Digital-Templates sind nicht für andere Topics verfügbar", () => {
    const result = evaluateOfficeWriteModules({
      topicId: "meldepflichten-zustaendige-stellen",
      checkpoints: [],
    });
    for (const id of [
      "digitale-umstellung-checkliste",
      "digitale-umstellung-teaminfo",
      "digitale-umstellung-patienteninfo",
    ]) {
      const mod = result.find((m) => m.templateId === id);
      expect(mod?.isAvailable ?? false).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Trigger: digitale-umstellung-checkliste
// ---------------------------------------------------------------------------

describe("digitale-umstellung-checkliste – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeDigitalSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "digitale-umstellung-checkliste")!;
  }

  it("verfügbar wenn DS-01 YES und DS-03 OPEN", () => {
    const mod = evaluate({ "DS-03": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn DS-01 YES und DS-03 NO", () => {
    const mod = evaluate({ "DS-03": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn DS-01 YES und DS-05 OPEN", () => {
    const mod = evaluate({ "DS-05": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn DS-01 YES und DS-06 NO", () => {
    const mod = evaluate({ "DS-06": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn DS-01 OPEN (Systemumstellung noch nicht beschrieben)", () => {
    const mod = evaluate({ "DS-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("NICHT verfügbar für leeren Snapshot (allOf DS-01=YES nicht erfüllt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "digitale-umstellung-checkliste")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Trigger: digitale-umstellung-teaminfo
// ---------------------------------------------------------------------------

describe("digitale-umstellung-teaminfo – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeDigitalSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "digitale-umstellung-teaminfo")!;
  }

  it("verfügbar wenn DS-04 OPEN (Team noch nicht informiert)", () => {
    const mod = evaluate({ "DS-04": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn DS-04 NO", () => {
    const mod = evaluate({ "DS-04": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn DS-05 OPEN (Schulung noch nicht geplant)", () => {
    const mod = evaluate({ "DS-05": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn DS-05 NO", () => {
    const mod = evaluate({ "DS-05": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn DS-01 OPEN (Systemumstellung noch nicht beschrieben)", () => {
    const mod = evaluate({ "DS-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT für leeren Snapshot (DS-01 defensiv OPEN → geblockt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "digitale-umstellung-teaminfo")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Trigger: digitale-umstellung-patienteninfo
// ---------------------------------------------------------------------------

describe("digitale-umstellung-patienteninfo – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeDigitalSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "digitale-umstellung-patienteninfo")!;
  }

  it("verfügbar wenn DS-07 OPEN (Patientenkomm. noch nicht vorbereitet)", () => {
    const mod = evaluate({ "DS-07": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn DS-07 NO", () => {
    const mod = evaluate({ "DS-07": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn DS-01 OPEN", () => {
    const mod = evaluate({ "DS-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT für leeren Snapshot (DS-01 defensiv OPEN → geblockt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "digitale-umstellung-patienteninfo")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Render: digitale-umstellung-checkliste
// ---------------------------------------------------------------------------

describe("digitale-umstellung-checkliste – Render", () => {
  const template = findModule("digitale-umstellung-checkliste")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Testpraxis",
      system_name: "NeuesPVS 2.0",
      go_live_datum: "01.09.2026",
      offene_punkte: "Datenmigration abklären",
    });
    expect(result).toContain("Testpraxis");
    expect(result).toContain("NeuesPVS 2.0");
    expect(result).toContain("01.09.2026");
    expect(result).toContain("Datenmigration abklären");
  });

  it("optionales Feld verantwortliche_person wird eingebettet", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Testpraxis",
      system_name: "NeuesPVS 2.0",
      go_live_datum: "01.09.2026",
      offene_punkte: "Offen",
      verantwortliche_person: "Frau Muster",
    });
    expect(result).toContain("Frau Muster");
  });

  it("fehlendes optionales Feld verantwortliche_person erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Testpraxis",
      system_name: "NeuesPVS 2.0",
      go_live_datum: "01.09.2026",
      offene_punkte: "Offen",
    });
    expect(result).not.toContain("{{");
  });

  it("Checkliste enthält alle 8 Prüfpunkte (DS-01..DS-08)", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "X",
      system_name: "Y",
      go_live_datum: "01.01.2027",
      offene_punkte: "–",
    });
    expect(result).toContain("DS-01");
    expect(result).toContain("DS-08");
  });
});

// ---------------------------------------------------------------------------
// 7. Render: digitale-umstellung-teaminfo
// ---------------------------------------------------------------------------

describe("digitale-umstellung-teaminfo – Render", () => {
  const template = findModule("digitale-umstellung-teaminfo")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Testpraxis",
      system_name: "NeuesPVS 2.0",
      lernziele: "Grundbedienung, Terminplanung",
    });
    expect(result).toContain("Testpraxis");
    expect(result).toContain("NeuesPVS 2.0");
    expect(result).toContain("Grundbedienung, Terminplanung");
  });

  it("optionale Felder schulungsdatum und schulungsort werden eingebettet", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Testpraxis",
      system_name: "NeuesPVS 2.0",
      lernziele: "Grundbedienung",
      schulungsdatum: "15.08.2026",
      schulungsort: "Besprechungsraum 1",
    });
    expect(result).toContain("15.08.2026");
    expect(result).toContain("Besprechungsraum 1");
  });

  it("fehlende optionale Felder erzeugen keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Testpraxis",
      system_name: "NeuesPVS 2.0",
      lernziele: "Grundbedienung",
    });
    expect(result).not.toContain("{{");
  });
});

// ---------------------------------------------------------------------------
// 8. Render: digitale-umstellung-patienteninfo
// ---------------------------------------------------------------------------

describe("digitale-umstellung-patienteninfo – Render", () => {
  const template = findModule("digitale-umstellung-patienteninfo")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Testpraxis",
      system_name: "NeuesPVS 2.0",
      gueltig_ab: "01.09.2026",
      betroffene_ablaeufe: "Online-Terminbuchung ab sofort unter neuem Link erreichbar.",
    });
    expect(result).toContain("Testpraxis");
    expect(result).toContain("NeuesPVS 2.0");
    expect(result).toContain("01.09.2026");
    expect(result).toContain("Online-Terminbuchung");
  });

  it("optionaler Block ansprechpartner wird eingebettet", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Testpraxis",
      system_name: "NeuesPVS 2.0",
      gueltig_ab: "01.09.2026",
      betroffene_ablaeufe: "Änderung",
      ansprechpartner: "Empfang",
    });
    expect(result).toContain("Empfang");
  });

  it("optionaler Block hinweis wird eingebettet", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Testpraxis",
      system_name: "NeuesPVS 2.0",
      gueltig_ab: "01.09.2026",
      betroffene_ablaeufe: "Änderung",
      hinweis: "Bitte bei Fragen direkt melden.",
    });
    expect(result).toContain("Bitte bei Fragen direkt melden.");
  });

  it("fehlende optionale Felder erzeugen keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Testpraxis",
      system_name: "NeuesPVS 2.0",
      gueltig_ab: "01.09.2026",
      betroffene_ablaeufe: "Änderung",
    });
    expect(result).not.toContain("{{");
  });

  it("enthält Disclaimer gegen DSGVO-Rechtscharakter", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      system_name: "S",
      gueltig_ab: "01.01.2027",
      betroffene_ablaeufe: "X",
    });
    expect(result).toContain("DSGVO");
  });
});

// ---------------------------------------------------------------------------
// 9. Compliance: Keine verbotenen Begriffe in DS-Templates
// ---------------------------------------------------------------------------

describe("officeDigitalSystemChangeTopic – Compliance", () => {
  const digitalTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds.includes(OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE),
  );

  const FORBIDDEN_TERMS = [
    "§",
    "rechtssicher",
    "Anbieterempfehlung",
    "KV-Pflicht",
    "TI-Pflicht",
    "Mindestlohn",
    "Kurzarbeit",
    "Vertragsänderung",
    "Rechtsberatung",
    "Gehaltsberatung",
  ];

  for (const term of FORBIDDEN_TERMS) {
    it(`kein DS-Template enthält den verbotenen Begriff "${term}"`, () => {
      for (const t of digitalTemplates) {
        const fullText = [
          t.bodyTemplate,
          ...t.inputSchema.map((f) => f.label),
        ].join("\n");
        expect(fullText).not.toContain(term);
      }
    });
  }

  it("kein DS-Checkpoint hat legalRefs (Compliance-Doppelcheck)", () => {
    const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE);
    for (const cp of catalog) {
      expect(cp.legalRefs ?? []).toHaveLength(0);
    }
  });
});
