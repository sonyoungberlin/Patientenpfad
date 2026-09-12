/**
 * @jest-environment jsdom
 */

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import InternalDocumentTitleField from "@/components/InternalDocumentTitleField";
import type { InternalDocumentTitleOption } from "@/lib/questionnaire/internalDocumentTitle";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("InternalDocumentTitleField", () => {
  it("startet ohne Vorauswahl und zeigt alle festen Optionen", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <InternalDocumentTitleField
          option=""
          customTitle=""
          onOptionChange={() => undefined}
          onCustomTitleChange={() => undefined}
        />,
      );
    });

    const select = container.querySelector("select")!;
    expect(select.value).toBe("");
    expect([...select.options].map((option) => option.text)).toEqual([
      "Bitte auswählen",
      "Arztbrief",
      "Stellungnahme",
      "Bescheinigung",
      "Attest",
      "Bericht",
      "Rückmeldung",
      "Patienteninformation",
      "Andere",
    ]);
    expect(container.querySelector('input[type="text"]')).toBeNull();
    await act(async () => root.unmount());
  });

  it("zeigt genau ein Pflichtfreitextfeld nur bei Andere", async () => {
    function Harness() {
      const [option, setOption] = useState<InternalDocumentTitleOption | "">("");
      const [customTitle, setCustomTitle] = useState("");
      return <InternalDocumentTitleField option={option} customTitle={customTitle} onOptionChange={setOption} onCustomTitleChange={setCustomTitle} />;
    }
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<Harness />));
    const select = container.querySelector("select")!;

    await act(async () => {
      select.value = "andere";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');
    expect(inputs).toHaveLength(1);
    expect(inputs[0].required).toBe(true);
    expect(inputs[0].maxLength).toBe(120);

    await act(async () => {
      select.value = "bericht";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.querySelector('input[type="text"]')).toBeNull();
    await act(async () => root.unmount());
  });
});