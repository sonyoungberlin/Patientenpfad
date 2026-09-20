jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: { create: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";
import {
  getInternalDocumentTitle,
  parseFrozenBlocks,
  parseInternalDocumentTitleMetadata,
} from "@/lib/questionnaire/frozenBlocks";
import { buildQuestionnaireInboxDetail } from "@/lib/questionnaire/inboxDetail";
import { buildStructuredAppXml } from "@/lib/questionnaire/appTextXml";

const create = prisma.patientQuestionnaireSession.create as jest.Mock;

describe("internal documentation persistence", () => {
  beforeEach(() => {
    create.mockReset().mockResolvedValue({ id: "session-1" });
  });

  it("erzeugt keine öffentliche Token- oder Patient-Copy-Freigabe", async () => {
    const result = await createQuestionnaireSession({
      selectedBlockIds: [],
      patientReference: "PAT-1",
      patientLanguage: "de",
      ownerAccountId: "account-1",
      ownerPracticeId: "practice-1",
      source: "practice_direct",
      sessionKind: "internal_documentation",
      internalWorkflowId: "care_plan_v1",
      origin: "https://example.test",
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        token: null,
        token_expires_at: null,
        patient_copy_return_email: null,
        source: "practice_direct",
        session_kind: "internal_documentation",
        internal_workflow_id: "care_plan_v1",
      }),
    }));
    expect(result.token).toBe("");
    expect(result.tokenLink).not.toContain("/q/");
  });

  it("friert Fachärzte und Einwilligung ohne Patientenkommunikationsfelder ein", async () => {
    const result = await createQuestionnaireSession({
      selectedBlockIds: ["SPECIALISTS", "INTERNAL_CONSENT"],
      patientReference: "PAT-2",
      patientLanguage: "de",
      ownerAccountId: "account-1",
      ownerPracticeId: "practice-1",
      source: "practice_direct",
      sessionKind: "internal_documentation",
      internalWorkflowId: null,
      internalDocumentTitle: {
        documentTitleOption: "patienteninformation",
        documentTitle: "Patienteninformation",
      },
      internalPatientSignatureRequired: true,
      internalPatientSignatureCity: "Berlin",
      origin: "https://example.test",
    });

    const data = create.mock.calls[0][0].data;
    expect(data.token).toBeNull();
    expect(data.token_expires_at).toBeNull();
    expect(data.patient_copy_return_email).toBeNull();
    expect(data.auto_xml_download_claimed_at).toBeNull();
    expect(data.selected_block_ids).toEqual(["SPECIALISTS", "INTERNAL_CONSENT"]);
    expect(data.frozen_blocks).toEqual(expect.objectContaining({
      schemaVersion: 2,
      metadata: {
        documentTitleOption: "patienteninformation",
        documentTitle: "Patienteninformation",
        patientSignatureRequired: true,
        patientSignatureCity: "Berlin",
      },
      blocks: [
        expect.objectContaining({ id: "SPECIALISTS", outputSemantics: "documented-content-v1" }),
        expect.objectContaining({ id: "INTERNAL_CONSENT", outputSemantics: "documented-content-v1" }),
      ],
    }));
    expect(parseFrozenBlocks(data.frozen_blocks)).toHaveLength(2);
    expect(parseInternalDocumentTitleMetadata(data.frozen_blocks)).toEqual({
      documentTitleOption: "patienteninformation",
      documentTitle: "Patienteninformation",
    });
    expect(data.deduplicated_questions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "FACHAERZTE", type: "textarea" }),
      expect.objectContaining({ id: "INTERNAL_CONSENT_INCLUDE", type: "multi_select" }),
    ]));
    expect(data.deduplicated_questions).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "confirmation" }),
      expect.objectContaining({ id: "PATIENT_COPY_EMAIL" }),
    ]));
    expect(result.token).toBe("");
    expect(result.tokenLink).toBe("https://example.test/questionnaire-kiosk/internal/session-1");
  });

  it("liest alte Array-Snapshots ohne Titel mit neutralem Fallback", () => {
    const legacySnapshot = [{
      id: "CARE_PLAN_HA",
      label: "Hausärztliche Betreuung",
      displayOrder: 10,
      questions: [],
      conditionalRules: [],
      initiallyVisible: true,
    }];

    expect(parseFrozenBlocks(legacySnapshot)).toEqual(legacySnapshot);
    expect(parseInternalDocumentTitleMetadata(legacySnapshot)).toBeNull();
    expect(getInternalDocumentTitle(legacySnapshot)).toBe("Interne Dokumentation");
    const detail = buildQuestionnaireInboxDetail({
      patient_reference: "PAT-1",
      submitted_at: new Date("2026-09-12T10:00:00.000Z"),
      selected_block_ids: ["CARE_PLAN_HA"],
      deduplicated_questions: [],
      answers: {},
      frozen_blocks: legacySnapshot,
      source: "practice_direct",
      session_kind: "internal_documentation",
      internal_workflow_id: null,
    });
    expect(buildStructuredAppXml(detail.semanticDocument!))
      .toContain("<documentTitle>Interne Dokumentation</documentTitle>");
  });

  it("übernimmt festen und individuellen Snapshot-Titel in das semantische v2-Dokument", () => {
    const blocks = [{
      id: "CARE_PLAN_HA",
      label: "Hausärztliche Betreuung",
      displayOrder: 10,
      questions: [],
      conditionalRules: [],
      initiallyVisible: true,
      outputSemantics: "documented-content-v1" as const,
    }];
    const detailFor = (documentTitleOption: "stellungnahme" | "andere", documentTitle: string) =>
      buildQuestionnaireInboxDetail({
        patient_reference: "PAT-1",
        submitted_at: new Date("2026-09-12T10:00:00.000Z"),
        selected_block_ids: ["CARE_PLAN_HA"],
        deduplicated_questions: [],
        answers: {},
        frozen_blocks: {
          schemaVersion: 2,
          metadata: { documentTitleOption, documentTitle },
          blocks,
        },
        source: "practice_direct",
        session_kind: "internal_documentation",
        internal_workflow_id: null,
      });

    const fixed = detailFor("stellungnahme", "Stellungnahme").semanticDocument!;
    const custom = detailFor("andere", "Bericht & Stellungnahme").semanticDocument!;
    expect(buildStructuredAppXml(fixed)).toContain(
      "<documentTitle>Stellungnahme</documentTitle>",
    );
    expect(buildStructuredAppXml(custom)).toContain(
      "<documentTitle>Bericht &amp; Stellungnahme</documentTitle>",
    );
  });
});