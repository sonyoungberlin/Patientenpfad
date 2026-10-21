import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { listCheckpointsFromLib } from "@/lib/practiceProcesses";
import { listCheckpointLabels } from "@/lib/checkpointLabels";
import CheckpointsListClient from "./CheckpointsListClient";

export default async function AdminCheckpointsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; open?: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const [{ view, q, open }, checkpoints, labels] = await Promise.all([
    searchParams,
    listCheckpointsFromLib(),
    listCheckpointLabels(),
  ]);
  const initialView = view === "unlabeled" || view === "labels" ? view : "all";
  const initialOpenLabelIds = (open ?? "").split(",").filter((id) => labels.some((label) => label.id === id));

  return (
    <main style={{ display: "grid", gap: "1.5rem", maxWidth: "var(--main-max-width)" }}>
      <section>
        <Link href="/admin/practice-processes" className="text-small text-muted">
          ← Praxisprozesse
        </Link>
        <h1 style={{ marginBottom: 0 }}>Checkpoint-Bibliothek</h1>
        <p className="text-muted" style={{ marginTop: "0.5rem" }}>
          {checkpoints.length} {checkpoints.length === 1 ? "Checkpoint" : "Checkpoints"} in der Bibliothek.
        </p>
      </section>

      <CheckpointsListClient
        checkpoints={checkpoints}
        initialLabels={labels}
        initialView={initialView}
        initialQuery={q ?? ""}
        initialOpenLabelIds={initialOpenLabelIds}
      />
    </main>
  );
}
