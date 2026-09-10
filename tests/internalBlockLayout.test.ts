import { moveInternalBlockPlacement } from "@/components/InternalDocumentationBlockOrganizer";
import {
  normalizeInternalBlockPlacements,
  reconcileInternalBlockPlacements,
  sortFrozenBlocksByLayout,
  type InternalBlockPlacement,
} from "@/lib/questionnaire/internalBlockLayout";
import type { FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import { INTERNAL_BLOCK_UI_ORDER } from "@/lib/questionnaire/internalBlockPresentation";

const placements: InternalBlockPlacement[] = [
  { blockId: "A", section: 1, order: 0 },
  { blockId: "B", section: 1, order: 1 },
  { blockId: "C", section: 2, order: 0 },
];

function frozen(id: string, displayOrder: number, placement?: Partial<InternalBlockPlacement>): FrozenBlock {
  return {
    id,
    label: id,
    displayOrder,
    questions: [],
    conditionalRules: [],
    initiallyVisible: true,
    ...(placement?.section ? { section: placement.section } : {}),
    ...(placement?.order !== undefined ? { order: placement.order } : {}),
  };
}

describe("internal block layout", () => {
  it("sortiert innerhalb eines Abschnitts", () => {
    expect(moveInternalBlockPlacement(placements, "B", "A")).toEqual([
      { blockId: "B", section: 1, order: 0 },
      { blockId: "A", section: 1, order: 1 },
      { blockId: "C", section: 2, order: 0 },
    ]);
  });

  it("verschiebt zwischen Abschnitten und in einen leeren Abschnitt", () => {
    expect(moveInternalBlockPlacement(placements, "A", "C")).toEqual([
      { blockId: "B", section: 1, order: 0 },
      { blockId: "A", section: 2, order: 0 },
      { blockId: "C", section: 2, order: 1 },
    ]);
    expect(moveInternalBlockPlacement(placements, "B", "internal-section-3")).toEqual([
      { blockId: "A", section: 1, order: 0 },
      { blockId: "C", section: 2, order: 0 },
      { blockId: "B", section: 3, order: 0 },
    ]);
  });

  it("setzt ohne Layout Abschnitt 1 in bestehender Reihenfolge", () => {
    expect(normalizeInternalBlockPlacements(["B", "A"])).toEqual([
      { blockId: "B", section: 1, order: 0 },
      { blockId: "A", section: 1, order: 1 },
    ]);
  });

  it("ordnet ein unberührtes Layout exakt wie die sichtbare Auswahl", () => {
    const selected = new Set(["CARE_PLAN_HA", "HEALTH_CHECK_MEASUREMENTS", "EKG"]);

    expect(reconcileInternalBlockPlacements([], selected, INTERNAL_BLOCK_UI_ORDER, false))
      .toEqual([
        { blockId: "HEALTH_CHECK_MEASUREMENTS", section: 1, order: 0 },
        { blockId: "EKG", section: 1, order: 1 },
        { blockId: "CARE_PLAN_HA", section: 1, order: 2 },
      ]);
  });

  it("erhält eine manuelle Sortierung beim Ergänzen weiterer Blöcke", () => {
    const manuallySorted: InternalBlockPlacement[] = [
      { blockId: "CARE_PLAN_HA", section: 1, order: 0 },
      { blockId: "EKG", section: 2, order: 0 },
    ];

    expect(reconcileInternalBlockPlacements(
      manuallySorted,
      new Set(["CARE_PLAN_HA", "EKG", "VACCINATION_REVIEW"]),
      INTERNAL_BLOCK_UI_ORDER,
      true,
    )).toEqual([
      { blockId: "CARE_PLAN_HA", section: 1, order: 0 },
      { blockId: "VACCINATION_REVIEW", section: 1, order: 1 },
      { blockId: "EKG", section: 2, order: 0 },
    ]);
  });

  it("fällt bei Legacy-Snapshots auf displayOrder zurück", () => {
    expect(sortFrozenBlocksByLayout([frozen("A", 20), frozen("B", 10)]).map((block) => block.id))
      .toEqual(["B", "A"]);
  });

  it("sortiert vollständige Layoutmetadaten nach Abschnitt und order", () => {
    expect(sortFrozenBlocksByLayout([
      frozen("A", 10, { section: 2, order: 0 }),
      frozen("B", 20, { section: 1, order: 0 }),
    ]).map((block) => block.id)).toEqual(["B", "A"]);
  });
});