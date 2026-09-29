import {
  checkpointTemplateSnapshot,
  parsePracticeDefinitionContent,
  validatePracticeDefinitionForRelease,
  type PracticeCheckpointDefinitionContent,
} from "@/lib/practiceProcesses/practiceDefinition";
import { buildInitialPracticeWorkflowSnapshot, isPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

const TEMPLATE = checkpointTemplateSnapshot({
  id: "patient-kommt-zu-spaet",
  title: "Patient kommt zu spät zum Termin",
  orientationAnchors: [
    { id: "reference-time", text: "Welcher Zeitpunkt ist der Bezugspunkt?" },
    { id: "prior-notice", text: "Spielt eine vorherige Mitteilung eine Rolle?" },
  ],
});

function validContent(): PracticeCheckpointDefinitionContent {
  return {
    schemaVersion: 1,
    statement: "Für diesen Vorgang liegt nach unserer Definition eine Terminverspätung vor.",
    dimensions: [
      { dimensionId: "reference-time", decision: "INCLUDED" },
      { dimensionId: "prior-notice", decision: "EXCLUDED", rationale: "Für diese Definition ohne Bedeutung." },
    ],
    criteria: [
      {
        id: "arrival-after-limit",
        label: "Praxiseigener spätester Ankunftszeitpunkt ist überschritten",
        sourceDimensionId: "reference-time",
        dataKey: "arrivalDelta",
        operator: "GREATER_THAN",
        expectedValue: 12,
        unit: "practice-defined-unit",
      },
      {
        id: "appointment-recorded",
        label: "Termin und Ankunft sind dokumentiert",
        dataKey: "appointmentRecorded",
        operator: "EQUALS",
        expectedValue: true,
      },
    ],
    expression: {
      kind: "ALL",
      operands: [
        { kind: "CRITERION", criterionId: "arrival-after-limit" },
        { kind: "CRITERION", criterionId: "appointment-recorded" },
      ],
    },
    requiredData: [
      { key: "arrivalDelta", label: "Zeitabweichung nach Praxisdefinition" },
      { key: "appointmentRecorded", label: "Dokumentierter Termin- und Ankunftsbezug" },
    ],
    responsibility: {
      collectedBy: ["Empfang"],
      assessedBy: ["Diensthabende MFA"],
      assessmentLocation: "Terminannahme",
      documentationLocation: "Praxissystem",
    },
  };
}

describe("Praxis-Checkpoint-Definition", () => {
  it("akzeptiert strukturierte eigene Kriterien und ausdrücklich ausgeschlossene Dimensionen", () => {
    expect(validatePracticeDefinitionForRelease(validContent(), TEMPLATE)).toEqual([]);
  });

  it("übernimmt aus einer Vorlagendimension keinen impliziten Praxiswert", () => {
    const content = validContent();
    content.criteria = content.criteria.filter((criterion) => criterion.sourceDimensionId !== "reference-time");
    content.expression = { kind: "CRITERION", criterionId: "appointment-recorded" };
    expect(validatePracticeDefinitionForRelease(content, TEMPLATE)).toContain(
      "Die einbezogene Dimension reference-time hat kein konkretes Kriterium.",
    );
  });

  it("verlangt strukturierte Werte, vollständige Logik und Verantwortlichkeiten", () => {
    const content = validContent();
    delete content.criteria[0].expectedValue;
    content.expression = { kind: "CRITERION", criterionId: "arrival-after-limit" };
    content.responsibility.assessedBy = [];
    const issues = validatePracticeDefinitionForRelease(content, TEMPLATE);
    expect(issues).toContain("Für arrival-after-limit fehlt ein strukturierter Vergleichswert.");
    expect(issues).toContain("Alle Kriterien müssen ausdrücklich verknüpft werden.");
    expect(issues).toContain("Erhebung, Einschätzung und Dokumentationsort müssen festgelegt sein.");
  });

  it("weist strukturell ungültige API-Inhalte an der Parse-Grenze ab", () => {
    const content = validContent() as unknown as Record<string, unknown>;
    content.criteria = [{ id: "broken", operator: "EQUALS" }];
    expect(parsePracticeDefinitionContent(content)).toBeNull();
  });
});

describe("Praxisdefinition im Workflow-Snapshot", () => {
  const profile = {
    id: "appointment",
    title: "Termin",
    description: "",
    checkpointRefs: [{ checkpointId: "late-arrival", order: 1 }],
  };
  const checkpoint = {
    id: "late-arrival",
    title: "Patient kommt zu spät.",
    orientationAnchors: [],
  };

  it("lässt bestehende V1-Snapshots ohne Definition weiterhin gültig", () => {
    const snapshot = buildInitialPracticeWorkflowSnapshot(profile, () => checkpoint);
    expect(isPracticeWorkflowSnapshot(snapshot)).toBe(true);
    expect(snapshot.checkpoints[0]).not.toHaveProperty("practiceDefinitionVersion");
  });

  it("heftet genau die beim Start aktuelle unveränderliche Version an", () => {
    const version = {
      definitionId: "definition-1",
      versionId: "version-2",
      version: 2,
      checkpointId: checkpoint.id,
      template: TEMPLATE,
      content: validContent(),
      releasedAt: "2026-09-29T12:00:00.000Z",
    };
    const snapshot = buildInitialPracticeWorkflowSnapshot(
      profile,
      () => checkpoint,
      new Map([[checkpoint.id, version]]),
    );
    expect(snapshot.checkpoints[0].practiceDefinitionVersion).toEqual(version);
  });
});