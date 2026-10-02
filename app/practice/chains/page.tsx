import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPracticeRole, requirePracticeCatalogAccessFromCookies, requirePracticeChainRunnerAccessFromCookies } from "@/lib/authz";
import { listPracticeChains } from "@/lib/practiceChains/service";
import ChainCreateForm from "./ChainCreateForm";

export default async function PracticeChainsPage() {
  const manager = await requirePracticeCatalogAccessFromCookies();
  const account = manager ?? await requirePracticeChainRunnerAccessFromCookies();
  if (!account || !account.current_practice) redirect("/dashboard");
  const canManage = Boolean(manager);
  const chains = (await listPracticeChains(account.current_practice.id)).filter((chain) => canManage || chain.status === "READY");

  return (
    <main style={{ padding: "2rem", maxWidth: "64rem", margin: "0 auto", display: "grid", gap: "1.5rem" }}>
      <header>
        {canManage ? (
          <Link href="/practice/catalog" className="text-small text-muted">← Praxiskatalog</Link>
        ) : (
          <Link href="/practice/library" className="text-small text-muted">← Praxisbibliothek</Link>
        )}
        <h1 style={{ marginBottom: "0.35rem" }}>Praxisfall-Ketten</h1>
        <p className="text-muted" style={{ margin: 0 }}>
          {canManage
            ? <>Verbinden Sie veröffentlichte Versionen Ihrer Praxisfälle mit eigenen Übergängen. Entwürfe dürfen offene Stellen enthalten.</>
            : "Nutzen Sie die für Ihre Praxis freigegebenen Ketten, um veröffentlichte Praxisfälle anhand ihrer Übergänge durchzugehen."}
        </p>
      </header>

      {canManage && <ChainCreateForm />}

      {chains.length === 0 ? (
        <p className="text-muted">Noch keine Kette angelegt.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
          {chains.map((chain) => (
            <li key={chain.id} className="card" style={{ padding: "1rem 1.25rem" }}>
              <Link href={canManage ? `/practice/chains/${chain.id}` : `/practice/chains/${chain.id}/run`} style={{ color: "inherit", textDecoration: "none" }}>
                <strong>{chain.name}</strong>
                <span className="text-small text-muted" style={{ marginLeft: "0.75rem" }}>
                  {canManage ? chain.status === "READY" ? "Einsatzbereit" : "Entwurf" : "Freigegeben"} · {chain.definition.steps.length} Schritte
                </span>
              </Link>
              {chain.status === "READY" && canManage && <Link href={`/practice/chains/${chain.id}/run`} className="text-small" style={{ marginLeft: "1rem" }}>Runner öffnen</Link>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}