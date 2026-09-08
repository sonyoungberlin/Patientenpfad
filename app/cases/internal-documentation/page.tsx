import { redirect } from "next/navigation";
import { requireInternalDocumentationAccessFromCookies } from "@/lib/authz";
import { INTERNAL_WORKFLOWS } from "@/lib/questionnaire/internalWorkflowRegistry";
import InternalDocumentationLauncher from "./InternalDocumentationLauncher";

export default async function InternalDocumentationStartPage() {
  const account = await requireInternalDocumentationAccessFromCookies();
  if (!account) redirect("/");

  const workflows = Object.values(INTERNAL_WORKFLOWS).map((workflow) => ({
    id: workflow.id,
    title: workflow.title,
  }));

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <section>
        <h1>Interne Dokumentation</h1>
        <p className="text-muted">Workflow auswählen und Dokumentation starten.</p>
      </section>
      <InternalDocumentationLauncher workflows={workflows} />
    </main>
  );
}