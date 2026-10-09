import { notFound, redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { getCheckpointFromLib, hasPersistedLibraryCheckpoint } from "@/lib/practiceProcesses";
import { getCheckpointLabelIds, listCheckpointLabels } from "@/lib/checkpointLabels";
import { sanitizeCheckpointLibraryReturnTo } from "@/lib/checkpointLibraryNavigation";
import CheckpointDetailClient from "./CheckpointDetailClient";

export default async function AdminCheckpointDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ checkpointId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const [{ checkpointId }, { returnTo: requestedReturnTo }] = await Promise.all([params, searchParams]);
  const [checkpoint, canDelete, labels, labelIds] = await Promise.all([
    getCheckpointFromLib(checkpointId),
    hasPersistedLibraryCheckpoint(checkpointId),
    listCheckpointLabels(),
    getCheckpointLabelIds(checkpointId),
  ]);
  if (!checkpoint) {
    notFound();
  }

  return (
    <CheckpointDetailClient
      initialDraft={{
        title: checkpoint.title,
        description: checkpoint.description ?? "",
        orientationHint: checkpoint.orientationHint ?? "",
        orientationAnchors: [...(checkpoint.orientationAnchors ?? [])],
      }}
      fixedId={checkpoint.id}
      initialLabels={labels.map(({ id, name }) => ({ id, name }))}
      initialLabelIds={labelIds}
      returnTo={sanitizeCheckpointLibraryReturnTo(requestedReturnTo)}
      canDelete={canDelete}
    />
  );
}
