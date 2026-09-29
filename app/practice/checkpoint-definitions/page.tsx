import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePracticeCatalogAccessFromCookies } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { listCheckpointsFromLib } from "@/lib/practiceProcesses/checkpointLibrary";
import { listPracticeDefinitionSummaries } from "@/lib/practiceProcesses/practiceDefinitionService";

export default async function PracticeCheckpointDefinitionsPage() {
  const account = await requirePracticeCatalogAccessFromCookies();
  if (!account) redirect("/dashboard");
  const scope = getCatalogOwnershipFilter(account);
  if (!scope) redirect("/dashboard");
  const [checkpoints, definitions] = await Promise.all([
    listCheckpointsFromLib(),
    listPracticeDefinitionSummaries(scope.practice_id),
  ]);
  const byCheckpointId = new Map(definitions.map((item) => [item.checkpoint_id, item]));

  return (
    <main style={{ padding: "2rem", maxWidth: "64rem", margin: "0 auto" }}>
      <header style={{ display: "flex", gap: "1rem", alignItems: "baseline", marginBottom: "1.5rem" }}>
        <div>
          <Link href="/practice/catalog" className="text-small text-muted">← Praxiskatalog</Link>
          <h1 style={{ marginBottom: "0.25rem" }}>Checkpoint-Definitionen</h1>
          <p className="text-muted" style={{ margin: 0 }}>Eine aktuell gültige Definition je Praxis und Vorlage.</p>
        </div>
      </header>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.6rem" }}>
        {checkpoints.map((checkpoint) => {
          const definition = byCheckpointId.get(checkpoint.id);
          const status = definition?.draft
            ? "Entwurf vorhanden"
            : definition?.current_version_id
              ? "Freigegeben"
              : "Noch nicht definiert";
          return (
            <li key={checkpoint.id}>
              <Link href={`/practice/checkpoint-definitions/${checkpoint.id}`} className="card" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: "0.85rem 1rem", color: "inherit", textDecoration: "none" }}>
                <span><strong>{checkpoint.title}</strong><br /><span className="text-small text-muted">{checkpoint.id}</span></span>
                <span className="text-small text-muted">{status}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}