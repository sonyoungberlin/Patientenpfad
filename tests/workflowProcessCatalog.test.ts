/**
 * Tests für lib/workflow/processCatalog.ts
 */

import {
  listWorkflowTopics,
  getWorkflowTopic,
  getProcessPoints,
  buildInitialSnapshot,
  isWorkflowTopicId,
  WORKFLOW_TOPIC_AU,
  WORKFLOW_TOPIC_REZEPT,
  WORKFLOW_TOPIC_UEBERWEISUNG,
  WORKFLOW_TOPIC_HEILMITTEL,
  WORKFLOW_TOPIC_HILFSMITTEL,
  WORKFLOW_TOPIC_KRANKENTRANSPORT,
} from "@/lib/workflow/processCatalog";

describe("listWorkflowTopics", () => {
  it("enthält alle 6 Topics", () => {
    const topics = listWorkflowTopics();
    expect(topics.length).toBe(6);
  });

  it("enthält das AU-Musterprozess-Topic", () => {
    const topics = listWorkflowTopics();
    const au = topics.find((t) => t.id === WORKFLOW_TOPIC_AU);
    expect(au).toBeDefined();
    expect(au?.title).toBeTruthy();
  });

  it("enthält alle neuen Topics mit sources", () => {
    const ids = listWorkflowTopics().map((t) => t.id);
    expect(ids).toContain(WORKFLOW_TOPIC_REZEPT);
    expect(ids).toContain(WORKFLOW_TOPIC_UEBERWEISUNG);
    expect(ids).toContain(WORKFLOW_TOPIC_HEILMITTEL);
    expect(ids).toContain(WORKFLOW_TOPIC_HILFSMITTEL);
    expect(ids).toContain(WORKFLOW_TOPIC_KRANKENTRANSPORT);
    for (const topic of listWorkflowTopics()) {
      expect(topic.sources.length).toBeGreaterThan(0);
    }
  });
});

describe("getWorkflowTopic", () => {
  it("gibt das AU-Topic zurück", () => {
    const topic = getWorkflowTopic(WORKFLOW_TOPIC_AU);
    expect(topic.id).toBe(WORKFLOW_TOPIC_AU);
    expect(topic.title).toBe("AU-Musterprozess");
  });

  it.each([
    WORKFLOW_TOPIC_REZEPT,
    WORKFLOW_TOPIC_UEBERWEISUNG,
    WORKFLOW_TOPIC_HEILMITTEL,
    WORKFLOW_TOPIC_HILFSMITTEL,
    WORKFLOW_TOPIC_KRANKENTRANSPORT,
  ] as const)("gibt Topic %s zurück ohne Fehler", (id) => {
    const topic = getWorkflowTopic(id);
    expect(topic.id).toBe(id);
    expect(topic.title.length).toBeGreaterThan(0);
    expect(topic.sources.length).toBeGreaterThan(0);
  });
});

describe("isWorkflowTopicId", () => {
  it.each([
    WORKFLOW_TOPIC_AU,
    WORKFLOW_TOPIC_REZEPT,
    WORKFLOW_TOPIC_UEBERWEISUNG,
    WORKFLOW_TOPIC_HEILMITTEL,
    WORKFLOW_TOPIC_HILFSMITTEL,
    WORKFLOW_TOPIC_KRANKENTRANSPORT,
  ])("erkennt %s als gültige Topic-ID", (id) => {
    expect(isWorkflowTopicId(id)).toBe(true);
  });

  it("lehnt unbekannte IDs ab", () => {
    expect(isWorkflowTopicId("unknown")).toBe(false);
    expect(isWorkflowTopicId("")).toBe(false);
    expect(isWorkflowTopicId(null)).toBe(false);
  });
});

describe("getProcessPoints", () => {
  it("MFA erhält nur MFA-relevante Punkte (keine ARZT-only-Punkte)", () => {
    const mfaPoints = getProcessPoints(WORKFLOW_TOPIC_AU, "MFA");
    expect(mfaPoints.length).toBeGreaterThan(0);
    // AU-P07, AU-P08, AU-P09 sind ARZT-only → dürfen nicht in MFA-Liste
    const ids = mfaPoints.map((p) => p.id);
    expect(ids).not.toContain("AU-P07");
    expect(ids).not.toContain("AU-P08");
    expect(ids).not.toContain("AU-P09");
  });

  it("ARZT erhält nur ARZT-relevante Punkte (keine MFA-only-Punkte)", () => {
    const arztPoints = getProcessPoints(WORKFLOW_TOPIC_AU, "ARZT");
    expect(arztPoints.length).toBeGreaterThan(0);
    // AU-P04, AU-P05, AU-P06 sind MFA-only → dürfen nicht in ARZT-Liste
    const ids = arztPoints.map((p) => p.id);
    expect(ids).not.toContain("AU-P04");
    expect(ids).not.toContain("AU-P05");
    expect(ids).not.toContain("AU-P06");
  });

  it("beide Rollen erhalten gemeinsame Punkte (AU-P01 bis AU-P03)", () => {
    const mfaPoints = getProcessPoints(WORKFLOW_TOPIC_AU, "MFA");
    const arztPoints = getProcessPoints(WORKFLOW_TOPIC_AU, "ARZT");
    const mfaIds = mfaPoints.map((p) => p.id);
    const arztIds = arztPoints.map((p) => p.id);
    expect(mfaIds).toContain("AU-P01");
    expect(mfaIds).toContain("AU-P02");
    expect(mfaIds).toContain("AU-P03");
    expect(arztIds).toContain("AU-P01");
    expect(arztIds).toContain("AU-P02");
    expect(arztIds).toContain("AU-P03");
  });
});

describe("buildInitialSnapshot", () => {
  it("erstellt Snapshot mit status UNKLAR für alle Punkte", () => {
    const snapshot = buildInitialSnapshot(WORKFLOW_TOPIC_AU, "MFA");
    expect(snapshot.length).toBeGreaterThan(0);
    for (const point of snapshot) {
      expect(point.status).toBe("UNKLAR");
    }
  });

  it("enthält id und title für jeden Prozesspunkt", () => {
    const snapshot = buildInitialSnapshot(WORKFLOW_TOPIC_AU, "ARZT");
    for (const point of snapshot) {
      expect(typeof point.id).toBe("string");
      expect(point.id.length).toBeGreaterThan(0);
      expect(typeof point.title).toBe("string");
      expect(point.title.length).toBeGreaterThan(0);
    }
  });

  it("MFA und ARZT erhalten unterschiedliche Prozesspunkt-IDs", () => {
    const mfa = buildInitialSnapshot(WORKFLOW_TOPIC_AU, "MFA");
    const arzt = buildInitialSnapshot(WORKFLOW_TOPIC_AU, "ARZT");
    const mfaIds = mfa.map((p) => p.id).sort().join(",");
    const arztIds = arzt.map((p) => p.id).sort().join(",");
    expect(mfaIds).not.toBe(arztIds);
  });
});
