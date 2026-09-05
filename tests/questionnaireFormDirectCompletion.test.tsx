/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QuestionnaireFormClient } from "@/app/q/[token]/QuestionnaireFormClient";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = jest.fn();
global.fetch = fetchMock;

const QUESTIONS = [
  {
    id: "CONTACT_PHONE",
    text: "Telefon",
    type: "text" as const,
    required: false,
  },
];

async function renderForm(source: string, inquirySessionId?: string | null) {
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
        context="office"
      />,
    );
  });
  return { container, root };
}

describe("QuestionnaireFormClient Direktabschluss", () => {
  beforeEach(() => fetchMock.mockReset());

  it("zeigt den bestehenden Copy-Button und Anfrage-Link nur mit Verknüpfung", async () => {
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

    expect(container.querySelector("[data-q-direct-completion]")).not.toBeNull();
    expect(container.querySelector("[data-q-copy-note='qs-1']")).not.toBeNull();
    expect(container.querySelector("a[href='/inquiries/inquiry-1/m3']")).not.toBeNull();
    expect(container.querySelector("a[href='/questionnaires']")).not.toBeNull();

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it("zeigt extern weiterhin nur die bisherige Dankesansicht", async () => {
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
    expect(container.querySelector("[data-q-direct-completion]")).toBeNull();
    expect(container.querySelector("[data-q-copy-note]")).toBeNull();

    await act(async () => root.unmount());
    document.body.removeChild(container);
  });
});