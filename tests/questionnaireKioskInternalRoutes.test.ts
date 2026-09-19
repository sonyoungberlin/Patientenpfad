import { NextRequest } from "next/server";
import { POST as createInternal } from "@/app/api/questionnaire-kiosk/internal/route";
import { POST as submitInternal } from "@/app/api/questionnaire-kiosk/internal/[id]/route";

jest.mock("@/lib/questionnaireKiosk/auth", () => ({
  requireUnlockedQuestionnaireKioskDevice: jest.fn(),
  hasQuestionnaireKioskCapability: jest.fn(),
}));
jest.mock("@/lib/questionnaire/createSession", () => ({
  createQuestionnaireSession: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    practiceDocumentationBlock: {
      findMany: jest.fn(),
    },
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import { prisma } from "@/lib/prisma";
import {
  hasQuestionnaireKioskCapability,
  requireUnlockedQuestionnaireKioskDevice,
} from "@/lib/questionnaireKiosk/auth";
import {
  buildInternalDocumentationFrozenBlocks,
  buildInternalWorkflowBlocks,
} from "@/lib/questionnaire/internalWorkflowRegistry";

const guard = requireUnlockedQuestionnaireKioskDevice as jest.Mock;
const hasCapability = hasQuestionnaireKioskCapability as jest.Mock;
const createSession = createQuestionnaireSession as jest.Mock;
const db = prisma as unknown as {
  practiceDocumentationBlock: {
    findMany: jest.Mock;
  };
  patientQuestionnaireSession: {
    findUnique: jest.Mock;
    updateMany: jest.Mock;
  };
};

const device = {
  deviceId: "device-1",
  practiceId: "practice-1",
  deviceName: "Empfang",
  capabilities: ["internal_documentation"],
};

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("interne Kiosk-Dokumentation", () => {
  beforeEach(() => {
    guard.mockReset().mockResolvedValue({ device, error: null });
    hasCapability.mockReset().mockReturnValue(true);
    createSession.mockReset().mockResolvedValue({
      sessionId: "session-1",
      token: "",
      tokenLink: "http://localhost/questionnaire-kiosk/internal/session-1",
    });
    db.practiceDocumentationBlock.findMany.mockReset().mockImplementation(({ where }: {
      where: { id: { in: string[] } };
    }) => Promise.resolve(where.id.in.map((id) => ({
      id,
      definition: {
        schemaVersion: 1,
        visibleType: "text",
        block: { id, label: id, displayOrder: 0, questionIds: [`${id}_question`] },
        questions: [{ id: `${id}_question`, text: id, type: "textarea", required: false }],
      },
    }))));
    db.patientQuestionnaireSession.findUnique.mockReset();
    db.patientQuestionnaireSession.updateMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it("verlangt die interne Capability vor dem Erstellen", async () => {
    hasCapability.mockReturnValue(false);

    const response = await createInternal(request("/api/questionnaire-kiosk/internal", {
      workflow_id: "care_plan_v1",
      patient_reference: "PAT-1",
    }));

    expect(response.status).toBe(403);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("erstellt ausgewählte Blocks als interne practice-owned Kiosk-Session", async () => {
    const response = await createInternal(request("/api/questionnaire-kiosk/internal", {
      selectedBlockIds: ["practice_block_care_plan"],
      blockLayout: [{ blockId: "practice_block_care_plan", section: 3, order: 0 }],
      patientReference: " 81426 ",
      documentTitleOption: "bescheinigung",
      outputFormat: "formell",
    }));

    expect(response.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      patientReference: "81426",
      internalDocumentTitle: {
        documentTitleOption: "bescheinigung",
        documentTitle: "Bescheinigung",
      },
      selectedBlockIds: ["practice_block_care_plan"],
      internalBlockLayout: [{ blockId: "practice_block_care_plan", section: 3, order: 0 }],
      internalOutputFormat: "formell",
      ownerPracticeId: "practice-1",
      createdByKioskDeviceId: "device-1",
      source: "kiosk_direct",
      sessionKind: "internal_documentation",
      internalWorkflowId: null,
    }));
    const input = createSession.mock.calls[0][0];
    expect(input).not.toHaveProperty("patientCopyReturnEmail");
    expect(input).not.toHaveProperty("practiceConfirmations");
  });

  it.each([
    { workflow_id: "care_plan_v1", patientReference: "PAT-1" },
    { selectedBlockIds: ["CARE_PLAN_HA"], workflow_id: "care_plan_v1", patientReference: "PAT-1" },
    { selectedBlockIds: ["CARE_PLAN_HA"], patient_reference: "PAT-1" },
  ])("weist Legacy-Create-Felder ab: %j", async (body) => {
    const response = await createInternal(request("/api/questionnaire-kiosk/internal", body));
    expect(response.status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("erstellt Cross-Group-Blocks ohne Workflow-ID", async () => {
    const response = await createInternal(request("/api/questionnaire-kiosk/internal", {
      selectedBlockIds: ["practice_block_care_plan", "practice_block_vaccination", "practice_block_lab"],
      patientReference: "81426",
      documentTitleOption: "bericht",
      outputFormat: "informell",
    }));

    expect(response.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      selectedBlockIds: ["practice_block_care_plan", "practice_block_vaccination", "practice_block_lab"],
      patientReference: "81426",
      internalDocumentTitle: {
        documentTitleOption: "bericht",
        documentTitle: "Bericht",
      },
      internalOutputFormat: "informell",
      internalWorkflowId: null,
    }));
    expect(createSession.mock.calls[0][0]).not.toHaveProperty("workflowId");
  });

  it("weist unbekannte interne Blocks serverseitig ab", async () => {
    const response = await createInternal(request("/api/questionnaire-kiosk/internal", {
      selectedBlockIds: ["__proto__"],
      patientReference: "81426",
    }));

    expect(response.status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { documentTitleOption: "unbekannt" },
    { documentTitleOption: "andere" },
    { documentTitleOption: "andere", customDocumentTitle: "   " },
    { documentTitleOption: "andere", customDocumentTitle: "Titel\nZeile" },
  ])("weist ungültige Dokumenttitel mit HTTP 400 ab: %j", async (titleInput) => {
    const response = await createInternal(request("/api/questionnaire-kiosk/internal", {
      selectedBlockIds: ["CARE_PLAN_HA"],
      patientReference: "81426",
      ...titleInput,
    }));

    expect(response.status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each(["", "PAT-1", "814-26", "81426!"])(
    "weist die ungültige neue Referenz %j mit HTTP 400 ab",
    async (patientReference) => {
      const response = await createInternal(request(
        "/api/questionnaire-kiosk/internal",
        {
          selectedBlockIds: ["CARE_PLAN_HA"],
          patientReference,
          documentTitleOption: "arztbrief",
        },
      ));

      expect(response.status).toBe(400);
      expect(createSession).not.toHaveBeenCalled();
    },
  );

  it("weist eine Session eines anderen Kioskgeräts ab", async () => {
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "kiosk_direct",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-2",
      deleted_at: null,
      deduplicated_questions: [],
      frozen_blocks: [],
    });

    const response = await submitInternal(
      request("/api/questionnaire-kiosk/internal/session-1", { answers: { note: "Inhalt" } }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(404);
    expect(db.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });

  it("antwortet bei 121 Zeichen in einem begrenzten Feld mit HTTP 400", async () => {
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "kiosk_direct",
      internal_workflow_id: "care_plan_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      deleted_at: null,
      frozen_blocks: buildInternalWorkflowBlocks("care_plan_v1"),
    });

    const response = await submitInternal(
      request("/api/questionnaire-kiosk/internal/session-1", {
        answers: { CARE_PLAN_HA_NOTES: "a".repeat(121) },
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      invalidQuestionIds: ["CARE_PLAN_HA_NOTES"],
    });
    expect(db.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });

  it("weist eine Session mit unbekannter Workflow-ID ab", async () => {
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "kiosk_direct",
      internal_workflow_id: "unknown_workflow",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      deleted_at: null,
      deduplicated_questions: [],
      frozen_blocks: [],
    });

    const response = await submitInternal(
      request("/api/questionnaire-kiosk/internal/session-1", { answers: { note: "Inhalt" } }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(400);
    expect(db.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });

  it("schließt eine eigene interne Session mit validierten Antworten ab", async () => {
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "kiosk_direct",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      deleted_at: null,
      deduplicated_questions: [{ id: "note", type: "textarea" }],
      frozen_blocks: [{
        id: "CARE",
        title: "Versorgungsplan",
        questions: [{ id: "note", type: "textarea", label: "Notiz" }],
        conditionalRules: [],
      }],
    });

    const response = await submitInternal(
      request("/api/questionnaire-kiosk/internal/session-1", { answers: { note: "  Inhalt  " } }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(200);
    expect(db.patientQuestionnaireSession.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "session-1",
        status: "pending",
        source: "kiosk_direct",
        session_kind: "internal_documentation",
        owner_practice_id: "practice-1",
        created_by_kiosk_device_id: "device-1",
        deleted_at: null,
      }),
      data: expect.objectContaining({
        answers: { note: "  Inhalt  " },
        status: "completed",
        submitted_at: expect.any(Date),
      }),
    });
  });

  it("akzeptiert technische v2-Impf-IDs ohne falschen Zeichenfehler", async () => {
    const frozenBlocks = buildInternalWorkflowBlocks("vaccination_review_v1");
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "kiosk_direct",
      internal_workflow_id: "vaccination_review_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      deleted_at: null,
      deduplicated_questions: frozenBlocks.flatMap((block) => block.questions),
      frozen_blocks: frozenBlocks,
    });

    const response = await submitInternal(
      request("/api/questionnaire-kiosk/internal/session-1", {
        answers: {
          VACCINATION_REVIEW_ITEMS: JSON.stringify([{
            vaccination_id: "dtp",
            documented_status: "Vollständig vorhanden",
          }]),
        },
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(200);
    expect(db.patientQuestionnaireSession.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: "session-1", status: "pending" }),
      data: expect.objectContaining({
        answers: {
          VACCINATION_REVIEW_ITEMS: JSON.stringify([{
            vaccination_id: "dtp",
            documented_status: "Vollständig vorhanden",
          }]),
        },
      }),
    });
  });

  it("liefert nach blockbasierter Impfberatung kanonischen Text und XML-Dateinamen", async () => {
    const frozenBlocks = buildInternalDocumentationFrozenBlocks(["VACCINATION_REVIEW"]);
    const answers = {
      VACCINATION_REVIEW_ITEMS: JSON.stringify([{
        vaccination_id: "influenza",
        documented_status: "Vollständig vorhanden",
      }]),
    };
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "kiosk_direct",
      internal_workflow_id: null,
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      deleted_at: null,
      patient_reference: "PAT-1",
      selected_block_ids: ["VACCINATION_REVIEW"],
      deduplicated_questions: frozenBlocks.flatMap((block) => block.questions),
      frozen_blocks: frozenBlocks,
    });

    const response = await submitInternal(
      request("/api/questionnaire-kiosk/internal/session-1", { answers }),
      { params: Promise.resolve({ id: "session-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.noteText).not.toContain("Interne Dokumentation");
    expect(body.noteText).toContain("Impfungen");
    expect(body.xmlFilename).toMatch(/^\d{8}_PAT1_Interne_Dokumentation\.xml$/);
  });

  it("lehnt eine manipulierte v2-Impf-ID nach Sanitizing über die Frozen-Allowlist ab", async () => {
    const frozenBlocks = buildInternalWorkflowBlocks("vaccination_review_v1");
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "kiosk_direct",
      internal_workflow_id: "vaccination_review_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      deleted_at: null,
      deduplicated_questions: frozenBlocks.flatMap((block) => block.questions),
      frozen_blocks: frozenBlocks,
    });

    const response = await submitInternal(
      request("/api/questionnaire-kiosk/internal/session-1", {
        answers: {
          VACCINATION_REVIEW_ITEMS: JSON.stringify([{
            vaccination_id: "foo_bar",
            documented_status: "Vollständig vorhanden",
          }]),
        },
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Die Impfungsdaten enthalten ungültige Werte.",
    });
    expect(db.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });

  it("lehnt echten ungültigen v2-Impf-Freitext weiterhin bei der Zeichenprüfung ab", async () => {
    const frozenBlocks = buildInternalWorkflowBlocks("vaccination_review_v1");
    db.patientQuestionnaireSession.findUnique.mockResolvedValue({
      status: "pending",
      session_kind: "internal_documentation",
      source: "kiosk_direct",
      internal_workflow_id: "vaccination_review_v1",
      owner_practice_id: "practice-1",
      created_by_kiosk_device_id: "device-1",
      deleted_at: null,
      deduplicated_questions: frozenBlocks.flatMap((block) => block.questions),
      frozen_blocks: frozenBlocks,
    });

    const response = await submitInternal(
      request("/api/questionnaire-kiosk/internal/session-1", {
        answers: {
          VACCINATION_REVIEW_ITEMS: JSON.stringify([{
            vaccination_id: "other",
            documented_status: "Unklar",
            custom_label: "Импфунг",
          }]),
        },
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Bitte verwenden Sie lateinische Buchstaben.",
      invalidQuestionIds: ["VACCINATION_REVIEW_ITEMS"],
    });
    expect(db.patientQuestionnaireSession.updateMany).not.toHaveBeenCalled();
  });
});