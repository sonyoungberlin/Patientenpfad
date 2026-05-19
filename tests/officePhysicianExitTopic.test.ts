import {
  OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
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

/** Alle AA-Checkpoints auf YES, einzelne States via overrides überschreibbar. */
function makeExitSnapshot(
  overrides: Partial<Record<string, OfficeCheckpointState>> = {},
): OfficeCheckpointSnapshot[] {
  const defaults: Record<string, OfficeCheckpointState> = {
    "AA-01": OfficeCheckpointState.YES,
    "AA-02": OfficeCheckpointState.YES,
    "AA-03": OfficeCheckpointState.YES,
    "AA-04": OfficeCheckpointState.YES,
    "AA-05": OfficeCheckpointState.YES,
    "AA-06": OfficeCheckpointState.YES,
    "AA-07": OfficeCheckpointState.YES,
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

describe("officePhysicianExitTopic – Checkpoint-Katalog", () => {
  const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION);
  const byId = new Map(catalog.map((cp) => [cp.id, cp]));

  it("enthält genau die 7 AA-Checkpoints in der richtigen Reihenfolge", () => {
    expect(catalog.map((cp) => cp.id)).toEqual([
      "AA-01",
      "AA-02",
      "AA-03",
      "AA-04",
      "AA-05",
      "AA-06",
      "AA-07",
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

  it("AA-04 referenziert DSGVO_ART_32 und optional DS_TOM_DOKU", () => {
    const cp = byId.get("AA-04");
    expect(cp?.legalRefs).toContain("DSGVO_ART_32");
    expect(cp?.optionalEvidenceKeys).toContain("DS_TOM_DOKU");
  });

  it("AA-05 fordert PATIENTENINFO_ARZTWECHSEL als Pflichtnachweis", () => {
    const cp = byId.get("AA-05");
    expect(cp?.requiredEvidenceKeys).toContain("PATIENTENINFO_ARZTWECHSEL");
  });

  it("AA-07 hat keine legalRefs (bewusst nur operative Chef-Mitdenken-Checkliste)", () => {
    const cp = byId.get("AA-07");
    expect(cp?.legalRefs ?? []).toHaveLength(0);
    expect(cp?.authorityKeys ?? []).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. WRITE-Modul-Katalog
// ---------------------------------------------------------------------------

describe("officePhysicianExitTopic – WRITE-Modul-Katalog", () => {
  const exitTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds.includes(OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION),
  );

  it("enthält genau 3 Exit-Templates", () => {
    expect(exitTemplates).toHaveLength(3);
  });

  it("enthält die erwarteten Template-IDs", () => {
    const ids = exitTemplates.map((t) => t.id);
    expect(ids).toContain("exit-patienteninformation");
    expect(ids).toContain("exit-uebergabe-checkliste");
    expect(ids).toContain("exit-zugriffscheckliste");
  });

  it("alle Template-IDs sind global eindeutig", () => {
    const allIds = OFFICE_WRITE_TEMPLATES.map((t) => t.id);
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });

  it("Exit-Templates sind nicht für andere Topics verfügbar", () => {
    const result = evaluateOfficeWriteModules({
      topicId: "meldepflichten-zustaendige-stellen",
      checkpoints: [],
    });
    for (const id of ["exit-patienteninformation", "exit-uebergabe-checkliste", "exit-zugriffscheckliste"]) {
      const mod = result.find((m) => m.templateId === id);
      expect(mod?.isAvailable ?? false).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Trigger: exit-patienteninformation
// ---------------------------------------------------------------------------

describe("exit-patienteninformation – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeExitSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "exit-patienteninformation")!;
  }

  it("NICHT verfügbar wenn alle Checkpoints YES (AA-05 bereits erledigt)", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("verfügbar wenn AA-01 YES und AA-05 OPEN", () => {
    const mod = evaluate({ "AA-05": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn AA-01 YES und AA-05 NO", () => {
    const mod = evaluate({ "AA-05": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("GEBLOCKT wenn AA-01 OPEN (Datum fehlt)", () => {
    const mod = evaluate({ "AA-01": OfficeCheckpointState.OPEN, "AA-05": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
    expect(mod.unavailableReason).toMatch(/AA-01/);
  });

  it("NICHT verfügbar für leeren Snapshot (AA-01 defensiv OPEN → geblockt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "exit-patienteninformation")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Trigger: exit-uebergabe-checkliste
// ---------------------------------------------------------------------------

describe("exit-uebergabe-checkliste – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeExitSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "exit-uebergabe-checkliste")!;
  }

  it("verfügbar wenn AA-01 YES und AA-03 OPEN", () => {
    const mod = evaluate({ "AA-03": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn AA-01 YES und AA-03 NO", () => {
    const mod = evaluate({ "AA-03": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn AA-01 YES und AA-03 YES (Übergabe abgeschlossen)", () => {
    const mod = evaluate(); // alle YES
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn AA-01 OPEN (Datum fehlt)", () => {
    const mod = evaluate({ "AA-01": OfficeCheckpointState.OPEN, "AA-03": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
    expect(mod.unavailableReason).toMatch(/AA-01/);
  });

  it("NICHT verfügbar wenn AA-01 NO (allOf schlägt fehl)", () => {
    const mod = evaluate({ "AA-01": OfficeCheckpointState.NO, "AA-03": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Trigger: exit-zugriffscheckliste
// ---------------------------------------------------------------------------

describe("exit-zugriffscheckliste – Trigger", () => {
  function evaluate(overrides: Partial<Record<string, OfficeCheckpointState>> = {}) {
    const checkpoints = makeExitSnapshot(overrides);
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
      checkpoints,
    });
    return modules.find((m) => m.templateId === "exit-zugriffscheckliste")!;
  }

  it("verfügbar wenn AA-01 YES und AA-04 OPEN", () => {
    const mod = evaluate({ "AA-04": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(true);
  });

  it("verfügbar wenn AA-01 YES und AA-04 NO", () => {
    const mod = evaluate({ "AA-04": OfficeCheckpointState.NO });
    expect(mod.isAvailable).toBe(true);
  });

  it("NICHT verfügbar wenn alle Checkpoints YES (AA-04 abgeschlossen)", () => {
    const mod = evaluate();
    expect(mod.isAvailable).toBe(false);
  });

  it("GEBLOCKT wenn AA-01 OPEN (Datum fehlt)", () => {
    const mod = evaluate({ "AA-01": OfficeCheckpointState.OPEN, "AA-04": OfficeCheckpointState.OPEN });
    expect(mod.isAvailable).toBe(false);
    expect(mod.unavailableReason).toMatch(/AA-01/);
  });

  it("NICHT verfügbar für leeren Snapshot (AA-01 defensiv OPEN → geblockt)", () => {
    const modules = evaluateOfficeWriteModules({
      topicId: OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
      checkpoints: [],
    });
    const mod = modules.find((m) => m.templateId === "exit-zugriffscheckliste")!;
    expect(mod.isAvailable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Render: exit-patienteninformation
// ---------------------------------------------------------------------------

describe("exit-patienteninformation – Render", () => {
  const template = findModule("exit-patienteninformation")!;

  it("ersetzt alle Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      letzter_praxistag: "2025-03-31",
    });
    expect(result).toContain("Dr. med. Jana Richter");
    expect(result).toContain("Praxis Dr. Keller");
    expect(result).toContain("2025-03-31");
  });

  it("zeigt optionalen Block nachfolge_info an, wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      letzter_praxistag: "2025-03-31",
      nachfolge_info: "Ihre Weiterbetreuung übernimmt Dr. Meier.",
    });
    expect(result).toContain("Ihre Weiterbetreuung übernimmt Dr. Meier.");
  });

  it("versteckt optionalen Block nachfolge_info, wenn leer", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      letzter_praxistag: "2025-03-31",
      nachfolge_info: "",
    });
    expect(result).not.toContain("{{#if nachfolge_info}}");
    expect(result).not.toContain("{{/if}}");
  });

  it("zeigt optionalen Block kontakt_fragen an, wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      letzter_praxistag: "2025-03-31",
      kontakt_fragen: "Tel. 030 / 12345-0",
    });
    expect(result).toContain("Tel. 030 / 12345-0");
  });

  it("markiert fehlende Pflichtfelder mit [{{key}}]", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      // arztname_austretend fehlt absichtlich
      letzter_praxistag: "2025-03-31",
    });
    expect(result).toContain("[{{arztname_austretend}}]");
  });
});

// ---------------------------------------------------------------------------
// 7. Render: exit-uebergabe-checkliste
// ---------------------------------------------------------------------------

describe("exit-uebergabe-checkliste – Render", () => {
  const template = findModule("exit-uebergabe-checkliste")!;

  it("ersetzt alle Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      austrittsdatum: "2025-03-31",
      offene_patientenfaelle: "Patient A: laufende Therapie",
    });
    expect(result).toContain("Dr. med. Jana Richter");
    expect(result).toContain("Patient A: laufende Therapie");
    expect(result).toContain("Chef-Mitdenken-Liste");
  });

  it("zeigt offene_befunde-Block an, wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      austrittsdatum: "2025-03-31",
      offene_patientenfaelle: "Patient A",
      offene_befunde: "Labor ausstehend",
    });
    expect(result).toContain("Labor ausstehend");
  });

  it("versteckt offene_befunde-Block, wenn leer", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      austrittsdatum: "2025-03-31",
      offene_patientenfaelle: "Patient A",
      offene_befunde: "",
    });
    expect(result).not.toContain("{{#if offene_befunde}}");
  });

  it("enthält die Chef-Mitdenken-Liste", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      austrittsdatum: "2025-03-31",
      offene_patientenfaelle: "Patient A",
    });
    expect(result).toContain("Chef-Mitdenken-Liste");
    expect(result).toContain("Zuständigkeiten");
  });
});

// ---------------------------------------------------------------------------
// 8. Render: exit-zugriffscheckliste
// ---------------------------------------------------------------------------

describe("exit-zugriffscheckliste – Render", () => {
  const template = findModule("exit-zugriffscheckliste")!;

  it("ersetzt alle Pflichtfelder korrekt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      austrittsdatum: "2025-03-31",
    });
    expect(result).toContain("Dr. med. Jana Richter");
    expect(result).toContain("2025-03-31");
    expect(result).toContain("[ ] Praxisverwaltungssystem");
  });

  it("zeigt verantwortliche_it-Block an, wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      austrittsdatum: "2025-03-31",
      verantwortliche_it: "MFA Meier",
    });
    expect(result).toContain("MFA Meier");
  });

  it("versteckt verantwortliche_it-Block, wenn leer", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      austrittsdatum: "2025-03-31",
      verantwortliche_it: "",
    });
    expect(result).not.toContain("{{#if verantwortliche_it}}");
  });

  it("zeigt erledigt_am-Block an, wenn gesetzt", () => {
    const result = renderOfficeWriteTemplate(template, {
      praxisname: "Praxis Dr. Keller",
      arztname_austretend: "Dr. med. Jana Richter",
      austrittsdatum: "2025-03-31",
      erledigt_am: "2025-03-28",
    });
    expect(result).toContain("2025-03-28");
  });
});

// ---------------------------------------------------------------------------
// 9. Compliance – keine arbeitsrechtlichen Formulierungen in bodyTemplates
// ---------------------------------------------------------------------------

describe("exit WRITE-Module – Compliance: keine arbeitsrechtlichen Inhalte", () => {
  const exitTemplates = OFFICE_WRITE_TEMPLATES.filter((t) =>
    t.trigger.topicIds.includes(OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION),
  );

  const forbidden = [
    "§",
    "Kündigung",
    "Aufhebungsvertrag",
    "Fristberatung",
    "Rechtsberatung",
    "Zeugnis",
    "Freistellung",
  ];

  for (const term of forbidden) {
    it(`kein '${term}' in einem Exit-bodyTemplate`, () => {
      for (const tmpl of exitTemplates) {
        expect(tmpl.bodyTemplate).not.toContain(term);
      }
    });
  }

  it("keine verbotenen Begriffe in keinem Exit-inputSchema-Feld", () => {
    for (const tmpl of exitTemplates) {
      for (const field of tmpl.inputSchema) {
        for (const term of forbidden) {
          expect(field.label).not.toContain(term);
          expect(field.placeholder ?? "").not.toContain(term);
        }
      }
    }
  });
});
