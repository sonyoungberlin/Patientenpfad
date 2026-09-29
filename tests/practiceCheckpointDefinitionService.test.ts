const mockDefinition = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  upsert: jest.fn(),
  update: jest.fn(),
};
const mockVersion = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  aggregate: jest.fn(),
  create: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceCheckpointDefinition: mockDefinition,
    practiceCheckpointDefinitionVersion: mockVersion,
    $transaction: jest.fn(async (callback: (tx: unknown) => unknown) => callback({
      practiceCheckpointDefinition: mockDefinition,
      practiceCheckpointDefinitionVersion: mockVersion,
    })),
  },
}));

jest.mock("@/lib/practiceProcesses/checkpointLibrary", () => ({
  getCheckpointFromLib: jest.fn(async () => ({
    id: "patient-kommt-zu-spaet",
    title: "Patient kommt zu spät zum Termin",
    orientationAnchors: [{ id: "reference-time", text: "Welcher Zeitpunkt gilt?" }],
  })),
}));

import {
  getPracticeDefinition,
  releasePracticeDefinition,
  savePracticeDefinitionDraft,
} from "@/lib/practiceProcesses/practiceDefinitionService";
import type { PracticeCheckpointDefinitionContent } from "@/lib/practiceProcesses/practiceDefinition";

const CONTENT: PracticeCheckpointDefinitionContent = {
  schemaVersion: 1,
  statement: "Nach unserer Definition liegt eine Terminverspätung vor.",
  dimensions: [{ dimensionId: "reference-time", decision: "INCLUDED" }],
  criteria: [{
    id: "after-limit",
    label: "Praxisgrenze überschritten",
    sourceDimensionId: "reference-time",
    dataKey: "arrivalDelta",
    operator: "GREATER_THAN",
    expectedValue: 12,
  }],
  expression: { kind: "CRITERION", criterionId: "after-limit" },
  requiredData: [{ key: "arrivalDelta", label: "Zeitabweichung" }],
  responsibility: {
    collectedBy: ["Empfang"],
    assessedBy: ["MFA"],
    assessmentLocation: "Empfang",
    documentationLocation: "PVS",
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDefinition.upsert.mockResolvedValue({ id: "definition-1" });
  mockDefinition.findUnique.mockResolvedValue({
    id: "definition-1",
    checkpoint_id: "patient-kommt-zu-spaet",
    draft: CONTENT,
    current_version_id: null,
  });
  mockVersion.aggregate.mockResolvedValue({ _max: { version: null } });
  mockVersion.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: `version-${String(data.version)}`,
    definition_id: "definition-1",
    checkpoint_id: "patient-kommt-zu-spaet",
    released_at: new Date("2026-09-29T10:00:00Z"),
    ...data,
  }));
  mockDefinition.update.mockResolvedValue({});
});

describe("versionierte Praxisdefinition", () => {
  it("speichert Drafts über genau eine Praxis-/Vorlagenfamilie", async () => {
    await savePracticeDefinitionDraft({ practiceId: "practice-1", checkpointId: "patient-kommt-zu-spaet", content: CONTENT });
    expect(mockDefinition.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        practice_id_checkpoint_id: {
          practice_id: "practice-1",
          checkpoint_id: "patient-kommt-zu-spaet",
        },
      },
    }));
  });

  it("erstellt bei jeder Freigabe eine neue unveränderliche Version statt zu überschreiben", async () => {
    const first = await releasePracticeDefinition({ practiceId: "practice-1", checkpointId: "patient-kommt-zu-spaet", actorAccountId: "account-1" });
    expect(first.version).toBe(1);
    expect(mockVersion.create).toHaveBeenCalledTimes(1);
    expect(mockDefinition.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ current_version_id: "version-1" }),
    }));
    expect(mockVersion).not.toHaveProperty("update");

    mockVersion.aggregate.mockResolvedValue({ _max: { version: 1 } });
    const second = await releasePracticeDefinition({ practiceId: "practice-1", checkpointId: "patient-kommt-zu-spaet", actorAccountId: "account-1" });
    expect(second.version).toBe(2);
    expect(mockVersion.create).toHaveBeenCalledTimes(2);
  });

  it("liefert den festen aktuellen Versionsinhalt getrennt vom nächsten Draft", async () => {
    mockDefinition.findUnique.mockResolvedValue({
      id: "definition-1",
      checkpoint_id: "patient-kommt-zu-spaet",
      draft: { ...CONTENT, statement: "Nächste Fassung" },
      current_version_id: "version-1",
    });
    mockVersion.findUnique.mockResolvedValue({
      id: "version-1",
      definition_id: "definition-1",
      version: 1,
      checkpoint_id: "patient-kommt-zu-spaet",
      template_snapshot: { checkpointId: "patient-kommt-zu-spaet", title: "Vorlage", dimensions: [] },
      content: CONTENT,
      released_at: new Date("2026-09-29T10:00:00Z"),
    });
    const result = await getPracticeDefinition("practice-1", "patient-kommt-zu-spaet");
    expect(result?.draft?.statement).toBe("Nächste Fassung");
    expect(result?.currentVersion?.content.statement).toBe(CONTENT.statement);
  });
});