import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import { isInternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";

export default async function WorkflowCasePage({
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
    select: { process_snapshot: true },
  });

  if (session && isInternalProtocolWorkflowSnapshot(session.process_snapshot)) {
    redirect(`/workflow-cases/${id}/protocol`);
  }

  redirect(`/workflow-cases/${id}/m2`);
}
