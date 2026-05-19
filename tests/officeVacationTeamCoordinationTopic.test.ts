import {
  OFFICE_TOPIC_VACATION_TEAM_COORDINATION,
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

/** Alle UT-Checkpoints auf YES; einzelne States via overrides überschreibbar. */
function makeUtSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "UT-01": OfficeCheckpointState.YES,
    "UT-02": OfficeCheckpointState.YES,
    "UT-03": OfficeCheckpointState.YES,
    "UT-04": OfficeCheckpointState.YES,
    "UT-05": OfficeCheckpointState.YES,
    "UT-06": OfficeCheckpointState.YES,
    "UT-07": OfficeCheckpointState.YES,
    "UT-08": OfficeCheckpointState.YES,
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

describe("officeVacationTeamCoordinationTopic – Checkpoint-Katalog", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_VACATION_TEAM_COORDINATION);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthält genau die 8 UT-Checkpoints in der richtigen Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "UT-01", "UT-02", "UT-03", "UT-04",
      "UT-05", "UT-06", "UT-07", "UT-08",
    ]);
  });

  it("kein UT-Checkpoint hat legalRefs", () => {
    for (const cp of catalog) {
      expect(cp.legalRefs ?? []).toHaveLength(0);
    }
  });

  it("kein UT-Checkpoint hat authorityKeys", () => {
    for (const cp of catalog) {
      expect(cp.authorityKeys ?? []).toHaveLength(0);
    }
  });

  it("UT-08 hat keine externen Referenzen (interner Abschluss-Entscheid)", () => {
    const cp = byId.get("UT-08");
    expect(cp?.legalRefs ?? []).toHaveLength(0);
    expect(cp?.authorityKeys ?? []).toHaveLength(0);
    expect(cp?.requiredEvidenceKeys ?? []).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. WRITE-Modul-Katalog
// ---------------------------------------------------------------------------

describe("officeVacationTeamCoordinationTopic – WRITE-Modul-Katalog", () => {
  const utTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds.includes(OFFICE_TOPIC_VACATION_TEAM_COORDINATION),
  );

  it("enthält genau 3 UT-Templates", () => {
    expect(utTemplates).toHaveLength(3);
  });

  it("enthält die erwarteten Template-IDs", () => {
    const ids = utTemplates.map((t) => t.id);
    expect(ids).toContain("urlaubs-uebergabe-checkliste");
    expect(ids).toContain("teaminfo-abwesenheit");
    expect(ids).toContain("patienteninfo-urlaub");
  });

  it("alle Template-IDs sind global eindeutig", () => {
    const allIds = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("UT-Templates sind nicht für andere Topics verfügbar", () => {
    const result = evaluateOfficeWriteModules({
      topicId: "meldepflichten-zustaendige-stellen",
      checkpoints: [],
    });
    for (const id of ["urlaubs-uebergabe-checkliste", "teaminfo-abwesenheit", "patienteninfo-urlaub"]) {
      const mod = result.find((m) => m.templateId === id);
      expect(mod?.isAvailable ?? false).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Trigger: urlaubs-uebergabe-checkliste
// ---------------------------------------------------------------------------

describe("urlaubs-uebergabe-checkliste – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeUtSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_VACATION_TEAM_COORDINATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "urlaubs-uebergabe-checkliste")!;
  }

  it("verfügbar wenn UT-01 YES und UT-06 OPEN", () => {
    const mod = evaluate({ "UT-06": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn UT-01 YES und UT-06 NO", () => {
    const mod = evaluate({ "UT-06": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn UT-01 YES und UT-07 OPEN", () => {
    const mod = evaluate({ "UT-07": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn UT-01 YES und UT-07 NO", () => {
    const mod = evaluate({ "UT-07": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn UT-01 OPEN", () => {
    const mod = evaluate({ "UT-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("NICHT verfügbar für leeren Snapshot (allOf UT-01=YES nicht erfüllt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_VACATION_TEAM_COORDINATION,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "urlaubs-uebergabe-checkliste")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Trigger: teaminfo-abwesenheit
// ---------------------------------------------------------------------------

describe("teaminfo-abwesenheit – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeUtSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_VACATION_TEAM_COORDINATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "teaminfo-abwesenheit")!;
  }

  it("verfügbar wenn UT-03 OPEN", () => {
    const mod = evaluate({ "UT-03": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn UT-03 NO", () => {
    const mod = evaluate({ "UT-03": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn UT-04 OPEN", () => {
    const mod = evaluate({ "UT-04": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn UT-04 NO", () => {
    const mod = evaluate({ "UT-04": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn UT-01 OPEN", () => {
    const mod = evaluate({ "UT-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT für leeren Snapshot (UT-01 defensiv OPEN → geblockt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_VACATION_TEAM_COORDINATION,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "teaminfo-abwesenheit")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Trigger: patienteninfo-urlaub
// ---------------------------------------------------------------------------

describe("patienteninfo-urlaub – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeUtSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_VACATION_TEAM_COORDINATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "patienteninfo-urlaub")!;
  }

  it("verfügbar wenn UT-05 OPEN", () => {
    const mod = evaluate({ "UT-05": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn UT-05 NO", () => {
    const mod = evaluate({ "UT-05": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn UT-01 OPEN", () => {
    const mod = evaluate({ "UT-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT für leeren Snapshot (UT-01 defensiv OPEN → geblockt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_VACATION_TEAM_COORDINATION,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "patienteninfo-urlaub")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Render: urlaubs-uebergabe-checkliste
// ---------------------------------------------------------------------------

describe("urlaubs-uebergabe-checkliste – Render", () => {
  const template = findModule("urlaubs-uebergabe-checkliste")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Musterfrau",
      mitarbeiter_name: "Dr. Huber",
      urlaubszeitraum: "01.08. – 15.08.2025",
      offene_aufgaben: "Recall-Liste prüfen, Lieferung abwarten",
    });
    expect(result).toContain("Praxis Musterfrau");
    expect(result).toContain("Dr. Huber");
    expect(result).toContain("01.08. – 15.08.2025");
    expect(result).toContain("Recall-Liste prüfen");
  });

  it("optionales Feld vertretung_name wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis X",
      mitarbeiter_name: "Müller",
      urlaubszeitraum: "01.07. – 07.07.2025",
      offene_aufgaben: "Aufgabe 1",
      vertretung_name: "Schmidt",
    });
    expect(result).toContain("Vertretung: Schmidt");
  });

  it("fehlendes optionales Feld vertretung_name erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis X",
      mitarbeiter_name: "Müller",
      urlaubszeitraum: "01.07. – 07.07.2025",
      offene_aufgaben: "Aufgabe 1",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Vertretung:");
  });

  it("optionaler Hinweis-Block wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis X",
      mitarbeiter_name: "Müller",
      urlaubszeitraum: "01.07. – 07.07.2025",
      offene_aufgaben: "Aufgabe 1",
      hinweis: "Passwort für Diensthandy übergeben",
    });
    expect(result).toContain("Passwort für Diensthandy übergeben");
  });

  it("Checkliste enthält alle 8 UT-Prüfpunkte", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      mitarbeiter_name: "M",
      urlaubszeitraum: "01.08. – 15.08.2025",
      offene_aufgaben: "X",
    });
    for (const id of ["UT-01", "UT-02", "UT-03", "UT-04", "UT-05", "UT-06", "UT-07", "UT-08"]) {
      expect(result).toContain(`(${id})`);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Render: teaminfo-abwesenheit
// ---------------------------------------------------------------------------

describe("teaminfo-abwesenheit – Render", () => {
  const template = findModule("teaminfo-abwesenheit")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Mustermann",
      mitarbeiter_name: "Dr. Klein",
      urlaubszeitraum: "01.08. – 10.08.2025",
      vertretungsregelung: "Frau Schulz übernimmt alle Termine",
    });
    expect(result).toContain("Praxis Mustermann");
    expect(result).toContain("Dr. Klein");
    expect(result).toContain("01.08. – 10.08.2025");
    expect(result).toContain("Frau Schulz");
  });

  it("optionaler Ansprechpartner-Block wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      mitarbeiter_name: "M",
      urlaubszeitraum: "Z",
      vertretungsregelung: "V",
      ansprechpartner: "Frau Meyer",
    });
    expect(result).toContain("Ansprechpartner: Frau Meyer");
  });

  it("fehlendes optionales Feld ansprechpartner erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      mitarbeiter_name: "M",
      urlaubszeitraum: "Z",
      vertretungsregelung: "V",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("Ansprechpartner:");
  });

  it("optionaler Hinweise-Block wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      mitarbeiter_name: "M",
      urlaubszeitraum: "Z",
      vertretungsregelung: "V",
      besondere_hinweise: "Praxis hat verkürzte Öffnungszeiten",
    });
    expect(result).toContain("Praxis hat verkürzte Öffnungszeiten");
  });

  it("kein {{ verbleibt im Output (alle optionalen Felder gesetzt)", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      mitarbeiter_name: "M",
      urlaubszeitraum: "Z",
      vertretungsregelung: "V",
      ansprechpartner: "A",
      besondere_hinweise: "B",
    });
    expect(result).not.toContain("{{");
  });
});

// ---------------------------------------------------------------------------
// 8. Render: patienteninfo-urlaub
// ---------------------------------------------------------------------------

describe("patienteninfo-urlaub – Render", () => {
  const template = findModule("patienteninfo-urlaub")!;

  it("rendert Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis am Park",
      abwesenheit_text: "Die Praxis bleibt geschlossen.",
      abwesend_von: "01.08.2025",
      abwesend_bis: "15.08.2025",
      vertretung_info: "Vertretung: Dr. Vogel, Tel. 0221-123",
    });
    expect(result).toContain("Praxis am Park");
    expect(result).toContain("01.08.2025");
    expect(result).toContain("15.08.2025");
    expect(result).toContain("Dr. Vogel");
  });

  it("abwesenheit_text erscheint im Output", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      abwesenheit_text: "Dr. Seidel ist nicht in der Praxis.",
      abwesend_von: "01.08.2025",
      abwesend_bis: "15.08.2025",
      vertretung_info: "V",
    });
    expect(result).toContain("Dr. Seidel ist nicht in der Praxis.");
  });

  it("alter Standardsatz ist nicht mehr vorhanden", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      abwesenheit_text: "Eingeschränkte Besetzung.",
      abwesend_von: "01.08.2025",
      abwesend_bis: "15.08.2025",
      vertretung_info: "V",
    });
    expect(result).not.toContain("ist die Praxis / ein Teammitglied abwesend");
  });

  it("Footer enthält 'Vielen Dank für Ihr Verständnis'", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      abwesenheit_text: "Die Praxis bleibt geschlossen.",
      abwesend_von: "01.08.2025",
      abwesend_bis: "15.08.2025",
      vertretung_info: "V",
    });
    expect(result).toContain("Vielen Dank für Ihr Verständnis");
  });

  it("Footer enthält nicht 'Arbeitsentwurf' oder 'rechtsverbindlich'", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      abwesenheit_text: "Die Praxis bleibt geschlossen.",
      abwesend_von: "01.08.2025",
      abwesend_bis: "15.08.2025",
      vertretung_info: "V",
    });
    expect(result).not.toContain("Arbeitsentwurf");
    expect(result).not.toContain("rechtsverbindlich");
  });

  it("bodyTemplate enthält nicht 'Arbeitsentwurf' oder 'rechtsverbindlich'", () => {
    expect(template.bodyTemplate).not.toContain("Arbeitsentwurf");
    expect(template.bodyTemplate).not.toContain("rechtsverbindlich");
  });

  it("optionaler Rückkehr-Block wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      abwesenheit_text: "Die Praxis bleibt geschlossen.",
      abwesend_von: "01.08.2025",
      abwesend_bis: "15.08.2025",
      vertretung_info: "V",
      rueckkehr_hinweis: "18.08.2025",
    });
    expect(result).toContain("18.08.2025");
    expect(result).toContain("wieder vollständig");
  });

  it("fehlendes optionales Feld rueckkehr_hinweis erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      abwesenheit_text: "Die Praxis bleibt geschlossen.",
      abwesend_von: "01.08.2025",
      abwesend_bis: "15.08.2025",
      vertretung_info: "V",
    });
    expect(result).not.toContain("{{");
    expect(result).not.toContain("wieder vollständig");
  });

  it("optionaler Notfallkontakt-Block wird eingebettet wenn angegeben", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      abwesenheit_text: "Die Praxis bleibt geschlossen.",
      abwesend_von: "01.08.2025",
      abwesend_bis: "15.08.2025",
      vertretung_info: "V",
      notfallkontakt: "Notaufnahme 112",
    });
    expect(result).toContain("Notaufnahme 112");
  });

  it("fehlendes optionales Feld notfallkontakt erzeugt keinen {{-Marker", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      abwesenheit_text: "Die Praxis bleibt geschlossen.",
      abwesend_von: "01.08.2025",
      abwesend_bis: "15.08.2025",
      vertretung_info: "V",
    });
    expect(result).not.toContain("{{");
  });

  it("kein {{ verbleibt im Output (alle optionalen Felder gesetzt)", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "P",
      abwesenheit_text: "Die Praxis bleibt geschlossen.",
      abwesend_von: "01.08.2025",
      abwesend_bis: "15.08.2025",
      vertretung_info: "V",
      rueckkehr_hinweis: "18.08.2025",
      notfallkontakt: "112",
    });
    expect(result).not.toContain("{{");
  });
});

// ---------------------------------------------------------------------------
// 9. Compliance – verbotene Begriffe
// ---------------------------------------------------------------------------

describe("officeVacationTeamCoordinationTopic – Compliance", () => {
  const utTemplates = [
    "urlaubs-uebergabe-checkliste",
    "teaminfo-abwesenheit",
    "patienteninfo-urlaub",
  ].map((id) => findModule(id)!);

  const forbidden = [
    "§",
    "Urlaubsanspruch",
    "BUrlG",
    "Genehmigungspflicht",
    "Betriebsferien",
    "Tarifvertrag",
    "rechtssicher",
    "Entgeltfortzahlung",
    "Rechtsberatung",
    "rechtsverbindlich",
  ];

  for (const term of forbidden) {
    it(`bodyTemplate enthält nicht "${term}"`, () => {
      for (const t of utTemplates) {
        expect(t.bodyTemplate).not.toContain(term);
      }
    });
  }

  it("kein UT-Checkpoint hat legalRefs (keine §-Referenzen)", () => {
    const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_VACATION_TEAM_COORDINATION);
    for (const cp of catalog) {
      expect(cp.legalRefs ?? []).toHaveLength(0);
    }
  });
});
