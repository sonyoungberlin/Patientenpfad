import { redirect } from "next/navigation";
import { requireInquiriesAccessFromCookies } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2, SECTION_INTRO_CHECKPOINT_IDS } from "@/lib/inquiries/inquiryCheckpointCatalog";
import {
  InquiryCheckpointKind,
  ActionStatus,
  type InquiryCheckpoint,
} from "@/lib/inquiries/types";
import { isStringRecord } from "@/lib/inquiries/inquirySessionService";
import {
  GLOBAL_ACTION_SHELF,
  PROCESS_SHELF_PROFILE_BINDINGS,
} from "@/lib/inquiries/processShelfProfileBindings";
import InquiryM2Client, {
  type PlainCheckpoint,
  type M2SectionData,
} from "./InquiryM2Client";
import { canAccessInquirySession } from "@/lib/inquiries/practiceScope";

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

function toPlainWithActiveText(cp: InquiryCheckpoint): PlainCheckpoint {
  return {
    ...toPlain(cp),
    previewText: cp.textByStatus?.[ActionStatus.ACTIVE],
  };
}

export default async function InquiryM2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await requireInquiriesAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  const { id } = await params;
  const session = await prisma.inquirySession.findUnique({
    where: { id },
    select: {
      owner_account_id: true,
      owner_practice_id: true,
      status: true,
      is_template: true,
      selected_inquiry_ids: true,
      checkpoint_statuses: true,
      action_statuses: true,
      communication_reason_selection: true,
    },
  });

  if (!session || !canAccessInquirySession(account, session) || session.is_template) {
    redirect("/inquiries");
  }

  if (session.status === "CONFIRMED") {
    redirect(`/inquiries/${id}/m3`);
  }

  const selectedIds: string[] = Array.isArray(session.selected_inquiry_ids)
    ? (session.selected_inquiry_ids as string[])
    : [];

  // Build per-inquiry sections (SPECIFIC checkpoints + decision questions for M2)
  const sections: M2SectionData[] = [];
  for (const inquiryId of selectedIds) {
    const profile = INQUIRY_PROFILE_CATALOG_V2[inquiryId];
    if (!profile) continue;
    const decisionCp = INQUIRY_CHECKPOINT_CATALOG_V2[profile.decisionCheckpointId];
    const specificCps = Array.from(new Set([
      ...profile.specificCheckpointIds,
      ...(PROCESS_SHELF_PROFILE_BINDINGS[inquiryId] ?? []),
      ...profile.boundGlobalCheckpointIds,
    ]))
      .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
      .filter((cp): cp is InquiryCheckpoint => !!cp);
    const actionCps = (profile.boundActionCheckpointIds ?? [])
      .filter((cpId) => !profile.boundActionConditions?.[cpId])
      .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
      .filter((cp): cp is InquiryCheckpoint => !!cp && cp.kind === InquiryCheckpointKind.ACTION);
    const allBoundActionCps = (profile.boundActionCheckpointIds ?? [])
      .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
      .filter((cp): cp is InquiryCheckpoint => !!cp && cp.kind === InquiryCheckpointKind.ACTION);
    sections.push({
      inquiryId,
      label: profile.label,
      decisionQuestions: decisionCp?.questions ?? [],
      specificCheckpoints: specificCps.map(toPlain),
      actionCheckpoints: actionCps.map(toPlain),
      allBoundActionCheckpoints: allBoundActionCps.map(toPlain),
      sectionIntroCheckpoints: (profile.availableSectionIntroIds ?? [])
        .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
        .filter(
          (cp): cp is InquiryCheckpoint =>
            !!cp && cp.kind === InquiryCheckpointKind.ACTION,
        )
        .map(toPlainWithActiveText),
    });
  }

  const actionIds = new Set<string>();
  for (const cpId of GLOBAL_ACTION_SHELF) {
    actionIds.add(cpId);
  }
  for (const inquiryId of selectedIds) {
    const profile = INQUIRY_PROFILE_CATALOG_V2[inquiryId];
    if (!profile) continue;
    profile.availableActionIds.forEach((cpId) => {
      actionIds.add(cpId);
    });
    // boundActionCheckpointIds must also be saved as actionStatuses
    (profile.boundActionCheckpointIds ?? []).forEach((cpId) => actionIds.add(cpId));
  }

  // Section-Intro-Checkpoints (M2 „Schubladen") werden – analog zu den
  // Message-Intros in M3 – als ACTION-Statuses persistiert. Sie sind
  // profilübergreifend und müssen auch dann als action_statuses gespeichert
  // werden, wenn ein Profil sie nicht in seine Whitelist aufnimmt.
  for (const cpId of SECTION_INTRO_CHECKPOINT_IDS) {
    actionIds.add(cpId);
  }

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
        initialCheckpointStatuses={checkpointStatuses}
        initialActionStatuses={actionStatuses}
        initialCommunicationReasonSelection={communicationReasonSelection}
        actionIds={Array.from(actionIds)}
      />
    </main>
  );
}
