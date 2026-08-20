import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { getCatalogOwnershipFilter } from "@/lib/practiceCatalog/scope";
import { getCatalogEntry, listCatalogEntryVersions } from "@/lib/practiceCatalog/query";
import { isPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import CatalogEntryActions from "./CatalogEntryActions";

type Params = { params: Promise<{ id: string }> };

export default async function CatalogEntryDetailPage({ params }: Params) {
  const { id } = await params;

  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!canAccessWorkflowCases(account)) {
    redirect("/dashboard");
  }

  const filter = getCatalogOwnershipFilter(account);
  if (!filter) {
    redirect("/dashboard");
  }

  const entry = await getCatalogEntry(id, filter.practice_id);
  if (!entry) {
    notFound();
  }

  const versions = await listCatalogEntryVersions(
    entry.catalog_case_id,
    filter.practice_id,
  );

  const snapshot = entry.snapshot;
  const hasSnapshot = isPracticeWorkflowSnapshot(snapshot);

  return (
    <main style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <Link
            href="/practice/catalog"
            className="text-small text-muted"
            style={{ display: "inline-block", marginBottom: "0.5rem" }}
          >
            ← Praxiskatalog
          </Link>
          <h1 style={{ margin: 0 }}>{entry.title}</h1>
          <p className="text-small text-muted" style={{ margin: "0.25rem 0 0" }}>
            Version {entry.version} · Publiziert am {entry.published_at.toISOString().slice(0, 10)}
            {!entry.is_catalog_active && (
              <span style={{ color: "#c00", marginLeft: "0.5rem" }}>· Inaktiv</span>
            )}
          </p>
          {entry.description && (
            <p style={{ margin: "0.5rem 0 0" }}>{entry.description}</p>
          )}
        </div>

        {/* Aktionen */}
        <CatalogEntryActions
          entryId={entry.id}
          isActive={entry.is_catalog_active}
        />
      </div>

      {/* Checkpoints */}
      {hasSnapshot && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "0.75rem" }}>Prozesspunkte</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
            {snapshot.checkpoints.map((cp) => (
              <li
                key={cp.checkpointId}
                className="card"
                style={{ padding: "0.75rem 1rem" }}
              >
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
                  <strong style={{ flex: 1 }}>{cp.checkpointTitle}</strong>
                  {cp.decision && (
                    <span
                      className="text-small"
                      style={{
                        padding: "0.1rem 0.45rem",
                        borderRadius: "0.2rem",
                        background:
                          cp.decision === "PFLICHT"
                            ? "#e0f0e0"
                            : cp.decision === "OPTIONAL"
                              ? "#e8e8f8"
                              : "#f5f0e0",
                        fontWeight: 600,
                      }}
                    >
                      {cp.decision}
                    </span>
                  )}
                </div>
                {cp.umsetzung && (
                  <p className="text-small" style={{ margin: "0.4rem 0 0", color: "#333" }}>
                    {cp.umsetzung}
                  </p>
                )}
                {cp.selectedAnchorIds.length > 0 && (
                  <p className="text-small text-muted" style={{ margin: "0.25rem 0 0" }}>
                    Anker: {cp.selectedAnchorIds.join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Versionshistorie */}
      {versions.length > 1 && (
        <section>
          <h2 style={{ marginBottom: "0.75rem" }}>Versionshistorie</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.4rem" }}>
            {versions.map((v) => (
              <li key={v.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {v.id === entry.id ? (
                  <span style={{ fontWeight: 700 }}>Version {v.version} (aktuell)</span>
                ) : (
                  <Link href={`/practice/catalog/${v.id}`} className="text-small">
                    Version {v.version} · {v.published_at.toISOString().slice(0, 10)}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
