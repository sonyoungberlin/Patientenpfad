import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import {
  InquiryCheckpointKind,
  type InquiryCheckpoint,
  type InquiryResponseV2Output,
} from "@/lib/inquiries/types";
import InquiryM3Client, {
  type M3SectionData,
  type M3ActionData,
} from "./InquiryM3Client";

function toM3Section(inquiryId: string): M3SectionData | null {
  const profile = INQUIRY_PROFILE_CATALOG_V2[inquiryId];
  if (!profile) return null;
  const decisionCp = INQUIRY_CHECKPOINT_CATALOG_V2[profile.decisionCheckpointId];
  if (!decisionCp) return null;
  const specificCps = profile.specificCheckpointIds
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter((cp): cp is InquiryCheckpoint => !!cp);
  return {
    inquiryId,
    label: profile.label,
    decisionCheckpointId: profile.decisionCheckpointId,
    decisionLabel: decisionCp.label,
    decisionQuestions: decisionCp.questions ?? [],
    specificCheckpoints: specificCps.map((cp) => ({
      id: cp.id,
      label: cp.label,
      kind: cp.kind,
      questions: cp.questions,
    })),
  };
}

export default async function InquiryM3Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (
    !account ||
    !account.is_approved ||
    (!account.inquiry_assistant_enabled && !account.is_admin)
  ) {
    redirect("/");
  }

  const { id } = await params;
  const session = await prisma.inquirySession.findUnique({
    where: { id },
    select: {
      owner_account_id: true,
      status: true,
      selected_inquiry_ids: true,
      checkpoint_statuses: true,
      action_statuses: true,
      explanation_output_statuses: true,
      generated_output: true,
    },
  });

  if (!session || session.owner_account_id !== account.id) {
    redirect("/inquiries");
  }

  const selectedIds: string[] = Array.isArray(session.selected_inquiry_ids)
    ? (session.selected_inquiry_ids as string[])
    : [];

  // Decision sections (one per inquiry, with specific checkpoints)
  const sections: M3SectionData[] = selectedIds
    .map(toM3Section)
    .filter((s): s is M3SectionData => s !== null);

  // Deduplicated ACTION checkpoints across all selected inquiries
  const actionIds = new Set<string>();
  for (const inquiryId of selectedIds) {
    const profile = INQUIRY_PROFILE_CATALOG_V2[inquiryId];
    if (!profile) continue;
    profile.availableActionIds.forEach((cpId) => actionIds.add(cpId));
  }

  const actionCheckpoints: M3ActionData[] = Array.from(actionIds)
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter(
      (cp): cp is InquiryCheckpoint =>
        !!cp && cp.kind === InquiryCheckpointKind.ACTION,
    )
    .map((cp) => ({ id: cp.id, label: cp.label }));

  // Global context checkpoints (read-only in M3, set in M2)
  // NOTE: per architecture spec, GLOBAL checkpoints must NOT appear in M3 at all.

  const checkpointStatuses: Record<string, string> =
    session.checkpoint_statuses !== null &&
    typeof session.checkpoint_statuses === "object" &&
    !Array.isArray(session.checkpoint_statuses)
      ? (session.checkpoint_statuses as Record<string, string>)
      : {};

  const actionStatuses: Record<string, string> =
    session.action_statuses !== null &&
    typeof session.action_statuses === "object" &&
    !Array.isArray(session.action_statuses)
      ? (session.action_statuses as Record<string, string>)
      : {};

  const explanationOutputStatuses: Record<string, string> =
    session.explanation_output_statuses !== null &&
    typeof session.explanation_output_statuses === "object" &&
    !Array.isArray(session.explanation_output_statuses)
      ? (session.explanation_output_statuses as Record<string, string>)
      : {};

  const generatedOutput: InquiryResponseV2Output | null =
    session.generated_output !== null &&
    typeof session.generated_output === "object" &&
    !Array.isArray(session.generated_output)
      ? (session.generated_output as unknown as InquiryResponseV2Output)
      : null;

  const isConfirmed = session.status === "CONFIRMED";

  return (
    <main>
      <h1>Entscheidung &amp; Antwort</h1>
      <InquiryM3Client
        sessionId={id}
        sections={sections}
        actionCheckpoints={actionCheckpoints}
        initialCheckpointStatuses={checkpointStatuses}
        initialActionStatuses={actionStatuses}
        initialExplanationOutputStatuses={explanationOutputStatuses}
        actionIds={Array.from(actionIds)}
        initialGeneratedOutput={generatedOutput}
        isConfirmed={isConfirmed}
      />
    </main>
  );
}
