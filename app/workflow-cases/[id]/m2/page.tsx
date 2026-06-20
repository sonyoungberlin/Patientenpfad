import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import { isValidProcessSnapshot } from "@/lib/workflow/types";
import WorkflowEditorClient from "../WorkflowEditorClient";

export default async function WorkflowCaseM2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!canAccessWorkflowCases(account)) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const session = await prisma.workflowSession.findFirst({
    where: { id, ...getWorkflowOwnershipFilter(account) },
    select: { id: true, title: true, process_snapshot: true },
  });

  if (!session) {
    redirect("/workflow-cases");
  }

  if (!isValidProcessSnapshot(session.process_snapshot)) {
    redirect("/workflow-cases");
  }

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h1>Vorbereitung</h1>
        <p className="text-muted" style={{ marginTop: "0.5rem" }}>
          Prozesspunkte anhand der eigenen Rolle prüfen und erfassen.
        </p>
      </section>
      <WorkflowEditorClient
        sessionId={session.id}
        title={session.title ?? undefined}
        snapshot={session.process_snapshot}
        mode="m2"
      />
    </main>
  );
}
