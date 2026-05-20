import {
  OFFICE_TOPIC_RESPONSIBILITY_COORDINATION,
  getOfficeCheckpointCatalog,
} from "@/lib/office/checkpointCatalog";
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

/** Alle RZ-Checkpoints auf YES; einzelne States via overrides überschreibbar. */
function makeRzSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "RZ-01": OfficeCheckpointState.YES,
    "RZ-02": OfficeCheckpointState.YES,
    "RZ-03": OfficeCheckpointState.YES,
    "RZ-04": OfficeCheckpointState.YES,
    "RZ-05": OfficeCheckpointState.YES,
    "RZ-06": OfficeCheckpointState.YES,
    "RZ-07": OfficeCheckpointState.YES,
    "RZ-08": OfficeCheckpointState.YES,
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

describe("officeResponsibilityCoordinationTopic – Checkpoint-Katalog", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_RESPONSIBILITY_COORDINATION);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthält genau die 8 RZ-Checkpoints in der richtigen Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "RZ-01", "RZ-02", "RZ-03", "RZ-04",
      "RZ-05", "RZ-06", "RZ-07", "RZ-08",
    ]);
  });

  it("kein RZ-Checkpoint hat legalRefs", () => {
    for (const cp of catalog) {
      expect(cp.legalRefs ?? []).toHaveLength(0);
    }
  });

  it("kein RZ-Checkpoint hat authorityKeys", () => {
    for (const cp of catalog) {
      expect(cp.authorityKeys ?? []).toHaveLength(0);
    }
  });

  it("RZ-08 hat keine externen Referenzen (interner Abschluss-Entscheid)", () => {
    const cp = byId.get("RZ-08");
    expect(cp?.legalRefs ?? []).toHaveLength(0);
    expect(cp?.authorityKeys ?? []).toHaveLength(0);
    expect(cp?.requiredEvidenceKeys ?? []).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. WRITE-Modul-Katalog
// ---------------------------------------------------------------------------

describe("officeResponsibilityCoordinationTopic – WRITE-Modul-Katalog", () => {
  const rzTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds.includes(OFFICE_TOPIC_RESPONSIBILITY_COORDINATION),
  );

  it("enthält genau 3 RZ-Templates", () => {
    expect(rzTemplates).toHaveLength(3);
  });

  it("enthält die erwarteten Template-IDs", () => {
    const ids = rzTemplates.map((t) => t.id);
    expect(ids).toContain("zustaendigkeits-uebersicht");
    expect(ids).toContain("uebergabe-notiz-stelle");
    expect(ids).toContain("teaminfo-rollen");
  });

  it("alle Template-IDs sind global eindeutig", () => {
    const allIds = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("RZ-Templates sind nicht für andere Topics verfügbar", () => {
    const result = evaluateOfficeWriteModules({
      topicId: "meldepflichten-zustaendige-stellen",
      checkpoints: [],
    });
    for (const id of ["zustaendigkeits-uebersicht", "uebergabe-notiz-stelle", "teaminfo-rollen"]) {
      const mod = result.find((m) => m.templateId === id);
      expect(mod?.isAvailable ?? false).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Trigger: zustaendigkeits-uebersicht
// ---------------------------------------------------------------------------

describe("zustaendigkeits-uebersicht – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeRzSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_RESPONSIBILITY_COORDINATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "zustaendigkeits-uebersicht")!;
  }

  it("verfügbar wenn RZ-01 YES und RZ-02 OPEN", () => {
    const mod = evaluate({ "RZ-02": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn RZ-01 YES und RZ-02 NO", () => {
    const mod = evaluate({ "RZ-02": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn RZ-01 YES und RZ-03 OPEN", () => {
    const mod = evaluate({ "RZ-03": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn RZ-01 YES und RZ-03 NO", () => {
    const mod = evaluate({ "RZ-03": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn RZ-01 OPEN", () => {
    const mod = evaluate({ "RZ-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("NICHT verfügbar für leeren Snapshot (allOf RZ-01=YES nicht erfüllt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_RESPONSIBILITY_COORDINATION,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "zustaendigkeits-uebersicht")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Trigger: uebergabe-notiz-stelle
// ---------------------------------------------------------------------------

describe("uebergabe-notiz-stelle – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeRzSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_RESPONSIBILITY_COORDINATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "uebergabe-notiz-stelle")!;
  }

  it("verfügbar wenn RZ-01 YES und RZ-07 OPEN", () => {
    const mod = evaluate({ "RZ-07": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn RZ-01 YES und RZ-07 NO", () => {
    const mod = evaluate({ "RZ-07": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn RZ-01 OPEN", () => {
    const mod = evaluate({ "RZ-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT für leeren Snapshot (RZ-01 defensiv OPEN → geblockt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_RESPONSIBILITY_COORDINATION,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "uebergabe-notiz-stelle")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Trigger: teaminfo-rollen
// ---------------------------------------------------------------------------

describe("teaminfo-rollen – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeRzSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_RESPONSIBILITY_COORDINATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "teaminfo-rollen")!;
  }

  it("verfügbar wenn RZ-05 OPEN", () => {
    const mod = evaluate({ "RZ-05": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn RZ-05 NO", () => {
    const mod = evaluate({ "RZ-05": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn RZ-06 OPEN", () => {
    const mod = evaluate({ "RZ-06": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn RZ-06 NO", () => {
    const mod = evaluate({ "RZ-06": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn RZ-01 OPEN", () => {
    const mod = evaluate({ "RZ-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT für leeren Snapshot (RZ-01 defensiv OPEN → geblockt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_RESPONSIBILITY_COORDINATION,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "teaminfo-rollen")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Render: zustaendigkeits-uebersicht
// ---------------------------------------------------------------------------

describe("zustaendigkeits-uebersicht – Render", () => {
  const template = findModule("zustaendigkeits-uebersicht")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Musterfrau",
      stand_datum: "01.08.2025",
      zustaendigkeiten: "Rezeption: Frau Müller\nAbrechnung: Frau Schmidt",
      vertretungsstruktur: "Bei Abwesenheit übernimmt Frau Maier",
    });
    expect(result).toContain("Praxis Musterfrau");
    expect(result).toContain("01.08.2025");
    expect(result).toContain("Rezeption: Frau Müller");
    expect(result).toContain("Bei Abwesenheit übernimmt Frau Maier");
  });

  it("optionaler Eskalationsweg wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis X",
      stand_datum: "01.08.2025",
      zustaendigkeiten: "Z",
      vertretungsstruktur: "V",
      eskalationsweg: "Praxisleitung Dr. Meier",
    });
    expect(result).toContain("Eskalationsweg:");
    expect(result).toContain("Praxisleitung Dr. Meier");
  });

  it("fehlendes optionales Feld eskalationsweg erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis X",
      stand_datum: "01.08.2025",
      zustaendigkeiten: "Z",
      vertretungsstruktur: "V",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Eskalationsweg:");
  });

  it("optionaler Hinweis-Block wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis X",
      stand_datum: "01.08.2025",
      zustaendigkeiten: "Z",
      vertretungsstruktur: "V",
      hinweis: "Gültig ab Quartalsbeginn",
    });
    expect(result).toContain("Gültig ab Quartalsbeginn");
  });

  it("Footer enthält 'Arbeitshilfe'", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      stand_datum: "01.08.2025",
      zustaendigkeiten: "Z",
      vertretungsstruktur: "V",
    });
    expect(result).toContain("Arbeitshilfe");
  });

  it("kein {{ verbleibt im Output (alle optionalen Felder gesetzt)", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      stand_datum: "01.08.2025",
      zustaendigkeiten: "Z",
      vertretungsstruktur: "V",
      eskalationsweg: "E",
      hinweis: "H",
    });
    expect(result).not.toContain("{{");
  });
});

// ---------------------------------------------------------------------------
// 7. Render: uebergabe-notiz-stelle
// ---------------------------------------------------------------------------

describe("uebergabe-notiz-stelle – Render", () => {
  const template = findModule("uebergabe-notiz-stelle")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Mustermann",
      stelle_bezeichnung: "MFA Rezeption",
      uebergabe_an: "Frau Schulz",
      aufgaben_liste: "Terminverwaltung, Patientenempfang",
      offene_punkte: "Passwort Praxissoftware übergeben",
    });
    expect(result).toContain("Praxis Mustermann");
    expect(result).toContain("MFA Rezeption");
    expect(result).toContain("Frau Schulz");
    expect(result).toContain("Terminverwaltung");
    expect(result).toContain("Passwort Praxissoftware");
  });

  it("optionaler Zugänge-Block wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      stelle_bezeichnung: "S",
      uebergabe_an: "U",
      aufgaben_liste: "A",
      offene_punkte: "O",
      zugang_info: "PVS-Passwort: XY123",
    });
    expect(result).toContain("Zugänge und Systeme:");
    expect(result).toContain("PVS-Passwort: XY123");
  });

  it("fehlendes optionales Feld zugang_info erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      stelle_bezeichnung: "S",
      uebergabe_an: "U",
      aufgaben_liste: "A",
      offene_punkte: "O",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Zugänge und Systeme:");
  });

  it("optionaler Hinweis-Block wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      stelle_bezeichnung: "S",
      uebergabe_an: "U",
      aufgaben_liste: "A",
      offene_punkte: "O",
      hinweis: "Rückfragen an Praxisleitung",
    });
    expect(result).toContain("Rückfragen an Praxisleitung");
  });

  it("Footer enthält 'Arbeitshilfe'", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      stelle_bezeichnung: "S",
      uebergabe_an: "U",
      aufgaben_liste: "A",
      offene_punkte: "O",
    });
    expect(result).toContain("Arbeitshilfe");
  });

  it("kein {{ verbleibt im Output (alle optionalen Felder gesetzt)", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      stelle_bezeichnung: "S",
      uebergabe_an: "U",
      aufgaben_liste: "A",
      offene_punkte: "O",
      zugang_info: "Z",
      hinweis: "H",
      uebergabe_von: "V",
    });
    expect(result).not.toContain("{{");
  });

  it("uebergabe_von gesetzt: erscheint im Kopfbereich", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      stelle_bezeichnung: "S",
      uebergabe_an: "Frau Schulz",
      aufgaben_liste: "A",
      offene_punkte: "O",
      uebergabe_von: "Frau Müller",
    });
    expect(result).toContain("Übergabe von: Frau Müller");
  });

  it("fehlendes uebergabe_von erzeugt keinen {{-Marker und keine Artefaktzeile", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      stelle_bezeichnung: "S",
      uebergabe_an: "U",
      aufgaben_liste: "A",
      offene_punkte: "O",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Übergabe von:");
  });
});

// ---------------------------------------------------------------------------
// 8. Render: teaminfo-rollen
// ---------------------------------------------------------------------------

describe("teaminfo-rollen – Render", () => {
  const template = findModule("teaminfo-rollen")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis am Markt",
      kontext: "Neue Teamstruktur ab Q3",
      neue_regelungen: "Frau Müller übernimmt Abrechnung",
      ansprechpartner_liste: "Abrechnung: Fr. Müller\nRezeption: Fr. Schulz",
    });
    expect(result).toContain("Praxis am Markt");
    expect(result).toContain("Neue Teamstruktur ab Q3");
    expect(result).toContain("Frau Müller übernimmt Abrechnung");
    expect(result).toContain("Fr. Schulz");
  });

  it("optionaler Eskalationsweg wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      kontext: "K",
      neue_regelungen: "N",
      ansprechpartner_liste: "A",
      eskalationsweg: "Dr. Meier direkt ansprechen",
    });
    expect(result).toContain("Eskalationsweg:");
    expect(result).toContain("Dr. Meier direkt ansprechen");
  });

  it("fehlendes optionales Feld eskalationsweg erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      kontext: "K",
      neue_regelungen: "N",
      ansprechpartner_liste: "A",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Eskalationsweg:");
  });

  it("optionaler Hinweise-Block wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      kontext: "K",
      neue_regelungen: "N",
      ansprechpartner_liste: "A",
      besondere_hinweise: "Änderungen gelten ab 01.09.",
    });
    expect(result).toContain("Änderungen gelten ab 01.09.");
  });

  it("Agenda-Block enthält Standardpunkte", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      kontext: "K",
      neue_regelungen: "N",
      ansprechpartner_liste: "A",
    });
    expect(result).toContain("Agenda:");
    expect(result).toContain("Wer übernimmt welche Aufgaben?");
    expect(result).toContain("Vertretungsregelungen");
    expect(result).toContain("Eskalation");
  });

  it("Footer enthält 'Arbeitshilfe'", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      kontext: "K",
      neue_regelungen: "N",
      ansprechpartner_liste: "A",
    });
    expect(result).toContain("Arbeitshilfe");
  });

  it("kein {{ verbleibt im Output (alle optionalen Felder gesetzt)", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      kontext: "K",
      neue_regelungen: "N",
      ansprechpartner_liste: "A",
      eskalationsweg: "E",
      besondere_hinweise: "B",
      datum: "01.06.2026",
    });
    expect(result).not.toContain("{{");
  });

  it("datum gesetzt: erscheint im Kopfbereich", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      kontext: "K",
      neue_regelungen: "N",
      ansprechpartner_liste: "A",
      datum: "01.06.2026",
    });
    expect(result).toContain("Datum: 01.06.2026");
  });

  it("fehlendes datum erzeugt keinen {{-Marker und keine Artefaktzeile", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      kontext: "K",
      neue_regelungen: "N",
      ansprechpartner_liste: "A",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Datum:");
  });
});

// ---------------------------------------------------------------------------
// 9. Compliance – verbotene Begriffe
// ---------------------------------------------------------------------------

describe("officeResponsibilityCoordinationTopic – Compliance", () => {
  const rzTemplates = [
    "zustaendigkeits-uebersicht",
    "uebergabe-notiz-stelle",
    "teaminfo-rollen",
  ].map((id) => findModule(id)!);

  const forbidden = [
    "§",
    "Haftung",
    "Weisungsrecht",
    "Disziplinarmaßnahme",
    "Rechtsberatung",
    "rechtssicher",
    "Arbeitsvertrag",
    "Aufhebungsvertrag",
  ];

  for (const term of forbidden) {
    it(`bodyTemplate enthält nicht "${term}"`, () => {
      for (const t of rzTemplates) {
        expect(t.bodyTemplate).not.toContain(term);
      }
    });
  }

  it("kein RZ-Checkpoint hat legalRefs (keine §-Referenzen)", () => {
    const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_RESPONSIBILITY_COORDINATION);
    for (const cp of catalog) {
      expect(cp.legalRefs ?? []).toHaveLength(0);
    }
  });
});
