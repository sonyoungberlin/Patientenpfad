import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases, getCurrentPracticeRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getCheckpointFromLib } from "@/lib/practiceProcesses/checkpointLibrary";
import { listCaseProfilesFromLib } from "@/lib/practiceProcesses/caseProfileLibrary";
import {
  isPracticeWorkflowDraftSnapshot,
  isPracticeWorkflowSnapshot,
  isPublishedPracticeWorkflowSnapshot,
} from "@/lib/practiceProcesses/workflowSnapshot";
import { buildPrintPdf } from "@/lib/pdf/printPdf";
import { getWorkflowOwnershipFilter } from "@/lib/workflow/scope";
import { isInternalProtocolWorkflowSnapshot } from "@/lib/workflow/internalProtocol/workflowAdapter";
import { isProcessPointStatus, isValidProcessSnapshot, type WorkflowProcessSnapshot } from "@/lib/workflow/types";
import type { WorkflowCasesPrintEntry, WorkflowCasesPrintMode } from "@/lib/workflow/workflowCasesPrintPdf";
import { buildWorkflowCasesPrintBlocks } from "@/lib/workflow/workflowCasesPrintPdf";
import type {
  WorkflowCasesExportReference,
  WorkflowCasesSessionKind,
} from "@/lib/workflow/workflowCasesExportTypes";

const NOT_AVAILABLE = "Ein oder mehrere ausgewählte Einträge sind nicht mehr verfügbar oder nicht mehr berechtigt. Bitte aktualisiere die Liste; es wurde keine PDF erstellt.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseReferences(value: unknown): WorkflowCasesExportReference[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const references: WorkflowCasesExportReference[] = [];
  const keys = new Set<string>();
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.id !== "string" || raw.id.length === 0) return null;
    let reference: WorkflowCasesExportReference;
    if (raw.type === "session" && ["clinical", "internal-protocol", "practice-workflow"].includes(String(raw.kind))) {
      reference = { type: "session", id: raw.id, kind: raw.kind as WorkflowCasesSessionKind };
    } else if (
      (raw.type === "practice-case-session" || raw.type === "catalog-entry") &&
      typeof raw.profileId === "string" && raw.profileId.length > 0
    ) {
      reference = { type: raw.type, id: raw.id, profileId: raw.profileId };
    } else if (raw.type === "practice-profile") {
      reference = { type: "practice-profile", id: raw.id };
    } else {
      return null;
    }
    const key = JSON.stringify(reference);
    if (keys.has(key)) return null;
    keys.add(key);
    references.push(reference);
  }
  return references;
}

function isClinicalSnapshot(value: unknown): value is WorkflowProcessSnapshot {
  const isAnswers = (answers: unknown) => answers === undefined || (
    isRecord(answers) && Object.values(answers).every((answer) =>
      answer === "YES" || answer === "NO" || answer === "UNCLEAR",
    )
  );
  return isValidProcessSnapshot(value) &&
    value.processPoints.every((point) =>
      !!point && typeof point.id === "string" && typeof point.title === "string" &&
      isProcessPointStatus(point.status) && (point.note === undefined || typeof point.note === "string") &&
      isAnswers(point.m2_answers),
    ) &&
    (value.m3Checkpoints === undefined || (Array.isArray(value.m3Checkpoints) && value.m3Checkpoints.every((checkpoint) =>
      !!checkpoint && typeof checkpoint.id === "string" && typeof checkpoint.title === "string" &&
      isProcessPointStatus(checkpoint.status) && isAnswers(checkpoint.m2_answers),
    ))) &&
    (value.sessionNote === undefined || typeof value.sessionNote === "string");
}

function unavailable() {
  return NextResponse.json({ ok: false, error: NOT_AVAILABLE }, { status: 409 });
}

export async function POST(request: NextRequest) {
  const account = await getSessionAccount(request);
  if (!account || !account.is_approved || !canAccessWorkflowCases(account)) {
    return NextResponse.json({ ok: false, error: "Nicht berechtigt." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Die Exportauswahl ist ungültig." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "Die Exportauswahl ist ungültig." }, { status: 400 });
  }
  const references = parseReferences(body.entries);
  const requestedMode = body.mode ?? "summary";
  if (!references || (requestedMode !== "summary" && requestedMode !== "detail")) {
    return NextResponse.json({ ok: false, error: "Bitte prüfe Auswahl und PDF-Ausgabe." }, { status: 400 });
  }
  const mode: WorkflowCasesPrintMode = requestedMode;

  const practiceId = account.current_practice?.id ?? null;
  const role = getCurrentPracticeRole(account);
  const canManagePracticeCases = role === "OWNER" || role === "ADMIN";
  const sessionReferences = references.filter((reference) =>
    reference.type === "session" || reference.type === "practice-case-session",
  );
  const sessionIds = sessionReferences.map((reference) => reference.id);
  if (new Set(sessionIds).size !== sessionIds.length) return unavailable();

  const sessions = sessionIds.length > 0
    ? await prisma.workflowSession.findMany({
        where: {
          ...getWorkflowOwnershipFilter(account),
          internal_saved_at: { not: null },
          id: { in: sessionIds },
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          process_snapshot: true,
          case_profile_id: true,
          owner_practice_id: true,
        },
      })
    : [];
  if (sessions.length !== sessionIds.length) return unavailable();
  const sessionById = new Map(sessions.map((session) => [session.id, session]));

  const catalogReferences = references.filter((reference) => reference.type === "catalog-entry");
  if (catalogReferences.length > 0 && (!canManagePracticeCases || !practiceId)) return unavailable();
  const catalogEntries = catalogReferences.length > 0
    ? await prisma.practiceCatalogEntry.findMany({
        where: {
          id: { in: catalogReferences.map((reference) => reference.id) },
          practice_id: practiceId!,
          is_catalog_active: true,
          is_current_version: true,
        },
      })
    : [];
  if (catalogEntries.length !== catalogReferences.length) return unavailable();
  const catalogById = new Map(catalogEntries.map((entry) => [entry.id, entry]));

  const profileReferences = references.filter((reference) => reference.type === "practice-profile");
  if (profileReferences.length > 0 && (!canManagePracticeCases || !practiceId)) return unavailable();
  const profiles = profileReferences.length > 0 ? await listCaseProfilesFromLib() : [];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  const entries: WorkflowCasesPrintEntry[] = [];
  for (const reference of references) {
    if (reference.type === "session") {
      const session = sessionById.get(reference.id);
      if (!session) return unavailable();
      const snapshot = session.process_snapshot;
      if (reference.kind === "clinical" && isClinicalSnapshot(snapshot)) {
        entries.push({ kind: "clinical", title: session.title, createdAt: session.createdAt, snapshot });
      } else if (reference.kind === "internal-protocol" && isInternalProtocolWorkflowSnapshot(snapshot)) {
        entries.push({ kind: "internal-protocol", title: session.title, createdAt: session.createdAt, snapshot });
      } else if (reference.kind === "practice-workflow" &&
        canManagePracticeCases && practiceId && session.owner_practice_id === practiceId &&
        isPracticeWorkflowSnapshot(snapshot)) {
        entries.push({ kind: "practice-workflow", title: session.title, createdAt: session.createdAt, snapshot });
      } else {
        return unavailable();
      }
      continue;
    }

    if (reference.type === "practice-case-session") {
      const session = sessionById.get(reference.id);
      if (!canManagePracticeCases || !practiceId || !session || session.owner_practice_id !== practiceId ||
        session.case_profile_id !== reference.profileId || !isPracticeWorkflowDraftSnapshot(session.process_snapshot) ||
        session.process_snapshot.caseProfileId !== reference.profileId) {
        return unavailable();
      }
      entries.push({
        kind: "practice-case",
        title: session.title ?? session.process_snapshot.caseProfileTitle,
        createdAt: session.updatedAt,
        status: "In Bearbeitung",
        snapshot: session.process_snapshot,
      });
      continue;
    }

    if (reference.type === "catalog-entry") {
      const entry = catalogById.get(reference.id);
      if (!canManagePracticeCases || !practiceId || !entry || entry.practice_id !== practiceId ||
        entry.source_case_profile_id !== reference.profileId || !isPublishedPracticeWorkflowSnapshot(entry.snapshot)) {
        return unavailable();
      }
      entries.push({
        kind: "practice-case",
        title: entry.title,
        createdAt: entry.updatedAt,
        status: "Veröffentlicht",
        snapshot: entry.snapshot,
      });
      continue;
    }

    if (!canManagePracticeCases || !practiceId) return unavailable();
    const profile = profileById.get(reference.id);
    if (!profile) return unavailable();
    const checkpointTitles = await Promise.all(profile.checkpointRefs.map(async (checkpointRef) => {
      const checkpoint = await getCheckpointFromLib(checkpointRef.checkpointId);
      return checkpoint?.title ?? null;
    }));
    if (checkpointTitles.some((title) => title === null)) return unavailable();
    entries.push({
      kind: "practice-profile",
      profile,
      checkpointTitles: checkpointTitles as string[],
    });
  }

  const title = mode === "summary" ? "Arbeitsprozesse – Kurzübersicht" : "Arbeitsprozesse – Ausführliche Übersicht";
  try {
    const bytes = await buildPrintPdf(title, buildWorkflowCasesPrintBlocks(entries, mode));
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="arbeitsprozesse.pdf"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Die PDF konnte nicht erstellt werden. Bitte erneut versuchen." }, { status: 500 });
  }
}
