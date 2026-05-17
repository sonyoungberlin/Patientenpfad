import {
  OFFICE_WRITE_TEMPLATES,
  OfficeWriteOutputKind,
  OfficeWriteKind,
} from "@/lib/office/writeModules";
import {
  evaluateOfficeWriteModules,
  renderOfficeWriteTemplate,
} from "@/lib/office/writeRenderer";
import { OFFICE_TOPIC_REGRESS } from "@/lib/office/checkpointCatalog";
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

/** Alle RG-Checkpoints auf YES – einzelne States via overrides überschreibbar. */
function makeRegressSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "RG-01": OfficeCheckpointState.YES,
    "RG-02": OfficeCheckpointState.YES,
    "RG-03": OfficeCheckpointState.YES,
    "RG-04": OfficeCheckpointState.YES,
    "RG-05": OfficeCheckpointState.YES,
    "RG-06": OfficeCheckpointState.YES,
    "RG-07": OfficeCheckpointState.YES,
  };
  return Object.entries({ ...defaults, ...overrides } as Record<string, OfficeCheckpointState>).map(([id, state]) =>
    makeCheckpoint(id, state),
  );
}

// ---------------------------------------------------------------------------
// 1. Katalogsanität
// ---------------------------------------------------------------------------

describe("OFFICE_WRITE_TEMPLATES: Katalogsanität", () => {
  it("alle Template-IDs sind eindeutig", () => {
    const ids = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("kein Template-ID enthält den Substring 'action' (case-insensitive)", () => {
    for (const t of OFFICE_WRITE_TEMPLATES) {
      expect(t.id.toLowerCase()).not.toContain("action");
    }
  });

  it("kein OfficeWriteOutputKind-Wert enthält 'action' (case-insensitive)", () => {
    for (const value of Object.values(OfficeWriteOutputKind)) {
      expect(value.toLowerCase()).not.toContain("action");
    }
  });

  it("kein OfficeWriteKind-Wert enthält 'action' (case-insensitive)", () => {
    for (const value of Object.values(OfficeWriteKind)) {
      expect(value.toLowerCase()).not.toContain("action");
    }
  });

  it("alle drei Regress-Templates sind im Katalog enthalten", () => {
    const ids = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("regress-stellungnahme");
    expect(ids).toContain("regress-arztgespraech-vorbereiten");
    expect(ids).toContain("regress-unterlagen-nachfordern");
  });

  it("alle Regress-Templates haben topicIds = [OFFICE_TOPIC_REGRESS]", () => {
    const regressTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
      t.trigger.topicIds.includes(OFFICE_TOPIC_REGRESS),
    );
    expect(regressTemplates).toHaveLength(3);
    for (const t of regressTemplates) {
      expect(t.trigger.topicIds).toEqual([OFFICE_TOPIC_REGRESS]);
    }
  });

  it("jedes Template hat ein nicht-leeres bodyTemplate", () => {
    for (const t of OFFICE_WRITE_TEMPLATES) {
      expect(t.bodyTemplate.trim().length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Topic-Filter
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: Topic-Filter", () => {
  const REGRESS_IDS = [
    "regress-stellungnahme",
    "regress-arztgespraech-vorbereiten",
    "regress-unterlagen-nachfordern",
  ] as const;

  it("Regress-Templates sind nicht verfügbar für fremdes Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: "arzt-anstellen-nachbesetzung",
      checkpoints: makeRegressSnapshot(),
    });
    for (const id of REGRESS_IDS) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });

  it("alle nicht verfügbaren Module für fremdes Topic haben unavailableReason", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: "arzt-anstellen-nachbesetzung",
      checkpoints: makeRegressSnapshot(),
    });
    for (const m of modules.filter((m) => !m.isAvailable)) {
      expect(typeof m.unavailableReason).toBe("string");
      expect(m.unavailableReason!.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. regress-stellungnahme: allOf + blockedWhenAnyOpen
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: regress-stellungnahme", () => {
  it("sichtbar wenn RG-01 und RG-02 YES (alle anderen auch YES)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "regress-stellungnahme");
    expect(m?.isAvailable).toBe(true);
    expect(m?.unavailableReason).toBeUndefined();
  });

  it("nicht sichtbar wenn RG-01 NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({ "RG-01": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "regress-stellungnahme");
    expect(m?.isAvailable).toBe(false);
  });

  it("nicht sichtbar wenn RG-02 NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({ "RG-02": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "regress-stellungnahme");
    expect(m?.isAvailable).toBe(false);
  });

  it("geblockt wenn RG-01 OPEN – unavailableReason enthält 'RG-01'", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({ "RG-01": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "regress-stellungnahme");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
    expect(m?.unavailableReason).toContain("RG-01");
  });

  it("geblockt wenn RG-02 OPEN – unavailableReason enthält 'RG-02'", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({ "RG-02": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "regress-stellungnahme");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toContain("RG-02");
  });

  it("sichtbar wenn RG-04 OPEN (weniger strenger Trigger – RG-04 nicht in allOf)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({ "RG-04": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "regress-stellungnahme");
    expect(m?.isAvailable).toBe(true);
  });

  it("sichtbar wenn RG-05 NO (weniger strenger Trigger – RG-05 nicht in allOf)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({ "RG-05": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "regress-stellungnahme");
    expect(m?.isAvailable).toBe(true);
  });

  it("leerer Snapshot (alle Checkpoints fehlen) → geblockt wegen OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "regress-stellungnahme");
    expect(m?.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. regress-arztgespraech-vorbereiten: anyOf
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: regress-arztgespraech-vorbereiten", () => {
  it("sichtbar wenn RG-03 OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({ "RG-03": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "regress-arztgespraech-vorbereiten");
    expect(m?.isAvailable).toBe(true);
  });

  it("sichtbar wenn RG-05 OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({ "RG-05": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "regress-arztgespraech-vorbereiten");
    expect(m?.isAvailable).toBe(true);
  });

  it("sichtbar wenn sowohl RG-03 als auch RG-05 OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({
        "RG-03": OfficeCheckpointState.OPEN,
        "RG-05": OfficeCheckpointState.OPEN,
      }),
    });
    const m = modules.find((m) => m.templateId === "regress-arztgespraech-vorbereiten");
    expect(m?.isAvailable).toBe(true);
  });

  it("nicht sichtbar wenn RG-03 und RG-05 beide YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "regress-arztgespraech-vorbereiten");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("sichtbar bei leerem Snapshot (RG-03 und RG-05 fehlen → OPEN)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "regress-arztgespraech-vorbereiten");
    expect(m?.isAvailable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. regress-unterlagen-nachfordern: anyOf
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: regress-unterlagen-nachfordern", () => {
  it("sichtbar wenn RG-04 NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({ "RG-04": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "regress-unterlagen-nachfordern");
    expect(m?.isAvailable).toBe(true);
  });

  it("sichtbar wenn RG-04 OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({ "RG-04": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "regress-unterlagen-nachfordern");
    expect(m?.isAvailable).toBe(true);
  });

  it("nicht sichtbar wenn RG-04 YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "regress-unterlagen-nachfordern");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("sichtbar bei leerem Snapshot (RG-04 fehlt → OPEN)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "regress-unterlagen-nachfordern");
    expect(m?.isAvailable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. unavailableReason immer gesetzt wenn nicht verfügbar
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: unavailableReason", () => {
  it("alle nicht verfügbaren Module haben einen nicht-leeren unavailableReason", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: "arzt-anstellen-nachbesetzung",
      checkpoints: [],
    });
    for (const m of modules) {
      if (!m.isAvailable) {
        expect(typeof m.unavailableReason).toBe("string");
        expect((m.unavailableReason ?? "").length).toBeGreaterThan(0);
      }
    }
  });

  it("verfügbare Module haben kein unavailableReason", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot({ "RG-04": OfficeCheckpointState.NO }),
    });
    for (const m of modules.filter((m) => m.isAvailable)) {
      expect(m.unavailableReason).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 7. renderOfficeWriteTemplate: Platzhalter ersetzen
// ---------------------------------------------------------------------------

describe("renderOfficeWriteTemplate: Platzhalter werden ersetzt", () => {
  const template = OFFICE_WRITE_TEMPLATES.find(
    (t) => t.id === "regress-unterlagen-nachfordern",
  )!;

  it("ersetzt alle bekannten Platzhalter", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Muster",
      bsnr: "123456789",
      arztname: "Dr. med. Anna Müller",
      lanr: "987654321",
      datum_schreiben: "17.05.2026",
      empfaenger_block: "KV Berlin\nMasurenallee 6-8\n14057 Berlin",
      pruefungszeitraum: "Q3/2024",
      aktenzeichen: "WP-2026-0042",
      frist_datum: "30.06.2026",
      fehlende_unterlagen: "Verordnungsdaten Q3/2024",
      kontakt_rueckfragen: "Tel. 030 / 12345-0",
    });
    expect(result).toContain("KV Berlin");
    expect(result).toContain("30.06.2026");
    expect(result).toContain("Verordnungsdaten Q3/2024");
    expect(result).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it("ersetzt mehrfache Vorkommen desselben Platzhalters vollständig", () => {
    const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "regress-stellungnahme")!;
    const result = renderOfficeWriteTemplate(tmpl, {
      praxisname: "Praxis Muster",
      bsnr: "111222333",
      pruefungszeitraum: "Q1/2025",
      pruefungsgegenstand: "Verordnungskosten",
      begruendung: "Begründungstext",
    });
    // {{praxisname}} kommt zweimal vor – darf kein {{praxisname}} mehr enthalten
    expect(result).not.toContain("{{praxisname}}");
    // Beide Vorkommen ersetzt
    expect(result.split("Praxis Muster").length - 1).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 8. renderOfficeWriteTemplate: fehlende Platzhalter sichtbar markieren
// ---------------------------------------------------------------------------

describe("renderOfficeWriteTemplate: fehlende Platzhalter markiert", () => {
  const template = OFFICE_WRITE_TEMPLATES.find(
    (t) => t.id === "regress-unterlagen-nachfordern",
  )!;

  it("fehlender Key erscheint als [{{key}}]", () => {
    const result = renderOfficeWriteTemplate(template, {
      adressat: "KV Berlin",
      // frist_datum fehlt
      fehlende_unterlagen: "Unterlagen",
    });
    expect(result).toContain("[{{frist_datum}}]");
  });

  it("leerer String gilt als fehlend und wird markiert", () => {
    const result = renderOfficeWriteTemplate(template, {
      empfaenger_block: "   ",
      frist_datum: "30.06.2026",
      fehlende_unterlagen: "x",
    });
    expect(result).toContain("[{{empfaenger_block}}]");
  });

  it("whitespace-only String gilt als fehlend", () => {
    const result = renderOfficeWriteTemplate(template, {
      empfaenger_block: "\t\n",
      frist_datum: "30.06.2026",
      fehlende_unterlagen: "x",
    });
    expect(result).toContain("[{{empfaenger_block}}]");
  });

  it("vollständig leere inputs markieren alle Platzhalter", () => {
    const result = renderOfficeWriteTemplate(template, {});
    expect(result).toContain("[{{empfaenger_block}}]");
    expect(result).toContain("[{{frist_datum}}]");
    expect(result).toContain("[{{fehlende_unterlagen}}]");
  });
});

// ---------------------------------------------------------------------------
// 9. renderOfficeWriteTemplate: bedingte Blöcke ({{#if}})
// ---------------------------------------------------------------------------

describe("renderOfficeWriteTemplate: bedingte Blöcke ({{#if}})", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find(
    (t) => t.id === "regress-stellungnahme",
  )!;

  const pflichtfelder: Record<string, string> = {
    praxisname: "Praxis Test",
    bsnr: "123456789",
    arztname: "Dr. Test",
    lanr: "987654321",
    datum_schreiben: "17.05.2026",
    empfaenger_block: "KV Berlin",
    pruefungszeitraum: "Q3/2024",
    pruefungsgegenstand: "Verordnungskosten",
    aktenzeichen: "WP-0042",
    bescheid_datum: "01.01.2026",
    begruendung: "Testbegr\u00fcndung.",
  };

  it("if-Block erscheint wenn Key vorhanden ist", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      kontakt_rueckfragen: "Tel. 030\u00a0/ 99999",
    });
    expect(result).toContain("Kontakt f\u00fcr R\u00fcckfragen: Tel. 030\u00a0/ 99999");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("if-Block wird vollst\u00e4ndig entfernt wenn Key fehlt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Kontakt f\u00fcr R\u00fcckfragen");
    expect(result).not.toContain("kontakt_rueckfragen");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("if-Block wird entfernt wenn Key nur Whitespace ist", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      kontakt_rueckfragen: "   ",
    });
    expect(result).not.toContain("Kontakt f\u00fcr R\u00fcckfragen");
  });

  it("required Platzhalter bleiben sichtbar markiert; optionaler if-Block hinterl\u00e4sst kein [{{}}]", () => {
    const result = renderOfficeWriteTemplate(tmpl, {});
    expect(result).toContain("[{{praxisname}}]");
    expect(result).toContain("[{{begruendung}}]");
    expect(result).not.toContain("[{{kontakt_rueckfragen}}]");
  });
});

// ---------------------------------------------------------------------------
// 10. Kein 'action'-Begriff in IDs oder Enums
// ---------------------------------------------------------------------------

describe("Keine Begriffskollision mit 'action'", () => {
  it("kein Template-ID enthält 'action'", () => {
    for (const t of OFFICE_WRITE_TEMPLATES) {
      expect(t.id.toLowerCase()).not.toContain("action");
    }
  });

  it("kein OfficeWriteOutputKind-Wert enthält 'action'", () => {
    for (const v of Object.values(OfficeWriteOutputKind)) {
      expect(v.toLowerCase()).not.toContain("action");
    }
  });

  it("kein OfficeWriteKind-Wert enthält 'action'", () => {
    for (const v of Object.values(OfficeWriteKind)) {
      expect(v.toLowerCase()).not.toContain("action");
    }
  });
});
