import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import { isInternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";
import InternalProtocolEditorClient from "./InternalProtocolEditorClient";

export default async function InternalProtocolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!canAccessWorkflowCases(account)) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const session = await prisma.workflowSession.findFirst({
    where: { id, ...getWorkflowOwnershipFilter(account) },
    select: { id: true, title: true, createdAt: true, process_snapshot: true },
  });

  if (!session) {
    redirect("/workflow-cases");
  }

  if (!isInternalProtocolWorkflowSnapshot(session.process_snapshot)) {
    redirect("/workflow-cases");
  }

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h1>Praxisinternes Regelungsdokument</h1>
        <p className="text-muted" style={{ marginTop: "0.5rem" }}>
          Patienten ohne Termin – Praxisinternes Regelungsdokument
        </p>
      </section>
      <InternalProtocolEditorClient
        sessionId={session.id}
        title={session.title ?? undefined}
        sessionCreatedAt={session.createdAt.toISOString()}
        snapshot={session.process_snapshot}
      />
    </main>
  );
}
