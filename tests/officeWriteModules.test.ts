import {
  OFFICE_WRITE_TEMPLATES,
  OfficeWriteOutputKind,
  OfficeWriteKind,
} from "@/lib/office/writeModules";
import {
  evaluateOfficeWriteModules,
  renderOfficeWriteTemplate,
} from "@/lib/office/writeRenderer";
import { OFFICE_TOPIC_REGRESS, OFFICE_TOPIC_KV_BILLING, OFFICE_TOPIC_DATA_PROTECTION_INCIDENT } from "@/lib/office/checkpointCatalog";
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
