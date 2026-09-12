jest.mock("@/lib/questionnaire/createSession", () => ({
  createQuestionnaireSession: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { prisma } from "@/lib/prisma";
import { buildInternalWorkflowBlocks } from "@/lib/questionnaire/internalWorkflowRegistry";
import {
  createInternalDocumentationSession,
  InternalDocumentationError,
  submitInternalDocumentationSession,
} from "@/lib/questionnaire/internalDocumentationService";

const createSession = createQuestionnaireSession as jest.Mock;
const db = prisma.patientQuestionnaireSession as unknown as {
  findUnique: jest.Mock;
  updateMany: jest.Mock;
};

describe("internal documentation service", () => {
  beforeEach(() => {
    createSession.mockReset().mockResolvedValue({ sessionId: "session-1" });
    db.findUnique.mockReset();
    db.updateMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it("erstellt ausgewählte Blocks im Praxiskontext mit festem Ownership-Scope", async () => {
      await createInternalDocumentationSession({
        selectedBlockIds: ["CARE_PLAN_HA"],
        patientReference: " 81426 ",
        documentTitleOption: "arztbrief",
        origin: "https://example.test",
        context: {
          kind: "practice",
          practiceId: "practice-1",
          accountId: "account-1",
        },
      });

      expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
        patientReference: "81426",
        ownerAccountId: "account-1",
        ownerPracticeId: "practice-1",
        source: "practice_direct",
        sessionKind: "internal_documentation",
        internalWorkflowId: null,
        internalDocumentTitle: {
          documentTitleOption: "arztbrief",
          documentTitle: "Arztbrief",
        },
      }));
      const input = createSession.mock.calls[0][0];
      expect(input.internalBlockLayout).toEqual([
        { blockId: "CARE_PLAN_HA", section: 1, order: 0 },
      ]);
      expect(input).not.toHaveProperty("createdByKioskDeviceId");
      expect(input).not.toHaveProperty("patientCopyReturnEmail");
      expect(input).not.toHaveProperty("practiceConfirmations");
  });

  it("erstellt den Kioskkontext weiterhin ohne Account-Owner", async () => {
    await createInternalDocumentationSession({
      selectedBlockIds: ["CARE_PLAN_HA"],
      patientReference: "81426",
      documentTitleOption: "bericht",
      origin: "https://example.test",
      context: {
        kind: "kiosk",
        practiceId: "practice-1",
        deviceId: "device-1",
      },
    });

    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      ownerPracticeId: "practice-1",
      createdByKioskDeviceId: "device-1",
      source: "kiosk_direct",
      internalWorkflowId: null,
    }));
    expect(createSession.mock.calls[0][0]).not.toHaveProperty("ownerAccountId");
  });

  it("weist unbekannte Blocks vor der Session-Erzeugung ab", async () => {
    await expect(createInternalDocumentationSession({
      selectedBlockIds: ["unknown"],
      patientReference: "81426",
      documentTitleOption: "arztbrief",
      origin: "https://example.test",
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    })).rejects.toMatchObject({ status: 400 });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("validiert und normalisiert frei sortierte Blockplatzierungen", async () => {
    await createInternalDocumentationSession({
      selectedBlockIds: ["CARE_PLAN_HA", "VACCINATION_REVIEW"],
      blockLayout: [
        { blockId: "VACCINATION_REVIEW", section: 1, order: 9 },
        { blockId: "CARE_PLAN_HA", section: 2, order: 4 },
      ],
      patientReference: "81426",
      documentTitleOption: "stellungnahme",
      origin: "https://example.test",
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });

    expect(createSession.mock.calls[0][0].internalBlockLayout).toEqual([
      { blockId: "VACCINATION_REVIEW", section: 1, order: 0 },
      { blockId: "CARE_PLAN_HA", section: 2, order: 0 },
    ]);
  });

  it.each([
    { blockLayout: [{ blockId: "UNKNOWN", section: 1, order: 0 }] },
    { blockLayout: [{ blockId: "CARE_PLAN_HA", section: 4, order: 0 }] },
    { blockLayout: [{ blockId: "CARE_PLAN_HA", section: 1, order: -1 }] },
    { blockLayout: [
      { blockId: "CARE_PLAN_HA", section: 1, order: 0 },
      { blockId: "CARE_PLAN_HA", section: 2, order: 0 },
    ] },
  ])("weist ungültiges Blocklayout ab: $blockLayout", async ({ blockLayout }) => {
    await expect(createInternalDocumentationSession({
      selectedBlockIds: ["CARE_PLAN_HA"],
      blockLayout,
      patientReference: "81426",
      documentTitleOption: "arztbrief",
      origin: "https://example.test",
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    })).rejects.toMatchObject({ status: 400 });
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([
    { documentTitleOption: undefined },
    { documentTitleOption: "unbekannt" },
    { documentTitleOption: "andere" },
    { documentTitleOption: "andere", customDocumentTitle: "   " },
    { documentTitleOption: "andere", customDocumentTitle: "a".repeat(121) },
    { documentTitleOption: "andere", customDocumentTitle: "Titel\nZeile" },
    { documentTitleOption: "arztbrief", customDocumentTitle: "Zusatz" },
  ])("weist einen ungültigen Dokumenttitel ab: %j", async (titleInput) => {
    await expect(createInternalDocumentationSession({
      selectedBlockIds: ["CARE_PLAN_HA"],
      patientReference: "81426",
      ...titleInput,
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
      origin: "https://example.test",
    })).rejects.toMatchObject({ status: 400 });
    expect(createSession).not.toHaveBeenCalled();
  });

  it("speichert einen getrimmten individuellen Dokumenttitel unabhängig von Blocks", async () => {
    await createInternalDocumentationSession({
      selectedBlockIds: ["VACCINATION_REVIEW", "CARE_PLAN_HA"],
      patientReference: "81426",
      documentTitleOption: "andere",
      customDocumentTitle: "  Individueller Titel  ",
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
      origin: "https://example.test",
    });

    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      selectedBlockIds: ["CARE_PLAN_HA", "VACCINATION_REVIEW"],
      internalDocumentTitle: {
        documentTitleOption: "andere",
        documentTitle: "Individueller Titel",
      },
    }));
  });

  it.each(["", "   ", "PAT-1", "814-26", "81426!"])(
    "weist die ungültige neue Patientenreferenz %j ab",
    async (patientReference) => {
      await expect(createInternalDocumentationSession({
        selectedBlockIds: ["CARE_PLAN_HA"],
        patientReference,
        documentTitleOption: "arztbrief",
        origin: "https://example.test",
        context: {
          kind: "practice",
          practiceId: "practice-1",
          accountId: "account-1",
        },
      })).rejects.toMatchObject({ status: 400 });

      expect(createSession).not.toHaveBeenCalled();
    },
  );

  it("schließt eine Praxis-Session mit vollständig gescoptem atomarem Write ab", async () => {
    const frozenBlocks = buildInternalWorkflowBlocks("care_plan_v1");
    db.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: "care_plan_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: frozenBlocks,
    });

    await submitInternalDocumentationSession({
      sessionId: "session-1",
      answers: { CARE_PLAN_HA_NOTES: "a".repeat(120) },
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });

    expect(db.updateMany).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        status: "pending",
        deleted_at: null,
        session_kind: "internal_documentation",
        source: "practice_direct",
        owner_practice_id: "practice-1",
        created_by_kiosk_device_id: null,
        internal_workflow_id: "care_plan_v1",
      },
      data: expect.objectContaining({ status: "completed", submitted_at: expect.any(Date) }),
    });
    expect(db.updateMany.mock.calls[0][0].data.answers.CARE_PLAN_HA_NOTES).toHaveLength(120);
  });

  it("weist im Praxisweg 121 Zeichen vor dem Speichern ab", async () => {
    db.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: "care_plan_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: buildInternalWorkflowBlocks("care_plan_v1"),
    });

    await expect(submitInternalDocumentationSession({
      sessionId: "session-1",
      answers: { CARE_PLAN_HA_NOTES: "a".repeat(121) },
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    })).rejects.toMatchObject({ status: 400, invalidQuestionIds: ["CARE_PLAN_HA_NOTES"] });
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it("akzeptiert im Kioskweg 120 Zeichen im optionalen Facharzt-Hinweis", async () => {
    db.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "kiosk_direct",
      internal_workflow_id: "care_plan_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      deleted_at: null,
      frozen_blocks: buildInternalWorkflowBlocks("care_plan_v1"),
    });

    await submitInternalDocumentationSession({
      sessionId: "session-1",
      answers: { CARE_PLAN_SPECIALISTS: JSON.stringify([{ note: "a".repeat(120) }]) },
      context: { kind: "kiosk", practiceId: "practice-1", deviceId: "device-1" },
    });
    const stored = JSON.parse(db.updateMany.mock.calls[0][0].data.answers.CARE_PLAN_SPECIALISTS);
    expect(stored[0].note).toHaveLength(120);
  });

  it("weist im Kioskweg 121 Zeichen in einem Repeatable-Unterfeld ab", async () => {
    db.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "kiosk_direct",
      internal_workflow_id: "care_plan_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      deleted_at: null,
      frozen_blocks: buildInternalWorkflowBlocks("care_plan_v1"),
    });

    await expect(submitInternalDocumentationSession({
      sessionId: "session-1",
      answers: { CARE_PLAN_SPECIALISTS: JSON.stringify([{ note: "a".repeat(121) }]) },
      context: { kind: "kiosk", practiceId: "practice-1", deviceId: "device-1" },
    })).rejects.toMatchObject({ status: 400, invalidQuestionIds: ["CARE_PLAN_SPECIALISTS"] });
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it("interpretiert einen alten Frozen Snapshot ohne maxLength nicht neu", async () => {
    const frozenBlocks = buildInternalWorkflowBlocks("care_plan_v1");
    const notes = frozenBlocks[0].questions.find((question) => question.id === "CARE_PLAN_HA_NOTES")!;
    delete notes.maxLength;
    db.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: "care_plan_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: frozenBlocks,
    });

    await submitInternalDocumentationSession({
      sessionId: "session-1",
      answers: { CARE_PLAN_HA_NOTES: "a".repeat(121) },
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });
    expect(db.updateMany.mock.calls[0][0].data.answers.CARE_PLAN_HA_NOTES).toHaveLength(121);
  });

  it.each([
    ["fremde Praxis", { owner_practice_id: "practice-2" }],
    ["Kiosk-Session", { source: "kiosk_direct", created_by_kiosk_device_id: "device-1" }],
    ["falsche Session-Art", { session_kind: "patient_communication" }],
    ["abgeschlossen", { status: "completed" }],
    ["archiviert", { deleted_at: new Date() }],
  ])("weist %s über den Praxisweg ab", async (_label, override) => {
    db.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: "care_plan_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: buildInternalWorkflowBlocks("care_plan_v1"),
      ...override,
    });

    await expect(submitInternalDocumentationSession({
      sessionId: "session-1",
      answers: { CARE_PLAN_HA_NOTES: "Praxis A" },
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    })).rejects.toBeInstanceOf(InternalDocumentationError);
    expect(db.updateMany).not.toHaveBeenCalled();
  });

  it("verhindert Doppelsubmit über den atomaren Write", async () => {
    db.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: "care_plan_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: buildInternalWorkflowBlocks("care_plan_v1"),
    });
    db.updateMany.mockResolvedValue({ count: 0 });

    await expect(submitInternalDocumentationSession({
      sessionId: "session-1",
      answers: { CARE_PLAN_HA_NOTES: "Praxis A" },
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    })).rejects.toMatchObject({ status: 409 });
  });

  describe("health_check_v1 Follow-up-Konsistenz", () => {
    function prepareHealthCheckSession() {
      db.findUnique.mockResolvedValue({
        status: "pending",
        session_kind: "internal_documentation",
        source: "practice_direct",
        internal_workflow_id: "health_check_v1",
        owner_practice_id: "practice-1",
        created_by_kiosk_device_id: null,
        deleted_at: null,
        frozen_blocks: buildInternalWorkflowBlocks("health_check_v1"),
      });
    }

    async function submitHealthCheck(answers: Record<string, string>) {
      prepareHealthCheckSession();
      return submitInternalDocumentationSession({
        sessionId: "session-1",
        answers,
        context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
      });
    }

    it("weist ein leeres Pflichtfeld ab", async () => {
      await expect(submitHealthCheck({})).rejects.toMatchObject({ status: 400 });
      expect(db.updateMany).not.toHaveBeenCalled();
    });

    it.each([
      ["nein ohne Maßnahmen", { HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein" }],
      ["nein mit Maßnahme", { HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein", HEALTH_CHECK_NEXT_STEPS: "Verlaufskontrolle in unserer Praxis" }],
      ["nein mit Hinweis", { HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein", HEALTH_CHECK_NEXT_STEPS_NOTE: "Hinweis" }],
      ["ja ohne Maßnahme oder Hinweis", { HEALTH_CHECK_FOLLOW_UP_REQUIRED: "ja" }],
      ["ja mit Maßnahme", { HEALTH_CHECK_FOLLOW_UP_REQUIRED: "ja", HEALTH_CHECK_NEXT_STEPS: "Verlaufskontrolle in unserer Praxis" }],
      ["ja nur mit Hinweis", { HEALTH_CHECK_FOLLOW_UP_REQUIRED: "ja", HEALTH_CHECK_NEXT_STEPS_NOTE: "Hinweis" }],
    ])("akzeptiert %s", async (_label, answers) => {
      await submitHealthCheck(answers);
      expect(db.updateMany).toHaveBeenCalledTimes(1);
    });

    it("speichert klinische und Follow-up-Custom-Werte exakt", async () => {
      await submitHealthCheck({
        HEALTH_CHECK_GENERAL_STATUS: "unauffällig",
        HEALTH_CHECK_HEART_STATUS: "auffällig",
        HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein",
      });

      expect(db.updateMany.mock.calls[0][0].data.answers).toMatchObject({
        HEALTH_CHECK_GENERAL_STATUS: "unauffällig",
        HEALTH_CHECK_HEART_STATUS: "auffällig",
        HEALTH_CHECK_FOLLOW_UP_REQUIRED: "nein",
      });
    });
  });

  it("berechnet Impf-next_date serverseitig und verwirft den Clientwert", async () => {
    const frozenBlocks = buildInternalWorkflowBlocks("vaccination_review_v1");
    db.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: "vaccination_review_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: frozenBlocks,
    });

    await submitInternalDocumentationSession({
      sessionId: "session-1",
      answers: {
        VACCINATION_REVIEW_ITEMS: JSON.stringify([{
          vaccination_id: "rsv",
          documented_status: "Nicht vorhanden",
          further_action: "Impfung ärztlich empfohlen",
          reference_date: "2026-01-31",
          interval_value: "1",
          interval_unit: "Monate",
          note: "a".repeat(120),
          next_date: "2099-12-31",
        }]),
      },
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });

    const stored = JSON.parse(
      db.updateMany.mock.calls[0][0].data.answers.VACCINATION_REVIEW_ITEMS,
    );
    expect(stored[0].next_date).toBe("2026-02-28");
    expect(stored[0].note).toHaveLength(120);
  });

  it("normalisiert die Impfmatrix anhand der Frozen QuestionDefinition", async () => {
    const frozenBlocks = buildInternalWorkflowBlocks("vaccination_review_v1");
    db.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: "care_plan_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: frozenBlocks,
    });

    await submitInternalDocumentationSession({
      sessionId: "session-1",
      answers: {
        VACCINATION_REVIEW_ITEMS: JSON.stringify([{
          vaccination_id: "rsv",
          documented_status: "Unklar",
          next_date: "2099-12-31",
        }]),
      },
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    });

    const stored = JSON.parse(
      db.updateMany.mock.calls[0][0].data.answers.VACCINATION_REVIEW_ITEMS,
    );
    expect(stored).toEqual([{
      vaccination_id: "rsv",
      documented_status: "Unklar",
    }]);
  });

  it("weist 121 Zeichen in einem Impfmatrix-Freitextfeld ab", async () => {
    db.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "practice_direct",
      internal_workflow_id: "vaccination_review_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: null,
      deleted_at: null,
      frozen_blocks: buildInternalWorkflowBlocks("vaccination_review_v1"),
    });

    await expect(submitInternalDocumentationSession({
      sessionId: "session-1",
      answers: {
        VACCINATION_REVIEW_ITEMS: JSON.stringify([{
          vaccination_id: "rsv",
          documented_status: "Unklar",
          further_action: "Impfung ärztlich empfohlen",
          note: "a".repeat(121),
        }]),
      },
      context: { kind: "practice", practiceId: "practice-1", accountId: "account-1" },
    })).rejects.toMatchObject({ status: 400, invalidQuestionIds: ["VACCINATION_REVIEW_ITEMS"] });
    expect(db.updateMany).not.toHaveBeenCalled();
  });
});
