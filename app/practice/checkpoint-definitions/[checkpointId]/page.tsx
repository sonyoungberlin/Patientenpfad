import { notFound, redirect } from "next/navigation";
import { requirePracticeCatalogAccessFromCookies } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { getCheckpointFromLib } from "@/lib/practiceProcesses/checkpointLibrary";
import { getPracticeCheckpointDefinition } from "@/lib/practiceProcesses/practiceDefinitionService";
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
  const definition = await getPracticeCheckpointDefinition(scope.practice_id, checkpointId);
  return (
    <PracticeDefinitionEditor
      checkpoint={checkpoint}
      initialDefinition={definition}
    />
  );
}