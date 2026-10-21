import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { listCheckpointsFromLib, getCheckpointFromLib } from "@/lib/practiceProcesses";
import { listCheckpointLabels } from "@/lib/checkpointLabels";
import { sanitizeCheckpointLibraryReturnTo } from "@/lib/checkpointLibraryNavigation";
import CheckpointDetailClient from "../[checkpointId]/CheckpointDetailClient";

export default async function AdminNewCheckpointPage({
  searchParams,
}: {
  searchParams: Promise<{ copyFrom?: string; returnTo?: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const { copyFrom, returnTo: requestedReturnTo } = await searchParams;
  const source = copyFrom ? await getCheckpointFromLib(copyFrom) : null;

  const [checkpoints, labels] = await Promise.all([listCheckpointsFromLib(), listCheckpointLabels()]);

  const initialDraft = source
    ? {
        title: source.title,
        description: source.description ?? "",
        orientationHint: source.orientationHint ?? "",
        // rebuild local anchor ids so each duplicate starts clean
        orientationAnchors: (source.orientationAnchors ?? []).map((a, i) => ({
          id: `a${i + 1}`,
          text: a.text,
        })),
      }
    : { title: "", description: "", orientationHint: "", orientationAnchors: [] };

  return (
    <CheckpointDetailClient
      initialDraft={initialDraft}
      existingIds={checkpoints.map((c) => c.id)}
      existingTitles={checkpoints.map((c) => c.title)}
      initialLabels={labels.map(({ id, name }) => ({ id, name }))}
      returnTo={sanitizeCheckpointLibraryReturnTo(requestedReturnTo)}
    />
  );
}
