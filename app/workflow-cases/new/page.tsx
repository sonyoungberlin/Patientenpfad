import { redirect } from "next/navigation";
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
    <main style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h1>Neue Sitzung starten</h1>
        <p className="text-muted">
          Musterprozess und Rolle auswählen.
        </p>
      </section>
      <WorkflowNewClient topics={listWorkflowTopics()} />
    </main>
  );
}
