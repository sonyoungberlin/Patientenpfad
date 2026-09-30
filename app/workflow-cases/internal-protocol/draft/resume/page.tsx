import { redirect } from "next/navigation";
import { requirePracticeCatalogAccessFromCookies } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { prisma } from "@/lib/prisma";
import { isPracticeWorkflowDraftSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import { listPracticeCheckpointDefinitions } from "@/lib/practiceProcesses/practiceDefinitionService";
import { resolvePracticeWorkflowResumeStep } from "@/lib/practiceProcesses/resume";

export default async function PracticeWorkflowResumePage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const account = await requirePracticeCatalogAccessFromCookies();
  if (!account) redirect("/dashboard");
  const scope = getCatalogOwnershipFilter(account);
  const sessionId = (await searchParams).sessionId;
  if (!scope || !sessionId) redirect("/workflow-cases");

  const session = await prisma.workflowSession.findFirst({
    where: { id: sessionId, owner_practice_id: scope.practice_id },
    select: { process_snapshot: true },
  });
  if (!session || !isPracticeWorkflowDraftSnapshot(session.process_snapshot)) redirect("/workflow-cases");

  const definitions = await listPracticeCheckpointDefinitions(
    scope.practice_id,
    session.process_snapshot.checkpoints.map((checkpoint) => checkpoint.checkpointId),
  );
  const step = resolvePracticeWorkflowResumeStep(session.process_snapshot, definitions);
  redirect(`/workflow-cases/internal-protocol/draft/${step}?sessionId=${encodeURIComponent(sessionId)}`);
}
