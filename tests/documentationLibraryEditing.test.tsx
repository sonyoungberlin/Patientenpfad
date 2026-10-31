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
  parsePracticeDocumentationBlockDefinition,
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
  let originalConfirm: typeof window.confirm;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalConfirm = window.confirm;
    originalFetch = global.fetch;
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
    window.confirm = originalConfirm;
    global.fetch = originalFetch;
    document.body.replaceChildren();
  });

  it("löscht deaktivierte Vorlagen erst nach Bestätigung", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }) as jest.Mock;
    const container = createContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <DocumentationTemplatesClient
          initialTemplates={[{
            id: "template-1",
            name: "Archivierte Vorlage",
            isActive: false,
            blockLayout: [{ blockId: "block-1", section: 1, order: 0 }],
          }]}
          availableBlocks={[{ id: "block-1", title: "Kontakt" }]}
        />,
      );
    });

    await clickEdit(container, "Löschen");

    expect(window.confirm).toHaveBeenCalledWith("Vorlage „Archivierte Vorlage“ wirklich dauerhaft löschen?");
    expect(global.fetch).toHaveBeenCalledWith("/api/practice/documentation-templates/template-1", { method: "DELETE" });
    await act(async () => root.unmount());
  });

  it("zeigt Löschen bei aktiven Vorlagen erst nach dem Deaktivieren", async () => {
    const container = createContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <DocumentationTemplatesClient
          initialTemplates={[{
            id: "template-1",
            name: "Aktive Vorlage",
            isActive: true,
            blockLayout: [{ blockId: "block-1", section: 1, order: 0 }],
          }]}
          availableBlocks={[{ id: "block-1", title: "Kontakt" }]}
        />,
      );
    });
    expect(Array.from(container.querySelectorAll("button")).some((button) => button.textContent === "Löschen")).toBe(false);
    expect(container.textContent).toContain("Deaktivieren");
    await act(async () => root.unmount());
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

  it("lädt, bearbeitet und speichert Ausgabearten samt Hinweis auf fehlende Bausteinformulierungen", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = fetchMock as jest.Mock;
    const container = createContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(<DocumentationTemplatesClient
        initialTemplates={[{
          id: "template-1",
          name: "Kontrolltermin",
          isActive: true,
          blockLayout: [{ blockId: "block-1", section: 1, order: 0 }],
          outputVariantIds: ["patientenbrief", "krankenblatt"],
        }]}
        availableBlocks={[{
          id: "block-1",
          title: "Kontrolltermin",
          outputVariantIds: ["patientenbrief"],
        }]}
      />);
    });

    await clickEdit(container, "Bearbeiten");
    const outputCheckbox = (labelText: string) => Array.from(container.querySelectorAll<HTMLLabelElement>("label"))
      .find((label) => label.textContent?.includes(labelText))?.querySelector<HTMLInputElement>("input[type=checkbox]");
    expect(outputCheckbox("Patientenbrief")?.checked).toBe(true);
    expect(outputCheckbox("Krankenblatt")?.checked).toBe(true);
    expect(container.textContent).toContain("Krankenblatt: Kontrolltermin");
    expect(container.textContent).toContain("Fehlende Formulierungen werden nicht durch Ersatztexte ergänzt.");

    await act(async () => outputCheckbox("Facharztbrief")?.click());
    await act(async () => {
      Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Speichern")?.click();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/practice/documentation-templates/template-1", expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"outputVariantIds":["patientenbrief","krankenblatt","facharztbrief"]'),
    }));
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

    expect(container.textContent).toContain("Übersicht als PDF");
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

  it("speichert Ausgabevarianten im Bausteineditor und lädt sie beim erneuten Öffnen", async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = fetchMock as jest.Mock;
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Vorstellungszweck",
      blockType: "selection",
      options: [{ value: "followup", label: "Verlaufskontrolle", documentationText: "Standardausgabe" }],
    });
    const container = createContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(<DocumentationLibraryClient initialBlocks={[{
        id: definition.block.id,
        title: definition.block.label,
        definition,
        isActive: true,
      }]} />);
    });

    await clickEdit(container, "Bearbeiten");
    const variantCheckbox = Array.from(container.querySelectorAll<HTMLLabelElement>("label"))
      .find((label) => label.textContent?.includes("Facharztbrief"))?.querySelector<HTMLInputElement>("input");
    expect(variantCheckbox).not.toBeNull();
    await act(async () => variantCheckbox!.click());

    const findTextarea = (text: string) => Array.from(container.querySelectorAll<HTMLLabelElement>("label"))
      .find((label) => label.textContent?.includes(text))?.querySelector<HTMLTextAreaElement>("textarea");
    const blockOutput = findTextarea("Ausgabetext des Bausteins");
    const optionOutput = findTextarea("Ausgabe für Option: Verlaufskontrolle");
    expect(blockOutput).not.toBeNull();
    expect(optionOutput).not.toBeNull();
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setValue?.call(blockOutput, "Allgemeiner Facharzttext");
      blockOutput!.dispatchEvent(new Event("input", { bubbles: true }));
      setValue?.call(optionOutput, "Fachtext für Verlaufskontrolle");
      optionOutput!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Speichern")?.click();
      await Promise.resolve();
    });

    const savedInput = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(savedInput.outputVariants.facharztbrief).toMatchObject({
      documentationText: "Allgemeiner Facharzttext",
      optionTexts: { __primary: { followup: { documentationText: "Fachtext für Verlaufskontrolle" } } },
    });
    const reopenedDefinition = parsePracticeDocumentationBlockDefinition({
      ...definition,
      outputVariants: savedInput.outputVariants,
    });
    await act(async () => {
      root.render(<DocumentationLibraryClient initialBlocks={[{
        id: reopenedDefinition.block.id,
        title: reopenedDefinition.block.label,
        definition: reopenedDefinition,
        isActive: true,
      }]} />);
    });
    await clickEdit(container, "Bearbeiten");
    expect(findTextarea("Ausgabetext des Bausteins")?.value).toBe("Allgemeiner Facharzttext");
    expect(findTextarea("Ausgabe für Option: Verlaufskontrolle")?.value).toBe("Fachtext für Verlaufskontrolle");

    global.fetch = originalFetch;
    await act(async () => root.unmount());
  });

  it("löscht einen Baustein erst nach Bestätigung", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }) as jest.Mock;
    const definition = buildPracticeDocumentationBlockDefinition({
      title: "Kontakt",
      blockType: "text",
      text: "Telefonnummer",
    });
    const container = createContainer();
    const root = createRoot(container);
    await act(async () => {
      root.render(<DocumentationLibraryClient initialBlocks={[{
        id: "block-1",
        title: "Kontakt",
        definition,
        isActive: true,
      }]} />);
    });

    await clickEdit(container, "Löschen");

    expect(window.confirm).toHaveBeenCalledWith("Baustein „Kontakt“ wirklich dauerhaft löschen?");
    expect(global.fetch).toHaveBeenCalledWith("/api/practice/documentation-library/block-1", { method: "DELETE" });
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
