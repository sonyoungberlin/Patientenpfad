import { notFound, redirect } from "next/navigation";
import { requirePracticeCatalogAccessFromCookies } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { getCheckpointFromLib } from "@/lib/practiceProcesses/checkpointLibrary";
import { getPracticeDefinition } from "@/lib/practiceProcesses/practiceDefinitionService";
import {
  checkpointTemplateSnapshot,
  createEmptyPracticeDefinition,
} from "@/lib/practiceProcesses/practiceDefinition";
import PracticeDefinitionEditor from "./PracticeDefinitionEditor";

export default async function PracticeCheckpointDefinitionPage({
  params,
}: {
  params: Promise<{ checkpointId: string }>;
}) {
  const account = await requirePracticeCatalogAccessFromCookies();
  if (!account) redirect("/dashboard");
  const scope = getCatalogOwnershipFilter(account);
  if (!scope) redirect("/dashboard");
  const { checkpointId } = await params;
  const checkpoint = await getCheckpointFromLib(checkpointId);
  if (!checkpoint) notFound();
  const definition = await getPracticeDefinition(scope.practice_id, checkpointId);
  const template = checkpointTemplateSnapshot(checkpoint);
  const initialContent = definition?.draft ?? definition?.currentVersion?.content ?? createEmptyPracticeDefinition(template);
  return (
    <PracticeDefinitionEditor
      template={template}
      initialContent={initialContent}
      currentVersion={definition?.currentVersion ?? null}
    />
  );
}