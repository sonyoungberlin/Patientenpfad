import { redirect } from "next/navigation";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { prisma } from "@/lib/prisma";
import OfficeCaseEditorClient from "../OfficeCaseEditorClient";
import { getOfficeTopicVersion, isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import { requireOfficeCasesManagementAccessFromCookies } from "@/lib/authz";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export default async function OfficeCaseM2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await requireOfficeCasesManagementAccessFromCookies();
  if (!account) redirect("/");

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
          templateVersion?: unknown;
          planned_start_date?: unknown;
          planned_event_date?: unknown;
          decisionRevision?: unknown;
          final_review?: unknown;
          final_review_history?: unknown;
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
        <h1>Operative Prüfung</h1>
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
            templateVersion:
              typeof snapshot?.topicId === "string" && isOfficeTopicId(snapshot.topicId)
                ? getOfficeTopicVersion(snapshot.topicId, snapshot.templateVersion)
                : 1,
            plannedStartDate:
              typeof snapshot?.planned_start_date === "string" ? snapshot.planned_start_date : "",
            plannedEventDate:
              typeof snapshot?.planned_event_date === "string" ? snapshot.planned_event_date : "",
            decisionRevision:
              typeof snapshot?.decisionRevision === "number" ? snapshot.decisionRevision : 0,
            finalReview: isRecord(snapshot?.final_review) ? snapshot.final_review : null,
            finalReviewHistory:
              Array.isArray(snapshot?.final_review_history)
                ? snapshot.final_review_history.filter(
                    (item): item is Record<string, unknown> =>
                      Boolean(item) && typeof item === "object" && !Array.isArray(item),
                  )
                : [],
            checkpoints,
          },
        }}
        mode="m2"
      />
    </main>
  );
}
