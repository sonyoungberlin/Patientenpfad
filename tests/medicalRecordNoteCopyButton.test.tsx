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

it("deaktiviert das Kopieren eines leeren Texts", async () => {
  const writeText = jest.fn();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <MedicalRecordNoteCopyButton sessionId="session-empty" noteText={"  \n"} />,
  ));

  const button = container.querySelector<HTMLButtonElement>("[data-q-copy-note]")!;
  expect(button.disabled).toBe(true);
  await act(async () => button.click());
  expect(writeText).not.toHaveBeenCalled();
  expect(button.textContent).not.toContain("Kopiert");

  await act(async () => root.unmount());
});

it("meldet einen fehlgeschlagenen Clipboard- und execCommand-Aufruf nicht als Erfolg", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: jest.fn().mockRejectedValue(new Error("denied")) },
  });
  const execCommand = jest.fn().mockReturnValue(false);
  Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <MedicalRecordNoteCopyButton sessionId="session-failed" noteText="Text" />,
  ));

  await act(async () => container.querySelector<HTMLButtonElement>("[data-q-copy-note]")!.click());

  expect(execCommand).toHaveBeenCalledWith("copy");
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Kopieren fehlgeschlagen");
  expect(container.querySelector("[data-q-copy-note]")?.textContent).not.toContain("Kopiert");

  await act(async () => root.unmount());
});