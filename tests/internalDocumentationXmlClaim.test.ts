jest.mock("@/lib/prisma", () => ({
  prisma: {
    patientQuestionnaireSession: {
      updateMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { claimInternalDocumentationXml } from "@/lib/questionnaire/internalDocumentationXmlClaim";

const updateMany = prisma.patientQuestionnaireSession.updateMany as jest.Mock;
const claimedAt = new Date("2026-09-12T12:00:00.000Z");

beforeEach(() => {
  updateMany.mockReset();
});

describe("claimInternalDocumentationXml", () => {
  it("setzt beim ersten Claim ausschließlich den XML-Zeitstempel", async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await expect(
      claimInternalDocumentationXml("session-1", claimedAt),
    ).resolves.toBe(true);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        status: "completed",
        deleted_at: null,
        session_kind: "internal_documentation",
        auto_xml_download_claimed_at: null,
      },
      data: { auto_xml_download_claimed_at: claimedAt },
    });
    expect(updateMany.mock.calls[0][0].data)
      .not.toHaveProperty("auto_pdf_download_claimed_at");
    expect(updateMany.mock.calls[0][0].data)
      .not.toHaveProperty("gdt_download_claimed_at");
  });

  it("meldet einen bereits vergebenen Claim als nicht geclaimt", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      claimInternalDocumentationXml("session-1", claimedAt),
    ).resolves.toBe(false);
  });

  it("lässt bei parallelen Claim-Versuchen höchstens einen gewinnen", async () => {
    updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const results = await Promise.all([
      claimInternalDocumentationXml("session-1", claimedAt),
      claimInternalDocumentationXml("session-1", claimedAt),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(updateMany).toHaveBeenCalledTimes(2);
  });
});
