import { notFound, redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { getCheckpointFromLib } from "@/lib/practiceProcesses";
import CheckpointDetailClient from "./CheckpointDetailClient";

export default async function AdminCheckpointDetailPage({
  params,
}: {
  params: Promise<{ checkpointId: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const { checkpointId } = await params;
  const checkpoint = await getCheckpointFromLib(checkpointId);
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
    />
  );
}
