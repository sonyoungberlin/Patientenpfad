import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { prisma } from "@/lib/prisma";
import OfficeCaseEditorClient from "../OfficeCaseEditorClient";

export default async function OfficeCaseM2Page({
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
          checkpoints?: unknown;
        })
      : null;

  const checkpoints = Array.isArray(snapshot?.checkpoints)
    ? (snapshot.checkpoints as {
        id: string;
        title: string;
        kind: import("@/lib/office/types").OfficeCheckpointKind;
        state: import("@/lib/office/types").OfficeCheckpointState;
        known_note?: string;
        missing_note?: string;
        answer_source?: string;
      }[])
    : [];

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h1>Officefall M2</h1>
        <p className="text-muted" style={{ marginTop: "0.5rem" }}>
          Informationen strukturiert sammeln und offene Punkte klaeren.
        </p>
      </section>

      <OfficeCaseEditorClient
        officeCase={{
          id: officeCase.id,
          title: officeCase.title,
          trigger_note: officeCase.trigger_note,
          topicId: typeof snapshot?.topicId === "string" ? snapshot.topicId : null,
          topicTitle: typeof snapshot?.topicTitle === "string" ? snapshot.topicTitle : null,
          checkpoint_snapshot: {
            topicId: typeof snapshot?.topicId === "string" ? snapshot.topicId : null,
            checkpoints,
          },
        }}
        mode="m2"
      />
    </main>
  );
}
