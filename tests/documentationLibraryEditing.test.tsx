/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import DocumentationTemplatesClient from "@/app/practice/documentation-templates/DocumentationTemplatesClient";
import DocumentationLibraryClient from "@/app/practice/documentation-library/DocumentationLibraryClient";
import type { PracticeDocumentationBlockDefinition } from "@/lib/practice/documentationBlocks";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/components/InternalDocumentationBlockOrganizer", () => () => null);

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

function createContainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return container;
}

async function clickEdit(container: HTMLElement, label: string) {
  await act(async () => {
    const button = Array.from(container.querySelectorAll("button"))
      .find((candidate) => candidate.textContent === label) as HTMLButtonElement;
    button.click();
    await Promise.resolve();
  });
}

describe("Dokumentationsbibliothek Inline-Bearbeitung", () => {
  let scrollIntoView: jest.Mock;

  beforeEach(() => {
    scrollIntoView = jest.fn();
    Object.defineProperty(globalThis, "structuredClone", {
      configurable: true,
      value: <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("öffnet Vorlagen inline, scrollt zum Editor und fokussiert den Namen", async () => {
    const container = createContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <DocumentationTemplatesClient
          initialTemplates={[{
            id: "template-1",
            name: "Aufnahme",
            isActive: true,
            blockLayout: [{ blockId: "block-1", section: 1, order: 0 }],
            outputFormat: "formell",
            documentTitleOption: "bericht",
            patientSignatureRequired: true,
          }]}
          availableBlocks={[{ id: "block-1", title: "Kontakt" }]}
        />,
      );
    });

    await clickEdit(container, "Bearbeiten");

    expect(Array.from(container.querySelectorAll("h2")).some((heading) => heading.textContent === "Vorlage bearbeiten")).toBe(true);
    expect(container.querySelector<HTMLInputElement>("input")?.value).toBe("Aufnahme");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(document.activeElement).toBe(container.querySelector("input"));

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Abbrechen")?.click();
    });
    expect(Array.from(container.querySelectorAll("h2")).some((heading) => heading.textContent === "Vorlage anlegen")).toBe(true);

    await act(async () => root.unmount());
  });

  it("öffnet Bausteine inline, scrollt zum Editor und fokussiert den Titel", async () => {
    const container = createContainer();
    const root = createRoot(container);
    const definition = {
      schemaVersion: 1,
      visibleType: "text",
      block: {
        id: "block-1",
        label: "Kontakt",
        displayOrder: 0,
        questionIds: ["question-1"],
      },
      questions: [{
        id: "question-1",
        text: "Telefonnummer",
        type: "text",
        required: true,
      }],
    } as unknown as PracticeDocumentationBlockDefinition;

    await act(async () => {
      root.render(
        <DocumentationLibraryClient
          initialBlocks={[{
            id: "block-1",
            title: "Kontakt",
            definition,
            isActive: true,
          }]}
        />,
      );
    });

    await clickEdit(container, "Bearbeiten");

    expect(Array.from(container.querySelectorAll("h2")).some((heading) => heading.textContent === "Baustein bearbeiten")).toBe(true);
    expect(container.querySelector<HTMLInputElement>("input")?.value).toBe("Kontakt");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(document.activeElement).toBe(container.querySelector("input"));

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Abbrechen")?.click();
    });
    expect(Array.from(container.querySelectorAll("h2")).some((heading) => heading.textContent === "Baustein anlegen")).toBe(true);

    await act(async () => root.unmount());
  });
});
