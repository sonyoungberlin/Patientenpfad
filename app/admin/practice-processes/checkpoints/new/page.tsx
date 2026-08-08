import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { listCheckpoints, getCheckpoint } from "@/lib/practiceProcesses";
import CheckpointDetailClient from "../[checkpointId]/CheckpointDetailClient";

export default async function AdminNewCheckpointPage({
  searchParams,
}: {
  searchParams: Promise<{ copyFrom?: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const { copyFrom } = await searchParams;
  const source = copyFrom ? getCheckpoint(copyFrom) : null;

  const checkpoints = listCheckpoints();

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
    />
  );
}
