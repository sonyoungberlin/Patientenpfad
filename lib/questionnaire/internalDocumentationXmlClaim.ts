import { prisma } from "@/lib/prisma";

export async function claimInternalDocumentationXml(
  sessionId: string,
  claimedAt = new Date(),
): Promise<boolean> {
  const result = await prisma.patientQuestionnaireSession.updateMany({
    where: {
      id: sessionId,
      status: "completed",
      deleted_at: null,
      session_kind: "internal_documentation",
      auto_xml_download_claimed_at: null,
    },
    data: { auto_xml_download_claimed_at: claimedAt },
  });

  return result.count === 1;
}
