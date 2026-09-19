/**
 * @jest-environment jsdom
 */

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import InternalDocumentationBlockSelector from "@/components/InternalDocumentationBlockSelector";
import {
  INTERNAL_BLOCK_GROUPS,
  INTERNAL_BLOCK_UI_ORDER,
} from "@/lib/questionnaire/internalBlockPresentation";
import {
  reconcileInternalBlockPlacements,
  type InternalBlockPlacement,
} from "@/lib/questionnaire/internalBlockLayout";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("InternalDocumentationBlockSelector", () => {
  function Harness() {
    const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
    const [blockLayout, setBlockLayout] = useState<InternalBlockPlacement[]>([]);
    const [manuallyArranged, setManuallyArranged] = useState(false);
    return (
      <InternalDocumentationBlockSelector
        selectedBlockIds={selectedBlockIds}
        onToggleBlock={(blockId) => {
          const next = new Set(selectedBlockIds);
          if (next.has(blockId)) next.delete(blockId);
          else next.add(blockId);
          setSelectedBlockIds(next);
          setBlockLayout(reconcileInternalBlockPlacements(
            blockLayout,
            next,
            INTERNAL_BLOCK_UI_ORDER,
            manuallyArranged,
          ));
        }}
        onToggleGroup={(blockIds) => {
          const next = new Set(selectedBlockIds);
          const select = blockIds.some((blockId) => !next.has(blockId));
          for (const blockId of blockIds) {
            if (select) next.add(blockId);
            else next.delete(blockId);
          }
          setSelectedBlockIds(next);
          setBlockLayout(reconcileInternalBlockPlacements(
            blockLayout,
            next,
            INTERNAL_BLOCK_UI_ORDER,
            manuallyArranged,
          ));
        }}
        blockLayout={blockLayout}
        onBlockLayoutChange={(layout) => {
          setManuallyArranged(true);
          setBlockLayout(layout);
        }}
      />
    );
  }

  it("gruppiert EKG, Stellungnahme, Fachärzte, Einwilligung und Dokumente wie vorgesehen", async () => {
    expect(INTERNAL_BLOCK_GROUPS.find((group) => group.id === "health_check")?.blockIds)
      .toContain("EKG");
    expect(INTERNAL_BLOCK_GROUPS.find((group) => group.id === "medical_statement")).toEqual({
      id: "medical_statement",
      label: "Stellungnahme",
      blockIds: ["MEDICAL_STATEMENT"],
    });
    expect(INTERNAL_BLOCK_GROUPS.find((group) => group.id === "additional_documentation")).toEqual({
      id: "additional_documentation",
      label: "Weitere Dokumentation",
      blockIds: ["DOCUMENT_HANDLING"],
    });
    expect(INTERNAL_BLOCK_GROUPS.find((group) => group.id === "specialists")).toEqual({
      id: "specialists",
      label: "Fachärzte",
      blockIds: ["SPECIALISTS"],
    });
    expect(INTERNAL_BLOCK_GROUPS.find((group) => group.id === "consent")).toEqual({
      id: "consent",
      label: "Einwilligungserklärung",
      blockIds: ["INTERNAL_CONSENT"],
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<Harness />);
    });

    expect(container.textContent).toContain("0 von 18 Dokumentationsbausteinen ausgewählt");
    expect(container.textContent).toContain("Ausgewählte Dokumentationsbausteine organisieren");
    expect(container.textContent).toContain("Die Abschnitte erscheinen im Dokument von oben nach unten.");
    expect(container.querySelectorAll("[data-document-section]")).toHaveLength(3);
    expect(container.querySelectorAll("[data-document-section] .text-muted")).toHaveLength(3);
    expect([...container.querySelectorAll("[data-internal-block]")].map(
      (input) => input.getAttribute("data-internal-block"),
    )).toEqual(INTERNAL_BLOCK_UI_ORDER);
    const sectionContainer = container.querySelector<HTMLElement>("[data-document-sections]")!;
    expect(sectionContainer.style.gridTemplateColumns).toBe("minmax(0, 1fr)");
    expect([...sectionContainer.children].map(
      (section) => section.getAttribute("data-document-section"),
    )).toEqual(["1", "2", "3"]);
    const ekgCheckbox = container.querySelector<HTMLInputElement>(
      '[data-internal-block="EKG"]',
    )!;
    const statementCheckbox = container.querySelector<HTMLInputElement>(
      '[data-internal-block="MEDICAL_STATEMENT"]',
    )!;
    const documentCheckbox = container.querySelector<HTMLInputElement>(
      '[data-internal-block="DOCUMENT_HANDLING"]',
    )!;
    const specialistsCheckbox = container.querySelector<HTMLInputElement>(
      '[data-internal-block="SPECIALISTS"]',
    )!;
    const consentCheckbox = container.querySelector<HTMLInputElement>(
      '[data-internal-block="INTERNAL_CONSENT"]',
    )!;
    expect(ekgCheckbox).not.toBeNull();
    expect(statementCheckbox).not.toBeNull();
    expect(documentCheckbox).not.toBeNull();
    expect(specialistsCheckbox).not.toBeNull();
    expect(consentCheckbox).not.toBeNull();

    await act(async () => ekgCheckbox.click());
    await act(async () => statementCheckbox.click());
    await act(async () => specialistsCheckbox.click());
    await act(async () => consentCheckbox.click());
    expect(ekgCheckbox.checked).toBe(true);
    expect(statementCheckbox.checked).toBe(true);
    expect(documentCheckbox.checked).toBe(false);
    expect(specialistsCheckbox.checked).toBe(true);
    expect(consentCheckbox.checked).toBe(true);
    expect(container.querySelector('[data-organized-block="EKG"]')).not.toBeNull();

    await act(async () => statementCheckbox.click());
    expect(container.querySelector('[data-organized-block="MEDICAL_STATEMENT"]')).toBeNull();
    await act(async () => statementCheckbox.click());

    const healthSection = [...container.querySelectorAll("section")]
      .find((section) => section.textContent?.includes("Gesundheitsuntersuchung"))!;
    const healthGroupCheckbox = healthSection.querySelector<HTMLInputElement>(
      'input[aria-label="Alle Abschnitte dieser Gruppe auswählen"]',
    )!;
    expect(healthGroupCheckbox.indeterminate).toBe(true);
    await act(async () => healthGroupCheckbox.click());
    expect(healthGroupCheckbox.checked).toBe(true);
    expect(ekgCheckbox.checked).toBe(true);
    expect(INTERNAL_BLOCK_GROUPS.find((group) => group.id === "health_check")?.blockIds.every(
      (blockId) => container.querySelector<HTMLInputElement>(`[data-internal-block="${blockId}"]`)?.checked,
    )).toBe(true);
    expect(statementCheckbox.checked).toBe(true);
    expect(documentCheckbox.checked).toBe(false);
    expect(specialistsCheckbox.checked).toBe(true);
    expect(consentCheckbox.checked).toBe(true);
    expect([...container.querySelectorAll('[data-document-section="1"] [data-organized-block]')].map(
      (block) => block.getAttribute("data-organized-block"),
    )).toEqual(INTERNAL_BLOCK_UI_ORDER.filter((blockId) =>
      container.querySelector<HTMLInputElement>(`[data-internal-block="${blockId}"]`)?.checked,
    ));

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt neue Auswahlen bis zur manuellen Sortierung in sichtbarer UI-Reihenfolge", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(<Harness />));

    await act(async () => container.querySelector<HTMLInputElement>(
      '[data-internal-block="CARE_PLAN_HA"]',
    )!.click());
    await act(async () => container.querySelector<HTMLInputElement>(
      '[data-internal-block="HEALTH_CHECK_MEASUREMENTS"]',
    )!.click());

    expect([...container.querySelectorAll('[data-document-section="1"] [data-organized-block]')].map(
      (block) => block.getAttribute("data-organized-block"),
    )).toEqual(["HEALTH_CHECK_MEASUREMENTS", "CARE_PLAN_HA"]);

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });
});