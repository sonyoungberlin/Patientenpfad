/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";
import type { QuestionDefinition } from "@/lib/questionnaire/blockCatalog";
import type { FrozenBlock } from "@/lib/questionnaire/frozenBlocks";
import { VACCINATION_REVIEW_QUESTION_CATALOG } from "@/lib/questionnaire/vaccinationReviewCatalog";

const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

jest.mock("@/components/SelfCheckInQrCode", () => ({
  SelfCheckInQrCode: ({ reference }: { reference: string }) => (
    <div data-self-check-in-qr data-reference={reference}>{reference}</div>
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = jest.fn();
global.fetch = fetchMock;

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob, "UTF-8");
  });
}

const QUESTIONS = [
  {
    id: "AU_SYMPTOMS",
    text: "Telefon",
    type: "text" as const,
    required: false,
  },
];

async function renderForm(
  source: string,
  inquirySessionId?: string | null,
  patientReference?: string | null,
  selfCheckInQrReference?: string | null,
  kioskRestartPath?: string,
  formQuestions: QuestionDefinition[] = QUESTIONS,
  frozenBlocks?: FrozenBlock[],
  publicHandoffPath?: string,
  submitEndpoint?: string,
  autoDownloadSessionId?: string,
  context = "office",
  hideManualExports = false,
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QuestionnaireFormClient
        token="token-1"
        questions={formQuestions}
        frozenBlocks={frozenBlocks}
        source={source}
        inquirySessionId={inquirySessionId}
        patientReference={patientReference}
        selfCheckInQrReference={selfCheckInQrReference}
        kioskRestartPath={kioskRestartPath}
        publicHandoffPath={publicHandoffPath}
        submitEndpoint={submitEndpoint}
        autoDownloadSessionId={autoDownloadSessionId}
        hideManualExports={hideManualExports}
        context={context}
      />,
    );
  });
  return { container, root };
}

describe("QuestionnaireFormClient Direktabschluss", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    refreshMock.mockReset();
  });

  it("zeigt das Kiosk-Formular direkt, während externe Links den Öffnen-Hinweis behalten", async () => {
    const kiosk = await renderForm("kiosk_direct", undefined, "81426", undefined, undefined, QUESTIONS, undefined, undefined, undefined, undefined, "patient");
    expect(kiosk.container.querySelector("[data-personal-link-notice]")).toBeNull();
    expect(kiosk.container.querySelector("[data-q-submit]")).not.toBeNull();
    await act(async () => kiosk.root.unmount());
    document.body.removeChild(kiosk.container);

    const link = await renderForm("internal_link", undefined, "81426", undefined, undefined, QUESTIONS, undefined, undefined, undefined, undefined, "patient");
    expect(link.container.querySelector("[data-personal-link-notice]")).not.toBeNull();
    expect(link.container.textContent).toContain("Fragebogen öffnen");
    await act(async () => link.root.unmount());
    document.body.removeChild(link.container);
  });

  it("markiert Server-Fehler und scrollt/fokussiert das erste ungültige Feld", async () => {
    const scrollIntoView = jest.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Bitte prüfen Sie die Pflichtfelder und Auswahlwerte.",
        invalidQuestionIds: ["SECOND_FIELD", "AU_SYMPTOMS"],
      }),
    });
    const formQuestions: QuestionDefinition[] = [
      ...QUESTIONS,
      { id: "SECOND_FIELD", text: "Zweites Feld", type: "text", required: false },
    ];
    const { container, root } = await renderForm(
      "practice_direct",
      undefined,
      undefined,
      undefined,
      undefined,
      formQuestions,
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const invalidQuestion = container.querySelector<HTMLElement>(
      '[data-q-question="AU_SYMPTOMS"]',
    )!;
    expect(invalidQuestion.getAttribute("data-q-invalid")).toBe("true");
    expect(container.querySelector('[data-q-validationerror="AU_SYMPTOMS"]')?.textContent)
      .toBe("Bitte dieses Feld prüfen.");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(document.activeElement).toBe(
      container.querySelector('[data-q-question="SECOND_FIELD"] input'),
    );

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("markiert VACCINATION_REVIEW_ITEMS mit einem spezifischen Matrixhinweis", async () => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: jest.fn(),
    });
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Bitte prüfen Sie die Pflichtfelder und Auswahlwerte.",
        invalidQuestionIds: ["VACCINATION_REVIEW_ITEMS"],
      }),
    });
    const vaccinationQuestion = VACCINATION_REVIEW_QUESTION_CATALOG.VACCINATION_REVIEW_ITEMS;
    const frozenBlocks: FrozenBlock[] = [{
      id: "VACCINATION_REVIEW",
      label: "Impfpassprüfung und Beratung",
      displayOrder: 10,
      questions: [vaccinationQuestion],
      conditionalRules: [],
      initiallyVisible: true,
      outputSemantics: "documented-content-v1",
    }];
    const { container, root } = await renderForm(
      "practice_direct",
      undefined,
      undefined,
      undefined,
      undefined,
      [vaccinationQuestion],
      frozenBlocks,
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-q-question="VACCINATION_REVIEW_ITEMS"]')
      ?.getAttribute("data-q-invalid")).toBe("true");
    expect(container.querySelector('[data-q-validationerror="VACCINATION_REVIEW_ITEMS"]')?.textContent)
      .toBe("Bitte prüfen Sie die bearbeiteten Impfungen auf einen gültigen Impfstatus.");

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt beim Direkteinstieg nur den patientengerechten Abschluss", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        noteText: "Digitale Anfrage\nBeschwerden: Husten",
        sessionId: "qs-1",
        inquiry_session_id: "inquiry-1",
      }),
    });
    const { container, root } = await renderForm("practice_direct", "inquiry-1");

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(container.querySelector("[data-q-submitted]")).not.toBeNull();
    expect(container.textContent).toContain("Fragebogen abgeschlossen");
    expect(container.textContent).toContain("Vielen Dank.");
    expect(container.textContent).not.toContain("Die Angaben wurden gespeichert");
    expect(container.querySelector("[data-q-copy-note]")).toBeNull();
    expect(container.querySelector("nav")).toBeNull();
    expect(container.querySelector("[data-q-kiosk-next]")).toBeNull();

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt im internen Kiosk-Abschluss keine manuellen Exporte", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        noteText: "Interne Dokumentation\nBefund",
        xmlFilename: "interne-dokumentation.xml",
        semanticDocument: { kind: "semantic-document", version: 2, sections: [] },
      }),
    });
    const { container, root } = await renderForm(
      "kiosk_direct",
      undefined,
      "81426",
      undefined,
      undefined,
      QUESTIONS,
      undefined,
      undefined,
      "/api/questionnaire-kiosk/internal/session-1",
      undefined,
      "patient",
      true,
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector("[data-q-submitted]")).not.toBeNull();
    expect(container.textContent).toContain("Fragebogen abgeschlossen");
    expect(container.querySelector("[data-q-pdf]")).toBeNull();
    expect(container.querySelector("[data-q-download-xml]")).toBeNull();
    expect(container.querySelector("[data-q-download-xml-v2]")).toBeNull();
    expect(container.querySelector("[data-q-gdt]")).toBeNull();

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("liefert nach einmaligem internen Submit PDF, XML und GDT derselben Session aus", async () => {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: jest.fn(() => "123e4567-e89b-42d3-a456-426614174000"),
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:internal-artifact"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });
    const downloadedFilenames: string[] = [];
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFilenames.push(this.download);
    });
    const artifactResponse = (contentType: string, filename: string) => ({
      ok: true,
      status: 200,
      headers: new Headers({
        "content-type": contentType,
        "content-disposition": `attachment; filename="${filename}"`,
      }),
      blob: async () => new Blob([filename], { type: contentType }),
    });
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ mode: "BROWSER", enabled: true, isCurrentDevice: true }),
      })
      .mockResolvedValueOnce(artifactResponse("application/pdf", "dokumentation.pdf"))
      .mockResolvedValueOnce(artifactResponse("application/xml; charset=utf-8", "dokumentation.xml"))
      .mockResolvedValueOnce(artifactResponse("application/octet-stream", "dokumentation.gdt"))
      .mockResolvedValueOnce({ ok: true, status: 204 });

    const { container, root } = await renderForm(
      "practice_direct",
      null,
      "81426",
      null,
      undefined,
      QUESTIONS,
      undefined,
      undefined,
      "/api/internal-documentation/internal-session-1",
      "internal-session-1",
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      for (let index = 0; index < 20; index += 1) await Promise.resolve();
    });

    expect(container.querySelector("[data-q-submitted]")).not.toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/internal-documentation/internal-session-1",
      "/api/practice/questionnaire-auto-download",
      "/api/questionnaire/auto-download/next?sessionId=internal-session-1",
      "/api/questionnaire/auto-download/next?sessionId=internal-session-1",
      "/api/questionnaire/auto-download/next?sessionId=internal-session-1",
      "/api/questionnaire/auto-download/next?sessionId=internal-session-1",
    ]);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(downloadedFilenames).toEqual([
      "dokumentation.pdf",
      "dokumentation.xml",
      "dokumentation.gdt",
    ]);
    expect(refreshMock).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
    document.body.removeChild(container);
    jest.restoreAllMocks();
  });

  it("zeigt den Neustart ausschließlich bei echter Kiosk-Provenienz", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const { container, root } = await renderForm("kiosk_direct", null, "K-001");

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector("[data-q-kiosk-next]")).not.toBeNull();
    expect(container.textContent).toContain("Nächsten Fragebogen starten");
    expect(container.querySelector("[data-q-kiosk-next]")?.getAttribute("data-q-kiosk-next"))
      .toBe("/questionnaire-kiosk/direct");

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("startet nach interner Dokumentation wieder den internen Kioskworkflow", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const { container, root } = await renderForm(
      "kiosk_direct",
      null,
      "K-001",
      null,
      "/questionnaire-kiosk/internal",
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector("[data-q-kiosk-next]")?.getAttribute("data-q-kiosk-next"))
      .toBe("/questionnaire-kiosk/internal");

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt nach interner Kiosk-Dokumentation den Word-XML-Download", async () => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:kiosk-xml"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });
    let downloadedFilename = "";
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        noteText: "Interne Dokumentation\n\nImpfberatung\nStatus: A & B",
        xmlFilename: "20260910_PAT1_Interne_Dokumentation.xml",
      }),
    });
    const { container, root } = await renderForm(
      "kiosk_direct",
      null,
      "PAT-1",
      null,
      "/questionnaire-kiosk/internal",
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const downloadButton = container.querySelector<HTMLButtonElement>("[data-q-download-xml]");
    expect(downloadButton?.textContent).toBe("XML für Word herunterladen");
    expect(container.textContent).not.toContain("Fragebogen abgeschlossen");
    expect(container.textContent).toContain("Vielen Dank.");
    await act(async () => downloadButton!.click());

    const blob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    await expect(readBlob(blob)).resolves.toBe(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
      "<appExport version=\"1.0\"><section id=\"APP_TEXT\">" +
      "Interne Dokumentation\n\nImpfberatung\nStatus: A &amp; B" +
      "</section></appExport>",
    );
    expect(downloadedFilename).toBe("20260910_PAT1_Interne_Dokumentation.xml");

    await act(async () => root.unmount());
    document.body.removeChild(container);
    jest.restoreAllMocks();
  });

  it("zeigt QR beim Direkteinstieg erst nach erfolgreichem Submit", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        noteText: "Digitale Anfrage",
        sessionId: "qs-direct",
      }),
    });
    const { container, root } = await renderForm(
      "practice_direct",
      null,
      "001234",
      "001234",
    );

    expect(container.querySelector("[data-self-check-in-qr]")).toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector("[data-q-submitted]")).not.toBeNull();
    expect(container.querySelector("[data-self-check-in-qr]"))
      .not.toBeNull();
    expect(container.querySelector("[data-reference='001234']")).not.toBeNull();
    expect(container.textContent).toContain("001234");
    expect(container.querySelector("[data-patient-reference]")).not.toBeNull();
    expect(container.querySelector("[data-patient-reference-value]")?.textContent).toBe("001234");
    expect(container.textContent?.match(/001234/g)).toHaveLength(2);
    expect(container.textContent).not.toContain("Die Angaben wurden gespeichert");
    expect(container.textContent).not.toContain("Nutzen Sie bei Ihrem nächsten Besuch");

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt QR beim Linkversand erst nach erfolgreichem Submit", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const { container, root } = await renderForm(
      "internal_link",
      null,
      "001234",
      "001234",
    );

    expect(container.querySelector("[data-self-check-in-qr]")).toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector("[data-q-submitted]")).not.toBeNull();
    expect(container.querySelector("[data-reference='001234']")).not.toBeNull();
    expect(container.textContent).toContain("Fragebogen abgeschlossen");
    expect(container.textContent).toContain("Vielen Dank.");
    expect(container.textContent).toContain("001234");
    expect(container.querySelector("[data-patient-reference-value]")?.textContent).toBe("001234");
    expect(container.textContent?.match(/001234/g)).toHaveLength(2);

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt ohne QR nur den patientengerechten Abschluss", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    const { container, root } = await renderForm("internal_link");

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(container.querySelector("[data-q-submitted]")).not.toBeNull();
    expect(container.textContent).toContain("Fragebogen abgeschlossen");
    expect(container.textContent).toContain("Vielen Dank.");
    expect(container.textContent).not.toContain("Die Angaben wurden gespeichert");
    expect(container.querySelector("[data-self-check-in-qr]")).toBeNull();
    expect(container.textContent).not.toContain("001234");
    expect(container.textContent).not.toContain("Ihre Patienten-ID");

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt die bereinigte Patienten-ID beim Linkversand auch ohne QR", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const { container, root } = await renderForm(
      "internal_link",
      null,
      " 001234 ",
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Ihre Patienten-ID");
    expect(container.querySelector("[data-patient-reference-value]")?.textContent).toBe("001234");
    expect(container.querySelector("[data-self-check-in-qr]")).toBeNull();

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt die Patienten-ID beim Direkteinstieg auch ohne QR", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, noteText: "Notiz", sessionId: "qs-direct" }),
    });
    const { container, root } = await renderForm(
      "practice_direct",
      null,
      "001234",
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-q-submit]")!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector("[data-patient-reference-value]")?.textContent).toBe("001234");
    expect(container.querySelector("[data-self-check-in-qr]")).toBeNull();

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });
});