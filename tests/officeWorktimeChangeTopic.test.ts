import {
  OFFICE_TOPIC_WORKTIME_CHANGE,
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

/** Alle AZ-Checkpoints auf YES, einzelne States via overrides überschreibbar. */
function makeWorktimeSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "AZ-01": OfficeCheckpointState.YES,
    "AZ-02": OfficeCheckpointState.YES,
    "AZ-03": OfficeCheckpointState.YES,
    "AZ-04": OfficeCheckpointState.YES,
    "AZ-05": OfficeCheckpointState.YES,
    "AZ-06": OfficeCheckpointState.YES,
    "AZ-07": OfficeCheckpointState.YES,
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

describe("officeWorktimeChangeTopic – Checkpoint-Katalog", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_WORKTIME_CHANGE);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthält genau die 7 AZ-Checkpoints in der richtigen Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "AZ-01",
      "AZ-02",
      "AZ-03",
      "AZ-04",
      "AZ-05",
      "AZ-06",
      "AZ-07",
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

  it("kein AZ-Checkpoint hat legalRefs (bewusst nur operative Checkliste)", () => {
    for (const cp of catalog) {
      expect(cp.legalRefs ?? []).toHaveLength(0);
    }
  });

  it("kein AZ-Checkpoint hat authorityKeys", () => {
    for (const cp of catalog) {
      expect(cp.authorityKeys ?? []).toHaveLength(0);
    }
  });

  it("AZ-07 hat keine externen Referenzen (Chef-Mitdenken)", () => {
    const cp = byId.get("AZ-07");
    expect(cp?.legalRefs ?? []).toHaveLength(0);
    expect(cp?.authorityKeys ?? []).toHaveLength(0);
    expect(cp?.requiredEvidenceKeys ?? []).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. WRITE-Modul-Katalog
// ---------------------------------------------------------------------------

describe("officeWorktimeChangeTopic – WRITE-Modul-Katalog", () => {
  const worktimeTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds.includes(OFFICE_TOPIC_WORKTIME_CHANGE),
  );

  it("enthält genau 3 Worktime-Templates", () => {
    expect(worktimeTemplates).toHaveLength(3);
  });

  it("enthält die erwarteten Template-IDs", () => {
    const ids = worktimeTemplates.map((t) => t.id);
    expect(ids).toContain("arbeitszeit-aenderung-gespraech");
    expect(ids).toContain("arbeitszeit-aenderung-checkliste");
    expect(ids).toContain("arbeitszeit-aenderung-lohnbuero-info");
  });

  it("alle Template-IDs sind global eindeutig", () => {
    const allIds = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("Worktime-Templates sind nicht für andere Topics verfügbar", () => {
    const result = evaluateOfficeWriteModules({
      topicId: "meldepflichten-zustaendige-stellen",
      checkpoints: [],
    });
    for (const id of [
      "arbeitszeit-aenderung-gespraech",
      "arbeitszeit-aenderung-checkliste",
      "arbeitszeit-aenderung-lohnbuero-info",
    ]) {
      const mod = result.find((m) => m.templateId === id);
      expect(mod?.isAvailable ?? false).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Trigger: arbeitszeit-aenderung-gespraech
// ---------------------------------------------------------------------------

describe("arbeitszeit-aenderung-gespraech – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeWorktimeSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_WORKTIME_CHANGE,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "arbeitszeit-aenderung-gespraech")!;
  }

  it("verfügbar wenn AZ-01 OPEN (noch nicht abgestimmt)", () => {
    const mod = evaluate({ "AZ-01": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn AZ-01 NO (Abstimmung gescheitert / offen)", () => {
    const mod = evaluate({ "AZ-01": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES (AZ-01 abgeschlossen)", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("verfügbar für leeren Snapshot (AZ-01 defensiv OPEN)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_WORKTIME_CHANGE,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "arbeitszeit-aenderung-gespraech")!;
    expect(mod.isAvailable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Trigger: arbeitszeit-aenderung-checkliste
// ---------------------------------------------------------------------------

describe("arbeitszeit-aenderung-checkliste – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeWorktimeSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_WORKTIME_CHANGE,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "arbeitszeit-aenderung-checkliste")!;
  }

  it("verfügbar wenn AZ-01 YES und AZ-03 OPEN", () => {
    const mod = evaluate({ "AZ-03": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn AZ-01 YES und AZ-03 NO", () => {
    const mod = evaluate({ "AZ-03": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn AZ-01 YES und AZ-05 OPEN (Systeme noch offen)", () => {
    const mod = evaluate({ "AZ-05": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn AZ-01 YES und AZ-05 NO", () => {
    const mod = evaluate({ "AZ-05": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES (alle organisatorischen Schritte abgeschlossen)", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn AZ-01 OPEN (Parameter fehlen noch)", () => {
    const mod = evaluate({ "AZ-01": OfficeCheckpointState.OPEN, "AZ-03": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
    expect(mod.unavailableReason).toMatch(/AZ-01/);
  });

  it("NICHT verfügbar wenn AZ-01 NO (allOf schlägt fehl)", () => {
    const mod = evaluate({ "AZ-01": OfficeCheckpointState.NO, "AZ-03": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });

  it("NICHT verfügbar für leeren Snapshot (AZ-01 defensiv OPEN → geblockt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_WORKTIME_CHANGE,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "arbeitszeit-aenderung-checkliste")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Trigger: arbeitszeit-aenderung-lohnbuero-info
// ---------------------------------------------------------------------------

describe("arbeitszeit-aenderung-lohnbuero-info – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeWorktimeSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_WORKTIME_CHANGE,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "arbeitszeit-aenderung-lohnbuero-info")!;
  }

  it("verfügbar wenn AZ-01 YES und AZ-04 OPEN", () => {
    const mod = evaluate({ "AZ-04": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn AZ-01 YES und AZ-04 NO", () => {
    const mod = evaluate({ "AZ-04": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES (Lohnbüro bereits informiert)", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn AZ-01 OPEN (Datum und Umfang fehlen)", () => {
    const mod = evaluate({ "AZ-01": OfficeCheckpointState.OPEN, "AZ-04": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
    expect(mod.unavailableReason).toMatch(/AZ-01/);
  });

  it("NICHT verfügbar für leeren Snapshot (AZ-01 defensiv OPEN → geblockt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_WORKTIME_CHANGE,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "arbeitszeit-aenderung-lohnbuero-info")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Render: arbeitszeit-aenderung-gespraech
// ---------------------------------------------------------------------------

describe("arbeitszeit-aenderung-gespraech – Render", () => {
  const template = findModule("arbeitszeit-aenderung-gespraech")!;

  it("ersetzt alle Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      neuer_umfang: "25 Std./Woche",
      einsatzzeiten: "Mo, Di, Do 08:00–14:00 Uhr",
    });
    expect(result).toContain("MFA Sandra Meier");
    expect(result).toContain("25 Std./Woche");
    expect(result).toContain("Mo, Di, Do 08:00–14:00 Uhr");
    expect(result).toContain("Praxis Dr. Keller");
  });

  it("zeigt gespraechsdatum-Block an, wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      neuer_umfang: "25 Std./Woche",
      einsatzzeiten: "Mo, Di",
      gespraechsdatum: "2026-05-20",
    });
    expect(result).toContain("2026-05-20");
  });

  it("versteckt gespraechsdatum-Block, wenn leer", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      neuer_umfang: "25 Std./Woche",
      einsatzzeiten: "Mo, Di",
      gespraechsdatum: "",
    });
    expect(result).not.toContain("{{#if gespraechsdatum}}");
  });

  it("zeigt offene_punkte-Block an, wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      neuer_umfang: "25 Std./Woche",
      einsatzzeiten: "Mo, Di",
      offene_punkte: "Vertretungsregelung noch offen",
    });
    expect(result).toContain("Vertretungsregelung noch offen");
  });

  it("versteckt offene_punkte-Block, wenn leer", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      neuer_umfang: "25 Std./Woche",
      einsatzzeiten: "Mo, Di",
      offene_punkte: "",
    });
    expect(result).not.toContain("{{#if offene_punkte}}");
  });

  it("markiert fehlende Pflichtfelder mit [{{key}}]", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      // mitarbeiter_name fehlt absichtlich
      neuer_umfang: "25 Std./Woche",
      einsatzzeiten: "Mo, Di",
    });
    expect(result).toContain("[{{mitarbeiter_name}}]");
  });
});

// ---------------------------------------------------------------------------
// 7. Render: arbeitszeit-aenderung-checkliste
// ---------------------------------------------------------------------------

describe("arbeitszeit-aenderung-checkliste – Render", () => {
  const template = findModule("arbeitszeit-aenderung-checkliste")!;

  it("ersetzt alle Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      gueltig_ab: "2026-06-01",
      neuer_umfang: "25 Std./Woche",
      einsatzzeiten: "Mo, Di, Do",
      offene_aufgaben: "Dienstplan anpassen",
    });
    expect(result).toContain("MFA Sandra Meier");
    expect(result).toContain("2026-06-01");
    expect(result).toContain("Dienstplan anpassen");
    expect(result).toContain("[ ] Dienstplan angepasst und freigegeben");
  });

  it("zeigt verantwortliche_person-Block an, wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      gueltig_ab: "2026-06-01",
      neuer_umfang: "25 Std./Woche",
      einsatzzeiten: "Mo, Di",
      offene_aufgaben: "n/a",
      verantwortliche_person: "Fr. Schulz",
    });
    expect(result).toContain("Fr. Schulz");
  });

  it("versteckt verantwortliche_person-Block, wenn leer", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      gueltig_ab: "2026-06-01",
      neuer_umfang: "25 Std./Woche",
      einsatzzeiten: "Mo, Di",
      offene_aufgaben: "n/a",
      verantwortliche_person: "",
    });
    expect(result).not.toContain("{{#if verantwortliche_person}}");
  });
});

// ---------------------------------------------------------------------------
// 8. Render: arbeitszeit-aenderung-lohnbuero-info
// ---------------------------------------------------------------------------

describe("arbeitszeit-aenderung-lohnbuero-info – Render", () => {
  const template = findModule("arbeitszeit-aenderung-lohnbuero-info")!;

  it("ersetzt alle Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      gueltig_ab: "2026-06-01",
      neuer_umfang: "25 Std./Woche",
    });
    expect(result).toContain("MFA Sandra Meier");
    expect(result).toContain("2026-06-01");
    expect(result).toContain("25 Std./Woche");
    expect(result).toContain("laufenden Abrechnung");
  });

  it("zeigt ansprechpartner-Block an, wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      gueltig_ab: "2026-06-01",
      neuer_umfang: "25 Std./Woche",
      ansprechpartner: "Fr. Schulz, Tel. 030 / 12345-0",
    });
    expect(result).toContain("Fr. Schulz");
  });

  it("versteckt ansprechpartner-Block, wenn leer", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      gueltig_ab: "2026-06-01",
      neuer_umfang: "25 Std./Woche",
      ansprechpartner: "",
    });
    expect(result).not.toContain("{{#if ansprechpartner}}");
  });

  it("zeigt hinweis-Block an, wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      gueltig_ab: "2026-06-01",
      neuer_umfang: "25 Std./Woche",
      hinweis: "Änderung betrifft nur Monat Juni",
    });
    expect(result).toContain("Änderung betrifft nur Monat Juni");
  });

  it("versteckt hinweis-Block, wenn leer", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      mitarbeiter_name: "MFA Sandra Meier",
      gueltig_ab: "2026-06-01",
      neuer_umfang: "25 Std./Woche",
      hinweis: "",
    });
    expect(result).not.toContain("{{#if hinweis}}");
  });
});

// ---------------------------------------------------------------------------
// 9. Compliance – keine arbeitsrechtlichen Formulierungen in bodyTemplates
// ---------------------------------------------------------------------------

describe("Worktime WRITE-Module – Compliance: keine arbeitsrechtlichen Inhalte", () => {
  const worktimeTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds.includes(OFFICE_TOPIC_WORKTIME_CHANGE),
  );

  const forbidden = [
    "§",
    "Vertragsänderung",
    "Tarif",
    "Mindestlohn",
    "Gehaltsberatung",
    "Rechtsberatung",
    "Kurzarbeit",
    "rechtssicher",
  ];

  for (const term of forbidden) {
    it(`kein '${term}' in einem Worktime-bodyTemplate`, () => {
      for (const tmpl of worktimeTemplates) {
        expect(tmpl.bodyTemplate).not.toContain(term);
      }
    });
  }

  it("keine verbotenen Begriffe in keinem Worktime-inputSchema-Feld", () => {
    for (const tmpl of worktimeTemplates) {
      for (const field of tmpl.inputSchema) {
        for (const term of forbidden) {
          expect(field.label).not.toContain(term);
          expect(field.placeholder ?? "").not.toContain(term);
        }
      }
    }
  });
});
