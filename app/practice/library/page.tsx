import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPracticeRole, requirePracticeChainRunnerAccessFromCookies } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { listActivePublishedCatalogEntries } from "@/lib/practiceCatalog/query";

export default async function PracticeLibraryPage() {
  const account = await requirePracticeChainRunnerAccessFromCookies();
  if (!account || getCurrentPracticeRole(account) !== "USER") redirect("/dashboard");

  const scope = getCatalogOwnershipFilter(account);
  if (!scope) redirect("/dashboard");

  const entries = await listActivePublishedCatalogEntries(scope.practice_id);

  return (
    <main style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>
      <Link href="/workflow-cases" className="text-small text-muted">← Arbeitsprozesse</Link>
      <h1>Praxisbibliothek</h1>
      <p className="text-muted">Aktuelle, veröffentlichte Praxisfälle Ihrer Praxis.</p>

      {entries.length === 0 ? (
        <p className="text-muted">Derzeit sind keine Praxisfälle freigegeben.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/practice/library/${entry.id}`}
                className="card"
                style={{ display: "block", padding: "1rem 1.25rem", textDecoration: "none", color: "inherit" }}
              >
                <strong>{entry.snapshot.caseProfileTitle}</strong>
                <span className="text-small text-muted" style={{ display: "block", marginTop: "0.25rem" }}>
                  {entry.snapshot.checkpoints.length} Praxisstandards
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}