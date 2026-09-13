import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    practice: { findUnique: jest.fn() },
    patientQuestionnaireSession: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock("@/lib/authz", () => ({
  requireQuestionnaireInboxAccess: jest.fn(),
}));
jest.mock("@/lib/questionnaire/pdfRenderer", () => ({
  buildQuestionnairePdfBytes: jest.fn(),
}));
jest.mock("@/lib/questionnaire/internalDocumentationArtifacts", () => ({
  buildInternalDocumentationPdfArtifact: jest.fn(),
  buildInternalDocumentationXmlArtifact: jest.fn(),
  buildInternalDocumentationGdtArtifact: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { requireQuestionnaireInboxAccess } from "@/lib/authz";
import { buildQuestionnairePdfBytes } from "@/lib/questionnaire/pdfRenderer";
import {
  buildInternalDocumentationGdtArtifact,
  buildInternalDocumentationPdfArtifact,
  buildInternalDocumentationXmlArtifact,
} from "@/lib/questionnaire/internalDocumentationArtifacts";
import { selectNextAutoDownloadArtifact } from "@/lib/questionnaire/autoDownloadArtifactSelector";
import { GET } from "@/app/api/questionnaire/auto-download/next/route";
import { hashQuestionnaireAutoDeviceId } from "@/lib/questionnaire/autoDownloadDevice";

const DEVICE_A = "123e4567-e89b-42d3-a456-426614174000";
const ENABLED_AT = new Date("2026-09-03T08:00:00.000Z");

const practiceMock = prisma.practice as unknown as { findUnique: jest.Mock };
const sessionMock = prisma.patientQuestionnaireSession as unknown as {
  findFirst: jest.Mock;
  findMany: jest.Mock;
  updateMany: jest.Mock;
};
const accessMock = requireQuestionnaireInboxAccess as jest.Mock;
const pdfMock = buildQuestionnairePdfBytes as jest.Mock;
const internalPdfMock = buildInternalDocumentationPdfArtifact as jest.Mock;
const internalXmlMock = buildInternalDocumentationXmlArtifact as jest.Mock;
const internalGdtMock = buildInternalDocumentationGdtArtifact as jest.Mock;

function request(deviceId = DEVICE_A) {
  return new NextRequest(
    "http://localhost/api/questionnaire/auto-download/next",
    { headers: { "X-Questionnaire-Auto-Device": deviceId } },
  );
}

const SESSION = {
  id: "session-1",
  patient_reference: "4711",
  submitted_at: new Date("2026-09-03T09:00:00.000Z"),
  submitted_by: "patient",
  selected_block_ids: ["VERSICHERUNG"],
  deduplicated_questions: [],
  frozen_blocks: null,
  answers: {},
  source: "internal_link",
  session_kind: "patient_communication",
  practice_form: null,
};

type InternalSessionFixture = Omit<
  typeof SESSION,
  "frozen_blocks" | "session_kind"
> & {
  frozen_blocks: unknown;
  session_kind: "internal_documentation";
  internal_workflow_id: string | null;
  auto_pdf_download_claimed_at: Date | null;
  auto_xml_download_claimed_at: Date | null;
  gdt_download_claimed_at: Date | null;
};

const INTERNAL_SESSION: InternalSessionFixture = {
  ...SESSION,
  id: "internal-session-1",
  submitted_by: "practice",
  source: "practice_direct",
  session_kind: "internal_documentation",
  internal_workflow_id: null,
  auto_pdf_download_claimed_at: null,
  auto_xml_download_claimed_at: null,
  gdt_download_claimed_at: null,
};

function internalArtifact(extension: "pdf" | "xml" | "gdt") {
  const mimeType = extension === "pdf"
    ? "application/pdf"
    : extension === "xml"
      ? "application/xml; charset=utf-8"
      : "application/octet-stream";
  return {
    bytes: new Uint8Array([extension.charCodeAt(0)]),
    filename: `20260903_4711_Bescheinigung.${extension}`,
    mimeType,
  };
}

function queueInternalCandidates(...candidates: Array<typeof INTERNAL_SESSION | null>) {
  for (const candidate of candidates) {
    sessionMock.findMany.mockResolvedValueOnce([]);
    sessionMock.findMany.mockResolvedValueOnce(candidate ? [candidate] : []);
  }
}

beforeEach(() => {
  accessMock.mockReset().mockResolvedValue({
    account: { current_practice: { id: "practice-1" } },
    error: null,
  });
  practiceMock.findUnique.mockReset().mockResolvedValue({
    questionnaire_auto_pdf_device_hash:
      hashQuestionnaireAutoDeviceId(DEVICE_A),
    questionnaire_auto_pdf_enabled_at: ENABLED_AT,
  });
  sessionMock.findFirst.mockReset().mockResolvedValue(SESSION);
  sessionMock.findMany.mockReset().mockResolvedValue([]);
  sessionMock.updateMany.mockReset().mockResolvedValue({ count: 1 });
  pdfMock.mockReset().mockResolvedValue({
    bytes: new Uint8Array([37, 80, 68, 70]),
    filename: "20260903_4711_Versicherungsdaten.pdf",
  });
  internalPdfMock.mockReset().mockResolvedValue(internalArtifact("pdf"));
  internalXmlMock.mockReset().mockReturnValue(internalArtifact("xml"));
  internalGdtMock.mockReset().mockReturnValue(internalArtifact("gdt"));
});

it("liefert das nächste Artefakt unabhängig vom HTTP-Transport", async () => {
  const artifact = await selectNextAutoDownloadArtifact({
    practiceId: "practice-1",
    deviceHash: hashQuestionnaireAutoDeviceId(DEVICE_A),
    enabledAt: ENABLED_AT,
  });

  expect(artifact).toEqual({
    bytes: new Uint8Array([37, 80, 68, 70]),
    filename: "20260903_4711_Versicherungsdaten.pdf",
    mimeType: "application/pdf",
  });
  expect(sessionMock.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    data: { auto_pdf_download_claimed_at: expect.any(Date) },
  }));
});

it("liefert interne PDF, XML und GDT nacheinander mit unabhängigen Claims", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  const claimedAt = new Date("2026-09-03T09:30:00.000Z");
  queueInternalCandidates(
    INTERNAL_SESSION,
    { ...INTERNAL_SESSION, auto_pdf_download_claimed_at: claimedAt },
    {
      ...INTERNAL_SESSION,
      auto_pdf_download_claimed_at: claimedAt,
      auto_xml_download_claimed_at: claimedAt,
    },
    null,
  );

  const pdfResponse = await GET(request());
  const xmlResponse = await GET(request());
  const gdtResponse = await GET(request());
  const emptyResponse = await GET(request());

  expect(pdfResponse.headers.get("content-type")).toBe("application/pdf");
  expect(xmlResponse.headers.get("content-type")).toBe("application/xml; charset=utf-8");
  expect(gdtResponse.headers.get("content-type")).toBe("application/octet-stream");
  expect(emptyResponse.status).toBe(204);
  expect([
    pdfResponse,
    xmlResponse,
    gdtResponse,
  ].map((response) => response.headers.get("content-disposition"))).toEqual([
    expect.stringContaining("20260903_4711_Bescheinigung.pdf"),
    expect.stringContaining("20260903_4711_Bescheinigung.xml"),
    expect.stringContaining("20260903_4711_Bescheinigung.gdt"),
  ]);
  expect(sessionMock.updateMany.mock.calls.map(([input]) => input.data)).toEqual([
    { auto_pdf_download_claimed_at: expect.any(Date) },
    { auto_xml_download_claimed_at: expect.any(Date) },
    { gdt_download_claimed_at: expect.any(Date) },
  ]);
});

it("liefert Legacy-PDF und XML, überspringt aber eine nicht verfügbare GDT", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  const claimedAt = new Date("2026-09-03T09:30:00.000Z");
  internalGdtMock.mockReturnValue(null);
  queueInternalCandidates(
    { ...INTERNAL_SESSION, patient_reference: "PAT-ALT" },
    {
      ...INTERNAL_SESSION,
      patient_reference: "PAT-ALT",
      auto_pdf_download_claimed_at: claimedAt,
    },
    {
      ...INTERNAL_SESSION,
      patient_reference: "PAT-ALT",
      auto_pdf_download_claimed_at: claimedAt,
      auto_xml_download_claimed_at: claimedAt,
    },
  );

  expect((await GET(request())).headers.get("content-type")).toBe("application/pdf");
  expect((await GET(request())).headers.get("content-type"))
    .toBe("application/xml; charset=utf-8");
  expect((await GET(request())).status).toBe(204);
  expect(sessionMock.updateMany.mock.calls.map(([input]) => input.data)).toEqual([
    { auto_pdf_download_claimed_at: expect.any(Date) },
    { auto_xml_download_claimed_at: expect.any(Date) },
  ]);
});

it("setzt keinen Claim für einen Buildfehler und versucht das nächste Artefakt", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  internalPdfMock.mockRejectedValue(new Error("pdf failed"));
  queueInternalCandidates(INTERNAL_SESSION);
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  const response = await GET(request());

  expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8");
  expect(sessionMock.updateMany).toHaveBeenCalledTimes(1);
  expect(sessionMock.updateMany.mock.calls[0][0].data).toEqual({
    auto_xml_download_claimed_at: expect.any(Date),
  });
  errorSpy.mockRestore();
});

it("lässt einen XML-Buildfehler die interne GDT nicht blockieren", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  internalXmlMock.mockImplementation(() => { throw new Error("xml failed"); });
  queueInternalCandidates({
    ...INTERNAL_SESSION,
    auto_pdf_download_claimed_at: new Date(),
  });
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  const response = await GET(request());

  expect(response.headers.get("content-disposition")).toContain("Bescheinigung.gdt");
  expect(sessionMock.updateMany).toHaveBeenCalledTimes(1);
  expect(sessionMock.updateMany.mock.calls[0][0].data).toEqual({
    gdt_download_claimed_at: expect.any(Date),
  });
  errorSpy.mockRestore();
});

it("versucht nach einem verlorenen PDF-Claim das nächste offene Artefakt", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  queueInternalCandidates(INTERNAL_SESSION);
  sessionMock.updateMany
    .mockResolvedValueOnce({ count: 0 })
    .mockResolvedValueOnce({ count: 1 });

  const response = await GET(request());

  expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8");
  expect(sessionMock.updateMany.mock.calls.map(([input]) => input.data)).toEqual([
    { auto_pdf_download_claimed_at: expect.any(Date) },
    { auto_xml_download_claimed_at: expect.any(Date) },
  ]);
});

it.each([
  ["PDF", {
    auto_pdf_download_claimed_at: null,
    auto_xml_download_claimed_at: new Date(),
    gdt_download_claimed_at: new Date(),
  }],
  ["XML", {
    auto_pdf_download_claimed_at: new Date(),
    auto_xml_download_claimed_at: null,
    gdt_download_claimed_at: new Date(),
  }],
  ["GDT", {
    auto_pdf_download_claimed_at: new Date(),
    auto_xml_download_claimed_at: new Date(),
    gdt_download_claimed_at: null,
  }],
])("liefert intern konkurrierend geclaimte %s höchstens einmal", async (_, claims) => {
  sessionMock.findFirst.mockResolvedValue(null);
  sessionMock.findMany.mockImplementation(({ where }) => {
    const parts = where.AND as Array<Record<string, unknown>>;
    return Promise.resolve(parts.some((part) => part.session_kind === "internal_documentation")
      ? [{ ...INTERNAL_SESSION, ...claims }]
      : []);
  });
  sessionMock.updateMany
    .mockResolvedValueOnce({ count: 1 })
    .mockResolvedValueOnce({ count: 0 });

  const responses = await Promise.all([GET(request()), GET(request())]);

  expect(responses.map((response) => response.status).sort()).toEqual([200, 204]);
  expect(sessionMock.updateMany).toHaveBeenCalledTimes(2);
});

it("liefert nur dem registrierten Gerät eine PDF und claimt nur den Auto-Marker", async () => {
  const response = await GET(request());

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/pdf");
  expect(response.headers.get("content-disposition")).toContain(
    "20260903_4711_Versicherungsdaten.pdf",
  );
  expect(sessionMock.updateMany).toHaveBeenCalledTimes(1);
  const claim = sessionMock.updateMany.mock.calls[0][0];
  expect(claim.data).toEqual({
    auto_pdf_download_claimed_at: expect.any(Date),
  });
  expect(claim.data).not.toHaveProperty("pdf_downloaded_at");
  expect(claim.where.AND).toEqual(
    expect.arrayContaining([
      { submitted_at: { gte: ENABLED_AT } },
      { auto_pdf_download_claimed_at: null },
    ]),
  );
});

it("weist ein anderes Gerät vor Kandidatensuche zurück", async () => {
  const response = await GET(
    request("123e4567-e89b-42d3-b456-426614174001"),
  );
  expect(response.status).toBe(403);
  expect(sessionMock.findFirst).not.toHaveBeenCalled();
  expect(sessionMock.updateMany).not.toHaveBeenCalled();
});

it("liefert 204 wenn keine eligible Session existiert", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  const response = await GET(request());
  expect(response.status).toBe(204);
  expect(pdfMock).not.toHaveBeenCalled();
});

it("liefert nach geclaimter PDF eine GDT für patient_communication", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  sessionMock.findMany.mockResolvedValue([SESSION]);

  const response = await GET(request());

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/octet-stream");
  expect(response.headers.get("content-disposition")).toContain(
    "20260903_4711_Versicherungsdaten.gdt",
  );
  expect(sessionMock.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      AND: expect.arrayContaining([
        { session_kind: "patient_communication" },
        { patient_reference: "4711" },
        { auto_pdf_download_claimed_at: { not: null } },
        { gdt_download_claimed_at: null },
      ]),
    }),
    data: { gdt_download_claimed_at: expect.any(Date) },
  }));
});

it("priorisiert eine offene GDT nach deren PDF vor der nächsten PDF", async () => {
  sessionMock.findMany.mockResolvedValue([SESSION]);

  const response = await GET(request());

  expect(response.headers.get("content-type")).toBe("application/octet-stream");
  expect(sessionMock.findFirst).not.toHaveBeenCalled();
});

it("liefert keine GDT für unzugeordnete oder interne Sessions", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  sessionMock.findMany.mockResolvedValue([
    { ...SESSION, patient_reference: null },
    { ...SESSION, session_kind: "internal_documentation" },
    { ...SESSION, patient_reference: "47A11" },
  ]);

  const response = await GET(request());

  expect(response.status).toBe(204);
  expect(sessionMock.updateMany).not.toHaveBeenCalled();
});

it("liefert bei konkurrierenden GDT-Claims höchstens eine Datei", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  sessionMock.findMany.mockResolvedValue([SESSION]);
  sessionMock.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

  const [first, second] = await Promise.all([GET(request()), GET(request())]);

  expect([first.status, second.status].sort()).toEqual([200, 204]);
});

it("wendet Practice-, Sichtbarkeits-, Zeit- und Claim-Filter an", async () => {
  await GET(request());
  const where = sessionMock.findFirst.mock.calls[0][0].where;
  expect(where.AND).toEqual(
    expect.arrayContaining([
      { owner_practice_id: "practice-1" },
      { context: "patient" },
      { deleted_at: null },
      { status: "completed" },
      { submitted_at: { gte: ENABLED_AT } },
      { auto_pdf_download_claimed_at: null },
    ]),
  );
  expect(where.AND.some((part: { OR?: unknown }) => part.OR)).toBe(true);
  expect(where.AND).not.toContainEqual({ session_kind: "patient_communication" });
});

it("rendert normale Fragebögen weiterhin für den Auto-Download", async () => {
  await GET(request());

  expect(pdfMock).toHaveBeenCalledWith(
    expect.objectContaining({ session_kind: "patient_communication" }),
    expect.objectContaining({ title: "Fragebogen – Patientenangaben" }),
  );
});

it("rendert abgeschlossene interne Dokumentationen für den Auto-Download", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  queueInternalCandidates({
    ...INTERNAL_SESSION,
    source: "kiosk_direct",
    internal_workflow_id: "care_plan_v1",
  });

  const response = await GET(request());

  expect(response.status).toBe(200);
  expect(internalPdfMock).toHaveBeenCalledWith(expect.objectContaining({
    session_kind: "internal_documentation",
    internal_workflow_id: "care_plan_v1",
  }));
  expect(pdfMock).not.toHaveBeenCalled();
});

it("rendert neue blockbasierte Dokumentationen neutral im Auto-Download", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  queueInternalCandidates({
    ...INTERNAL_SESSION,
    source: "practice_direct",
    internal_workflow_id: null,
    frozen_blocks: [{
      id: "CARE_PLAN_HA",
      label: "Hausärztliche Betreuung",
      displayOrder: 10,
      questions: [],
      conditionalRules: [],
      initiallyVisible: true,
      outputSemantics: "documented-content-v1",
    }],
  });

  const response = await GET(request());

  expect(response.status).toBe(200);
  expect(internalPdfMock).toHaveBeenCalledWith(expect.objectContaining({
    session_kind: "internal_documentation",
    internal_workflow_id: null,
  }));
  expect(pdfMock).not.toHaveBeenCalled();
});

it("leitet auch alte interne Workflows an den zentralen Artefaktbuilder", async () => {
  sessionMock.findFirst.mockResolvedValue(null);
  queueInternalCandidates({
    ...INTERNAL_SESSION,
    source: "kiosk_direct",
    internal_workflow_id: "vaccination_review_v1",
  });

  const response = await GET(request());

  expect(response.status).toBe(200);
  expect(response.headers.get("content-disposition")).toContain(
    "20260903_4711_Bescheinigung.pdf",
  );
  expect(internalPdfMock).toHaveBeenCalledWith(expect.objectContaining({
    session_kind: "internal_documentation",
    internal_workflow_id: "vaccination_review_v1",
  }));
});

it("lässt nur abgeschlossene und noch nicht geclaimte interne Dokumentationen zu", async () => {
  await GET(request());
  const eligibility = sessionMock.findMany.mock.calls[1][0].where.AND;

  expect(eligibility).toEqual(expect.arrayContaining([
    { status: "completed" },
    { session_kind: "internal_documentation" },
    {
      OR: [
        { auto_pdf_download_claimed_at: null },
        { auto_xml_download_claimed_at: null },
        { gdt_download_claimed_at: null },
      ],
    },
  ]));
});

it("claimt nicht, wenn die PDF-Erzeugung fehlschlägt", async () => {
  pdfMock.mockRejectedValue(new Error("render failed"));
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  const response = await GET(request());

  expect(response.status).toBe(500);
  expect(sessionMock.updateMany).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

it("liefert bei verlorenem atomarem Claim 204", async () => {
  sessionMock.updateMany.mockResolvedValue({ count: 0 });
  const response = await GET(request());
  expect(response.status).toBe(204);
});

it("lässt bei zwei parallelen Requests genau einen gewinnen", async () => {
  sessionMock.updateMany
    .mockResolvedValueOnce({ count: 1 })
    .mockResolvedValueOnce({ count: 0 });

  const [first, second] = await Promise.all([GET(request()), GET(request())]);

  expect([first.status, second.status].sort()).toEqual([200, 204]);
  expect(sessionMock.updateMany).toHaveBeenCalledTimes(2);
});

it("prüft beim Claim erneut Gerätehash und Aktivierungszeitpunkt", async () => {
  await GET(request());
  const claimWhere = sessionMock.updateMany.mock.calls[0][0].where;
  expect(claimWhere.AND).toEqual(
    expect.arrayContaining([
      {
        owner_practice: {
          is: {
            questionnaire_auto_pdf_device_hash:
              hashQuestionnaireAutoDeviceId(DEVICE_A),
            questionnaire_auto_pdf_enabled_at: ENABLED_AT,
          },
        },
      },
    ]),
  );
});