import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import {
  isInternalProtocolWorkflowSnapshot,
  getPracticeProcessMode,
} from "@/lib/workflow/internalProtocol/workflowAdapter";

export default async function InternalProtocolM1Page({
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

  const processMode = getPracticeProcessMode(session.process_snapshot);
  const createdDate = session.createdAt.toISOString().slice(0, 10);

  const modeLabel =
    processMode === "CURRENT_STATE"
      ? "Heutigen Ablauf dokumentieren"
      : "Zukünftigen Ablauf festlegen";

  const description =
    processMode === "CURRENT_STATE"
      ? "Beschreiben Sie, wie Ihre Praxis heute mit Patienten ohne Termin umgeht."
      : "Legen Sie gemeinsam fest, wie Ihre Praxis künftig mit Patienten ohne Termin umgehen soll.";

  const buttonText =
    processMode === "CURRENT_STATE"
      ? "Ablauf gemeinsam beschreiben →"
      : "Ablauf gemeinsam festlegen →";

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section className="card" style={{ display: "grid", gap: "0.5rem" }}>
        <div className="text-small text-muted">Arbeitsprozess · {modeLabel}</div>
        <h1 style={{ margin: 0 }}>Patienten ohne Termin</h1>
        <p style={{ margin: 0 }}>{description}</p>
        {session.title && (
          <p className="text-small text-muted" style={{ margin: 0 }}>
            Sitzung: {session.title}
          </p>
        )}
        <p className="text-small text-muted" style={{ margin: 0 }}>
          Erstellt: {createdDate}
        </p>
      </section>

      <section
        className="card"
        style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
      >
        <Link href={`/workflow-cases/${id}/protocol/m2`}>
          <button type="button">{buttonText}</button>
        </Link>
      </section>

      <div>
        <Link href="/workflow-cases" className="text-small text-muted">
          ← Arbeitsprozesse
        </Link>
      </div>
    </main>
  );
}

