import {
  OFFICE_TOPIC_TRAINING_COORDINATION,
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

/** Alle FO-Checkpoints auf YES; einzelne States via overrides überschreibbar. */
function makeFoSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "FO-01": OfficeCheckpointState.YES,
    "FO-02": OfficeCheckpointState.YES,
    "FO-03": OfficeCheckpointState.YES,
    "FO-04": OfficeCheckpointState.YES,
    "FO-05": OfficeCheckpointState.YES,
    "FO-06": OfficeCheckpointState.YES,
    "FO-07": OfficeCheckpointState.YES,
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

describe("officeTrainingCoordinationTopic – Checkpoint-Katalog", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_TRAINING_COORDINATION);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthält genau die 7 FO-Checkpoints in der richtigen Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "FO-01", "FO-02", "FO-03", "FO-04",
      "FO-05", "FO-06", "FO-07",
    ]);
  });

  it("kein FO-Checkpoint hat legalRefs", () => {
    for (const cp of catalog) {
      expect(cp.legalRefs ?? []).toHaveLength(0);
    }
  });

  it("kein FO-Checkpoint hat authorityKeys", () => {
    for (const cp of catalog) {
      expect(cp.authorityKeys ?? []).toHaveLength(0);
    }
  });

  it("kein FO-Checkpoint hat requiredEvidenceKeys", () => {
    for (const cp of catalog) {
      expect(cp.requiredEvidenceKeys ?? []).toHaveLength(0);
    }
  });

  it("FO-07 hat keine externen Referenzen (interner Abschluss-Entscheid)", () => {
    const cp = byId.get("FO-07");
    expect(cp?.legalRefs ?? []).toHaveLength(0);
    expect(cp?.authorityKeys ?? []).toHaveLength(0);
    expect(cp?.requiredEvidenceKeys ?? []).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. WRITE-Modul-Katalog
// ---------------------------------------------------------------------------

describe("officeTrainingCoordinationTopic – WRITE-Modul-Katalog", () => {
  const foTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds.includes(OFFICE_TOPIC_TRAINING_COORDINATION),
  );

  it("enthält genau 3 FO-Templates", () => {
    expect(foTemplates).toHaveLength(3);
  });

  it("enthält die erwarteten Template-IDs", () => {
    const ids = foTemplates.map((t) => t.id);
    expect(ids).toContain("schulungs-terminankuendigung");
    expect(ids).toContain("teilnehmerliste-schulung");
    expect(ids).toContain("schulungsnachbereitung");
  });

  it("alle Template-IDs sind global eindeutig", () => {
    const allIds = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("FO-Templates sind nicht für andere Topics verfügbar", () => {
    const result = evaluateOfficeWriteModules({
      topicId: "meldepflichten-zustaendige-stellen",
      checkpoints: [],
    });
    for (const id of ["schulungs-terminankuendigung", "teilnehmerliste-schulung", "schulungsnachbereitung"]) {
      const mod = result.find((m) => m.templateId === id);
      expect(mod?.isAvailable ?? false).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Trigger: schulungs-terminankuendigung
// ---------------------------------------------------------------------------

describe("schulungs-terminankuendigung – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeFoSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_TRAINING_COORDINATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "schulungs-terminankuendigung")!;
  }

  it("verfügbar wenn FO-01 YES, FO-02 YES und FO-04 OPEN", () => {
    const mod = evaluate({ "FO-04": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn FO-01 YES, FO-02 YES und FO-04 NO", () => {
    const mod = evaluate({ "FO-04": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("NICHT verfügbar wenn FO-02 OPEN (allOf nicht erfüllt)", () => {
    const mod = evaluate({ "FO-02": OfficeCheckpointState.OPEN, "FO-04": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn FO-01 OPEN", () => {
    const mod = evaluate({ "FO-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("NICHT verfügbar für leeren Snapshot (allOf nicht erfüllt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_TRAINING_COORDINATION,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "schulungs-terminankuendigung")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Trigger: teilnehmerliste-schulung
// ---------------------------------------------------------------------------

describe("teilnehmerliste-schulung – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeFoSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_TRAINING_COORDINATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "teilnehmerliste-schulung")!;
  }

  it("verfügbar wenn FO-01 YES, FO-02 YES und FO-05 OPEN", () => {
    const mod = evaluate({ "FO-05": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn FO-01 YES, FO-02 YES und FO-05 NO", () => {
    const mod = evaluate({ "FO-05": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("NICHT verfügbar wenn FO-02 OPEN (allOf nicht erfüllt)", () => {
    const mod = evaluate({ "FO-02": OfficeCheckpointState.OPEN, "FO-05": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn FO-01 OPEN", () => {
    const mod = evaluate({ "FO-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT für leeren Snapshot", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_TRAINING_COORDINATION,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "teilnehmerliste-schulung")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Trigger: schulungsnachbereitung
// ---------------------------------------------------------------------------

describe("schulungsnachbereitung – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeFoSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_TRAINING_COORDINATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "schulungsnachbereitung")!;
  }

  it("verfügbar wenn FO-01 YES, FO-05 YES und FO-06 OPEN", () => {
    const mod = evaluate({ "FO-06": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn FO-01 YES, FO-05 YES und FO-06 NO", () => {
    const mod = evaluate({ "FO-06": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn FO-01 YES, FO-05 YES und FO-07 OPEN", () => {
    const mod = evaluate({ "FO-07": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn FO-01 YES, FO-05 YES und FO-07 NO", () => {
    const mod = evaluate({ "FO-07": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("NICHT verfügbar wenn FO-05 OPEN (allOf nicht erfüllt)", () => {
    const mod = evaluate({ "FO-05": OfficeCheckpointState.OPEN, "FO-06": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn FO-01 OPEN", () => {
    const mod = evaluate({ "FO-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT für leeren Snapshot", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_TRAINING_COORDINATION,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "schulungsnachbereitung")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Render: schulungs-terminankuendigung
// ---------------------------------------------------------------------------

describe("schulungs-terminankuendigung – Render", () => {
  const template = findModule("schulungs-terminankuendigung")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Sonneck",
      schulungsthema: "Hygieneunterweisung 2026",
      termin_datum: "15.06.2026",
      zielgruppe: "Gesamtes Praxisteam",
    });
    expect(result).toContain("Praxis Sonneck");
    expect(result).toContain("Hygieneunterweisung 2026");
    expect(result).toContain("15.06.2026");
    expect(result).toContain("Gesamtes Praxisteam");
  });

  it("optionale Uhrzeit erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      zielgruppe: "Z",
      termin_uhrzeit: "14:00 Uhr",
    });
    expect(result).toContain("Uhrzeit: 14:00 Uhr");
  });

  it("fehlende Uhrzeit erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      zielgruppe: "Z",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Uhrzeit:");
  });

  it("optionaler Ort erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      zielgruppe: "Z",
      ort: "Besprechungsraum 1",
    });
    expect(result).toContain("Ort: Besprechungsraum 1");
  });

  it("fehlender Ort erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      zielgruppe: "Z",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Ort:");
  });

  it("optionaler Referent erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      zielgruppe: "Z",
      referent: "Frau Dr. Koch",
    });
    expect(result).toContain("Referent / Referentin: Frau Dr. Koch");
  });

  it("optionale Vorbereitung erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      zielgruppe: "Z",
      vorbereitung: "Hygieneplan vorab lesen",
    });
    expect(result).toContain("Vorbereitung:");
    expect(result).toContain("Hygieneplan vorab lesen");
  });

  it("Agenda-Block enthält Standardpunkte", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      zielgruppe: "Z",
    });
    expect(result).toContain("Agenda:");
    expect(result).toContain("Einführung:");
    expect(result).toContain("Folgeschritte:");
    expect(result).toContain("Offene Punkte:");
  });

  it("Footer enthält 'Arbeitshilfe'", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      zielgruppe: "Z",
    });
    expect(result).toContain("Arbeitshilfe");
  });

  it("kein {{ verbleibt im Output (alle optionalen Felder gesetzt)", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      zielgruppe: "Z",
      termin_uhrzeit: "14:00 Uhr",
      ort: "Raum 1",
      referent: "Fr. Koch",
      vorbereitung: "V",
      hinweis: "H",
    });
    expect(result).not.toContain("{{");
  });
});

// ---------------------------------------------------------------------------
// 7. Render: teilnehmerliste-schulung
// ---------------------------------------------------------------------------

describe("teilnehmerliste-schulung – Render", () => {
  const template = findModule("teilnehmerliste-schulung")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis am Markt",
      schulungsthema: "Umgang mit dem neuen PVS",
      termin_datum: "15.06.2026",
      teilnehmer_liste: "Sandra Müller – MFA\nLena Koch – MFA\nPetra Wolf – Praxismanagerin",
    });
    expect(result).toContain("Praxis am Markt");
    expect(result).toContain("Umgang mit dem neuen PVS");
    expect(result).toContain("15.06.2026");
    expect(result).toContain("Sandra Müller");
    expect(result).toContain("Petra Wolf");
  });

  it("optionaler Dokumentations-Hinweis erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      teilnehmer_liste: "L",
      unterschriften_hinweis: "Anwesenheit per Handzeichen intern dokumentiert",
    });
    expect(result).toContain("Dokumentation:");
    expect(result).toContain("Anwesenheit per Handzeichen intern dokumentiert");
  });

  it("fehlender Dokumentations-Hinweis erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      teilnehmer_liste: "L",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Dokumentation:");
  });

  it("optionale abwesende Personen erscheinen wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      teilnehmer_liste: "L",
      abwesende_mit_grund: "Fr. Maier – Urlaub",
    });
    expect(result).toContain("Nicht anwesend:");
    expect(result).toContain("Fr. Maier – Urlaub");
  });

  it("fehlende abwesende Personen erzeugen keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      teilnehmer_liste: "L",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Nicht anwesend:");
  });

  it("Footer enthält 'Arbeitshilfe'", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      teilnehmer_liste: "L",
    });
    expect(result).toContain("Arbeitshilfe");
  });

  it("kein {{ verbleibt im Output (alle optionalen Felder gesetzt)", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      teilnehmer_liste: "L",
      unterschriften_hinweis: "U",
      abwesende_mit_grund: "A",
    });
    expect(result).not.toContain("{{");
  });
});

// ---------------------------------------------------------------------------
// 8. Render: schulungsnachbereitung
// ---------------------------------------------------------------------------

describe("schulungsnachbereitung – Render", () => {
  const template = findModule("schulungsnachbereitung")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Haas",
      schulungsthema: "Notfallmanagement Praxis",
      termin_datum: "15.06.2026",
      teilnehmer_anzahl: "5",
      inhalte_zusammenfassung: "Ablauf bei medizinischen Notfällen im Wartezimmer besprochen",
      offene_punkte: "Defibrillator-Standort noch nicht final kommuniziert",
      folgeaufgaben: "Fr. Müller: Aushang Notfallplan bis 20.06. – Fr. Koch: Defi-Standort klären",
    });
    expect(result).toContain("Praxis Haas");
    expect(result).toContain("Notfallmanagement Praxis");
    expect(result).toContain("15.06.2026");
    expect(result).toContain("5");
    expect(result).toContain("Notfällen im Wartezimmer");
    expect(result).toContain("Defibrillator-Standort");
    expect(result).toContain("Fr. Müller:");
  });

  it("optionaler Nächster-Termin-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      teilnehmer_anzahl: "3",
      inhalte_zusammenfassung: "I",
      offene_punkte: "O",
      folgeaufgaben: "F",
      naechster_termin: "Wiederholung geplant: 15.09.2026",
    });
    expect(result).toContain("Nächster Termin:");
    expect(result).toContain("Wiederholung geplant: 15.09.2026");
  });

  it("fehlender Nächster-Termin erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      teilnehmer_anzahl: "3",
      inhalte_zusammenfassung: "I",
      offene_punkte: "O",
      folgeaufgaben: "F",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Nächster Termin:");
  });

  it("optionaler Hinweis-Block erscheint wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      teilnehmer_anzahl: "3",
      inhalte_zusammenfassung: "I",
      offene_punkte: "O",
      folgeaufgaben: "F",
      hinweis: "Protokoll liegt in Ordner Schulungen ab",
    });
    expect(result).toContain("Hinweis:");
    expect(result).toContain("Protokoll liegt in Ordner Schulungen ab");
  });

  it("Footer enthält 'Arbeitshilfe'", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      teilnehmer_anzahl: "3",
      inhalte_zusammenfassung: "I",
      offene_punkte: "O",
      folgeaufgaben: "F",
    });
    expect(result).toContain("Arbeitshilfe");
  });

  it("kein {{ verbleibt im Output (alle optionalen Felder gesetzt)", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      schulungsthema: "S",
      termin_datum: "15.06.2026",
      teilnehmer_anzahl: "3",
      inhalte_zusammenfassung: "I",
      offene_punkte: "O",
      folgeaufgaben: "F",
      naechster_termin: "N",
      hinweis: "H",
    });
    expect(result).not.toContain("{{");
  });
});

// ---------------------------------------------------------------------------
// 9. Compliance – verbotene Begriffe
// ---------------------------------------------------------------------------

describe("officeTrainingCoordinationTopic – Compliance", () => {
  const foTemplates = [
    "schulungs-terminankuendigung",
    "teilnehmerliste-schulung",
    "schulungsnachbereitung",
  ].map((id) => findModule(id)!);

  const forbidden = [
    "§",
    "Fortbildungspflicht",
    "CME",
    "Ärztekammer",
    "Zertifikat",
    "Nachweis",
    "Punktekonto",
    "Pflichtschulung",
    "Teilnahmebestätigung",
    "bestätigt",
    "zertifiziert",
    "rechtssicher",
    "Rechtsberatung",
    "Haftung",
    "Weisungsrecht",
    "Arbeitsvertrag",
    "Entgeltfortzahlung",
    "DSGVO-Pflicht",
    "MPDG",
  ];

  for (const term of forbidden) {
    it(`bodyTemplate enthält nicht "${term}"`, () => {
      for (const t of foTemplates) {
        expect(t.bodyTemplate).not.toContain(term);
      }
    });
  }

  it("kein FO-Checkpoint hat legalRefs (keine §-Referenzen)", () => {
    const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_TRAINING_COORDINATION);
    for (const cp of catalog) {
      expect(cp.legalRefs ?? []).toHaveLength(0);
    }
  });

  it("teilnehmerliste-schulung enthält nicht 'Teilnahmebestätigung'", () => {
    const t = findModule("teilnehmerliste-schulung")!;
    expect(t.bodyTemplate).not.toContain("Teilnahmebestätigung");
  });

  it("teilnehmerliste-schulung enthält nicht 'Nachweis'", () => {
    const t = findModule("teilnehmerliste-schulung")!;
    expect(t.bodyTemplate).not.toContain("Nachweis");
  });

  it("teilnehmerliste-schulung enthält nicht 'Pflichtschulung'", () => {
    const t = findModule("teilnehmerliste-schulung")!;
    expect(t.bodyTemplate).not.toContain("Pflichtschulung");
  });
});
