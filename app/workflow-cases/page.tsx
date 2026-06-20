import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import { getWorkflowTopic, isWorkflowTopicId } from "@/lib/workflow/processCatalog";
import { isValidProcessSnapshot } from "@/lib/workflow/types";
import WorkflowCasesListClient from "./WorkflowCasesListClient";

export default async function WorkflowCasesPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!canAccessWorkflowCases(account)) {
    redirect("/dashboard");
  }

  const sessions = await prisma.workflowSession.findMany({
    where: {
      ...getWorkflowOwnershipFilter(account),
      internal_saved_at: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      title: true,
      process_snapshot: true,
    },
  });

  const items = sessions.map((s) => {
    const snapshot = isValidProcessSnapshot(s.process_snapshot) ? s.process_snapshot : null;
    const topicTitle =
      snapshot && isWorkflowTopicId(snapshot.topicId)
        ? getWorkflowTopic(snapshot.topicId).title
        : null;
    const role = snapshot?.role ?? null;
    const pointCount = snapshot?.processPoints.length ?? 0;
    return {
      id: s.id,
      createdAt: s.createdAt.toISOString().slice(0, 10),
      title: s.title,
      topicTitle,
      role,
      pointCount,
    };
  });

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h1>Arbeitsprozesse</h1>
        <p className="text-muted">
          Musterprozesse strukturiert dokumentieren.
        </p>
        <div style={{ marginTop: "0.75rem" }}>
          <Link href="/workflow-cases/new">
            <button type="button">Neue Sitzung starten</button>
          </Link>
        </div>
      </section>

      {items.length === 0 ? (
        <p className="text-muted">Noch keine Sitzungen gespeichert.</p>
      ) : (
        <WorkflowCasesListClient items={items} />
      )}
    </main>
  );
}
