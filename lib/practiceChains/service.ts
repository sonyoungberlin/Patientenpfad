import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { validateChainDefinition, parseChainDefinition } from "./validate";
import type {
  ChainStatus,
  PracticeCaseChainDefinition,
  PracticeCaseChainRecord,
} from "./types";
import type { RunnerChain } from "./runner";

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
        select: { id: true },
      });
  const knownIds = new Set(entries.map((entry) => entry.id));
  const hasForeignEntry = definition.steps.some((step) => !step.catalogEntryId || !knownIds.has(step.catalogEntryId));
  if (hasForeignEntry) {
    throw Object.assign(new Error("Mindestens ein Praxisfall gehört nicht zur eigenen Praxis oder existiert nicht."), {
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

export async function getPracticeChain(id: string, practiceId: string) {
  const row = await prisma.practiceCaseChain.findFirst({ where: { id, practice_id: practiceId } });
  return row ? mapChain(row) : null;
}

export async function getReadyPracticeChainRunner(id: string, practiceId: string): Promise<RunnerChain | null> {
  const chain = await getPracticeChain(id, practiceId);
  if (!chain || chain.status !== "READY" || !chain.definition.startStepId) return null;
  const entries = await prisma.practiceCatalogEntry.findMany({
    where: {
      practice_id: practiceId,
      id: { in: chain.definition.steps.map((step) => step.catalogEntryId) },
    },
    select: { id: true, title: true, description: true, snapshot: true },
  });
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const steps = chain.definition.steps.map((step) => {
    const entry = entryById.get(step.catalogEntryId);
    const snapshot = entry?.snapshot as { checkpoints?: unknown[] } | null | undefined;
    const checkpoints = Array.isArray(snapshot?.checkpoints) ? snapshot.checkpoints : [];
    return {
      id: step.id,
      title: entry?.title ?? "Unbekannter Praxisfall",
      description: entry?.description ?? null,
      standards: checkpoints.flatMap((checkpoint) => {
        if (!checkpoint || typeof checkpoint !== "object") return [];
        const value = checkpoint as { checkpointTitle?: unknown; umsetzung?: unknown };
        return typeof value.checkpointTitle === "string"
          ? [{ title: value.checkpointTitle, implementation: typeof value.umsetzung === "string" ? value.umsetzung : null }]
          : [];
      }),
    };
  });
  return {
    id: chain.id,
    name: chain.name,
    version: chain.version,
    startStepId: chain.definition.startStepId,
    steps,
    transitions: chain.definition.transitions,
  };
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