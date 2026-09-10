import type { FrozenBlock } from "./frozenBlocks";

export type InternalBlockSection = 1 | 2 | 3;

export type InternalBlockPlacement = {
  blockId: string;
  section: InternalBlockSection;
  order: number;
};

export function compactInternalBlockPlacements(
  placements: readonly InternalBlockPlacement[],
): InternalBlockPlacement[] {
  const sectionCounts = new Map<InternalBlockSection, number>();
  return [...placements]
    .sort((left, right) => left.section - right.section || left.order - right.order)
    .map((placement) => {
      const order = sectionCounts.get(placement.section) ?? 0;
      sectionCounts.set(placement.section, order + 1);
      return { ...placement, order };
    });
}

export function appendInternalBlockPlacements(
  placements: readonly InternalBlockPlacement[],
  blockIds: readonly string[],
): InternalBlockPlacement[] {
  const existingIds = new Set(placements.map((placement) => placement.blockId));
  const additions = blockIds.filter((blockId) => !existingIds.has(blockId));
  const nextOrder = placements
    .filter((placement) => placement.section === 1)
    .reduce((maximum, placement) => Math.max(maximum, placement.order + 1), 0);
  return compactInternalBlockPlacements(
    placements.concat(additions.map((blockId, index) => ({
      blockId,
      section: 1 as const,
      order: nextOrder + index,
    }))),
  );
}

export function reconcileInternalBlockPlacements(
  placements: readonly InternalBlockPlacement[],
  selectedBlockIds: ReadonlySet<string>,
  defaultBlockOrder: readonly string[],
  manuallyArranged: boolean,
): InternalBlockPlacement[] {
  const selectedInDefaultOrder = defaultBlockOrder.filter((blockId) =>
    selectedBlockIds.has(blockId),
  );
  if (!manuallyArranged) {
    return selectedInDefaultOrder.map((blockId, order) => ({
      blockId,
      section: 1,
      order,
    }));
  }

  const retained = compactInternalBlockPlacements(
    placements.filter((placement) => selectedBlockIds.has(placement.blockId)),
  );
  return appendInternalBlockPlacements(retained, selectedInDefaultOrder);
}

function isSection(value: unknown): value is InternalBlockSection {
  return value === 1 || value === 2 || value === 3;
}

function isOrder(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export function normalizeInternalBlockPlacements(
  selectedBlockIds: readonly string[],
  rawPlacements?: unknown,
): InternalBlockPlacement[] {
  if (rawPlacements === undefined || rawPlacements === null) {
    return selectedBlockIds.map((blockId, order) => ({ blockId, section: 1, order }));
  }
  if (!Array.isArray(rawPlacements)) {
    throw new Error("blockLayout muss eine Liste sein.");
  }

  const selectedIds = new Set(selectedBlockIds);
  const seenIds = new Set<string>();
  const seenPositions = new Set<string>();
  const placements: InternalBlockPlacement[] = [];

  for (const rawPlacement of rawPlacements) {
    if (!rawPlacement || typeof rawPlacement !== "object" || Array.isArray(rawPlacement)) {
      throw new Error("Ungültige Blockplatzierung.");
    }
    const { blockId, section, order } = rawPlacement as Record<string, unknown>;
    if (typeof blockId !== "string" || !selectedIds.has(blockId)) {
      throw new Error(`Blockplatzierung gehört nicht zur Auswahl: ${String(blockId)}`);
    }
    if (seenIds.has(blockId)) {
      throw new Error(`Blockplatzierung mehrfach vorhanden: ${blockId}`);
    }
    if (!isSection(section)) {
      throw new Error(`Ungültiger Dokumentabschnitt für Block: ${blockId}`);
    }
    if (!isOrder(order)) {
      throw new Error(`Ungültige Reihenfolge für Block: ${blockId}`);
    }
    const position = `${section}:${order}`;
    if (seenPositions.has(position)) {
      throw new Error(`Blockposition mehrfach vorhanden: ${position}`);
    }
    seenIds.add(blockId);
    seenPositions.add(position);
    placements.push({ blockId, section, order });
  }

  if (seenIds.size !== selectedIds.size) {
    throw new Error("blockLayout muss alle ausgewählten Blöcke enthalten.");
  }

  return compactInternalBlockPlacements(placements);
}

export function sortFrozenBlocksByLayout(blocks: readonly FrozenBlock[]): FrozenBlock[] {
  const selectedBlocks = blocks.filter((block) => block.initiallyVisible);
  const hasCompleteLayout = selectedBlocks.length > 0 && selectedBlocks.every(
    (block) => isSection(block.section) && isOrder(block.order),
  );

  if (!hasCompleteLayout) {
    return [...blocks].sort((left, right) => left.displayOrder - right.displayOrder);
  }

  return [...blocks].sort((left, right) => {
    const leftHasLayout = isSection(left.section) && isOrder(left.order);
    const rightHasLayout = isSection(right.section) && isOrder(right.order);
    if (leftHasLayout && rightHasLayout) {
      return left.section! - right.section! || left.order! - right.order!;
    }
    if (leftHasLayout) return -1;
    if (rightHasLayout) return 1;
    return left.displayOrder - right.displayOrder;
  });
}