import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentPracticeRole, requirePracticeChainRunnerAccessFromCookies } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { getCatalogEntry } from "@/lib/practiceCatalog/query";
import { isPublishedPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";

export default async function PracticeLibraryEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await requirePracticeChainRunnerAccessFromCookies();
  if (!account || getCurrentPracticeRole(account) !== "USER") redirect("/dashboard");

  const scope = getCatalogOwnershipFilter(account);
  if (!scope) redirect("/dashboard");

  const { id } = await params;
  const entry = await getCatalogEntry(id, scope.practice_id);
  if (!entry || !entry.is_catalog_active || !entry.is_current_version || !isPublishedPracticeWorkflowSnapshot(entry.snapshot)) {
    notFound();
  }

  const snapshot = entry.snapshot;

  return (
    <main style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto", display: "grid", gap: "1.25rem" }}>
      <header>
        <Link href="/practice/library" className="text-small text-muted">← Praxisbibliothek</Link>
        <h1>{snapshot.caseProfileTitle}</h1>
        <p className="text-small text-muted">Veröffentlicht am {entry.published_at.toISOString().slice(0, 10)}</p>
      </header>

      <section>
        <h2>Praxisstandards</h2>
        {snapshot.checkpoints.length === 0 ? (
          <p className="text-muted">Für diesen Praxisfall sind keine Praxisstandards veröffentlicht.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {snapshot.checkpoints.map((checkpoint) => {
              const anchorsById = new Map((checkpoint.definition.checkpointAnchors ?? []).map((anchor) => [anchor.id, anchor.text]));
              const selectedAnchors = checkpoint.definition.selectedAnchorIds.flatMap((id) => {
                const text = anchorsById.get(id);
                return text === undefined ? [] : [text];
              });
              const missingAnchorCount = checkpoint.definition.selectedAnchorIds.length - selectedAnchors.length;

              return (
                <article key={checkpoint.checkpointId} className="card" style={{ padding: "0.75rem 1rem" }}>
                  <strong>{checkpoint.checkpointTitle}</strong>
                  {checkpoint.definition.checkpointDescription && <p className="text-small text-muted">{checkpoint.definition.checkpointDescription}</p>}
                  {checkpoint.decision && <p className="text-small">Einordnung: {checkpoint.decision}</p>}
                  {selectedAnchors.length > 0 && <ul>{selectedAnchors.map((anchor, index) => <li key={`${index}-${anchor}`}>{anchor}</li>)}</ul>}
                  {missingAnchorCount > 0 && <p className="text-small text-muted">{missingAnchorCount} veröffentlichte Kriterien sind in diesem Snapshot nicht verfügbar.</p>}
                  {checkpoint.definition.implementation.trim() && <p><strong>Zusätzliche Umsetzung:</strong> {checkpoint.definition.implementation}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}