import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { validateChainDefinition, parseChainDefinition } from "./validate";
import type {
  ChainStatus,
  PracticeCaseChainDefinition,
  PracticeCaseChainRecord,
} from "./types";
import type { RunnerChain } from "./runner";
import { isPublishedPracticeWorkflowSnapshot } from "@/lib/practiceProcesses/workflowSnapshot";
import { discoverPracticeChainSegments, findAttachmentCandidates, getSegmentTerminalCatalogEntryIds, type PracticeChainSegment } from "./discovery";

const EMPTY_DEFINITION: PracticeCaseChainDefinition = {
  startStepId: null,
  steps: [],
  transitions: [],
};

async function assertCatalogEntriesBelongToPractice(
  definition: PracticeCaseChainDefinition,
  practiceId: string,
) {
  const ids = [...new Set(definition.steps.map((step) => step.catalogEntryId))];
  const entries = ids.length === 0
    ? []
    : await prisma.practiceCatalogEntry.findMany({
        where: { id: { in: ids }, practice_id: practiceId },
        select: { id: true, snapshot: true },
      });
  const knownIds = new Set(entries.map((entry) => entry.id));
  const hasForeignEntry = definition.steps.some((step) => !step.catalogEntryId || !knownIds.has(step.catalogEntryId));
  if (hasForeignEntry) {
    throw Object.assign(new Error("Mindestens ein Praxisfall gehört nicht zur eigenen Praxis oder existiert nicht."), {
      statusCode: 400,
    });
  }
  const hasUnpublishedEntry = entries.some((entry) => !isPublishedPracticeWorkflowSnapshot(entry.snapshot));
  if (hasUnpublishedEntry) {
    throw Object.assign(new Error("Jeder Praxisfall einer einsatzbereiten Kette muss einen vollständigen Published-Snapshot besitzen."), {
      statusCode: 400,
    });
  }
}

function mapChain(row: {
  id: string;
  practice_id: string;
  name: string;
  status: string;
  version: number;
  source_chain_id: string | null;
  definition: unknown;
  created_at: Date;
  updated_at: Date;
}): PracticeCaseChainRecord {
  const definition = parseChainDefinition(row.definition);
  if (!definition) throw new Error("Ungültige Kettendefinition in der Datenbank.");
  return { ...row, status: row.status as ChainStatus, definition };
}

export async function listPracticeChains(practiceId: string) {
  const rows = await prisma.practiceCaseChain.findMany({
    where: { practice_id: practiceId },
    orderBy: { updated_at: "desc" },
  });
  return rows.map(mapChain);
}

export async function discoverPracticeChainConnections(practiceId: string, excludedChainId?: string) {
  const chains = await prisma.practiceCaseChain.findMany({
    where: { practice_id: practiceId, status: "READY" },
    orderBy: [{ name: "asc" }, { version: "asc" }],
  });
  const entryIds = [...new Set(chains.flatMap((chain) => {
    const definition = parseChainDefinition(chain.definition);
    return definition?.steps.map((step) => step.catalogEntryId) ?? [];
  }))];
  const entries = entryIds.length === 0 ? [] : await prisma.practiceCatalogEntry.findMany({
    where: { practice_id: practiceId, id: { in: entryIds } },
    select: { id: true, title: true },
  });
  const titleById = new Map(entries.map((entry) => [entry.id, entry.title]));
  const segments = chains.flatMap((chain) => {
    const definition = parseChainDefinition(chain.definition);
    if (!definition) return [];
    return discoverPracticeChainSegments({ id: chain.id, name: chain.name, version: chain.version, definition, entryTitles: titleById });
  });
  const current = excludedChainId ? segments.filter((segment) => segment.chainId === excludedChainId) : [];
  const currentEntryIds = getSegmentTerminalCatalogEntryIds(current);
  const targetCandidates = findAttachmentCandidates(segments, currentEntryIds, excludedChainId);
  const attachmentCandidates = targetCandidates.flatMap((target) => current.flatMap((source) => source.paths.flatMap((path, index) =>
    path.at(-1)?.catalogEntryId === target.start.catalogEntryId && source.pathExitIds[index]
      ? [{ sourceChainId: source.chainId, sourceStepId: path.at(-1)!.stepId, sourceExitId: source.pathExitIds[index]!, sourceExitPrompt: source.pathExitPrompts[index], sourceExitLabel: source.pathExitLabels[index], target }]
      : [])));
  return {
    segments,
    attachmentCandidates,
  } satisfies { segments: PracticeChainSegment[]; attachmentCandidates: { sourceChainId: string; sourceStepId: string; sourceExitId: string; sourceExitPrompt: string | null; sourceExitLabel: string | null; target: PracticeChainSegment }[] };
}

export async function getPracticeChain(id: string, practiceId: string) {
  const row = await prisma.practiceCaseChain.findFirst({ where: { id, practice_id: practiceId } });
  return row ? mapChain(row) : null;
}

function chainStepExists(definition: PracticeCaseChainDefinition, stepId: string) {
  return definition.steps.some((step) => step.id === stepId);
}

async function getReadyChain(id: string, practiceId: string) {
  const chain = await getPracticeChain(id, practiceId);
  return chain?.status === "READY" ? chain : null;
}

function isUniqueConstraintError(error: unknown) {
  return (error as { code?: unknown })?.code === "P2002";
}

function approvalConflict(message: string) {
  return Object.assign(new Error(message), { statusCode: 409 });
}

function isTerminalStep(definition: PracticeCaseChainDefinition, stepId: string) {
  const step = definition.steps.find((candidate) => candidate.id === stepId);
  if (!step) return false;
  const entries = new Map(definition.steps.map((item) => [item.id, item]));
  const transition = definition.transitions.find((candidate) => candidate.fromStepId === stepId);
  if (!transition) return true;
  const targets = transition.kind === "DIRECT"
    ? transition.targetStepId ? [transition.targetStepId] : []
    : (transition.question?.answers ?? []).flatMap((answer) => answer.targetStepId ? [answer.targetStepId] : []);
  return targets.length === 0 || targets.every((target) => !entries.has(target));
}

export async function listPracticeChainApprovals(practiceId: string, chainId: string) {
  const [entries, connections] = await Promise.all([
    prisma.practiceCaseChainEntryApproval.findMany({ where: { practice_id: practiceId, chain_id: chainId, revoked_at: null }, orderBy: { created_at: "asc" } }),
    prisma.practiceCaseChainConnectionApproval.findMany({ where: { practice_id: practiceId, source_chain_id: chainId, revoked_at: null }, orderBy: { created_at: "asc" } }),
  ]);
  return { entries, connections };
}

export async function approvePracticeChainEntry(input: { practiceId: string; chainId: string; stepId: string; actorAccountId: string }) {
  const chain = await getReadyChain(input.chainId, input.practiceId);
  if (!chain || !chainStepExists(chain.definition, input.stepId)) {
    throw Object.assign(new Error("READY-Kette oder Einstiegsschritt nicht gefunden."), { statusCode: 400 });
  }
  return prisma.$transaction(async (tx) => {
    const current = await tx.practiceCaseChainEntryApproval.findFirst({ where: { practice_id: input.practiceId, chain_id: input.chainId, step_id: input.stepId } });
    const approvalVersion = (current?.approval_version ?? 0) + 1;
    const approval = await tx.practiceCaseChainEntryApproval.upsert({
      where: { practice_id_chain_id_step_id: { practice_id: input.practiceId, chain_id: input.chainId, step_id: input.stepId } },
      create: { practice_id: input.practiceId, chain_id: input.chainId, step_id: input.stepId },
      update: { revoked_at: null, approval_version: { increment: 1 } },
    });
    await tx.practiceCaseChainApprovalEvent.create({ data: {
      practice_id: input.practiceId, actor_account_id: input.actorAccountId, approval_kind: "ENTRY", action: "APPROVE",
      chain_id: input.chainId, step_id: input.stepId, selection_version: approvalVersion,
    } });
    return approval;
  });
}

export async function revokePracticeChainEntry(input: { practiceId: string; chainId: string; stepId: string; expectedApprovalVersion?: number; actorAccountId: string }) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.practiceCaseChainEntryApproval.updateMany({
      where: { practice_id: input.practiceId, chain_id: input.chainId, step_id: input.stepId, revoked_at: null, ...(input.expectedApprovalVersion === undefined ? {} : { approval_version: input.expectedApprovalVersion }) },
      data: { revoked_at: new Date(), approval_version: { increment: 1 } },
    });
    if (result.count === 0) throw approvalConflict("Die Einstiegsfreigabe wurde inzwischen geändert oder widerrufen.");
    if (result.count > 0) {
      await tx.practiceCaseChainApprovalEvent.create({ data: {
        practice_id: input.practiceId, actor_account_id: input.actorAccountId, approval_kind: "ENTRY", action: "REVOKE",
        chain_id: input.chainId, step_id: input.stepId,
      } });
    }
    return result;
  });
}

export async function approvePracticeChainConnection(input: { practiceId: string; sourceChainId: string; sourceStepId: string; sourceExitId: string; targetChainId: string; targetStepId: string; expectedSelectionVersion?: number; actorAccountId: string }) {
  const [source, target] = await Promise.all([
    getReadyChain(input.sourceChainId, input.practiceId),
    getReadyChain(input.targetChainId, input.practiceId),
  ]);
  if (!source || !target || !chainStepExists(source.definition, input.sourceStepId) || !chainStepExists(target.definition, input.targetStepId)) {
    throw Object.assign(new Error("READY-Kette oder Verbindungsfall nicht gefunden."), { statusCode: 400 });
  }
  const sourceTransition = source.definition.transitions.find((candidate) => candidate.fromStepId === input.sourceStepId);
  if (typeof input.sourceExitId !== "string" || !input.sourceExitId.trim()) {
    throw Object.assign(new Error("Die konkrete End-ID fehlt."), { statusCode: 400 });
  }
  const sourceExitId = input.sourceExitId;
  const sourceExitIsTerminal = sourceTransition?.kind === "DIRECT"
    ? sourceTransition.id === sourceExitId && sourceTransition.targetStepId === null
    : sourceTransition?.kind === "QUESTION" && sourceTransition.question?.answers.some((answer) => answer.id === sourceExitId && answer.targetStepId === null);
  if (!sourceExitIsTerminal) {
    throw Object.assign(new Error("Ein Anschluss darf nur an einem ausdrücklichen Ende ausgewählt werden."), { statusCode: 400 });
  }
  const sourceCatalogEntryId = source.definition.steps.find((step) => step.id === input.sourceStepId)?.catalogEntryId;
  const targetCatalogEntryId = target.definition.steps.find((step) => step.id === input.targetStepId)?.catalogEntryId;
  if (!sourceCatalogEntryId || sourceCatalogEntryId !== targetCatalogEntryId) {
    throw Object.assign(new Error("Quell- und Zieleinstieg müssen auf denselben konkreten Praxisfall zeigen."), { statusCode: 400 });
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.practiceCaseChainConnectionApproval.findFirst({
        where: { practice_id: input.practiceId, source_chain_id: input.sourceChainId, source_exit_id: sourceExitId! },
      });
      const isRevoked = existing?.revoked_at != null;
      const expectedSelectionVersion = isRevoked ? input.expectedSelectionVersion ?? existing?.selection_version : input.expectedSelectionVersion;
      if (existing && !isRevoked && (typeof expectedSelectionVersion !== "number" || !Number.isInteger(expectedSelectionVersion) || expectedSelectionVersion < 1)) {
        throw approvalConflict("Für eine bestehende Anschlussauswahl ist die aktuelle Auswahlversion erforderlich.");
      }
      if (existing && existing.selection_version !== expectedSelectionVersion) {
        throw approvalConflict("Die Anschlussauswahl wurde inzwischen geändert. Bitte laden Sie die aktuelle Auswahl neu.");
      }
      const selectionVersion = (existing?.selection_version ?? 0) + 1;
      const approval = existing
        ? await (async () => {
          const result = await tx.practiceCaseChainConnectionApproval.updateMany({
            where: { id: existing.id, selection_version: expectedSelectionVersion, revoked_at: isRevoked ? { not: null } : null },
            data: { target_chain_id: input.targetChainId, target_step_id: input.targetStepId, revoked_at: null, selection_version: { increment: 1 } },
          });
          if (result.count === 0) throw approvalConflict("Die Anschlussauswahl wurde inzwischen geändert. Bitte laden Sie die aktuelle Auswahl neu.");
          return { ...existing, target_chain_id: input.targetChainId, target_step_id: input.targetStepId, selection_version: selectionVersion };
        })()
        : await tx.practiceCaseChainConnectionApproval.create({
          data: {
            practice_id: input.practiceId,
            source_chain_id: input.sourceChainId,
            source_step_id: input.sourceStepId,
            source_exit_id: sourceExitId!,
            target_chain_id: input.targetChainId,
            target_step_id: input.targetStepId,
          },
        });
      await tx.practiceCaseChainApprovalEvent.create({ data: {
        practice_id: input.practiceId, actor_account_id: input.actorAccountId, approval_kind: "CONNECTION", action: "SELECT",
        source_chain_id: input.sourceChainId, source_step_id: input.sourceStepId,
        source_exit_id: sourceExitId!,
        target_chain_id: input.targetChainId, target_step_id: input.targetStepId,
        selection_version: selectionVersion,
      } });
      return approval;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) throw approvalConflict("Der Anschluss wurde gleichzeitig ausgewählt. Bitte laden Sie die aktuelle Auswahl neu.");
    throw error;
  }
}

export async function revokePracticeChainConnection(input: { practiceId: string; sourceChainId: string; sourceStepId: string; sourceExitId: string; expectedSelectionVersion?: number; actorAccountId: string }) {
  return prisma.$transaction(async (tx) => {
    if (!input.sourceExitId.trim()) throw Object.assign(new Error("Die konkrete End-ID fehlt."), { statusCode: 400 });
    const current = await tx.practiceCaseChainConnectionApproval.findFirst({ where: { practice_id: input.practiceId, source_chain_id: input.sourceChainId, source_exit_id: input.sourceExitId, revoked_at: null } });
    if (!current) throw approvalConflict("Die Anschlussauswahl wurde inzwischen geändert oder widerrufen.");
    const result = await tx.practiceCaseChainConnectionApproval.updateMany({
      where: { id: current.id, revoked_at: null, ...(input.expectedSelectionVersion === undefined ? {} : { selection_version: input.expectedSelectionVersion }) },
      data: { revoked_at: new Date(), selection_version: { increment: 1 } },
    });
    if (result.count === 0) throw approvalConflict("Die Anschlussauswahl wurde inzwischen geändert oder widerrufen.");
    if (result.count > 0) {
      await tx.practiceCaseChainApprovalEvent.create({ data: {
        practice_id: input.practiceId, actor_account_id: input.actorAccountId, approval_kind: "CONNECTION", action: "REVOKE",
        source_chain_id: input.sourceChainId, source_step_id: input.sourceStepId,
        source_exit_id: current.source_exit_id,
        target_chain_id: current.target_chain_id, target_step_id: current.target_step_id,
        selection_version: (current.selection_version ?? 0) + 1,
      } });
    }
    return result;
  });
}

export async function getReadyPracticeChainRunner(id: string, practiceId: string, requestedStartStepId?: string, verifiedContinuation = false): Promise<RunnerChain | null> {
  const chain = await getPracticeChain(id, practiceId);
  if (!chain || chain.status !== "READY" || !chain.definition.startStepId) return null;
  const startStepId = requestedStartStepId ?? chain.definition.startStepId;
  if (!chainStepExists(chain.definition, startStepId)) return null;
  if (requestedStartStepId && requestedStartStepId !== chain.definition.startStepId && !verifiedContinuation) {
    const entryApproval = await prisma.practiceCaseChainEntryApproval.findFirst({ where: { practice_id: practiceId, chain_id: id, step_id: requestedStartStepId, revoked_at: null }, select: { id: true } });
    if (!entryApproval) return null;
  }
  const entries = await prisma.practiceCatalogEntry.findMany({
    where: {
      practice_id: practiceId,
      id: { in: chain.definition.steps.map((step) => step.catalogEntryId) },
    },
    select: { id: true, title: true, description: true, snapshot: true },
  });
  if (entries.some((entry) => !isPublishedPracticeWorkflowSnapshot(entry.snapshot))) return null;
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const steps = chain.definition.steps.map((step) => {
    const entry = entryById.get(step.catalogEntryId);
    const snapshot = entry?.snapshot as { checkpoints?: unknown[] } | null | undefined;
    const checkpoints = Array.isArray(snapshot?.checkpoints) ? snapshot.checkpoints : [];
    return {
      id: step.id,
      catalogEntryId: step.catalogEntryId,
      title: entry?.title ?? "Unbekannter Praxisfall",
      description: entry?.description ?? null,
      standards: checkpoints.flatMap((checkpoint) => {
        if (!checkpoint || typeof checkpoint !== "object") return [];
        const value = checkpoint as { checkpointTitle?: unknown; definition?: { implementation?: unknown } };
        return typeof value.checkpointTitle === "string"
          ? [{ title: value.checkpointTitle, implementation: typeof value.definition?.implementation === "string" ? value.definition.implementation : null }]
          : [];
      }),
    };
  });
  const approvedConnections = await prisma.practiceCaseChainConnectionApproval.findMany({ where: { practice_id: practiceId, source_chain_id: id, revoked_at: null } });
  const targetChains = await prisma.practiceCaseChain.findMany({ where: { practice_id: practiceId, id: { in: approvedConnections.map((connection) => connection.target_chain_id) }, status: "READY" } });
  const targetEntryIds = targetChains.flatMap((targetChain) => {
    const definition = parseChainDefinition(targetChain.definition);
    const connection = approvedConnections.find((item) => item.target_chain_id === targetChain.id);
    const step = definition?.steps.find((item) => item.id === connection?.target_step_id);
    return step ? [step.catalogEntryId] : [];
  });
  const targetEntries = targetEntryIds.length === 0 ? [] : await prisma.practiceCatalogEntry.findMany({ where: { practice_id: practiceId, id: { in: targetEntryIds } }, select: { id: true, title: true } });
  const targetTitleByEntryId = new Map(targetEntries.map((entry) => [entry.id, entry.title]));
  const connections = approvedConnections.flatMap((connection) => {
    const targetChain = targetChains.find((candidate) => candidate.id === connection.target_chain_id);
    const definition = targetChain ? parseChainDefinition(targetChain.definition) : null;
    const step = definition?.steps.find((candidate) => candidate.id === connection.target_step_id);
    if (!targetChain || !step) return [];
    return [{ sourceStepId: connection.source_step_id, sourceExitId: connection.source_exit_id, targetChainId: targetChain.id, targetStepId: step.id, targetName: targetChain.name, targetVersion: targetChain.version, targetTitle: targetTitleByEntryId.get(step.catalogEntryId) ?? "Unbekannter Praxisfall" }];
  });
  return {
    id: chain.id,
    name: chain.name,
    version: chain.version,
    startStepId,
    steps,
    transitions: chain.definition.transitions,
    connections,
  };
}

export async function getApprovedPracticeChainContinuation(input: {
  practiceId: string;
  sourceChainId: string;
  sourceStepId: string;
  sourceExitId: string;
  targetChainId: string;
  targetStepId: string;
}) {
  if (typeof input.sourceExitId !== "string" || !input.sourceExitId.trim()) return null;
  const approval = await prisma.practiceCaseChainConnectionApproval.findFirst({
    where: {
      practice_id: input.practiceId,
      source_chain_id: input.sourceChainId,
      source_step_id: input.sourceStepId,
      source_exit_id: input.sourceExitId,
      target_chain_id: input.targetChainId,
      target_step_id: input.targetStepId,
      revoked_at: null,
    },
  });
  if (!approval) return null;
  return getReadyPracticeChainRunner(input.targetChainId, input.practiceId, input.targetStepId, true);
}

export async function createPracticeChain(input: { practiceId: string; name: string }) {
  const row = await prisma.practiceCaseChain.create({
    data: {
      practice_id: input.practiceId,
      name: input.name.trim(),
      status: "DRAFT",
      version: 1,
      source_chain_id: null,
      definition: EMPTY_DEFINITION as unknown as Prisma.InputJsonValue,
    },
  });
  return mapChain(row);
}

export async function updatePracticeChain(input: {
  id: string;
  practiceId: string;
  name: string;
  status: ChainStatus;
  definition: PracticeCaseChainDefinition;
}) {
  const existing = await prisma.practiceCaseChain.findFirst({
    where: { id: input.id, practice_id: input.practiceId },
    select: { id: true },
  });
  if (!existing) throw Object.assign(new Error("Kette nicht gefunden oder kein Zugriff."), { statusCode: 404 });
  if (!input.name.trim()) throw Object.assign(new Error("Name der Kette fehlt."), { statusCode: 400 });

  const existingChain = await prisma.practiceCaseChain.findFirst({
    where: { id: input.id, practice_id: input.practiceId },
    select: { status: true },
  });
  if (existingChain?.status === "READY") {
    throw Object.assign(new Error("Eine einsatzbereite Kette ist unveränderlich. Erstellen Sie dafür eine neue Entwurfsversion."), { statusCode: 409 });
  }

  await assertCatalogEntriesBelongToPractice(input.definition, input.practiceId);
  if (input.status !== "DRAFT" && input.status !== "READY") {
    throw Object.assign(new Error("Unbekannter Kettenstatus."), { statusCode: 400 });
  }
  if (input.status === "READY") {
    const ids = new Set(input.definition.steps.map((step) => step.catalogEntryId));
    const issues = validateChainDefinition(input.definition, ids);
    if (issues.length > 0) {
      throw Object.assign(new Error("Die Kette kann erst nach Behebung aller offenen Stellen freigegeben werden."), {
        statusCode: 400,
        issues,
      });
    }
  }

  const row = await prisma.practiceCaseChain.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      status: input.status,
      definition: input.definition as unknown as Prisma.InputJsonValue,
    },
  });
  return mapChain(row);
}

export async function createPracticeChainRevision(id: string, practiceId: string) {
  const source = await prisma.practiceCaseChain.findFirst({
    where: { id, practice_id: practiceId },
  });
  if (!source) throw Object.assign(new Error("Kette nicht gefunden oder kein Zugriff."), { statusCode: 404 });
  if (source.status !== "READY") {
    throw Object.assign(new Error("Eine neue Version kann erst aus einer einsatzbereiten Kette erstellt werden."), { statusCode: 400 });
  }
  const row = await prisma.practiceCaseChain.create({
    data: {
      practice_id: practiceId,
      name: source.name,
      status: "DRAFT",
      version: source.version + 1,
      source_chain_id: source.id,
      definition: source.definition as Prisma.InputJsonValue,
    },
  });
  return mapChain(row);
}