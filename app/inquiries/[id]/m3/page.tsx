import { redirect } from "next/navigation";
import { requireInquiriesAccessFromCookies } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { INQUIRY_CHECKPOINT_CATALOG_V2, INTRO_CHECKPOINT_IDS, SECTION_INTRO_CHECKPOINT_IDS } from "@/lib/inquiries/inquiryCheckpointCatalog";
import { GLOBAL_ACTION_SHELF } from "@/lib/inquiries/processShelfProfileBindings";
import {
  getActiveProcessShelfGroupsFromStatuses,
  getAllowedGlobalActionIds,
} from "@/lib/inquiries/processShelfGroups";
import {
  InquiryCheckpointKind,
  InquiryCheckpointScope,
  type InquiryCheckpoint,
  type InquiryResponseV2Output,
} from "@/lib/inquiries/types";
import { isStringRecord } from "@/lib/inquiries/inquirySessionService";
import InquiryM3Client, {
  type M3SectionData,
  type M3ActionData,
  type M3BoundActionData,
} from "./InquiryM3Client";

function toM3Section(inquiryId: string): M3SectionData | null {
  const profile = INQUIRY_PROFILE_CATALOG_V2[inquiryId];
  if (!profile) return null;
  // Profiles without a decision checkpoint (e.g. APPOINTMENT, TECH_SUPPORT, ONBOARDING,
  // BILLING) have decisionCheckpointId: "". They must still appear in M3 so the user
  // can set SHOW/HIDE on their specific checkpoints.
  const decisionCp = profile.decisionCheckpointId
    ? INQUIRY_CHECKPOINT_CATALOG_V2[profile.decisionCheckpointId]
    : undefined;
  const specificCps = profile.specificCheckpointIds
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter((cp): cp is InquiryCheckpoint => !!cp);
  const boundActionCps = (profile.boundActionCheckpointIds ?? [])
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter((cp): cp is InquiryCheckpoint => !!cp && cp.kind === InquiryCheckpointKind.ACTION);
  const boundActionCheckpoints: M3BoundActionData[] = boundActionCps.map((cp) => {
    const conditions = profile.boundActionConditions?.[cp.id];
    return {
      id: cp.id,
      label: cp.label,
      actionCategory: cp.actionCategory,
      questions: cp.questions,
      showWhenAny: conditions?.showWhenAny,
      hideWhenAny: conditions?.hideWhenAny,
    };
  });
  // GLOBAL MODULAR EXPLANATION-Checkpoints → in M3 als SHOW/HIDE-fähige Output-Bausteine
  const boundGlobalOutputCps = (profile.boundGlobalCheckpointIds ?? [])
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter(
      (cp): cp is InquiryCheckpoint =>
        !!cp &&
        cp.scope === InquiryCheckpointScope.GLOBAL &&
        cp.kind === InquiryCheckpointKind.EXPLANATION &&
        cp.classification === "MODULAR",
    );
  return {
    inquiryId,
    label: profile.label,
    decisionCheckpointId: profile.decisionCheckpointId,
    decisionLabel: decisionCp?.label ?? "",
    decisionQuestions: decisionCp?.questions ?? [],
    specificCheckpoints: specificCps.map((cp) => ({
      id: cp.id,
      label: cp.label,
      kind: cp.kind,
      questions: cp.questions,
      textByStatus: cp.textByStatus,
    })),
    boundActionCheckpoints,
    boundGlobalOutputCheckpoints: boundGlobalOutputCps.map((cp) => ({
      id: cp.id,
      label: cp.label,
      kind: cp.kind,
    })),
  };
}

export default async function InquiryM3Page({
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
      status: true,
      is_template: true,
      selected_inquiry_ids: true,
      checkpoint_statuses: true,
      action_statuses: true,
      explanation_output_statuses: true,
      response_goal_selection: true,
      generated_output: true,
    },
  });

  if (!session || session.owner_account_id !== account.id || session.is_template) {
    redirect("/inquiries");
  }

  // Praxis-Signatur laden (für die Nachrichten-Vorschau / „Nachricht kopieren").
  // Quelle: `Practice.message_signature` der aktuellen Practice des eingeloggten
  // Accounts – analog zu `app/cases/[id]/m3/page.tsx`. Reines Lesen, keine
  // neue Logik.
  let messageSignature = "";
  const currentPracticeId = account.current_practice?.id;
  if (currentPracticeId) {
    try {
      const pr = await prisma.practice.findUnique({
        where: { id: currentPracticeId },
        select: { message_signature: true },
      });
      messageSignature = pr?.message_signature ?? "";
    } catch {
      messageSignature = "";
    }
  }

  const selectedIds: string[] = Array.isArray(session.selected_inquiry_ids)
    ? (session.selected_inquiry_ids as string[])
    : [];

  // Decision sections (one per inquiry, with specific checkpoints)
  const sections: M3SectionData[] = selectedIds
    .map(toM3Section)
    .filter((s): s is M3SectionData => s !== null);

  // Statuses früh laden – werden für die schubladen-konditionale Auswahl der
  // GLOBAL_ACTION_SHELF-Actions sowie weiter unten unverändert weiterverwendet.
  const checkpointStatusesEarly: Record<string, string> =
    isStringRecord(session.checkpoint_statuses) ? session.checkpoint_statuses : {};
  const actionStatusesEarly: Record<string, string> =
    isStringRecord(session.action_statuses) ? session.action_statuses : {};
  const mergedStatuses: Record<string, string> = {
    ...checkpointStatusesEarly,
    ...actionStatusesEarly,
  };
  const activeShelfGroups = getActiveProcessShelfGroupsFromStatuses(mergedStatuses);
  const allowedGlobalActionIds = getAllowedGlobalActionIds(activeShelfGroups);

  // Deduplicated ACTION IDs across all selected inquiries.
  // actionIds is the full set used for status storage (includes boundActionCheckpointIds).
  // displayActionIds is the subset used for the ungrouped global action list in M3
  // (availableActionIds only – boundActionCheckpointIds are rendered via sections[].boundActionCheckpoints).
  const actionIds = new Set<string>();
  const displayActionIds = new Set<string>();
  // Globale Actions (profilübergreifend, einmalig): nur einspeisen, wenn die
  // zugehörige Prozess-Schublade durch aktive M2-Statuses aktiviert wurde.
  for (const cpId of GLOBAL_ACTION_SHELF) {
    if (!allowedGlobalActionIds.has(cpId)) continue;
    actionIds.add(cpId);
    displayActionIds.add(cpId);
  }
  // Persistenz-Erhalt: Bereits gespeicherte action_statuses-Einträge globaler
  // Shelf-Actions weiter in actionIds führen, damit der Save-Pfad sie nicht
  // versehentlich verwirft. Nicht in displayActionIds (keine Anzeige ohne
  // aktive Schublade).
  for (const cpId of GLOBAL_ACTION_SHELF) {
    if (cpId in actionStatusesEarly) actionIds.add(cpId);
  }

  for (const inquiryId of selectedIds) {
    const profile = INQUIRY_PROFILE_CATALOG_V2[inquiryId];
    if (!profile) continue;
    profile.availableActionIds.forEach((cpId) => {
      actionIds.add(cpId);
      displayActionIds.add(cpId);
    });
    // boundActionCheckpointIds must be routed to actionStatuses but must NOT
    // appear in the ungrouped global list – they are shown via boundActionCheckpoints.
    (profile.boundActionCheckpointIds ?? []).forEach((cpId) => actionIds.add(cpId));
  }

  const actionCheckpoints: M3ActionData[] = Array.from(displayActionIds)
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter(
      (cp): cp is InquiryCheckpoint =>
        !!cp && cp.kind === InquiryCheckpointKind.ACTION,
    )
    .map((cp) => ({ id: cp.id, label: cp.label, actionCategory: cp.actionCategory }));

  // Herkunfts-Map: actionId → Liste der selectedProfileIds, die diese Action in availableActionIds haben.
  // Wird in M3 genutzt, um Actions mit genau einer Profil-Herkunft unter dem Profil-Abschnitt zu rendern.
  const actionOrigins: Record<string, string[]> = {};
  for (const inquiryId of selectedIds) {
    const profile = INQUIRY_PROFILE_CATALOG_V2[inquiryId];
    if (!profile) continue;
    for (const cpId of profile.availableActionIds) {
      if (!displayActionIds.has(cpId)) continue;
      if (!actionOrigins[cpId]) actionOrigins[cpId] = [];
      actionOrigins[cpId].push(inquiryId);
    }
  }

  // Intro-Bausteine (Nachrichteneinstieg): profilübergreifend, immer verfügbar.
  // Die IDs werden zu actionIds hinzugefügt, damit ihre Statuses in actionStatuses gespeichert werden.
  // Sie erscheinen NICHT in actionCheckpoints (dafür gibt es introCheckpoints).
  for (const cpId of INTRO_CHECKPOINT_IDS) {
    actionIds.add(cpId);
  }
  // Section-Intro-Bausteine (M2 „Schubladen", Pilot AU/LAB/APPOINTMENT):
  // werden in M2 gesetzt, müssen aber auch in M3 weiter als action_statuses
  // erhalten bleiben, damit ein Speichern in M3 die Auswahl nicht löscht.
  for (const cpId of SECTION_INTRO_CHECKPOINT_IDS) {
    actionIds.add(cpId);
  }
  const introCheckpoints: M3ActionData[] = INTRO_CHECKPOINT_IDS
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter(
      (cp): cp is InquiryCheckpoint =>
        !!cp && cp.kind === InquiryCheckpointKind.ACTION,
    )
    .map((cp) => ({ id: cp.id, label: cp.label }));

  // Section-Intro-Bausteine (Pilot M2 „Schubladen"): nur als read-only Anzeige
  // an den Client durchreichen, damit M3 zeigen kann, welche Schublade in M2
  // gewählt wurde. Kein Schreib-Pfad in M3 – die Auswahl erfolgt
  // ausschließlich in M2.
  const sectionIntroCheckpoints: M3ActionData[] = SECTION_INTRO_CHECKPOINT_IDS
    .map((cpId) => INQUIRY_CHECKPOINT_CATALOG_V2[cpId])
    .filter(
      (cp): cp is InquiryCheckpoint =>
        !!cp && cp.kind === InquiryCheckpointKind.ACTION,
    )
    .map((cp) => ({ id: cp.id, label: cp.label }));

  // Global context checkpoints (read-only in M3, set in M2)
  // NOTE: per architecture spec, GLOBAL checkpoints must NOT appear in M3 at all.

  const checkpointStatuses: Record<string, string> = checkpointStatusesEarly;

  const actionStatuses: Record<string, string> = actionStatusesEarly;

  const explanationOutputStatuses: Record<string, string> =
    isStringRecord(session.explanation_output_statuses)
      ? session.explanation_output_statuses
      : {};

  const responseGoalSelection: Record<string, string> =
    isStringRecord(session.response_goal_selection) ? session.response_goal_selection : {};

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
        introCheckpoints={introCheckpoints}
        sectionIntroCheckpoints={sectionIntroCheckpoints}
        initialCheckpointStatuses={checkpointStatuses}
        initialActionStatuses={actionStatuses}
        initialExplanationOutputStatuses={explanationOutputStatuses}
        initialResponseGoalSelection={responseGoalSelection}
        actionIds={Array.from(actionIds)}
        actionOrigins={actionOrigins}
        initialGeneratedOutput={generatedOutput}
        isConfirmed={isConfirmed}
        messageSignature={messageSignature}
      />
    </main>
  );
}
