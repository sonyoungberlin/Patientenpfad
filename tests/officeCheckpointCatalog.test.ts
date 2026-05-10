import {
  OFFICE_MANAGEMENT_KIND_ANLASS,
  OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
  OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
  OFFICE_MANAGEMENT_KIND_NACHWEIS,
  OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
  OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT,
  OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_REPORTING_DUTIES,
  OFFICE_TOPIC_SEAT_APPROVAL,
  buildInitialSnapshotForTopic,
  getOfficeCheckpointCatalog,
  isOfficeManagementCheckpointKind,
  listOfficeTopics,
} from "@/lib/office/checkpointCatalog";
import { OfficeCheckpointState } from "@/lib/office/types";

const NEW_TOPIC_IDS = [
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_SEAT_APPROVAL,
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  OFFICE_TOPIC_REPORTING_DUTIES,
] as const;

const CORE_OFFICE_MANAGEMENT_KINDS = [
  OFFICE_MANAGEMENT_KIND_ANLASS,
  OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
  OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
  OFFICE_MANAGEMENT_KIND_NACHWEIS,
  OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
] as const;

const OPTIONAL_OFFICE_MANAGEMENT_KINDS = [
  OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
  OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT,
] as const;

describe("office checkpoint catalog", () => {
  it("HR-topic nutzt neutrale NC-Checkpoints ohne Governance-Container", () => {
    const catalog = getOfficeCheckpointCatalog(OFFICE_TOPIC_HIRING_REPLACEMENT);
    const ids = catalog.map((checkpoint) => checkpoint.id);

    expect(ids).toEqual([
      "NC-REGISTERSTATUS",
      "NC-APPROBATION",
      "NC-FACHARZTQUALIFIKATION",
      "NC-BERUFSHAFTPFLICHT",
      "NC-TAETIGKEITSUMFANG",
      "NC-EXTERNE_STELLE",
      "NC-ANTRAGSWEG",
      "NC-GENEHMIGUNGSSTATUS",
      "NC-BETRIEBSSTAETTENSTRUKTUR",
    ]);

    expect(ids).not.toContain("HR-GOV-A");
    expect(ids).not.toContain("HR-GOV-B");
    expect(ids).not.toContain("HR-GOV-C");
    expect(ids).not.toContain("HR-GOV-D");

    const byId = Object.fromEntries(catalog.map((checkpoint) => [checkpoint.id, checkpoint]));

    expect(byId["NC-REGISTERSTATUS"]?.title).toBe("Registerstatus");
    expect(byId["NC-APPROBATION"]?.title).toBe("Approbation");
    expect(byId["NC-FACHARZTQUALIFIKATION"]?.title).toBe("Facharztqualifikation");
    expect(byId["NC-BERUFSHAFTPFLICHT"]?.title).toBe("Berufshaftpflicht");
    expect(byId["NC-TAETIGKEITSUMFANG"]?.title).toBe("Taetigkeitsumfang");
    expect(byId["NC-EXTERNE_STELLE"]?.title).toBe("Zustaendige externe Stelle");
    expect(byId["NC-ANTRAGSWEG"]?.title).toBe("Antragsweg");
    expect(byId["NC-GENEHMIGUNGSSTATUS"]?.title).toBe("Genehmigungsstatus");
    expect(byId["NC-BETRIEBSSTAETTENSTRUKTUR"]?.title).toBe("Betriebsstaettenstruktur");

    for (const checkpoint of catalog) {
      expect(checkpoint.kind).toBeDefined();
      expect(checkpoint.governanceCategory).toBeUndefined();
      expect(checkpoint.decisionRuleKey).toBeUndefined();
      expect(checkpoint.m4RuleKey).toBeUndefined();
    }
  });

  it("enthaelt die sechs neuen topic ids in der Themenliste", () => {
    const topicIds = listOfficeTopics().map((topic) => topic.id);

    for (const topicId of NEW_TOPIC_IDS) {
      expect(topicIds).toContain(topicId);
    }
  });

  it("jeder neue topic hat die fuenf Kern-Checkpoint-Arten in derselben Reihenfolge", () => {
    for (const topicId of NEW_TOPIC_IDS) {
      const catalog = getOfficeCheckpointCatalog(topicId);
      const firstFiveOfficeKinds = catalog.slice(0, 5).map((checkpoint) => checkpoint.officeKind);

      expect(firstFiveOfficeKinds).toEqual(CORE_OFFICE_MANAGEMENT_KINDS);
    }
  });

  it("jeder neue topic nutzt nur erlaubte Verwaltungs-Checkpoint-Typen", () => {
    const allowed = new Set([...CORE_OFFICE_MANAGEMENT_KINDS, ...OPTIONAL_OFFICE_MANAGEMENT_KINDS]);

    for (const topicId of NEW_TOPIC_IDS) {
      const catalog = getOfficeCheckpointCatalog(topicId);
      for (const checkpoint of catalog) {
        expect(checkpoint.officeKind).toBeDefined();
        expect(isOfficeManagementCheckpointKind(String(checkpoint.officeKind))).toBe(true);
        expect(allowed.has(checkpoint.officeKind!)).toBe(true);
      }
    }
  });

  it("initial snapshots fuer neue topics bleiben OPEN und enthalten alle Checkpoint IDs", () => {
    for (const topicId of NEW_TOPIC_IDS) {
      const catalog = getOfficeCheckpointCatalog(topicId);
      const snapshot = buildInitialSnapshotForTopic(topicId);

      expect(snapshot).toHaveLength(catalog.length);
      expect(snapshot.every((checkpoint) => checkpoint.state === OfficeCheckpointState.OPEN)).toBe(true);

      const snapshotIds = snapshot.map((checkpoint) => checkpoint.id);
      const catalogIds = catalog.map((checkpoint) => checkpoint.id);
      expect(snapshotIds).toEqual(catalogIds);

      for (const checkpoint of snapshot) {
        expect(checkpoint.deadline).toBe("");
        expect(checkpoint.responsible_role).toBe("");
        expect(checkpoint.authority).toBe("");
        expect(checkpoint.required_documents).toEqual([]);
        expect(checkpoint.escalation_needed).toBe(false);
      }
    }
  });
});
