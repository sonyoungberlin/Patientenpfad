import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import { isInternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";
import { getM2StepConfig } from "@/lib/workflow/internalProtocol/synthesis";
import InternalProtocolM2StepClient from "./InternalProtocolM2StepClient";

export default async function InternalProtocolM2StepPage({
  params,
}: {
  params: Promise<{ id: string; step: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!canAccessWorkflowCases(account)) {
    redirect("/dashboard");
  }

  const { id, step: stepParam } = await params;
  const stepNumber = parseInt(stepParam, 10);

  // Ungültige Schrittnummer → zurück zu Schritt 1
  const stepConfig = getM2StepConfig(stepNumber);
  if (!stepConfig) {
    redirect(`/workflow-cases/${id}/protocol/m2/1`);
  }

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
      <InternalProtocolM2StepClient
        sessionId={session.id}
        step={stepNumber}
        snapshot={session.process_snapshot}
      />
    </main>
  );
}
