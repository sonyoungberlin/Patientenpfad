"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getInternalBlockLabel } from "@/lib/questionnaire/internalBlockPresentation";
import type {
  InternalBlockPlacement,
  InternalBlockSection,
} from "@/lib/questionnaire/internalBlockLayout";

const SECTIONS: InternalBlockSection[] = [1, 2, 3];

function sectionId(section: InternalBlockSection) {
  return `internal-section-${section}`;
}

export function moveInternalBlockPlacement(
  placements: InternalBlockPlacement[],
  activeId: string,
  overId: string,
): InternalBlockPlacement[] {
  const active = placements.find((placement) => placement.blockId === activeId);
  if (!active) return placements;
  const over = placements.find((placement) => placement.blockId === overId);
  const targetSection = over?.section ?? SECTIONS.find(
    (section) => sectionId(section) === overId,
  );
  if (!targetSection) return placements;

  const bySection = new Map(SECTIONS.map((section) => [
    section,
    placements
      .filter((placement) => placement.section === section)
      .sort((left, right) => left.order - right.order)
      .map((placement) => placement.blockId),
  ]));
  const sourceIds = bySection.get(active.section)!;
  const targetIds = bySection.get(targetSection)!;

  if (active.section === targetSection && over) {
    bySection.set(
      targetSection,
      arrayMove(sourceIds, sourceIds.indexOf(activeId), sourceIds.indexOf(overId)),
    );
  } else {
    sourceIds.splice(sourceIds.indexOf(activeId), 1);
    const targetIndex = over ? targetIds.indexOf(overId) : targetIds.length;
    targetIds.splice(targetIndex, 0, activeId);
  }

  return SECTIONS.flatMap((section) =>
    bySection.get(section)!.map((blockId, order) => ({ blockId, section, order })),
  );
}

function SortableBlock({ blockId, label, disabled }: { blockId: string; label: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: blockId,
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      data-organized-block={blockId}
      style={{
        alignItems: "center",
        background: "var(--surface, #fff)",
        border: "1px solid var(--border, #cbd5e1)",
        display: "flex",
        gap: "0.5rem",
        opacity: isDragging ? 0.55 : 1,
        padding: "0.5rem",
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button
        type="button"
        aria-label={`${label} verschieben`}
        title="Verschieben"
        disabled={disabled}
        {...attributes}
        {...listeners}
        style={{ cursor: disabled ? "not-allowed" : "grab", padding: "0.25rem 0.4rem", touchAction: "none" }}
      >
        ↕
      </button>
      <span style={{ overflowWrap: "anywhere" }}>{label}</span>
    </div>
  );
}

function DropSection({
  section,
  placements,
  blockLabels,
  disabled,
}: {
  section: InternalBlockSection;
  placements: InternalBlockPlacement[];
  blockLabels?: Readonly<Record<string, string>>;
  disabled: boolean;
}) {
  const id = sectionId(section);
  const { isOver, setNodeRef } = useDroppable({ id, disabled });
  const blockIds = placements
    .filter((placement) => placement.section === section)
    .sort((left, right) => left.order - right.order)
    .map((placement) => placement.blockId);
  return (
    <section
      ref={setNodeRef}
      data-document-section={section}
      style={{
        background: isOver ? "var(--surface-muted, #f1f5f9)" : "transparent",
        border: "1px dashed var(--border, #94a3b8)",
        minHeight: "5rem",
        padding: "0.65rem",
      }}
    >
      <h3 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>Abschnitt {section}</h3>
      <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {blockIds.map((blockId) => (
            <SortableBlock key={blockId} blockId={blockId} label={blockLabels?.[blockId] ?? getInternalBlockLabel(blockId)} disabled={disabled} />
          ))}
          {blockIds.length === 0 ? (
            <span className="text-muted text-small">Leer</span>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

export default function InternalDocumentationBlockOrganizer({
  placements,
  blockLabels,
  onChange,
  disabled = false,
}: {
  placements: InternalBlockPlacement[];
  blockLabels?: Readonly<Record<string, string>>;
  onChange: (placements: InternalBlockPlacement[]) => void;
  disabled?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) return;
    onChange(moveInternalBlockPlacement(
      placements,
      String(event.active.id),
      String(event.over.id),
    ));
  }

  return (
    <section aria-labelledby="internal-block-organizer-title" style={{ display: "grid", gap: "0.6rem" }}>
      <h2 id="internal-block-organizer-title" style={{ fontSize: "1.05rem", margin: 0 }}>
        Ausgewählte Dokumentationsbausteine organisieren
      </h2>
      <p className="text-muted text-small" style={{ margin: 0 }}>
        Die Abschnitte erscheinen im Dokument von oben nach unten.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div data-document-sections style={{ display: "grid", gap: "0.65rem", gridTemplateColumns: "minmax(0, 1fr)" }}>
          {SECTIONS.map((section) => (
            <DropSection
              key={section}
              section={section}
              placements={placements}
              blockLabels={blockLabels}
              disabled={disabled}
            />
          ))}
        </div>
      </DndContext>
    </section>
  );
}