jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/questionnaire/pdfRenderer", () => ({
  buildQuestionnairePdfBytes: jest.fn(),
}));
jest.mock("@/lib/questionnaire/internalDocumentationArtifacts", () => ({
  buildInternalDocumentationPdfArtifact: jest.fn(),
  buildInternalDocumentationXmlArtifact: jest.fn(),
  buildInternalDocumentationGdtArtifact: jest.fn(),
}));
jest.mock("@/lib/questionnaire/questionnaireExportService", () => ({
  resolveQuestionnairePdfOptions: jest.fn(() => ({ title: "Fragebogen" })),
  resolveQuestionnaireGdtExport: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import {
  buildInternalDocumentationGdtArtifact,
  buildInternalDocumentationPdfArtifact,
  buildInternalDocumentationXmlArtifact,
} from "@/lib/questionnaire/internalDocumentationArtifacts";
import { resolveQuestionnaireGdtExport } from "@/lib/questionnaire/questionnaireExportService";
import { selectNextAutoDownloadArtifactForDelivery } from "@/lib/questionnaire/autoDownloadArtifactSelector";

const sessions = prisma.patientQuestionnaireSession as unknown as {
  findFirst: jest.Mock;
  findMany: jest.Mock;
  updateMany: jest.Mock;
};
const buildPdf = buildQuestionnairePdfBytes as jest.Mock;
const buildInternalPdf = buildInternalDocumentationPdfArtifact as jest.Mock;
const buildInternalXml = buildInternalDocumentationXmlArtifact as jest.Mock;
const buildInternalGdt = buildInternalDocumentationGdtArtifact as jest.Mock;
const resolveGdt = resolveQuestionnaireGdtExport as jest.Mock;

const PATIENT_SESSION = {
  id: "patient-1",
  patient_reference: "4711",
  submitted_at: new Date("2026-09-13T10:00:00.000Z"),
  submitted_by: "patient",
  selected_block_ids: [],
  deduplicated_questions: [],
  frozen_blocks: null,
  answers: {},
  source: "internal_link",
  session_kind: "patient_communication",
  internal_workflow_id: null,
  auto_pdf_download_claimed_at: null,
  gdt_download_claimed_at: null,
  practice_form: null,
};
const INTERNAL_SESSION = {
  ...PATIENT_SESSION,
  id: "internal-1",
  submitted_by: "practice",
  source: "practice_direct",
  session_kind: "internal_documentation",
  auto_xml_download_claimed_at: null,
};

function artifact(extension: "pdf" | "xml" | "gdt") {
  return {
    bytes: new Uint8Array([extension.charCodeAt(0)]),
    filename: `artefakt.${extension}`,
    mimeType: extension === "pdf"
      ? "application/pdf"
      : extension === "xml"
        ? "application/xml; charset=utf-8"
        : "application/octet-stream",
  };
}

beforeEach(() => {
  sessions.findFirst.mockReset().mockResolvedValue(null);
  sessions.findMany.mockReset().mockResolvedValue([]);
  sessions.updateMany.mockReset();
  buildPdf.mockReset().mockResolvedValue(artifact("pdf"));
  buildInternalPdf.mockReset().mockResolvedValue(artifact("pdf"));
  buildInternalXml.mockReset().mockReturnValue(artifact("xml"));
  buildInternalGdt.mockReset().mockReturnValue(artifact("gdt"));
  resolveGdt.mockReset().mockReturnValue(null);
});

it("verwendet für interne Dokumentation dieselbe Reihenfolge PDF, XML, GDT", async () => {
  const claimedAt = new Date();
  sessions.findMany
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([INTERNAL_SESSION])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ ...INTERNAL_SESSION, auto_pdf_download_claimed_at: claimedAt }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{
      ...INTERNAL_SESSION,
      auto_pdf_download_claimed_at: claimedAt,
      auto_xml_download_claimed_at: claimedAt,
    }]);
  const accepted: string[] = [];
  const accept = jest.fn(async (candidate) => {
    accepted.push(candidate.artifactType);
    return true;
  });

  await selectNextAutoDownloadArtifactForDelivery({ practiceId: "practice-1", accept });
  await selectNextAutoDownloadArtifactForDelivery({ practiceId: "practice-1", accept });
  await selectNextAutoDownloadArtifactForDelivery({ practiceId: "practice-1", accept });

  expect(accepted).toEqual(["PDF", "XML", "GDT"]);
});

it("überspringt Legacy-GDT, bietet aber PDF und XML an", async () => {
  const claimedAt = new Date();
  buildInternalGdt.mockReturnValue(null);
  sessions.findMany
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ ...INTERNAL_SESSION, patient_reference: "PAT-ALT" }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{
      ...INTERNAL_SESSION,
      patient_reference: "PAT-ALT",
      auto_pdf_download_claimed_at: claimedAt,
    }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{
      ...INTERNAL_SESSION,
      patient_reference: "PAT-ALT",
      auto_pdf_download_claimed_at: claimedAt,
      auto_xml_download_claimed_at: claimedAt,
    }])
    .mockResolvedValueOnce([]);
  const accepted: string[] = [];
  const accept = jest.fn(async (candidate) => {
    accepted.push(candidate.artifactType);
    return true;
  });

  expect(await selectNextAutoDownloadArtifactForDelivery({ practiceId: "practice-1", accept })).not.toBeNull();
  expect(await selectNextAutoDownloadArtifactForDelivery({ practiceId: "practice-1", accept })).not.toBeNull();
  expect(await selectNextAutoDownloadArtifactForDelivery({ practiceId: "practice-1", accept })).toBeNull();
  expect(accepted).toEqual(["PDF", "XML"]);
});

it("bietet Patientenfragebögen ausschließlich als PDF und danach GDT an", async () => {
  sessions.findMany
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([PATIENT_SESSION])
    .mockResolvedValueOnce([{ ...PATIENT_SESSION, auto_pdf_download_claimed_at: new Date() }]);
  resolveGdt.mockReturnValue({
    patientReference: "4711",
    documentationText: "Versicherungsdaten",
    filename: "fragebogen.gdt",
  });
  const accepted: string[] = [];
  const accept = jest.fn(async (candidate) => {
    accepted.push(candidate.artifactType);
    return true;
  });

  await selectNextAutoDownloadArtifactForDelivery({ practiceId: "practice-1", accept });
  await selectNextAutoDownloadArtifactForDelivery({ practiceId: "practice-1", accept });

  expect(accepted).toEqual(["PDF", "GDT"]);
  expect(accepted).not.toContain("XML");
});

it("setzt bei Buildfehler keinen Lease für das fehlgeschlagene Artefakt", async () => {
  buildInternalPdf.mockRejectedValue(new Error("render failed"));
  sessions.findMany
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([INTERNAL_SESSION]);
  const accept = jest.fn().mockResolvedValue(true);
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  const result = await selectNextAutoDownloadArtifactForDelivery({
    practiceId: "practice-1",
    accept,
  });

  expect(result?.artifactType).toBe("XML");
  expect(accept).toHaveBeenCalledTimes(1);
  expect(accept.mock.calls[0][0].artifactType).toBe("XML");
  errorSpy.mockRestore();
});

it("lässt bei belegter interner PDF nicht XML derselben Session vorbeiziehen", async () => {
  sessions.findMany
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      INTERNAL_SESSION,
      { ...INTERNAL_SESSION, id: "internal-2" },
    ]);
  const accept = jest.fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);

  const result = await selectNextAutoDownloadArtifactForDelivery({
    practiceId: "practice-1",
    accept,
  });

  expect(result?.sessionId).toBe("internal-2");
  expect(accept.mock.calls.map(([candidate]) => [
    candidate.sessionId,
    candidate.artifactType,
  ])).toEqual([
    ["internal-1", "PDF"],
    ["internal-2", "PDF"],
  ]);
});

it("prüft nur Sessions der authentifizierten Praxis", async () => {
  await selectNextAutoDownloadArtifactForDelivery({
    practiceId: "practice-1",
    accept: jest.fn().mockResolvedValue(true),
  });

  for (const [query] of sessions.findMany.mock.calls) {
    expect(query.where.AND).toEqual(expect.arrayContaining([
      { owner_practice_id: "practice-1" },
    ]));
  }
});
