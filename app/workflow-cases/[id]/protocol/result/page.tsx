import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import {
  isInternalProtocolWorkflowSnapshot,
  getPracticeProcessMode,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import { loadSourceSnapshot } from "@/lib/workflow/internalProtocol/sourceLoader";
import InternalProtocolResultClient from "./InternalProtocolResultClient";

export default async function InternalProtocolResultPage({
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
    select: { id: true, createdAt: true, process_snapshot: true },
  });

  if (!session) {
    redirect("/workflow-cases");
  }

  if (!isInternalProtocolWorkflowSnapshot(session.process_snapshot)) {
    redirect("/workflow-cases");
  }

  const snapshot = session.process_snapshot;

  // Für TARGET_STATE: Ursprungssession laden (mit Ownership-Prüfung)
  let sourceSnapshot: import("@/lib/workflow/internalProtocol/workflowAdapter").InternalProtocolWorkflowSnapshot | null = null;
  if (
    getPracticeProcessMode(snapshot) === "TARGET_STATE" &&
    snapshot.sourceWorkflowSessionId
  ) {
    sourceSnapshot = await loadSourceSnapshot(snapshot.sourceWorkflowSessionId, account);
  }

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <InternalProtocolResultClient
        sessionId={session.id}
        sessionCreatedAt={session.createdAt.toISOString()}
        snapshot={snapshot}
        sourceSnapshot={sourceSnapshot}
      />
    </main>
  );
}
