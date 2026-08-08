import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { listCheckpoints } from "@/lib/practiceProcesses";
import CheckpointsListClient from "./CheckpointsListClient";

export default async function AdminCheckpointsPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved || !account.is_admin) {
    redirect("/");
  }

  const checkpoints = listCheckpoints();

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
        <Link href="/admin/practice-processes/checkpoints/new" className="text-small">
          + Neuer Checkpoint
        </Link>
      </section>

      <CheckpointsListClient checkpoints={checkpoints} />
    </main>
  );
}
