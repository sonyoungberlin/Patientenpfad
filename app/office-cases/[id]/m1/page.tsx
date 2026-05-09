import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { getOfficeTopic, isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { prisma } from "@/lib/prisma";

export default async function OfficeCaseM1Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }
  if (!account.office_cases_enabled && !account.is_admin) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const officeCase = await prisma.officeCaseSession.findFirst({
    where: {
      id,
      ...getOfficeOwnershipFilter(account),
    },
    select: {
      id: true,
      title: true,
      trigger_note: true,
      checkpoint_snapshot: true,
    },
  });

  if (!officeCase) {
    redirect("/office-cases");
  }

  const snapshot =
    officeCase.checkpoint_snapshot &&
    typeof officeCase.checkpoint_snapshot === "object" &&
    !Array.isArray(officeCase.checkpoint_snapshot)
      ? (officeCase.checkpoint_snapshot as {
          topicId?: unknown;
          topicTitle?: unknown;
        })
      : null;
  const topicId =
    typeof snapshot?.topicId === "string" && isOfficeTopicId(snapshot.topicId)
      ? snapshot.topicId
      : null;
  const topic = topicId ? getOfficeTopic(topicId) : null;

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section className="card" style={{ display: "grid", gap: "0.5rem" }}>
        <div className="text-small text-muted">M1</div>
        <h1 style={{ margin: 0 }}>{topic?.title ?? officeCase.title ?? "Officefall"}</h1>
        <p style={{ margin: 0 }}>
          {officeCase.trigger_note ?? "Kein Anlass erfasst."}
        </p>
        <p className="text-small text-muted" style={{ marginBottom: 0 }}>
          Hier wird nur das gewählte Thema angezeigt.
        </p>
      </section>

      <section className="card" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href={`/office-cases/${id}/m2`}>
          <button type="button">Zu M2</button>
        </Link>
        <Link href={`/office-cases/${id}/m3`}>
          <button type="button">Zu M3</button>
        </Link>
      </section>
    </main>
  );
}
