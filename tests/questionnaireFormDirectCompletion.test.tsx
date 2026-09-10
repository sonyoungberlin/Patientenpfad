/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";

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
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QuestionnaireFormClient
        token="token-1"
        questions={QUESTIONS}
        source={source}
        inquirySessionId={inquirySessionId}
        patientReference={patientReference}
        selfCheckInQrReference={selfCheckInQrReference}
        kioskRestartPath={kioskRestartPath}
        context="office"
      />,
    );
  });
  return { container, root };
}

describe("QuestionnaireFormClient Direktabschluss", () => {
  beforeEach(() => fetchMock.mockReset());

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