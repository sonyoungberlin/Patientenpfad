import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import { isValidProcessSnapshot } from "@/lib/workflow/types";
import WorkflowEditorClient from "../WorkflowEditorClient";

export default async function WorkflowCaseM3Page({
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
        <h1>Klärungsstand</h1>
        <p className="text-muted" style={{ marginTop: "0.5rem" }}>
          Klärungsstand je Bereich eintragen – vorbefüllt aus der Vorbereitung.
        </p>
      </section>
      <WorkflowEditorClient
        sessionId={session.id}
        title={session.title ?? undefined}
        snapshot={session.process_snapshot}
        mode="m3"
      />
    </main>
  );
}
