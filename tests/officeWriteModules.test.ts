import {
  OFFICE_WRITE_TEMPLATES,
  OfficeWriteOutputKind,
  OfficeWriteKind,
} from "@/lib/office/writeModules";
import {
  evaluateOfficeWriteModules,
  renderOfficeWriteTemplate,
} from "@/lib/office/writeRenderer";
import {
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_KV_BILLING,
  OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
  OFFICE_TOPIC_MFA_HIRING,
  OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
} from "@/lib/office/checkpointCatalog";
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

// ---------------------------------------------------------------------------
// Hilfsfunktion: KV-Snapshot
// ---------------------------------------------------------------------------

/** Alle KV-Checkpoints auf YES – einzelne States via overrides überschreibbar. */
function makeKvSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "KV-01": OfficeCheckpointState.YES,
    "KV-02": OfficeCheckpointState.YES,
    "KV-03": OfficeCheckpointState.YES,
    "KV-04": OfficeCheckpointState.YES,
    "KV-05": OfficeCheckpointState.YES,
  };
  return Object.entries({ ...defaults, ...overrides } as Record<string, OfficeCheckpointState>).map(
    ([id, state]) => makeCheckpoint(id, state),
  );
}

// ---------------------------------------------------------------------------
// 11. Katalogsanität KV-Templates
// ---------------------------------------------------------------------------

describe("OFFICE_WRITE_TEMPLATES: KV-Katalog", () => {
  it("alle drei KV-Templates sind im Katalog enthalten", () => {
    const ids = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("kv-antwortschreiben");
    expect(ids).toContain("kv-arztgespraech-vorbereiten");
    expect(ids).toContain("kv-klaerungsnotiz");
  });

  it("alle KV-Templates haben topicIds = [OFFICE_TOPIC_KV_BILLING]", () => {
    const kvTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
      t.trigger.topicIds.includes(OFFICE_TOPIC_KV_BILLING),
    );
    expect(kvTemplates).toHaveLength(3);
    for (const t of kvTemplates) {
      expect(t.trigger.topicIds).toEqual([OFFICE_TOPIC_KV_BILLING]);
    }
  });

  it("alle Template-IDs sind nach wie vor eindeutig", () => {
    const ids = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// 12. KV-Templates erscheinen nicht beim Regress-Topic
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: KV-Topic-Filter", () => {
  const KV_IDS = [
    "kv-antwortschreiben",
    "kv-arztgespraech-vorbereiten",
    "kv-klaerungsnotiz",
  ] as const;

  it("KV-Templates sind nicht verfügbar für Regress-Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot(),
    });
    for (const id of KV_IDS) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });

  it("Regress-Templates sind nicht verfügbar für KV-Topic", () => {
    const REGRESS_IDS = [
      "regress-stellungnahme",
      "regress-arztgespraech-vorbereiten",
      "regress-unterlagen-nachfordern",
    ] as const;
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot(),
    });
    for (const id of REGRESS_IDS) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 13. kv-antwortschreiben: allOf + blockedWhenAnyOpen
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: kv-antwortschreiben", () => {
  it("verfügbar wenn KV-01 und KV-02 YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "kv-antwortschreiben");
    expect(m?.isAvailable).toBe(true);
    expect(m?.unavailableReason).toBeUndefined();
  });

  it("nicht verfügbar wenn KV-01 NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot({ "KV-01": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "kv-antwortschreiben");
    expect(m?.isAvailable).toBe(false);
  });

  it("nicht verfügbar wenn KV-02 NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot({ "KV-02": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "kv-antwortschreiben");
    expect(m?.isAvailable).toBe(false);
  });

  it("geblockt wenn KV-01 OPEN – unavailableReason enthält 'KV-01'", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot({ "KV-01": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "kv-antwortschreiben");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toContain("KV-01");
  });

  it("geblockt wenn KV-02 OPEN – unavailableReason enthält 'KV-02'", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot({ "KV-02": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "kv-antwortschreiben");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toContain("KV-02");
  });

  it("geblockt bei leerem Snapshot (KV-01 und KV-02 fehlen → OPEN)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "kv-antwortschreiben");
    expect(m?.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 14. kv-arztgespraech-vorbereiten: anyOf KV-03 OPEN
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: kv-arztgespraech-vorbereiten", () => {
  it("verfügbar wenn KV-03 OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot({ "KV-03": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "kv-arztgespraech-vorbereiten");
    expect(m?.isAvailable).toBe(true);
  });

  it("nicht verfügbar wenn KV-03 YES (alle YES)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "kv-arztgespraech-vorbereiten");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("verfügbar bei leerem Snapshot (KV-03 fehlt → OPEN)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "kv-arztgespraech-vorbereiten");
    expect(m?.isAvailable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 15. kv-klaerungsnotiz: anyOf KV-04 oder KV-05 OPEN
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: kv-klaerungsnotiz", () => {
  it("verfügbar wenn KV-04 OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot({ "KV-04": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "kv-klaerungsnotiz");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn KV-05 OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot({ "KV-05": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "kv-klaerungsnotiz");
    expect(m?.isAvailable).toBe(true);
  });

  it("nicht verfügbar wenn KV-04 und KV-05 beide YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "kv-klaerungsnotiz");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("verfügbar bei leerem Snapshot (KV-04 und KV-05 fehlen → OPEN)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "kv-klaerungsnotiz");
    expect(m?.isAvailable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 16. renderOfficeWriteTemplate: kv-antwortschreiben
// ---------------------------------------------------------------------------

describe("renderOfficeWriteTemplate: kv-antwortschreiben", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "kv-antwortschreiben")!;

  const pflichtfelder: Record<string, string> = {
    praxisname: "Praxis Muster",
    bsnr: "123456789",
    arztname: "Dr. med. Anna Müller",
    lanr: "987654321",
    datum_schreiben: "17.05.2026",
    empfaenger_block: "KV Berlin\nMasurenallee 6-8\n14057 Berlin",
    aktenzeichen: "ABR-2026-0099",
    datum_kv_schreiben: "05.05.2026",
    abrechnungszeitraum: "Quartal 2/2025",
    beanstandete_leistung: "GOP 13250",
    sachverhalt: "Die Leistung wurde erbracht.",
    fachliche_einschaetzung: "Medizinisch indiziert wegen Herzinsuffizienz.",
  };

  it("erzeugt Schreiben mit allen Pflichtfeldern und ohne {{-Rest", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("KV Berlin");
    expect(result).toContain("GOP 13250");
    expect(result).toContain("Quartal 2/2025");
    expect(result).toContain("ABR-2026-0099");
    expect(result).toContain("Medizinisch indiziert wegen Herzinsuffizienz.");
    expect(result).toContain("KV-Schreiben vom 05.05.2026, Az. ABR-2026-0099");
    expect(result).toContain("Rückfrage vom 05.05.2026");
    expect(result).not.toContain("KV-Schreiben vom Az.");
    expect(result).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it("Kontaktblock erscheint wenn kontakt_rueckfragen gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      kontakt_rueckfragen: "Tel. 030 / 12345-0",
    });
    expect(result).toContain("Kontakt für Rückfragen: Tel. 030 / 12345-0");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("Kontaktblock fehlt vollständig wenn kontakt_rueckfragen nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Kontakt für Rückfragen");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
    expect(result).not.toContain("[{{kontakt_rueckfragen}}]");
  });

  it("Anlagenblock erscheint wenn anlagen gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      anlagen: "Diagnoseauszug aus PVS\nExportprotokoll vom 18.05.2026",
    });
    expect(result).toContain("Anlagen:");
    expect(result).toContain("Diagnoseauszug aus PVS");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("Anlagenblock fehlt vollständig wenn anlagen nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Anlagen:");
    expect(result).not.toContain("[{{anlagen}}]");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("Antwortfrist erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      antwortfrist: "30.05.2026",
    });
    expect(result).toContain("Antwortfrist: 30.05.2026");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("Antwortfrist-Block fehlt vollständig wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Antwortfrist");
    expect(result).not.toContain("[{{antwortfrist}}]");
  });
});

// ---------------------------------------------------------------------------
// 17. Neue Enums: BETROFFENENINFORMATION + PERSON_COMMUNICATION
// ---------------------------------------------------------------------------

describe("Neue Enums: BETROFFENENINFORMATION + PERSON_COMMUNICATION", () => {
  it("OfficeWriteOutputKind.BETROFFENENINFORMATION ist definiert", () => {
    expect(OfficeWriteOutputKind.BETROFFENENINFORMATION).toBe("BETROFFENENINFORMATION");
  });

  it("OfficeWriteKind.PERSON_COMMUNICATION ist definiert", () => {
    expect(OfficeWriteKind.PERSON_COMMUNICATION).toBe("PERSON_COMMUNICATION");
  });

  it("kein OfficeWriteOutputKind-Wert enthält 'action'", () => {
    for (const v of Object.values(OfficeWriteOutputKind)) {
      expect(v.toLowerCase()).not.toContain("action");
    }
  });
});

// ---------------------------------------------------------------------------
// 18. DS-Templates: Topic-Relevanz
// ---------------------------------------------------------------------------

/** Alle DS-Checkpoints auf YES – einzelne States via overrides überschreibbar. */
function makeDsSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "DS-01": OfficeCheckpointState.YES,
    "DS-02": OfficeCheckpointState.YES,
    "DS-03": OfficeCheckpointState.YES,
    "DS-04": OfficeCheckpointState.YES,
    "DS-05": OfficeCheckpointState.YES,
    "DS-06": OfficeCheckpointState.YES,
  };
  return Object.entries({ ...defaults, ...overrides } as Record<string, OfficeCheckpointState>).map(
    ([id, state]) => makeCheckpoint(id, state),
  );
}

describe("DS-Templates: Topic-Relevanz", () => {
  it("kein DS-Template ist verfügbar beim Regress-Topic", () => {
    const evaluated = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot(),
    });
    const availableDs = evaluated.filter(
      (m) => m.templateId.startsWith("ds-") && m.isAvailable,
    );
    expect(availableDs).toHaveLength(0);
  });

  it("alle drei DS-Templates erscheinen beim Datenschutz-Topic (alle YES)", () => {
    const evaluated = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
      checkpoints: makeDsSnapshot(),
    });
    const dsIds = evaluated.map((m) => m.templateId);
    expect(dsIds).toContain("ds-vorfallsnotiz");
    expect(dsIds).toContain("ds-meldung-behoerde");
    expect(dsIds).toContain("ds-betroffeneninformation");
  });
});

// ---------------------------------------------------------------------------
// 19. DS-Templates: Trigger ds-vorfallsnotiz
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: ds-vorfallsnotiz Trigger", () => {
  it("ist verfügbar wenn DS-01=YES", () => {
    const evaluated = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
      checkpoints: [makeCheckpoint("DS-01", OfficeCheckpointState.YES)],
    });
    const m = evaluated.find((e) => e.templateId === "ds-vorfallsnotiz");
    expect(m?.isAvailable).toBe(true);
  });

  it("ist nicht verfügbar wenn DS-01=OPEN", () => {
    const evaluated = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
      checkpoints: [makeCheckpoint("DS-01", OfficeCheckpointState.OPEN)],
    });
    const m = evaluated.find((e) => e.templateId === "ds-vorfallsnotiz");
    expect(m?.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 20. DS-Templates: Trigger ds-meldung-behoerde
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: ds-meldung-behoerde Trigger", () => {
  it("ist verfügbar wenn DS-01, DS-02, DS-03 alle YES", () => {
    const evaluated = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
      checkpoints: makeDsSnapshot(),
    });
    const m = evaluated.find((e) => e.templateId === "ds-meldung-behoerde");
    expect(m?.isAvailable).toBe(true);
  });

  it("ist nicht verfügbar wenn DS-03=OPEN (allOf verletzt)", () => {
    const evaluated = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
      checkpoints: makeDsSnapshot({ "DS-03": OfficeCheckpointState.OPEN }),
    });
    const m = evaluated.find((e) => e.templateId === "ds-meldung-behoerde");
    expect(m?.isAvailable).toBe(false);
  });

  it("ist nicht verfügbar wenn DS-02=OPEN (blockedWhenAnyOpen)", () => {
    const evaluated = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
      checkpoints: makeDsSnapshot({ "DS-02": OfficeCheckpointState.OPEN }),
    });
    const m = evaluated.find((e) => e.templateId === "ds-meldung-behoerde");
    expect(m?.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 21. DS-Templates: Trigger ds-betroffeneninformation
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: ds-betroffeneninformation Trigger", () => {
  it("ist verfügbar wenn DS-05=OPEN und DS-01/DS-02=YES", () => {
    const evaluated = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
      checkpoints: makeDsSnapshot({ "DS-05": OfficeCheckpointState.OPEN }),
    });
    const m = evaluated.find((e) => e.templateId === "ds-betroffeneninformation");
    expect(m?.isAvailable).toBe(true);
  });

  it("ist nicht verfügbar wenn DS-01=OPEN (blockedWhenAnyOpen)", () => {
    const evaluated = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
      checkpoints: makeDsSnapshot({ "DS-01": OfficeCheckpointState.OPEN, "DS-05": OfficeCheckpointState.OPEN }),
    });
    const m = evaluated.find((e) => e.templateId === "ds-betroffeneninformation");
    expect(m?.isAvailable).toBe(false);
  });

  it("ist nicht verfügbar wenn DS-05=YES (anyOf nicht erfüllt)", () => {
    const evaluated = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
      checkpoints: makeDsSnapshot(),
    });
    const m = evaluated.find((e) => e.templateId === "ds-betroffeneninformation");
    expect(m?.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 22. renderOfficeWriteTemplate: ds-meldung-behoerde
// ---------------------------------------------------------------------------

describe("renderOfficeWriteTemplate: ds-meldung-behoerde", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "ds-meldung-behoerde")!;

  const pflichtfelder: Record<string, string> = {
    datum_vorfall: "14.05.2026",
    datum_bekanntwerden: "14.05.2026, 11:00 Uhr",
    praxisname: "Praxis am Gendarmenmarkt",
    arztname_verantwortliche: "Dr. med. Schulz",
    beschreibung_vorfall: "E-Mail mit Patientendaten an falsche Adresse versandt.",
    betroffene_datenkategorien: "Patientennamen, Diagnosen",
    anzahl_betroffene_geschaetzt: "ca. 12 Patienten",
    risikobewertung_ergebnis: "Mittleres Risiko für Betroffene.",
    ergriffene_massnahmen: "E-Mail zurückgerufen, Zugänge geprüft.",
  };

  it("erzeugt Meldung mit allen Pflichtfeldern und ohne {{-Rest", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Art. 33 DSGVO");
    expect(result).toContain("Praxis am Gendarmenmarkt");
    expect(result).toContain("Dr. med. Schulz");
    expect(result).toContain("14.05.2026");
    expect(result).toContain("E-Mail mit Patientendaten an falsche Adresse versandt.");
    expect(result).toContain("ca. 12 Patienten");
    expect(result).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it("Hinweis 'Berliner Datenschutzbehörde' erscheint im Text", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Berliner Datenschutzbehörde");
    expect(result).toContain("Arbeitsentwurf");
    expect(result).toContain("Fachlich und rechtlich zu prüfen");
  });

  it("Fristblock erscheint wenn meldung_fristdatum gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      meldung_fristdatum: "17.05.2026, 11:00 Uhr",
    });
    expect(result).toContain("72-h-Frist endet: 17.05.2026, 11:00 Uhr");
    expect(result).not.toContain("{{#if");
  });

  it("Fristblock fehlt vollständig wenn meldung_fristdatum nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("72-h-Frist endet");
    expect(result).not.toContain("{{#if");
  });

  it("Kontaktblock erscheint wenn kontakt_rueckfragen gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      kontakt_rueckfragen: "Tel. 030 / 99887-0",
    });
    expect(result).toContain("Kontakt für Rückfragen: Tel. 030 / 99887-0");
  });

  it("BSNR-Block erscheint wenn bsnr gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      bsnr: "123456789",
    });
    expect(result).toContain("BSNR 123456789");
  });

  it("BSNR-Block fehlt wenn bsnr nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("BSNR");
    expect(result).not.toContain("{{#if");
  });
});

// ---------------------------------------------------------------------------
// 23. renderOfficeWriteTemplate: ds-betroffeneninformation
// ---------------------------------------------------------------------------

describe("renderOfficeWriteTemplate: ds-betroffeneninformation", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "ds-betroffeneninformation")!;

  const pflichtfelder: Record<string, string> = {
    datum_schreiben: "17.05.2026",
    datum_vorfall: "14.05.2026",
    praxisname: "Praxis am Gendarmenmarkt",
    arztname: "Dr. med. Schulz",
    beschreibung_vorfall_extern: "Eine E-Mail mit Ihren Patientendaten wurde versehentlich an eine falsche Adresse gesendet.",
    betroffene_datenkategorien: "Name, Diagnose, Versicherungsnummer",
    moegliche_folgen: "Mögliche unbefugte Kenntnisnahme Ihrer Gesundheitsdaten.",
    ergriffene_massnahmen: "Die E-Mail wurde zurückgerufen und der Vorfall intern dokumentiert.",
  };

  it("erzeugt Betroffeneninformation mit allen Pflichtfeldern und ohne {{-Rest", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Art. 34 DSGVO");
    expect(result).toContain("Praxis am Gendarmenmarkt");
    expect(result).toContain("Dr. med. Schulz");
    expect(result).toContain("14.05.2026");
    expect(result).toContain("E-Mail mit Ihren Patientendaten");
    expect(result).toContain("Name, Diagnose, Versicherungsnummer");
    expect(result).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it("Hinweis 'hohem Risiko' und 'Arbeitsentwurf' erscheinen im Text", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("hohem Risiko");
    expect(result).toContain("Arbeitsentwurf");
    expect(result).toContain("Vor Versand fachlich und rechtlich prüfen");
  });

  it("Empfehlungsblock erscheint wenn empfehlung_betroffene gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      empfehlung_betroffene: "Bitte prüfen Sie Ihre Kontoauszüge.",
    });
    expect(result).toContain("Empfehlungen an Sie:");
    expect(result).toContain("Bitte prüfen Sie Ihre Kontoauszüge.");
    expect(result).not.toContain("{{#if");
  });

  it("Empfehlungsblock fehlt wenn empfehlung_betroffene nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Empfehlungen an Sie:");
    expect(result).not.toContain("{{#if");
  });

  it("Datenschutzbeauftragter-Block erscheint wenn ansprechpartner_ds gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      ansprechpartner_ds: "Max Muster, Tel. 030 / 111-22",
    });
    expect(result).toContain("Datenschutzbeauftragter / Ansprechpartner: Max Muster");
    expect(result).not.toContain("{{#if");
  });

  it("Datenschutzbeauftragter-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Datenschutzbeauftragter");
    expect(result).not.toContain("{{#if");
  });

  it("Betroffeneninformation enthält datum_schreiben", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Datum: 17.05.2026");
    expect(result).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it("individuelle Anrede erscheint wenn anrede_name gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      anrede_name: "Frau Müller",
    });
    expect(result).toContain("Sehr geehrte/r Frau Müller,");
    expect(result).not.toContain("Sehr geehrte Damen und Herren,");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
    expect(result).not.toContain("{{#unless");
    expect(result).not.toContain("{{/unless}}");
  });

  it("allgemeine Anrede bleibt wenn anrede_name fehlt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Sehr geehrte Damen und Herren,");
    expect(result).not.toContain("Sehr geehrte/r");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
    expect(result).not.toContain("{{#unless");
    expect(result).not.toContain("{{/unless}}");
  });
});

// ---------------------------------------------------------------------------
// 24. renderOfficeWriteTemplate: ds-vorfallsnotiz
// ---------------------------------------------------------------------------

describe("renderOfficeWriteTemplate: ds-vorfallsnotiz", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "ds-vorfallsnotiz")!;

  const pflichtfelder: Record<string, string> = {
    datum_vorfall: "14.05.2026, ca. 15:30 Uhr",
    datum_bekanntwerden: "14.05.2026, 16:00 Uhr",
    praxisname: "Hausarztpraxis Dr. Kröger",
    beschreibung_vorfall: "Excel-Tabelle an falsche E-Mail-Adresse gesendet.",
    betroffene_datenkategorien: "Name, Geburtsdatum, GKV-Nummer",
    anzahl_betroffene: "43 Patienten",
    erstverantwortliche_person: "MFA Julia Schwarz",
  };

  it("72h-Hinweis erscheint in Vorfallsnotiz", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("72-Stunden-Frist");
    expect(result).toContain("Meldepflicht und Frist bitte gesondert prüfen");
    expect(result).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it("erzeugt vollständige Notiz mit allen Pflichtfeldern und ohne {{-Rest", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Hausarztpraxis Dr. Kröger");
    expect(result).toContain("14.05.2026, ca. 15:30 Uhr");
    expect(result).toContain("Excel-Tabelle an falsche E-Mail-Adresse");
    expect(result).toContain("Interne Arbeitsunterlage");
    expect(result).not.toMatch(/\{\{[^}]+\}\}/);
  });
});

// ---------------------------------------------------------------------------
// 25. renderOfficeWriteTemplate: ds-meldung-behoerde – Verzögerungsbegründung
// ---------------------------------------------------------------------------

describe("renderOfficeWriteTemplate: ds-meldung-behoerde – Verzögerungsbegründung", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "ds-meldung-behoerde")!;

  const pflichtfelder: Record<string, string> = {
    datum_vorfall: "14.05.2026",
    datum_bekanntwerden: "14.05.2026, 16:00 Uhr",
    praxisname: "Praxis am Gendarmenmarkt",
    arztname_verantwortliche: "Dr. med. Schulz",
    beschreibung_vorfall: "E-Mail mit Patientendaten an falsche Adresse versandt.",
    betroffene_datenkategorien: "Patientennamen, Diagnosen",
    anzahl_betroffene_geschaetzt: "ca. 12 Patienten",
    risikobewertung_ergebnis: "Mittleres Risiko für Betroffene.",
    ergriffene_massnahmen: "E-Mail zurückgerufen, Zugänge geprüft.",
  };

  it("Verzögerungsbegründung erscheint wenn verzoegerung_begruendung gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      verzoegerung_begruendung:
        "Der Vorfall wurde zunächst als technisches Problem eingestuft.",
    });
    expect(result).toContain("Begründung bei Überschreitung der 72-Stunden-Frist:");
    expect(result).toContain("Der Vorfall wurde zunächst als technisches Problem eingestuft.");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("Verzögerungsblock fehlt vollständig wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Begründung bei Überschreitung");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });
});

// ---------------------------------------------------------------------------
// Hilfsfunktion: MFA-Snapshot
// ---------------------------------------------------------------------------

/** Alle MF-Checkpoints auf YES – einzelne States via overrides überschreibbar. */
function makeMfaSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "MF-01": OfficeCheckpointState.YES,
    "MF-02": OfficeCheckpointState.YES,
    "MF-03": OfficeCheckpointState.YES,
    "MF-04": OfficeCheckpointState.YES,
    "MF-05": OfficeCheckpointState.YES,
    "MF-06": OfficeCheckpointState.YES,
  };
  return Object.entries({ ...defaults, ...overrides } as Record<string, OfficeCheckpointState>).map(
    ([id, state]) => makeCheckpoint(id, state),
  );
}

// ---------------------------------------------------------------------------
// 26. MFA-Templates: Katalog-Sanität
// ---------------------------------------------------------------------------

describe("OFFICE_WRITE_TEMPLATES: MFA-Katalog", () => {
  it("alle drei MFA-Templates sind im Katalog enthalten", () => {
    const ids = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("mfa-gespraechsleitfaden");
    expect(ids).toContain("mfa-unterlagen-anforderung");
    expect(ids).toContain("mfa-onboarding-plan");
  });

  it("alle MFA-Templates haben topicIds = [OFFICE_TOPIC_MFA_HIRING]", () => {
    const mfaTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
      t.trigger.topicIds.includes(OFFICE_TOPIC_MFA_HIRING),
    );
    expect(mfaTemplates).toHaveLength(3);
    for (const t of mfaTemplates) {
      expect(t.trigger.topicIds).toEqual([OFFICE_TOPIC_MFA_HIRING]);
    }
  });

  it("alle Template-IDs bleiben eindeutig nach MFA-Erweiterung", () => {
    const ids = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("MFA-Templates haben smoothingEnabled = false", () => {
    const mfaTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
      t.trigger.topicIds.includes(OFFICE_TOPIC_MFA_HIRING),
    );
    for (const t of mfaTemplates) {
      expect(t.smoothingEnabled).toBe(false);
    }
  });

  it("mfa-gespraechsleitfaden: outputKind GESPRAECHSLEITFADEN, writeKind INTERNAL_GUIDE", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "mfa-gespraechsleitfaden")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.GESPRAECHSLEITFADEN);
    expect(t.writeKind).toBe(OfficeWriteKind.INTERNAL_GUIDE);
    expect(t.audience).toBe("INTERN");
  });

  it("mfa-unterlagen-anforderung: outputKind UNTERLAGEN_ANFORDERUNG, writeKind DATA_REQUEST", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "mfa-unterlagen-anforderung")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.UNTERLAGEN_ANFORDERUNG);
    expect(t.writeKind).toBe(OfficeWriteKind.DATA_REQUEST);
    expect(t.audience).toBe("EXTERNE_STELLE");
  });

  it("mfa-onboarding-plan: outputKind INTERNE_NOTIZ, writeKind INTERNAL_NOTE", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "mfa-onboarding-plan")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.INTERNE_NOTIZ);
    expect(t.writeKind).toBe(OfficeWriteKind.INTERNAL_NOTE);
    expect(t.audience).toBe("INTERN");
  });
});

// ---------------------------------------------------------------------------
// 27. MFA-Templates: Topic-Filter
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: MFA-Topic-Filter", () => {
  const MFA_IDS = [
    "mfa-gespraechsleitfaden",
    "mfa-unterlagen-anforderung",
    "mfa-onboarding-plan",
  ] as const;

  it("MFA-Templates sind nicht verfügbar für Regress-Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeRegressSnapshot(),
    });
    for (const id of MFA_IDS) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });

  it("MFA-Templates sind nicht verfügbar für KV-Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeKvSnapshot(),
    });
    for (const id of MFA_IDS) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });

  it("MFA-Templates sind nicht verfügbar für Datenschutz-Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
      checkpoints: makeDsSnapshot(),
    });
    for (const id of MFA_IDS) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });

  it("Regress-Templates sind nicht verfügbar für MFA-Topic", () => {
    const REGRESS_IDS = [
      "regress-stellungnahme",
      "regress-arztgespraech-vorbereiten",
      "regress-unterlagen-nachfordern",
    ] as const;
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeMfaSnapshot(),
    });
    for (const id of REGRESS_IDS) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 28. mfa-gespraechsleitfaden: allOf MF-01=YES
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: mfa-gespraechsleitfaden", () => {
  it("verfügbar wenn MF-01=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeMfaSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "mfa-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(true);
    expect(m?.unavailableReason).toBeUndefined();
  });

  it("nicht verfügbar wenn MF-01=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeMfaSnapshot({ "MF-01": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "mfa-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("nicht verfügbar wenn MF-01=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeMfaSnapshot({ "MF-01": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "mfa-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(false);
  });

  it("nicht verfügbar bei leerem Snapshot (MF-01 fehlt → OPEN)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "mfa-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 29. mfa-unterlagen-anforderung: anyOf MF-03=NO oder MF-03=OPEN
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: mfa-unterlagen-anforderung", () => {
  it("verfügbar wenn MF-03=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeMfaSnapshot({ "MF-03": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "mfa-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn MF-03=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeMfaSnapshot({ "MF-03": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "mfa-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });

  it("nicht verfügbar wenn MF-03=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeMfaSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "mfa-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("verfügbar bei leerem Snapshot (MF-03 fehlt → OPEN)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "mfa-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 30. mfa-onboarding-plan: allOf MF-02=YES
// ---------------------------------------------------------------------------

describe("evaluateOfficeWriteModules: mfa-onboarding-plan", () => {
  it("verfügbar wenn MF-02=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeMfaSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "mfa-onboarding-plan");
    expect(m?.isAvailable).toBe(true);
    expect(m?.unavailableReason).toBeUndefined();
  });

  it("nicht verfügbar wenn MF-02=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeMfaSnapshot({ "MF-02": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "mfa-onboarding-plan");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("nicht verfügbar wenn MF-02=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeMfaSnapshot({ "MF-02": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "mfa-onboarding-plan");
    expect(m?.isAvailable).toBe(false);
  });

  it("nicht verfügbar bei leerem Snapshot (MF-02 fehlt → OPEN)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "mfa-onboarding-plan");
    expect(m?.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 31. renderOfficeWriteTemplate: mfa-unterlagen-anforderung
// ---------------------------------------------------------------------------

describe("renderOfficeWriteTemplate: mfa-unterlagen-anforderung", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "mfa-unterlagen-anforderung")!;

  const pflichtfelder: Record<string, string> = {
    praxisname: "Hausarztpraxis Dr. Müller",
    datum_schreiben: "19.05.2026",
    bewerber_name: "Julia Schmidt",
    fehlende_unterlagen: "Steuer-ID\nSV-Ausweis\nAbschlusszeugnis",
  };

  it("erzeugt Anforderungsschreiben mit allen Pflichtfeldern und ohne {{-Rest", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Hausarztpraxis Dr. Müller");
    expect(result).toContain("19.05.2026");
    expect(result).toContain("Julia Schmidt");
    expect(result).toContain("Steuer-ID");
    expect(result).toContain("SV-Ausweis");
    expect(result).toContain("Abschlusszeugnis");
    expect(result).toContain("Arbeitsentwurf");
    expect(result).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it("enthält neutrale Anrede 'Guten Tag'", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Guten Tag Julia Schmidt,");
  });

  it("enthält nicht mehr 'Sehr geehrte/r'", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Sehr geehrte/r");
  });

  it("Fristblock erscheint wenn rueckgabefrist gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      rueckgabefrist: "01.06.2026",
    });
    expect(result).toContain("01.06.2026");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("Fristblock fehlt vollständig wenn rueckgabefrist nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("spätestens");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
    expect(result).not.toContain("[{{rueckgabefrist}}]");
  });

  it("Kontaktblock erscheint wenn kontakt_rueckfragen gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      kontakt_rueckfragen: "Tel. 030 / 12345-0",
    });
    expect(result).toContain("Tel. 030 / 12345-0");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("Kontaktblock fehlt vollständig wenn kontakt_rueckfragen nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Rückfragen stehen");
    expect(result).not.toContain("[{{kontakt_rueckfragen}}]");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("Schreiben mit optionaler Frist UND Kontakt enthält beide Blöcke ohne {{-Rest", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      rueckgabefrist: "15.06.2026",
      kontakt_rueckfragen: "mail@praxis.de",
    });
    expect(result).toContain("15.06.2026");
    expect(result).toContain("mail@praxis.de");
    expect(result).not.toMatch(/\{\{[^}]+\}\}/);
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });
});

// ---------------------------------------------------------------------------
// 32. renderOfficeWriteTemplate: mfa-onboarding-plan
// ---------------------------------------------------------------------------

describe("renderOfficeWriteTemplate: mfa-onboarding-plan", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "mfa-onboarding-plan")!;

  const pflichtfelder: Record<string, string> = {
    praxisname: "Hausarztpraxis Dr. Müller",
    mfa_name: "Julia Schmidt",
    startdatum: "01.06.2026",
    einsatzbereich: "Anmeldung und Prophylaxe",
    systemzugriffe: "PVS-Zugang\nZeiterfassung\nE-Mail-Postfach",
    pflichtunterweisungen: "Datenschutz\nSchweigepflicht\nHygieneplan",
    erste_aufgaben: "Woche 1: Begleitung Anmeldung\nWoche 2: PVS-Schulung",
  };

  it("erzeugt Onboarding-Plan mit allen Pflichtfeldern und ohne {{-Rest", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Hausarztpraxis Dr. Müller");
    expect(result).toContain("Julia Schmidt");
    expect(result).toContain("01.06.2026");
    expect(result).toContain("Anmeldung und Prophylaxe");
    expect(result).toContain("PVS-Zugang");
    expect(result).toContain("Datenschutz");
    expect(result).toContain("Woche 1: Begleitung Anmeldung");
    expect(result).toContain("Interne Arbeitsliste");
    expect(result).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it("verantwortliche_person erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      verantwortliche_person: "MFA Meyer (Patin)",
    });
    expect(result).toContain("MFA Meyer (Patin)");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("verantwortliche_person-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Ansprechperson Einarbeitung");
    expect(result).not.toContain("[{{verantwortliche_person}}]");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("fehlende Pflichtfelder werden als [{{key}}] markiert", () => {
    const result = renderOfficeWriteTemplate(tmpl, {});
    expect(result).toContain("[{{mfa_name}}]");
    expect(result).toContain("[{{startdatum}}]");
    expect(result).toContain("[{{systemzugriffe}}]");
  });
});

// ---------------------------------------------------------------------------
// Hilfsfunktionen – Azubi
// ---------------------------------------------------------------------------

function makeAzubiSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "MA-01": OfficeCheckpointState.YES,
    "MA-02": OfficeCheckpointState.YES,
    "MA-03": OfficeCheckpointState.YES,
    "MA-04": OfficeCheckpointState.YES,
    "MA-05": OfficeCheckpointState.YES,
    "MA-06": OfficeCheckpointState.YES,
  };
  return Object.entries({ ...defaults, ...overrides } as Record<string, OfficeCheckpointState>).map(
    ([id, state]) => makeCheckpoint(id, state),
  );
}

// ---------------------------------------------------------------------------
// 33. Katalog-Sanität: azubi-Templates
// ---------------------------------------------------------------------------

describe("33. Katalog-Sanität: azubi-Templates", () => {
  const azubiTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds?.includes(OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING),
  );

  it("enthält genau 3 Azubi-Templates", () => {
    expect(azubiTemplates).toHaveLength(3);
  });

  it("alle Azubi-Template-IDs sind eindeutig", () => {
    const ids = azubiTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("azubi-unterlagen-anforderung: outputKind und writeKind korrekt", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((x) => x.id === "azubi-unterlagen-anforderung")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.UNTERLAGEN_ANFORDERUNG);
    expect(t.writeKind).toBe(OfficeWriteKind.DATA_REQUEST);
    expect(t.smoothingEnabled).toBe(false);
    expect(t.audience).toBe("EXTERNE_STELLE");
    expect(t.estimatedLength).toBe("SHORT");
  });

  it("azubi-gespraechsleitfaden: outputKind und writeKind korrekt", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((x) => x.id === "azubi-gespraechsleitfaden")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.GESPRAECHSLEITFADEN);
    expect(t.writeKind).toBe(OfficeWriteKind.INTERNAL_GUIDE);
    expect(t.smoothingEnabled).toBe(false);
    expect(t.audience).toBe("INTERN");
    expect(t.estimatedLength).toBe("SHORT");
  });

  it("azubi-onboarding-plan: outputKind und writeKind korrekt", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((x) => x.id === "azubi-onboarding-plan")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.INTERNE_NOTIZ);
    expect(t.writeKind).toBe(OfficeWriteKind.INTERNAL_NOTE);
    expect(t.smoothingEnabled).toBe(false);
    expect(t.audience).toBe("INTERN");
    expect(t.estimatedLength).toBe("MEDIUM");
  });

  it("alle Azubi-Templates haben topicIds mit OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING", () => {
    for (const t of azubiTemplates) {
      expect(t.trigger.topicIds).toContain(OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING);
    }
  });
});

// ---------------------------------------------------------------------------
// 34. Topic-Filter: azubi-Templates nicht für andere Topics
// ---------------------------------------------------------------------------

describe("34. Topic-Filter: azubi-Templates nicht für andere Topics", () => {
  it("azubi-unterlagen-anforderung nicht verfügbar für regress-Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeAzubiSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "azubi-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(false);
  });

  it("azubi-gespraechsleitfaden nicht verfügbar für kv-Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_KV_BILLING,
      checkpoints: makeAzubiSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "azubi-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(false);
  });

  it("azubi-onboarding-plan nicht verfügbar für mfa-einstellung-Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeAzubiSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "azubi-onboarding-plan");
    expect(m?.isAvailable).toBe(false);
  });

  it("azubi-Templates nicht verfügbar für datenschutz-Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
      checkpoints: makeAzubiSnapshot(),
    });
    const azubiIds = ["azubi-unterlagen-anforderung", "azubi-gespraechsleitfaden", "azubi-onboarding-plan"];
    for (const id of azubiIds) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 35. Trigger: azubi-unterlagen-anforderung
// ---------------------------------------------------------------------------

describe("35. evaluateOfficeWriteModules: azubi-unterlagen-anforderung", () => {
  const topic = OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING;

  it("verfügbar wenn MA-02=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeAzubiSnapshot({ "MA-02": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "azubi-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn MA-05=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeAzubiSnapshot({ "MA-05": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "azubi-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn MA-05=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeAzubiSnapshot({ "MA-05": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "azubi-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });

  it("nicht verfügbar wenn MA-02=YES und MA-05=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeAzubiSnapshot({ "MA-02": OfficeCheckpointState.YES, "MA-05": OfficeCheckpointState.YES }),
    });
    const m = modules.find((m) => m.templateId === "azubi-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("verfügbar bei leerem Snapshot (OPEN-Default greift für MA-02)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "azubi-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 36. Trigger: azubi-gespraechsleitfaden
// ---------------------------------------------------------------------------

describe("36. evaluateOfficeWriteModules: azubi-gespraechsleitfaden", () => {
  const topic = OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING;

  it("verfügbar wenn MA-01=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeAzubiSnapshot({ "MA-01": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "azubi-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn MA-01=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeAzubiSnapshot({ "MA-01": OfficeCheckpointState.YES }),
    });
    const m = modules.find((m) => m.templateId === "azubi-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(true);
  });

  it("nicht verfügbar wenn MA-01=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeAzubiSnapshot({ "MA-01": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "azubi-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 37. Trigger: azubi-onboarding-plan
// ---------------------------------------------------------------------------

describe("37. evaluateOfficeWriteModules: azubi-onboarding-plan", () => {
  const topic = OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING;

  it("verfügbar wenn MA-03=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeAzubiSnapshot({ "MA-03": OfficeCheckpointState.YES }),
    });
    const m = modules.find((m) => m.templateId === "azubi-onboarding-plan");
    expect(m?.isAvailable).toBe(true);
    expect(m?.unavailableReason).toBeUndefined();
  });

  it("nicht verfügbar wenn MA-03=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeAzubiSnapshot({ "MA-03": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "azubi-onboarding-plan");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("nicht verfügbar wenn MA-03=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeAzubiSnapshot({ "MA-03": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "azubi-onboarding-plan");
    expect(m?.isAvailable).toBe(false);
  });

  it("nicht verfügbar bei leerem Snapshot (OPEN-Default, kein YES für MA-03)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "azubi-onboarding-plan");
    expect(m?.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 38. renderOfficeWriteTemplate: azubi-unterlagen-anforderung
// ---------------------------------------------------------------------------

describe("38. renderOfficeWriteTemplate: azubi-unterlagen-anforderung", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "azubi-unterlagen-anforderung")!;

  const pflichtfelder = {
    datum_schreiben: "15.07.2026",
    praxisname: "Hausarztpraxis Dr. Müller",
    azubi_name: "Lena Hoffmann",
    fehlende_unterlagen: "Erstuntersuchungsnachweis\nEinwilligungserklärung",
  };

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Hausarztpraxis Dr. Müller");
    expect(result).toContain("15.07.2026");
    expect(result).toContain("Lena Hoffmann");
    expect(result).toContain("Erstuntersuchungsnachweis");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("rueckgabefrist-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      rueckgabefrist: "31.07.2026",
    });
    expect(result).toContain("31.07.2026");
    expect(result).toContain("spätestens");
    expect(result).not.toContain("{{#if");
  });

  it("rueckgabefrist-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("spätestens");
    expect(result).not.toContain("[{{rueckgabefrist}}]");
  });

  it("kontakt_rueckfragen-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      kontakt_rueckfragen: "Tel. 030 / 12345-0",
    });
    expect(result).toContain("Tel. 030 / 12345-0");
    expect(result).not.toContain("{{#if");
  });

  it("kontakt_rueckfragen-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Rückfragen stehen wir");
    expect(result).not.toContain("[{{kontakt_rueckfragen}}]");
  });

  it("fehlende Pflichtfelder werden als [{{key}}] markiert", () => {
    const result = renderOfficeWriteTemplate(tmpl, {});
    expect(result).toContain("[{{datum_schreiben}}]");
    expect(result).toContain("[{{praxisname}}]");
    expect(result).toContain("[{{azubi_name}}]");
    expect(result).toContain("[{{fehlende_unterlagen}}]");
  });
});

// ---------------------------------------------------------------------------
// 39. renderOfficeWriteTemplate: azubi-gespraechsleitfaden
// ---------------------------------------------------------------------------

describe("39. renderOfficeWriteTemplate: azubi-gespraechsleitfaden", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "azubi-gespraechsleitfaden")!;

  const pflichtfelder = {
    praxisname: "Hausarztpraxis Dr. Müller",
    azubi_name: "Lena Hoffmann",
    ausbildungsbeginn: "01.09.2026",
    einsatzbereich: "Anmeldung",
    wochenstunden: "38,5 h / Woche",
    offene_punkte: "Berufsschulplan klären",
  };

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Hausarztpraxis Dr. Müller");
    expect(result).toContain("Lena Hoffmann");
    expect(result).toContain("01.09.2026");
    expect(result).toContain("Anmeldung");
    expect(result).toContain("38,5 h / Woche");
    expect(result).toContain("Berufsschulplan klären");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("gespraechsdatum-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      gespraechsdatum: "10.07.2026",
    });
    expect(result).toContain("10.07.2026");
    expect(result).not.toContain("{{#if");
  });

  it("gespraechsdatum-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Datum:");
    expect(result).not.toContain("[{{gespraechsdatum}}]");
  });

  it("verantwortliche_person-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      verantwortliche_person: "Dr. Müller (Praxisleitung)",
    });
    expect(result).toContain("Dr. Müller (Praxisleitung)");
    expect(result).toContain("Gesprächsführung");
    expect(result).not.toContain("{{#if");
  });

  it("verantwortliche_person-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Gesprächsführung");
    expect(result).not.toContain("[{{verantwortliche_person}}]");
  });

  it("fehlende Pflichtfelder werden als [{{key}}] markiert", () => {
    const result = renderOfficeWriteTemplate(tmpl, {});
    expect(result).toContain("[{{praxisname}}]");
    expect(result).toContain("[{{azubi_name}}]");
    expect(result).toContain("[{{ausbildungsbeginn}}]");
    expect(result).toContain("[{{offene_punkte}}]");
  });
});

// ---------------------------------------------------------------------------
// 40. renderOfficeWriteTemplate: azubi-onboarding-plan
// ---------------------------------------------------------------------------

describe("40. renderOfficeWriteTemplate: azubi-onboarding-plan", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "azubi-onboarding-plan")!;

  const pflichtfelder = {
    praxisname: "Hausarztpraxis Dr. Müller",
    azubi_name: "Lena Hoffmann",
    startdatum: "01.09.2026",
    ausbildungsjahr: "1. Ausbildungsjahr",
    einsatzbereich: "Anmeldung",
    berufsschultage: "Montag und Mittwoch",
    systemzugriffe: "PVS-Zugang\nZeiterfassung",
    pflichtunterweisungen: "Datenschutz\nSchweigepflicht",
    erste_aufgaben: "Begleitung Anmeldung Woche 1",
  };

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Lena Hoffmann");
    expect(result).toContain("01.09.2026");
    expect(result).toContain("1. Ausbildungsjahr");
    expect(result).toContain("Montag und Mittwoch");
    expect(result).toContain("PVS-Zugang");
    expect(result).toContain("Datenschutz");
    expect(result).toContain("Begleitung Anmeldung Woche 1");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("verantwortliche_person-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      verantwortliche_person: "MFA Meyer (Patin)",
    });
    expect(result).toContain("MFA Meyer (Patin)");
    expect(result).toContain("Ansprechperson Einarbeitung");
    expect(result).not.toContain("{{#if");
  });

  it("verantwortliche_person-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Ansprechperson Einarbeitung");
    expect(result).not.toContain("[{{verantwortliche_person}}]");
    expect(result).not.toContain("{{#if");
  });

  it("notfallkontakt-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      notfallkontakt: "Eltern Hoffmann, Tel. 040 / 12345",
    });
    expect(result).toContain("Notfallkontakt: Eltern Hoffmann, Tel. 040 / 12345");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("notfallkontakt-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Notfallkontakt");
    expect(result).not.toContain("[{{notfallkontakt}}]");
    expect(result).not.toContain("{{#if");
  });

  it("fehlende Pflichtfelder werden als [{{key}}] markiert", () => {
    const result = renderOfficeWriteTemplate(tmpl, {});
    expect(result).toContain("[{{azubi_name}}]");
    expect(result).toContain("[{{startdatum}}]");
    expect(result).toContain("[{{systemzugriffe}}]");
  });
});

// ---------------------------------------------------------------------------
// 41. Compliance: keine unerlaubten Rechtsverweise in Azubi-Templates
// ---------------------------------------------------------------------------

describe("41. Compliance: keine unerlaubten Rechtsverweise in Azubi-Templates", () => {
  const azubiTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds?.includes(OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING),
  );

  it("kein Paragraphenzeichen in bodyTemplates", () => {
    for (const t of azubiTemplates) {
      expect(t.bodyTemplate).not.toContain("§");
    }
  });

  it("kein 'JArbSchG' in bodyTemplates", () => {
    for (const t of azubiTemplates) {
      expect(t.bodyTemplate).not.toContain("JArbSchG");
    }
  });

  it("keine fest kodierten Stundenzahlen (z. B. '8 Stunden') in bodyTemplates", () => {
    for (const t of azubiTemplates) {
      expect(t.bodyTemplate).not.toMatch(/\b8\s*Stunden\b/);
      expect(t.bodyTemplate).not.toMatch(/\b40\s*Stunden\b/);
    }
  });
});

// ---------------------------------------------------------------------------
// Hilfsfunktionen – NC (arzt-anstellen-nachbesetzung)
// ---------------------------------------------------------------------------

function makeNcSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "NC-REGISTERSTATUS": OfficeCheckpointState.YES,
    "NC-APPROBATION": OfficeCheckpointState.YES,
    "NC-FACHARZTQUALIFIKATION": OfficeCheckpointState.YES,
    "NC-BERUFSHAFTPFLICHT": OfficeCheckpointState.YES,
    "NC-TAETIGKEITSUMFANG": OfficeCheckpointState.YES,
    "NC-EXTERNE_STELLE": OfficeCheckpointState.YES,
    "NC-ANTRAGSWEG": OfficeCheckpointState.YES,
    "NC-GENEHMIGUNGSSTATUS": OfficeCheckpointState.YES,
    "NC-BETRIEBSSTAETTENSTRUKTUR": OfficeCheckpointState.YES,
    "NC-ARBEITSVERTRAG_FREIGABE": OfficeCheckpointState.YES,
    "NC-LANR_BSNR_ZUORDNUNG": OfficeCheckpointState.YES,
    "NC-SYSTEMZUGRIFFE_EINGERICHTET": OfficeCheckpointState.YES,
  };
  return Object.entries({ ...defaults, ...overrides } as Record<string, OfficeCheckpointState>).map(
    ([id, state]) => makeCheckpoint(id, state),
  );
}

// ---------------------------------------------------------------------------
// 42. Katalog-Sanität: NC-Templates
// ---------------------------------------------------------------------------

describe("42. Katalog-Sanität: NC-Templates", () => {
  const ncTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds?.includes(OFFICE_TOPIC_HIRING_REPLACEMENT),
  );

  it("enthält genau 3 NC-Templates", () => {
    expect(ncTemplates).toHaveLength(3);
  });

  it("alle NC-Template-IDs sind eindeutig", () => {
    const ids = ncTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("nc-unterlagen-anforderung: outputKind und writeKind korrekt", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((x) => x.id === "nc-unterlagen-anforderung")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.UNTERLAGEN_ANFORDERUNG);
    expect(t.writeKind).toBe(OfficeWriteKind.DATA_REQUEST);
    expect(t.smoothingEnabled).toBe(false);
    expect(t.audience).toBe("EXTERNE_STELLE");
    expect(t.estimatedLength).toBe("SHORT");
  });

  it("nc-gespraechsleitfaden: outputKind und writeKind korrekt", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((x) => x.id === "nc-gespraechsleitfaden")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.GESPRAECHSLEITFADEN);
    expect(t.writeKind).toBe(OfficeWriteKind.INTERNAL_GUIDE);
    expect(t.smoothingEnabled).toBe(false);
    expect(t.audience).toBe("INTERN");
    expect(t.estimatedLength).toBe("SHORT");
  });

  it("nc-onboarding-abrechnungsstart: outputKind und writeKind korrekt", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((x) => x.id === "nc-onboarding-abrechnungsstart")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.INTERNE_NOTIZ);
    expect(t.writeKind).toBe(OfficeWriteKind.INTERNAL_NOTE);
    expect(t.smoothingEnabled).toBe(false);
    expect(t.audience).toBe("INTERN");
    expect(t.estimatedLength).toBe("MEDIUM");
  });

  it("alle NC-Templates haben topicIds mit OFFICE_TOPIC_HIRING_REPLACEMENT", () => {
    for (const t of ncTemplates) {
      expect(t.trigger.topicIds).toContain(OFFICE_TOPIC_HIRING_REPLACEMENT);
    }
  });
});

// ---------------------------------------------------------------------------
// 43. Topic-Filter: NC-Templates nicht für andere Topics
// ---------------------------------------------------------------------------

describe("43. Topic-Filter: NC-Templates nicht für andere Topics", () => {
  it("NC-Templates nicht verfügbar für regress-Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_REGRESS,
      checkpoints: makeNcSnapshot(),
    });
    const ncIds = ["nc-unterlagen-anforderung", "nc-gespraechsleitfaden", "nc-onboarding-abrechnungsstart"];
    for (const id of ncIds) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });

  it("NC-Templates nicht verfügbar für mfa-einstellung-Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MFA_HIRING,
      checkpoints: makeNcSnapshot(),
    });
    const ncIds = ["nc-unterlagen-anforderung", "nc-gespraechsleitfaden", "nc-onboarding-abrechnungsstart"];
    for (const id of ncIds) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });

  it("NC-Templates nicht verfügbar für azubi-Topic", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
      checkpoints: makeNcSnapshot(),
    });
    const ncIds = ["nc-unterlagen-anforderung", "nc-gespraechsleitfaden", "nc-onboarding-abrechnungsstart"];
    for (const id of ncIds) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 44. Trigger: nc-unterlagen-anforderung
// ---------------------------------------------------------------------------

describe("44. evaluateOfficeWriteModules: nc-unterlagen-anforderung", () => {
  const topic = OFFICE_TOPIC_HIRING_REPLACEMENT;

  it("verfügbar wenn NC-APPROBATION=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-APPROBATION": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "nc-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn NC-APPROBATION=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-APPROBATION": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "nc-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn NC-FACHARZTQUALIFIKATION=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-FACHARZTQUALIFIKATION": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "nc-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn NC-FACHARZTQUALIFIKATION=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-FACHARZTQUALIFIKATION": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "nc-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn NC-BERUFSHAFTPFLICHT=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-BERUFSHAFTPFLICHT": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "nc-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn NC-BERUFSHAFTPFLICHT=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-BERUFSHAFTPFLICHT": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "nc-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });

  it("nicht verfügbar wenn alle drei Nachweischeckpoints YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot(),
    });
    const m = modules.find((m) => m.templateId === "nc-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("verfügbar bei leerem Snapshot (OPEN-Default greift)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "nc-unterlagen-anforderung");
    expect(m?.isAvailable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 45. Trigger: nc-gespraechsleitfaden
// ---------------------------------------------------------------------------

describe("45. evaluateOfficeWriteModules: nc-gespraechsleitfaden", () => {
  const topic = OFFICE_TOPIC_HIRING_REPLACEMENT;

  it("verfügbar wenn NC-TAETIGKEITSUMFANG=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-TAETIGKEITSUMFANG": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "nc-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn NC-TAETIGKEITSUMFANG=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-TAETIGKEITSUMFANG": OfficeCheckpointState.YES }),
    });
    const m = modules.find((m) => m.templateId === "nc-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn NC-BETRIEBSSTAETTENSTRUKTUR=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-BETRIEBSSTAETTENSTRUKTUR": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "nc-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn NC-BETRIEBSSTAETTENSTRUKTUR=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-BETRIEBSSTAETTENSTRUKTUR": OfficeCheckpointState.YES }),
    });
    const m = modules.find((m) => m.templateId === "nc-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(true);
  });

  it("nicht verfügbar wenn beide Checkpoints NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({
        "NC-TAETIGKEITSUMFANG": OfficeCheckpointState.NO,
        "NC-BETRIEBSSTAETTENSTRUKTUR": OfficeCheckpointState.NO,
      }),
    });
    const m = modules.find((m) => m.templateId === "nc-gespraechsleitfaden");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 46. Trigger: nc-onboarding-abrechnungsstart
// ---------------------------------------------------------------------------

describe("46. evaluateOfficeWriteModules: nc-onboarding-abrechnungsstart", () => {
  const topic = OFFICE_TOPIC_HIRING_REPLACEMENT;

  it("verfügbar wenn NC-GENEHMIGUNGSSTATUS=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-GENEHMIGUNGSSTATUS": OfficeCheckpointState.YES }),
    });
    const m = modules.find((m) => m.templateId === "nc-onboarding-abrechnungsstart");
    expect(m?.isAvailable).toBe(true);
    expect(m?.unavailableReason).toBeUndefined();
  });

  it("nicht verfügbar wenn NC-GENEHMIGUNGSSTATUS=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-GENEHMIGUNGSSTATUS": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "nc-onboarding-abrechnungsstart");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("nicht verfügbar wenn NC-GENEHMIGUNGSSTATUS=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeNcSnapshot({ "NC-GENEHMIGUNGSSTATUS": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "nc-onboarding-abrechnungsstart");
    expect(m?.isAvailable).toBe(false);
  });

  it("nicht verfügbar bei leerem Snapshot (OPEN-Default, kein YES)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "nc-onboarding-abrechnungsstart");
    expect(m?.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 47. renderOfficeWriteTemplate: nc-unterlagen-anforderung
// ---------------------------------------------------------------------------

describe("47. renderOfficeWriteTemplate: nc-unterlagen-anforderung", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "nc-unterlagen-anforderung")!;

  const pflichtfelder = {
    datum_schreiben: "20.05.2026",
    praxisname: "Gemeinschaftspraxis Dres. Keller & Nowak",
    arzt_name: "Dr. Martina Böhm",
    fehlende_unterlagen: "Approbationsurkunde\nBerufshaftpflichtnachweis",
  };

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Gemeinschaftspraxis Dres. Keller & Nowak");
    expect(result).toContain("20.05.2026");
    expect(result).toContain("Dr. Martina Böhm");
    expect(result).toContain("Approbationsurkunde");
    expect(result).toContain("Berufshaftpflichtnachweis");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("rueckgabefrist-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      rueckgabefrist: "10.06.2026",
    });
    expect(result).toContain("10.06.2026");
    expect(result).toContain("spätestens");
    expect(result).not.toContain("{{#if");
  });

  it("rueckgabefrist-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("spätestens");
    expect(result).not.toContain("[{{rueckgabefrist}}]");
  });

  it("kontakt_rueckfragen-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      kontakt_rueckfragen: "Tel. 040 / 12345-0",
    });
    expect(result).toContain("Tel. 040 / 12345-0");
    expect(result).not.toContain("{{#if");
  });

  it("kontakt_rueckfragen-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Rückfragen stehen wir");
    expect(result).not.toContain("[{{kontakt_rueckfragen}}]");
  });

  it("fehlende Pflichtfelder werden als [{{key}}] markiert", () => {
    const result = renderOfficeWriteTemplate(tmpl, {});
    expect(result).toContain("[{{datum_schreiben}}]");
    expect(result).toContain("[{{praxisname}}]");
    expect(result).toContain("[{{arzt_name}}]");
    expect(result).toContain("[{{fehlende_unterlagen}}]");
  });
});

// ---------------------------------------------------------------------------
// 48. renderOfficeWriteTemplate: nc-gespraechsleitfaden
// ---------------------------------------------------------------------------

describe("48. renderOfficeWriteTemplate: nc-gespraechsleitfaden", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "nc-gespraechsleitfaden")!;

  const pflichtfelder = {
    praxisname: "Gemeinschaftspraxis Dres. Keller & Nowak",
    arzt_name: "Dr. Martina Böhm",
    einstellungsdatum: "01.10.2026",
    taetigkeitsumfang: "20 h / Woche",
    betriebsstaette: "Hauptstandort Musterstr. 1",
    offene_punkte: "LANR-Zuordnung noch offen",
  };

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Dr. Martina Böhm");
    expect(result).toContain("01.10.2026");
    expect(result).toContain("20 h / Woche");
    expect(result).toContain("Hauptstandort Musterstr. 1");
    expect(result).toContain("LANR-Zuordnung noch offen");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("Gesprächspunkt 3 enthält keine implizite Vertragszusage", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Vertrag folgt separat");
    expect(result).not.toContain("Probezeit");
  });

  it("gespraechsdatum-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      gespraechsdatum: "25.05.2026",
    });
    expect(result).toContain("25.05.2026");
    expect(result).not.toContain("{{#if");
  });

  it("gespraechsdatum-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Datum:");
    expect(result).not.toContain("[{{gespraechsdatum}}]");
  });

  it("verantwortliche_person-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      verantwortliche_person: "Dr. Keller (Praxisleitung)",
    });
    expect(result).toContain("Dr. Keller (Praxisleitung)");
    expect(result).toContain("Gesprächsführung");
    expect(result).not.toContain("{{#if");
  });

  it("verantwortliche_person-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Gesprächsführung");
    expect(result).not.toContain("[{{verantwortliche_person}}]");
  });

  it("fehlende Pflichtfelder werden als [{{key}}] markiert", () => {
    const result = renderOfficeWriteTemplate(tmpl, {});
    expect(result).toContain("[{{praxisname}}]");
    expect(result).toContain("[{{arzt_name}}]");
    expect(result).toContain("[{{einstellungsdatum}}]");
    expect(result).toContain("[{{offene_punkte}}]");
  });
});

// ---------------------------------------------------------------------------
// 49. renderOfficeWriteTemplate: nc-onboarding-abrechnungsstart
// ---------------------------------------------------------------------------

describe("49. renderOfficeWriteTemplate: nc-onboarding-abrechnungsstart", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "nc-onboarding-abrechnungsstart")!;

  const pflichtfelder = {
    praxisname: "Gemeinschaftspraxis Dres. Keller & Nowak",
    arzt_name: "Dr. Martina Böhm",
    startdatum: "01.10.2026",
    betriebsstaette: "Hauptstandort Musterstr. 1",
    taetigkeitsumfang: "20 h / Woche",
    lanr_bsnr_status: "LANR 123456789 zugeordnet, BSNR bestätigt",
    systemzugriffe: "PVS-Zugang\nZeiterfassung\nE-Mail",
    pflichtunterweisungen: "Datenschutz\nSchweigepflicht\nBrandschutz",
    erste_aufgaben: "Woche 1: Einführung Praxisabläufe",
  };

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Dr. Martina Böhm");
    expect(result).toContain("01.10.2026");
    expect(result).toContain("Hauptstandort Musterstr. 1");
    expect(result).toContain("20 h / Woche");
    expect(result).toContain("LANR 123456789 zugeordnet");
    expect(result).toContain("PVS-Zugang");
    expect(result).toContain("Datenschutz");
    expect(result).toContain("Woche 1: Einführung Praxisabläufe");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("verantwortliche_person-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      verantwortliche_person: "Dr. Keller (Praxisleitung)",
    });
    expect(result).toContain("Dr. Keller (Praxisleitung)");
    expect(result).toContain("Ansprechperson Einarbeitung");
    expect(result).not.toContain("{{#if");
  });

  it("verantwortliche_person-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Ansprechperson Einarbeitung");
    expect(result).not.toContain("[{{verantwortliche_person}}]");
    expect(result).not.toContain("{{#if");
  });

  it("fehlende Pflichtfelder werden als [{{key}}] markiert", () => {
    const result = renderOfficeWriteTemplate(tmpl, {});
    expect(result).toContain("[{{arzt_name}}]");
    expect(result).toContain("[{{startdatum}}]");
    expect(result).toContain("[{{lanr_bsnr_status}}]");
    expect(result).toContain("[{{systemzugriffe}}]");
  });
});

// ---------------------------------------------------------------------------
// 50. Compliance: keine unerlaubten Inhalte in NC-Templates
// ---------------------------------------------------------------------------

describe("50. Compliance: keine unerlaubten Inhalte in NC-Templates", () => {
  const ncTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds?.includes(OFFICE_TOPIC_HIRING_REPLACEMENT),
  );

  it("kein Paragraphenzeichen in bodyTemplates", () => {
    for (const t of ncTemplates) {
      expect(t.bodyTemplate).not.toContain("§");
    }
  });

  it("kein 'Zulassungsausschuss-Antrag' in bodyTemplates", () => {
    for (const t of ncTemplates) {
      expect(t.bodyTemplate).not.toContain("Zulassungsausschuss-Antrag");
      expect(t.bodyTemplate).not.toContain("Antrag beim Zulassungsausschuss");
    }
  });

  it("kein 'rechtssicher' in bodyTemplates", () => {
    for (const t of ncTemplates) {
      expect(t.bodyTemplate).not.toContain("rechtssicher");
    }
  });

  it("keine Vertragsklauseln ('§ 626', 'Kündigungsschutz') in bodyTemplates", () => {
    for (const t of ncTemplates) {
      expect(t.bodyTemplate).not.toContain("§ 626");
      expect(t.bodyTemplate).not.toContain("Kündigungsschutz");
    }
  });

  it("kein 'rechtliche Begründung' in bodyTemplates", () => {
    for (const t of ncTemplates) {
      expect(t.bodyTemplate).not.toContain("rechtliche Begründung");
    }
  });
});

// ---------------------------------------------------------------------------
// Hilfsfunktionen – UV (praxisschliessung-urlaubsvertretung)
// ---------------------------------------------------------------------------

function makeUvSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "UV-01": OfficeCheckpointState.YES,
    "UV-02": OfficeCheckpointState.YES,
    "UV-03": OfficeCheckpointState.YES,
    "UV-04": OfficeCheckpointState.YES,
    "UV-05": OfficeCheckpointState.YES,
    "UV-06": OfficeCheckpointState.YES,
    "UV-PATIENTENINFO": OfficeCheckpointState.YES,
    "UV-NOTFALLVERSORGUNG": OfficeCheckpointState.YES,
    "UV-TERMINMANAGEMENT": OfficeCheckpointState.YES,
    "UV-ABRECHNUNGSZUORDNUNG": OfficeCheckpointState.YES,
  };
  return Object.entries({ ...defaults, ...overrides } as Record<string, OfficeCheckpointState>).map(
    ([id, state]) => makeCheckpoint(id, state),
  );
}

// ---------------------------------------------------------------------------
// 51. Katalog-Sanität: UV-Templates
// ---------------------------------------------------------------------------

describe("51. Katalog-Sanität: UV-Templates", () => {
  const uvTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds?.includes(OFFICE_TOPIC_CLOSURE_COVERAGE),
  );

  it("enthält genau 3 UV-Templates", () => {
    expect(uvTemplates).toHaveLength(3);
  });

  it("alle UV-Template-IDs sind eindeutig", () => {
    const ids = uvTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("uv-patienteninfo-aushang: outputKind und writeKind korrekt", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((x) => x.id === "uv-patienteninfo-aushang")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.BETROFFENENINFORMATION);
    expect(t.writeKind).toBe(OfficeWriteKind.PERSON_COMMUNICATION);
    expect(t.smoothingEnabled).toBe(false);
    expect(t.audience).toBe("EXTERNE_STELLE");
    expect(t.estimatedLength).toBe("SHORT");
  });

  it("uv-telefonansage: outputKind und writeKind korrekt", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((x) => x.id === "uv-telefonansage")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.INTERNE_NOTIZ);
    expect(t.writeKind).toBe(OfficeWriteKind.INTERNAL_NOTE);
    expect(t.smoothingEnabled).toBe(false);
    expect(t.audience).toBe("INTERN");
    expect(t.estimatedLength).toBe("SHORT");
  });

  it("uv-uebergabe-checkliste: outputKind und writeKind korrekt", () => {
    const t = OFFICE_WRITE_TEMPLATES.find((x) => x.id === "uv-uebergabe-checkliste")!;
    expect(t.outputKind).toBe(OfficeWriteOutputKind.INTERNE_NOTIZ);
    expect(t.writeKind).toBe(OfficeWriteKind.INTERNAL_NOTE);
    expect(t.smoothingEnabled).toBe(false);
    expect(t.audience).toBe("INTERN");
    expect(t.estimatedLength).toBe("MEDIUM");
  });

  it("alle UV-Templates haben topicIds mit OFFICE_TOPIC_CLOSURE_COVERAGE", () => {
    for (const t of uvTemplates) {
      expect(t.trigger.topicIds).toContain(OFFICE_TOPIC_CLOSURE_COVERAGE);
    }
  });
});

// ---------------------------------------------------------------------------
// 52. Topic-Filter: UV-Templates nicht für andere Topics
// ---------------------------------------------------------------------------

describe("52. Topic-Filter: UV-Templates nicht für andere Topics", () => {
  const uvIds = ["uv-patienteninfo-aushang", "uv-telefonansage", "uv-uebergabe-checkliste"];

  it.each([
    OFFICE_TOPIC_REGRESS,
    OFFICE_TOPIC_MFA_HIRING,
    OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
    OFFICE_TOPIC_HIRING_REPLACEMENT,
  ])("nicht verfügbar für Topic %s", (topic) => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeUvSnapshot(),
    });
    for (const id of uvIds) {
      const m = modules.find((m) => m.templateId === id);
      expect(m?.isAvailable).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 53. Trigger: uv-patienteninfo-aushang
// ---------------------------------------------------------------------------

describe("53. evaluateOfficeWriteModules: uv-patienteninfo-aushang", () => {
  const topic = OFFICE_TOPIC_CLOSURE_COVERAGE;

  it("verfügbar wenn UV-PATIENTENINFO=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeUvSnapshot({ "UV-PATIENTENINFO": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "uv-patienteninfo-aushang");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn UV-PATIENTENINFO=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeUvSnapshot({ "UV-PATIENTENINFO": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "uv-patienteninfo-aushang");
    expect(m?.isAvailable).toBe(true);
  });

  it("nicht verfügbar wenn UV-PATIENTENINFO=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeUvSnapshot({ "UV-PATIENTENINFO": OfficeCheckpointState.YES }),
    });
    const m = modules.find((m) => m.templateId === "uv-patienteninfo-aushang");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("verfügbar bei leerem Snapshot (OPEN-Default greift)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "uv-patienteninfo-aushang");
    expect(m?.isAvailable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 54. Trigger: uv-telefonansage
// ---------------------------------------------------------------------------

describe("54. evaluateOfficeWriteModules: uv-telefonansage", () => {
  const topic = OFFICE_TOPIC_CLOSURE_COVERAGE;

  it("verfügbar wenn UV-PATIENTENINFO=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeUvSnapshot({ "UV-PATIENTENINFO": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "uv-telefonansage");
    expect(m?.isAvailable).toBe(true);
  });

  it("verfügbar wenn UV-PATIENTENINFO=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeUvSnapshot({ "UV-PATIENTENINFO": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "uv-telefonansage");
    expect(m?.isAvailable).toBe(true);
  });

  it("nicht verfügbar wenn UV-PATIENTENINFO=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeUvSnapshot({ "UV-PATIENTENINFO": OfficeCheckpointState.YES }),
    });
    const m = modules.find((m) => m.templateId === "uv-telefonansage");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("verfügbar bei leerem Snapshot (OPEN-Default greift)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "uv-telefonansage");
    expect(m?.isAvailable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 55. Trigger: uv-uebergabe-checkliste
// ---------------------------------------------------------------------------

describe("55. evaluateOfficeWriteModules: uv-uebergabe-checkliste", () => {
  const topic = OFFICE_TOPIC_CLOSURE_COVERAGE;

  it("verfügbar wenn UV-05=YES", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeUvSnapshot({ "UV-05": OfficeCheckpointState.YES }),
    });
    const m = modules.find((m) => m.templateId === "uv-uebergabe-checkliste");
    expect(m?.isAvailable).toBe(true);
    expect(m?.unavailableReason).toBeUndefined();
  });

  it("nicht verfügbar wenn UV-05=NO", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeUvSnapshot({ "UV-05": OfficeCheckpointState.NO }),
    });
    const m = modules.find((m) => m.templateId === "uv-uebergabe-checkliste");
    expect(m?.isAvailable).toBe(false);
    expect(m?.unavailableReason).toBeTruthy();
  });

  it("nicht verfügbar wenn UV-05=OPEN", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: makeUvSnapshot({ "UV-05": OfficeCheckpointState.OPEN }),
    });
    const m = modules.find((m) => m.templateId === "uv-uebergabe-checkliste");
    expect(m?.isAvailable).toBe(false);
  });

  it("nicht verfügbar bei leerem Snapshot (kein YES)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: topic,
      checkpoints: [],
    });
    const m = modules.find((m) => m.templateId === "uv-uebergabe-checkliste");
    expect(m?.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 56. renderOfficeWriteTemplate: uv-patienteninfo-aushang
// ---------------------------------------------------------------------------

describe("56. renderOfficeWriteTemplate: uv-patienteninfo-aushang", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "uv-patienteninfo-aushang")!;

  const pflichtfelder = {
    praxisname: "Hausarztpraxis Dr. Keller",
    schliessungsbeginn: "28.07.2026",
    schliessungsende: "08.08.2026",
    vertretung_name: "Dr. Andrea Nowak",
    vertretung_adresse: "Musterstraße 12, 20095 Hamburg",
    vertretung_telefon: "040 / 98765-0",
  };

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Hausarztpraxis Dr. Keller");
    expect(result).toContain("28.07.2026");
    expect(result).toContain("08.08.2026");
    expect(result).toContain("Dr. Andrea Nowak");
    expect(result).toContain("Musterstraße 12, 20095 Hamburg");
    expect(result).toContain("040 / 98765-0");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("notfallhinweis-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      notfallhinweis: "Im Notfall: 116 117 oder 112",
    });
    expect(result).toContain("Im Notfall: 116 117 oder 112");
    expect(result).not.toContain("{{#if");
  });

  it("notfallhinweis-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Im Notfall");
    expect(result).not.toContain("[{{notfallhinweis}}]");
    expect(result).not.toContain("{{#if");
  });

  it("fehlende Pflichtfelder werden als [{{key}}] markiert", () => {
    const result = renderOfficeWriteTemplate(tmpl, {});
    expect(result).toContain("[{{praxisname}}]");
    expect(result).toContain("[{{schliessungsbeginn}}]");
    expect(result).toContain("[{{vertretung_name}}]");
    expect(result).toContain("[{{vertretung_telefon}}]");
  });

  it("vertretung_oeffnungszeiten erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      vertretung_oeffnungszeiten: "Mo–Fr 8–12 Uhr und 14–18 Uhr",
    });
    expect(result).toContain("Sprechzeiten / Erreichbarkeit: Mo–Fr 8–12 Uhr und 14–18 Uhr");
    expect(result).not.toContain("{{#if");
  });

  it("vertretung_oeffnungszeiten fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Sprechzeiten / Erreichbarkeit");
    expect(result).not.toContain("[{{vertretung_oeffnungszeiten}}]");
    expect(result).not.toContain("{{#if");
  });
});

// ---------------------------------------------------------------------------
// 57. renderOfficeWriteTemplate: uv-telefonansage
// ---------------------------------------------------------------------------

describe("57. renderOfficeWriteTemplate: uv-telefonansage", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "uv-telefonansage")!;

  const pflichtfelder = {
    praxisname: "Hausarztpraxis Dr. Keller",
    schliessungsbeginn: "28.07.2026",
    schliessungsende: "08.08.2026",
    vertretung_name: "Dr. Andrea Nowak",
    vertretung_telefon: "040 / 98765-0",
  };

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Hausarztpraxis Dr. Keller");
    expect(result).toContain("28.07.2026");
    expect(result).toContain("08.08.2026");
    expect(result).toContain("Dr. Andrea Nowak");
    expect(result).toContain("040 / 98765-0");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("notfallhinweis erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      notfallhinweis: "Im Notfall: 116 117",
    });
    expect(result).toContain("Im Notfall: 116 117");
    expect(result).not.toContain("{{#if");
  });

  it("notfallhinweis fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("[{{notfallhinweis}}]");
    expect(result).not.toContain("{{#if");
  });

  it("fehlende Pflichtfelder werden als [{{key}}] markiert", () => {
    const result = renderOfficeWriteTemplate(tmpl, {});
    expect(result).toContain("[{{praxisname}}]");
    expect(result).toContain("[{{schliessungsbeginn}}]");
    expect(result).toContain("[{{vertretung_name}}]");
    expect(result).toContain("[{{vertretung_telefon}}]");
  });
});

// ---------------------------------------------------------------------------
// 58. renderOfficeWriteTemplate: uv-uebergabe-checkliste
// ---------------------------------------------------------------------------

describe("58. renderOfficeWriteTemplate: uv-uebergabe-checkliste", () => {
  const tmpl = OFFICE_WRITE_TEMPLATES.find((t) => t.id === "uv-uebergabe-checkliste")!;

  const pflichtfelder = {
    praxisname: "Hausarztpraxis Dr. Keller",
    schliessungsbeginn: "28.07.2026",
    schliessungsende: "08.08.2026",
    vertretungsarzt_name: "Dr. Andrea Nowak",
    vertretungsarzt_kontakt: "Tel. 040 / 98765-0",
    offene_aufgaben: "Rezeptwiederholungen vorbereiten\nLaborbefunde weiterleiten\nNachsorgetermine absagen",
  };

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).toContain("Hausarztpraxis Dr. Keller");
    expect(result).toContain("28.07.2026");
    expect(result).toContain("08.08.2026");
    expect(result).toContain("Dr. Andrea Nowak");
    expect(result).toContain("Tel. 040 / 98765-0");
    expect(result).toContain("Rezeptwiederholungen vorbereiten");
    expect(result).not.toContain("{{#if");
    expect(result).not.toContain("{{/if}}");
  });

  it("abrechnungshinweis-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, {
      ...pflichtfelder,
      abrechnungshinweis: "Quartalsabschluss noch offen",
    });
    expect(result).toContain("Quartalsabschluss noch offen");
    expect(result).toContain("Abrechnungshinweis");
    expect(result).not.toContain("{{#if");
  });

  it("abrechnungshinweis-Block fehlt wenn nicht gesetzt", () => {
    const result = renderOfficeWriteTemplate(tmpl, pflichtfelder);
    expect(result).not.toContain("Abrechnungshinweis");
    expect(result).not.toContain("[{{abrechnungshinweis}}]");
    expect(result).not.toContain("{{#if");
  });

  it("fehlende Pflichtfelder werden als [{{key}}] markiert", () => {
    const result = renderOfficeWriteTemplate(tmpl, {});
    expect(result).toContain("[{{praxisname}}]");
    expect(result).toContain("[{{vertretungsarzt_name}}]");
    expect(result).toContain("[{{offene_aufgaben}}]");
  });
});

// ---------------------------------------------------------------------------
// 59. Compliance: keine unerlaubten Inhalte in UV-Templates
// ---------------------------------------------------------------------------

describe("59. Compliance: keine unerlaubten Inhalte in UV-Templates", () => {
  const uvTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds?.includes(OFFICE_TOPIC_CLOSURE_COVERAGE),
  );

  it("kein Paragraphenzeichen in bodyTemplates", () => {
    for (const t of uvTemplates) {
      expect(t.bodyTemplate).not.toContain("§");
    }
  });

  it("keine KV-Antragsformulierung in bodyTemplates", () => {
    for (const t of uvTemplates) {
      expect(t.bodyTemplate).not.toContain("Zulassungsausschuss");
      expect(t.bodyTemplate).not.toContain("KV-Antrag");
      expect(t.bodyTemplate).not.toContain("Antrag bei der KV");
    }
  });

  it("keine Fristbewertung in bodyTemplates", () => {
    for (const t of uvTemplates) {
      expect(t.bodyTemplate).not.toContain("Frist");
      expect(t.bodyTemplate).not.toContain("fristgerecht");
    }
  });

  it("keine Patientendaten-Weitergabe in bodyTemplates (kein 'Patientendaten')", () => {
    for (const t of uvTemplates) {
      expect(t.bodyTemplate).not.toContain("Patientendaten");
      expect(t.bodyTemplate).not.toContain("Patientenakte");
    }
  });

  it("kein 'rechtssicher' in bodyTemplates", () => {
    for (const t of uvTemplates) {
      expect(t.bodyTemplate).not.toContain("rechtssicher");
    }
  });
});
