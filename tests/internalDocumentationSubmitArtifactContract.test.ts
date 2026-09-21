jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/questionnaire/internalDocumentationArtifacts", () => ({
  buildInternalDocumentationPdfArtifact: jest.fn(),
  buildInternalDocumentationXmlArtifact: jest.fn(),
  buildInternalDocumentationGdtArtifact: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import {
  buildInternalDocumentationGdtArtifact,
  buildInternalDocumentationPdfArtifact,
  buildInternalDocumentationXmlArtifact,
} from "@/lib/questionnaire/internalDocumentationArtifacts";
import { selectNextAutoDownloadArtifact } from "@/lib/questionnaire/autoDownloadArtifactSelector";
import { buildInternalWorkflowBlocks } from "@/lib/questionnaire/internalWorkflowRegistry";
import { submitInternalDocumentationSession } from "@/lib/questionnaire/internalDocumentationService";

const sessions = prisma.patientQuestionnaireSession as unknown as {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  updateMany: jest.Mock;
};
const buildPdf = buildInternalDocumentationPdfArtifact as jest.Mock;
const buildXml = buildInternalDocumentationXmlArtifact as jest.Mock;
const buildGdt = buildInternalDocumentationGdtArtifact as jest.Mock;

function artifact(extension: "pdf" | "xml" | "gdt") {
  return {
    bytes: new Uint8Array([extension.charCodeAt(0)]),
    filename: `20260921_81426_Interne_Dokumentation.${extension}`,
    mimeType: extension === "pdf"
      ? "application/pdf"
      : extension === "xml"
        ? "application/xml; charset=utf-8"
        : "application/octet-stream",
  };
}

it("schließt mit einem Submit ab und liefert danach PDF, XML und GDT derselben Session", async () => {
  const frozenBlocks = buildInternalWorkflowBlocks("care_plan_v1");
  const state = {
    id: "internal-session-1",
    status: "pending",
    session_kind: "internal_documentation" as const,
    source: "practice_direct",
    internal_workflow_id: "care_plan_v1",
    owner_practice_id: "practice-1",
    created_by_kiosk_device_id: null,
    deleted_at: null,
    patient_reference: "81426",
    submitted_at: null as Date | null,
    submitted_by: "practice",
    selected_block_ids: ["CARE_PLAN_HA"],
    deduplicated_questions: frozenBlocks.flatMap((block) => block.questions),
    frozen_blocks: frozenBlocks,
    answers: {} as Record<string, string>,
    context: "patient",
    auto_pdf_download_claimed_at: null as Date | null,
    auto_xml_download_claimed_at: null as Date | null,
    gdt_download_claimed_at: null as Date | null,
    practice_form: null,
  };

  sessions.findUnique.mockResolvedValue(state);
  sessions.findFirst.mockResolvedValue(null);
  sessions.findMany.mockImplementation(({ where }: { where: { AND: Array<Record<string, unknown>> } }) => {
    if (state.status !== "completed") return Promise.resolve([]);
    const isInternal = where.AND.some((part) => part.session_kind === "internal_documentation");
    const requestedId = where.AND.find((part) => typeof part.id === "string")?.id;
    const hasOpenArtifact = state.auto_pdf_download_claimed_at === null ||
      state.auto_xml_download_claimed_at === null ||
      state.gdt_download_claimed_at === null;
    return Promise.resolve(
      isInternal && requestedId === state.id && hasOpenArtifact ? [state] : [],
    );
  });
  sessions.updateMany.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
    Object.assign(state, data);
    return Promise.resolve({ count: 1 });
  });
  buildPdf.mockResolvedValue(artifact("pdf"));
  buildXml.mockReturnValue(artifact("xml"));
  buildGdt.mockReturnValue(artifact("gdt"));

  await submitInternalDocumentationSession({
    sessionId: state.id,
    answers: { CARE_PLAN_HA_NOTES: "Versorgung abgestimmt" },
    context: {
      kind: "practice",
      practiceId: "practice-1",
      accountId: "account-1",
    },
  });

  expect(state.status).toBe("completed");
  expect(state.submitted_at).toBeInstanceOf(Date);

  const selectNext = () => selectNextAutoDownloadArtifact({
    practiceId: "practice-1",
    deviceHash: "device-hash",
    enabledAt: new Date(0),
    sessionId: state.id,
  });
  const delivered = [await selectNext(), await selectNext(), await selectNext()];

  expect(delivered.map((result) => result?.filename)).toEqual([
    "20260921_81426_Interne_Dokumentation.pdf",
    "20260921_81426_Interne_Dokumentation.xml",
    "20260921_81426_Interne_Dokumentation.gdt",
  ]);
  expect(await selectNext()).toBeNull();
  expect(buildPdf).toHaveBeenCalledTimes(1);
  expect(buildXml).toHaveBeenCalledTimes(1);
  expect(buildGdt).toHaveBeenCalledTimes(1);
});