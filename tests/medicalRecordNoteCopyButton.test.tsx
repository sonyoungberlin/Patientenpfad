/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import MedicalRecordNoteCopyButton from "@/components/questionnaire/MedicalRecordNoteCopyButton";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
});

it("zeigt im medizinischen Posteingang nur die Copy-Funktion", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <MedicalRecordNoteCopyButton
      sessionId="session-1"
      noteText="Krankenblatt-Text"
    />,
  ));

  const copyButton = container.querySelector<HTMLButtonElement>("[data-q-copy-note]")!;
  await act(async () => copyButton.click());

  expect(writeText).toHaveBeenCalledWith("Krankenblatt-Text");
  expect(container.querySelector("[data-q-download-xml]")).toBeNull();
  expect(container.querySelector("[data-q-download-xml-v2]")).toBeNull();

  await act(async () => root.unmount());
});