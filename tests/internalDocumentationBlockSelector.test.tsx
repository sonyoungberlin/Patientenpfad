/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import InternalDocumentationBlockSelector from "@/components/InternalDocumentationBlockSelector";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("InternalDocumentationBlockSelector", () => {
  it("bietet Dokumente / Befunde in einer neutralen Gruppe eigenständig an", async () => {
    const onToggleBlock = jest.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <InternalDocumentationBlockSelector
          selectedBlockIds={new Set()}
          onToggleBlock={onToggleBlock}
          onToggleGroup={jest.fn()}
        />,
      );
    });

    expect(container.textContent).toContain("Weitere Dokumentation");
    expect(container.textContent).toContain("Dokumente / Befunde");
    expect(container.textContent).toContain("EKG");
    expect(container.textContent).toContain("0 von 14 Abschnitten ausgewählt");
    const checkbox = container.querySelector<HTMLInputElement>(
      '[data-internal-block="DOCUMENT_HANDLING"]',
    );
    expect(checkbox).not.toBeNull();
    await act(async () => checkbox!.click());
    expect(onToggleBlock).toHaveBeenCalledWith("DOCUMENT_HANDLING");
    const ekgCheckbox = container.querySelector<HTMLInputElement>(
      '[data-internal-block="EKG"]',
    );
    expect(ekgCheckbox).not.toBeNull();
    await act(async () => ekgCheckbox!.click());
    expect(onToggleBlock).toHaveBeenCalledWith("EKG");

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });
});