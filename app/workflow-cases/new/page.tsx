import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { listWorkflowTopics } from "@/lib/workflow/processCatalog";
import WorkflowNewClient from "./WorkflowNewClient";

export default async function WorkflowNewPage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!canAccessWorkflowCases(account)) {
    redirect("/dashboard");
  }

  return (
    <main style={{ display: "grid", gap: "2rem" }}>
      <section>
        <h1>Neue Sitzung starten</h1>
        <p className="text-muted">
          Musterprozess und Rolle auswählen.
        </p>
      </section>
      <WorkflowNewClient topics={listWorkflowTopics()} />

      {/* Interne Regelungsdokumente */}
      <section style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Interne Regelungsdokumente</h2>
        <p className="text-muted" style={{ margin: 0 }}>
          Praxisinterne Prozessregelungen gemeinsam erarbeiten und festhalten.
        </p>
        <div>
          <Link href="/workflow-cases/internal-protocol/new">
            <button type="button">Patienten ohne Termin</button>
          </Link>
        </div>
      </section>
    </main>
  );
}
