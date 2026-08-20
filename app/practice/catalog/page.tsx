import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { listActiveCatalogEntries } from "@/lib/practiceCatalog/query";

export default async function PracticeCatalogPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!canAccessWorkflowCases(account)) {
    redirect("/dashboard");
  }

  const filter = getCatalogOwnershipFilter(account);
  const entries = filter ? await listActiveCatalogEntries(filter.practice_id) : [];

  return (
    <main style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Praxiskatalog</h1>
        <Link href="/workflow-cases" style={{ marginLeft: "auto", fontSize: "0.9rem" }}>
          ← Arbeitsprozesse
        </Link>
      </div>

      {!filter && (
        <p className="text-muted">
          Kein Praxiskontext vorhanden. Bitte melden Sie sich als Praxismitglied an.
        </p>
      )}

      {filter && entries.length === 0 && (
        <p className="text-muted">
          Noch keine Praxisprozesse im Katalog. Schließen Sie einen Arbeitsprozess ab,
          um ihn hier aufzunehmen.
        </p>
      )}

      {entries.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/practice/catalog/${entry.id}`}
                className="card"
                style={{
                  display: "block",
                  padding: "1rem 1.25rem",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                  <strong>{entry.title}</strong>
                  <span className="text-muted text-small">
                    v{entry.version} · {entry.published_at.toISOString().slice(0, 10)}
                  </span>
                </div>
                {entry.description && (
                  <p className="text-small text-muted" style={{ margin: "0.25rem 0 0" }}>
                    {entry.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
