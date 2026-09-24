/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import DocumentationTemplatesClient from "@/app/practice/documentation-templates/DocumentationTemplatesClient";
import DocumentationLibraryClient from "@/app/practice/documentation-library/DocumentationLibraryClient";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";
import {
  buildPracticeDocumentationBlockDefinition,
  resolvePracticeDocumentationBlocks,
  type PracticeDocumentationBlockDefinition,
} from "@/lib/practice/documentationBlocks";

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

  it("erklärt die fünf fachlichen Bausteintypen sichtbar und ohne Backend-Sprache", async () => {
    const container = createContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(<DocumentationLibraryClient initialBlocks={[]} />);
    });

    const typeSelect = container.querySelector<HTMLSelectElement>("select");
    const help = container.querySelector<HTMLElement>("[data-documentation-block-type-help]");
    expect(typeSelect).not.toBeNull();
    expect(help?.textContent).toContain("Nur Ihre Eingabe erscheint im Dokument, ohne Überschrift.");

    const expectedHelp = [
      ["paragraph", "Wird ohne Eingabefeld als normaler Text ausgegeben."],
      ["hint", "Ihre Eingabe erscheint mit ‚Hinweis:‘ hervorgehoben."],
      ["repeatable", "Für wiederholende Angaben wie Fachrichtung, Praxis und Adresse; kompakt und eingerückt."],
      ["list", "Fester Einleitungssatz mit ausgewählten Punkten darunter."],
    ] as const;
    for (const [value, text] of expectedHelp) {
      await act(async () => {
        typeSelect!.value = value;
        typeSelect!.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(help?.textContent).toContain(text);
    }

    expect(container.textContent).not.toContain("SemanticDocument");
    expect(container.textContent).not.toContain("documentationItemType");
    await act(async () => root.unmount());
  });

  it("gruppiert Bausteine nach Vorlagen und zeigt Mehrfachverwendung", async () => {
    const fixedText = buildPracticeDocumentationBlockDefinition({
      title: "Datenschutz- und Sorgfaltshinweis Attest",
      blockType: "paragraph",
      text: "Bitte behandeln Sie diese Bescheinigung sorgfältig.",
    });
    const realHint = buildPracticeDocumentationBlockDefinition({
      title: "Individueller Hinweis",
      blockType: "hint",
      text: "Zusätzliche Information",
    });
    const consent = buildPracticeDocumentationBlockDefinition({
      title: "Einwilligung Befundanforderung – Einleitung",
      blockType: "paragraph",
      text: "Ich willige in die Anforderung ein.",
    });
    const container = createContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <DocumentationLibraryClient
          initialBlocks={[
            { id: "fixed", title: fixedText.block.label, definition: fixedText, isActive: true, usedInTemplates: [{ id: "template-1", name: "Rückfrage an Facharzt" }, { id: "template-2", name: "Einwilligung zur Anforderung von Facharztunterlagen" }] },
            { id: "hint", title: realHint.block.label, definition: realHint, isActive: true, usedInTemplates: [{ id: "template-1", name: "Rückfrage an Facharzt" }] },
            { id: "consent", title: consent.block.label, definition: consent, isActive: true, usedInTemplates: [] },
          ]}
          initialTemplates={[
            { id: "template-1", name: "Rückfrage an Facharzt", placements: [{ blockId: "fixed", section: 1, order: 0 }, { blockId: "hint", section: 2, order: 0 }] },
            { id: "template-2", name: "Einwilligung zur Anforderung von Facharztunterlagen", placements: [{ blockId: "fixed", section: 1, order: 0 }] },
          ]}
        />,
      );
    });

    expect(container.querySelectorAll("details").length).toBeGreaterThanOrEqual(6);
    expect(container.textContent).toContain("Rückfrage an Facharzt");
    expect(container.textContent).toContain("Einwilligung zur Anforderung von Facharztunterlagen");
    expect(container.textContent).toContain("Weitere Bausteine");
    expect(Array.from(container.querySelectorAll("strong")).filter((node) => node.textContent === "Datenschutz- und Sorgfaltshinweis Attest")).toHaveLength(2);
    expect(container.textContent).toContain("Einwilligung Befundanforderung – Einleitung");
    expect(container.textContent).not.toContain("Facharztkommunikation");
    expect(container.textContent).toContain("Festtext");
    expect(container.textContent).toContain("Hinweis");
    expect(container.textContent).toContain("Eingabe erforderlich: nein");
    expect(container.textContent).toContain("Verwendet in 1 Vorlage");
    expect(container.textContent).toContain("Verwendet in 2 Vorlagen");
    expect(container.textContent).toContain("Wird ohne Eingabe als normaler Text ausgegeben.");
    expect(container.textContent).toContain("Ihre Eingabe erscheint hervorgehoben als ‚Hinweis: …‘.");
    expect(container.textContent).toContain("Noch nicht verwendet");

    const usedBlockRow = Array.from(container.querySelectorAll("details"))
      .find((details) => details.querySelector("summary")?.textContent?.includes("Datenschutz- und Sorgfaltshinweis Attest"));
    await act(async () => {
      usedBlockRow?.querySelector<HTMLButtonElement>("button")?.click();
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Änderungen betreffen: Rückfrage an Facharzt, Einwilligung zur Anforderung von Facharztunterlagen.");
    await act(async () => root.unmount());
  });

  it("zeigt Festtext im Formular ohne Eingabefeld", async () => {
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Ambulante Behandlung",
      blockType: "paragraph",
      text: "Die weitere Behandlung erfolgt ambulant hausärztlich.",
    });
    const frozenBlocks = resolvePracticeDocumentationBlocks([{ definition }]);
    const container = createContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <QuestionnaireFormClient
          token="festtext-test"
          questions={definition.questions}
          frozenBlocks={frozenBlocks}
          source="practice_direct"
          context="office"
          internalWorkflowId={null}
        />,
      );
    });

    expect(container.textContent).toContain("Die weitere Behandlung erfolgt ambulant hausärztlich.");
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
    await act(async () => root.unmount());
  });
});
