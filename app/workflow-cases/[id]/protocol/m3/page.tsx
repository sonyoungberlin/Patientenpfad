import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import { isInternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";
import InternalProtocolM3Client from "./InternalProtocolM3Client";

export default async function InternalProtocolM3Page({
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
    select: { id: true, process_snapshot: true },
  });

  if (!session) {
    redirect("/workflow-cases");
  }

  if (!isInternalProtocolWorkflowSnapshot(session.process_snapshot)) {
    redirect("/workflow-cases");
  }

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <InternalProtocolM3Client
        sessionId={session.id}
        snapshot={session.process_snapshot}
      />
    </main>
  );
}
