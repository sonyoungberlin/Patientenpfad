import { renderToStaticMarkup } from "react-dom/server";

const redirectMock = jest.fn(() => { throw new Error("redirect"); });
const notFoundMock = jest.fn(() => { throw new Error("not-found"); });

jest.mock("next/navigation", () => ({
  redirect: () => redirectMock(),
  notFound: () => notFoundMock(),
}));
jest.mock("@/lib/authz", () => ({
  requireInternalDocumentationAccessFromCookies: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: { findFirst: jest.fn() },
  },
}));
jest.mock("@/app/q/[token]/QuestionnaireFormClient", () => ({
  QuestionnaireFormClient: ({ submitEndpoint }: { submitEndpoint: string }) => (
    <div data-submit-endpoint={submitEndpoint} />
  ),
}));

import { requireInternalDocumentationAccessFromCookies } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildInternalWorkflowBlocks } from "@/lib/questionnaire/internalWorkflowRegistry";
import InternalDocumentationPage from "@/app/cases/internal-documentation/[id]/page";

const guard = requireInternalDocumentationAccessFromCookies as jest.Mock;
const findFirst = prisma.patientQuestionnaireSession.findFirst as jest.Mock;

describe("practice internal documentation page", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    notFoundMock.mockClear();
    guard.mockReset().mockResolvedValue({ current_practice: { id: "practice-1" } });
    findFirst.mockReset().mockResolvedValue({
      internal_workflow_id: "care_plan_v1",
      frozen_blocks: buildInternalWorkflowBlocks("care_plan_v1"),
      patient_reference: "PAT-1",
    });
  });

  it("lädt das Formular nur mit vollständigem Praxis- und Session-Scope", async () => {
    const html = renderToStaticMarkup(await InternalDocumentationPage({
      params: Promise.resolve({ id: "session-1" }),
    }));

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "session-1",
        owner_practice_id: "practice-1",
        session_kind: "internal_documentation",
        source: "practice_direct",
        created_by_kiosk_device_id: null,
        status: "pending",
        deleted_at: null,
      },
    }));
    expect(html).toContain('/api/internal-documentation/session-1');
  });

  it("gibt fremde oder nicht passende Sessions nicht preis", async () => {
    findFirst.mockResolvedValue(null);
    await expect(InternalDocumentationPage({
      params: Promise.resolve({ id: "foreign" }),
    })).rejects.toThrow("not-found");
    expect(notFoundMock).toHaveBeenCalled();
  });
});