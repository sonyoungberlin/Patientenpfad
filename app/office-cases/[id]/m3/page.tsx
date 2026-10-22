import { redirect } from "next/navigation";
import { getOfficeOwnershipFilter } from "@/lib/office/scope";
import { prisma } from "@/lib/prisma";
import { getOfficeTopicVersion, isOfficeTopicId } from "@/lib/office/checkpointCatalog";
import { buildCheckpointComplianceMap } from "@/lib/office/checkpointCompliance";
import OfficeCaseEditorClient from "../OfficeCaseEditorClient";
import { requireOfficeCasesManagementAccessFromCookies } from "@/lib/authz";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export default async function OfficeCaseM3Page({
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

  const topicIdString = typeof snapshot?.topicId === "string" ? snapshot.topicId : null;
  const templateVersion = topicIdString && isOfficeTopicId(topicIdString)
    ? getOfficeTopicVersion(topicIdString, snapshot?.templateVersion)
    : 1;
  const complianceByCheckpointId =
    topicIdString && isOfficeTopicId(topicIdString)
      ? buildCheckpointComplianceMap(topicIdString, templateVersion)
      : {};

  return (
    <main style={{ display: "grid", gap: "1rem" }}>
      <section>
        <h1>Klärung & nächste Schritte</h1>
        <p className="text-muted" style={{ marginTop: "0.5rem" }}>
          Klärungsstand je Bereich eintragen und offene Punkte sichtbar machen.
        </p>
      </section>

      <OfficeCaseEditorClient
        officeCase={{
          id: officeCase.id,
          title: officeCase.title,
          trigger_note: officeCase.trigger_note,
          topicId: topicIdString,
          topicTitle: typeof snapshot?.topicTitle === "string" ? snapshot.topicTitle : null,
          checkpoint_snapshot: {
            topicId: topicIdString,
            templateVersion,
            plannedStartDate:
              typeof snapshot?.planned_start_date === "string" ? snapshot.planned_start_date : "",
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
        mode="m3"
        complianceByCheckpointId={complianceByCheckpointId}
      />
    </main>
  );
}
