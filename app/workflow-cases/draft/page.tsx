import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { isWorkflowTopicId, getWorkflowTopic } from "@/lib/workflow/processCatalog";
import { isWorkflowRole } from "@/lib/workflow/types";
import WorkflowDraftClient from "./WorkflowDraftClient";

export default async function WorkflowDraftPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!canAccessWorkflowCases(account)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const topicId = typeof sp.topicId === "string" ? sp.topicId : "";
  const role = typeof sp.role === "string" ? sp.role : "";
  const title = typeof sp.title === "string" ? sp.title : undefined;

  if (!isWorkflowTopicId(topicId) || !isWorkflowRole(role)) {
    redirect("/workflow-cases/new");
  }

  const topic = getWorkflowTopic(topicId);

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h1>Neue Sitzung</h1>
        <p className="text-muted">{topic.title}</p>
      </section>
      <WorkflowDraftClient topicId={topicId} role={role} title={title} />
    </main>
  );
}
