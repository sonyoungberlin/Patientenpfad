import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { getOfficeTopic, isOfficeTopicId, listOfficeTopics } from "@/lib/office/checkpointCatalog";
import OfficeCasesClient, { type OfficeCaseListItem } from "./OfficeCasesClient";

export default async function OfficeCasesPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!account.office_cases_enabled && !account.is_admin) {
    redirect("/dashboard");
  }

  const officeCases = await prisma.officeCaseSession.findMany({
    where: getOfficeOwnershipFilter(account),
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
          Snapshot-Tool für Praxisleitung und Geschäftsführung.
        </p>
      </section>

      <OfficeCasesClient topics={listOfficeTopics()} items={items} />

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Kurzpfad</h2>
        <p className="text-small text-muted" style={{ marginBottom: 0 }}>
          Neue Snapshots können über ein Thema angelegt und anschließend strukturiert betrachtet werden.
        </p>
      </section>
    </main>
  );
}
