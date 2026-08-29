import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { getOfficeTopic, isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import OfficeCasesClient, { type OfficeCaseListItem } from "./OfficeCasesClient";
import { requireOfficeCasesManagementAccessFromCookies } from "@/lib/authz";

export default async function OfficeCasesPage() {
  const account = await requireOfficeCasesManagementAccessFromCookies();
  if (!account) redirect("/");

  const officeCases = await prisma.officeCaseSession.findMany({
    where: { ...getOfficeOwnershipFilter(account), internal_saved_at: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      title: true,
      trigger_note: true,
      checkpoint_snapshot: true,
      owner_account_id: true,
      owner_practice_id: true,
    },
  });

  const items: OfficeCaseListItem[] = officeCases.map((officeCase) => {
    const snapshot =
      officeCase.checkpoint_snapshot &&
      typeof officeCase.checkpoint_snapshot === "object" &&
      !Array.isArray(officeCase.checkpoint_snapshot)
        ? (officeCase.checkpoint_snapshot as {
            topicId?: unknown;
            checkpoints?: unknown;
          })
        : null;
    const topicId =
      typeof snapshot?.topicId === "string" && isOfficeTopicId(snapshot.topicId)
        ? snapshot.topicId
        : null;
    const topicTitle = topicId ? getOfficeTopic(topicId).title : null;
    const checkpointCount = Array.isArray(snapshot?.checkpoints)
      ? snapshot.checkpoints.length
      : 0;

    return {
      id: officeCase.id,
      createdAt: officeCase.createdAt.toISOString(),
      title: officeCase.title,
      trigger_note: officeCase.trigger_note,
      topicId,
      topicTitle,
      checkpointCount,
    };
  });

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h1>Officefälle</h1>
        <p className="text-muted" style={{ marginTop: "0.5rem" }}>
          Organisatorische Abläufe strukturiert und nachvollziehbar umsetzen.
        </p>
      </section>

      <OfficeCasesClient items={items} />
    </main>
  );
}
