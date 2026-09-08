import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireInternalDocumentationAccessFromCookies } from "@/lib/authz";
import { parseFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import { getInternalWorkflow } from "@/lib/questionnaire/internalWorkflowRegistry";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";

export const dynamic = "force-dynamic";

export default async function InternalDocumentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await requireInternalDocumentationAccessFromCookies();
  if (!account) redirect("/");
  const practiceId = account.current_practice?.id;
  if (!practiceId) redirect("/");

  const { id } = await params;
  const session = await prisma.patientQuestionnaireSession.findFirst({
    where: {
      id,
      owner_practice_id: practiceId,
      session_kind: "internal_documentation",
      source: "practice_direct",
      created_by_kiosk_device_id: null,
      status: "pending",
      deleted_at: null,
    },
    select: {
      internal_workflow_id: true,
      frozen_blocks: true,
      patient_reference: true,
    },
  });
  if (!session) notFound();

  const workflow = getInternalWorkflow(session.internal_workflow_id);
  if (!workflow) notFound();
  const frozenBlocks = parseFrozenBlocks(session.frozen_blocks);
  const questions = frozenBlocks?.flatMap((block) => block.questions) ?? [];

  return (
    <main>
      <h1>{workflow.title}</h1>
      <p className="text-muted">Patientenreferenz: {session.patient_reference}</p>
      <QuestionnaireFormClient
        token={id}
        submitEndpoint={`/api/internal-documentation/${id}`}
        questions={questions}
        frozenBlocks={frozenBlocks}
        context="patient"
        source="practice_direct"
        introText="Interne Dokumentation für die Praxis."
        patientReference={session.patient_reference}
      />
    </main>
  );
}