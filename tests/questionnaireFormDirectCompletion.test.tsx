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

    await act(async () => root.unmount());
    document.body.removeChild(container);
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