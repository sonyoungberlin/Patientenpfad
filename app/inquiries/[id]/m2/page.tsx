import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";
import {
  InquiryCheckpointScope,
  InquiryCheckpointKind,
  type InquiryCheckpoint,
} from "@/lib/inquiries/types";
import { isStringRecord } from "@/lib/inquiries/inquirySessionService";
import InquiryM2Client, {
  type PlainCheckpoint,
  type M2SectionData,
} from "./InquiryM2Client";

function toPlain(cp: InquiryCheckpoint): PlainCheckpoint {
  return {
    id: cp.id,
    label: cp.label,
    kind: cp.kind,
    scope: cp.scope,
    question: cp.question,
    questions: cp.questions,
    actionCategory: cp.actionCategory,
  };
}

export default async function InquiryM2Page({
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
      communication_reason_selection: true,
    },
  });

  if (!session || session.owner_account_id !== account.id) {
    redirect("/inquiries");
  }

  if (session.status === "CONFIRMED") {
    redirect(`/inquiries/${id}/m3`);
  }

  const selectedIds: string[] = Array.isArray(session.selected_inquiry_ids)
    ? (session.selected_inquiry_ids as string[])
    : [];

  // Build per-inquiry sections (SPECIFIC checkpoints + decision questions for M2)
  const sections: M2SectionData[] = selectedIds
    .map((inquiryId) => {
      const profile = INQUIRY_PROFILE_CATALOG_V2[inquiryId];
      if (!profile) return null;
      const decisionCp = INQUIRY_CHECKPOINT_CATALOG_V2[profile.decisionCheckpointId];
      const specificCps = profile.specificCheckpointIds
        .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
        .filter((cp): cp is InquiryCheckpoint => !!cp);
      const actionCps = (profile.boundActionCheckpointIds ?? [])
        .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
        .filter((cp): cp is InquiryCheckpoint => !!cp && cp.kind === InquiryCheckpointKind.ACTION);
      return {
        inquiryId,
        label: profile.label,
        decisionQuestions: decisionCp?.questions ?? [],
        specificCheckpoints: specificCps.map(toPlain),
        actionCheckpoints: actionCps.map(toPlain),
      };
    })
    .filter((s): s is M2SectionData => s !== null);

  // Deduplicate global EXPLANATION checkpoints across all selected inquiries
  const globalIds = new Set<string>();
  const actionIds = new Set<string>();
  // Collect all boundActionCheckpointIds across selected profiles for deduplication
  const boundActionIds = new Set<string>();
  for (const inquiryId of selectedIds) {
    const profile = INQUIRY_PROFILE_CATALOG_V2[inquiryId];
    if (!profile) continue;
    (profile.boundActionCheckpointIds ?? []).forEach((cpId) => boundActionIds.add(cpId));
  }
  // availableActionIds from selected profiles (deduplicated, excluding boundActionCheckpointIds)
  const profileAvailableActionIds = new Set<string>();
  for (const inquiryId of selectedIds) {
    const profile = INQUIRY_PROFILE_CATALOG_V2[inquiryId];
    if (!profile) continue;
    profile.boundGlobalCheckpointIds.forEach((cpId) => globalIds.add(cpId));
    profile.availableActionIds.forEach((cpId) => {
      if (!boundActionIds.has(cpId)) profileAvailableActionIds.add(cpId);
    });
    profile.availableActionIds.forEach((cpId) => actionIds.add(cpId));
    // boundActionCheckpointIds must also be saved as actionStatuses
    (profile.boundActionCheckpointIds ?? []).forEach((cpId) => actionIds.add(cpId));
  }

  const globalCheckpoints: PlainCheckpoint[] = Array.from(globalIds)
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter(
      (cp): cp is InquiryCheckpoint =>
        !!cp &&
        cp.scope === InquiryCheckpointScope.GLOBAL &&
        cp.kind === InquiryCheckpointKind.EXPLANATION,
    )
    .map(toPlain);

  // Profile-scoped available actions (deduplicated, excluding boundActionCheckpointIds)
  const profileActionCheckpoints: PlainCheckpoint[] = Array.from(profileAvailableActionIds)
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter((cp): cp is InquiryCheckpoint => !!cp && cp.kind === InquiryCheckpointKind.ACTION)
    .map(toPlain);

  const checkpointStatuses: Record<string, string> =
    isStringRecord(session.checkpoint_statuses) ? session.checkpoint_statuses : {};

  const actionStatuses: Record<string, string> =
    isStringRecord(session.action_statuses) ? session.action_statuses : {};

  const communicationReasonSelection: Record<string, string> =
    isStringRecord(session.communication_reason_selection)
      ? session.communication_reason_selection
      : {};

  return (
    <main>
      <h1>Klärpunkte</h1>
      <InquiryM2Client
        sessionId={id}
        sections={sections}
        globalCheckpoints={globalCheckpoints}
        profileActionCheckpoints={profileActionCheckpoints}
        initialCheckpointStatuses={checkpointStatuses}
        initialActionStatuses={actionStatuses}
        initialCommunicationReasonSelection={communicationReasonSelection}
        actionIds={Array.from(actionIds)}
      />
    </main>
  );
}
