/**
 * @jest-environment jsdom
 */

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import InternalDocumentationBlockSelector from "@/components/InternalDocumentationBlockSelector";
import { INTERNAL_BLOCK_GROUPS } from "@/lib/questionnaire/internalBlockPresentation";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("InternalDocumentationBlockSelector", () => {
  function Harness() {
    const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
    return (
      <InternalDocumentationBlockSelector
        selectedBlockIds={selectedBlockIds}
        onToggleBlock={(blockId) => {
          setSelectedBlockIds((current) => {
            const next = new Set(current);
            if (next.has(blockId)) next.delete(blockId);
            else next.add(blockId);
            return next;
          });
        }}
        onToggleGroup={(blockIds) => {
          setSelectedBlockIds((current) => {
            const next = new Set(current);
            const select = blockIds.some((blockId) => !next.has(blockId));
            for (const blockId of blockIds) {
              if (select) next.add(blockId);
              else next.delete(blockId);
            }
            return next;
          });
        }}
      />
    );
  }

  it("gruppiert EKG, Stellungnahme und Dokumente / Befunde wie vorgesehen", async () => {
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

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<Harness />);
    });

    expect(container.textContent).toContain("0 von 15 Abschnitten ausgewählt");
    const ekgCheckbox = container.querySelector<HTMLInputElement>(
      '[data-internal-block="EKG"]',
    )!;
    const statementCheckbox = container.querySelector<HTMLInputElement>(
      '[data-internal-block="MEDICAL_STATEMENT"]',
    )!;
    const documentCheckbox = container.querySelector<HTMLInputElement>(
      '[data-internal-block="DOCUMENT_HANDLING"]',
    )!;
    expect(ekgCheckbox).not.toBeNull();
    expect(statementCheckbox).not.toBeNull();
    expect(documentCheckbox).not.toBeNull();

    await act(async () => ekgCheckbox.click());
    await act(async () => statementCheckbox.click());
    expect(ekgCheckbox.checked).toBe(true);
    expect(statementCheckbox.checked).toBe(true);
    expect(documentCheckbox.checked).toBe(false);

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

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });
});