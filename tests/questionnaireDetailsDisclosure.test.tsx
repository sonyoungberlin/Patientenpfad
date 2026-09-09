/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import QuestionnaireDetailsDisclosure from "@/components/questionnaire/QuestionnaireDetailsDisclosure";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = jest.fn();
global.fetch = fetchMock;

const detail = {
  questions: [
    { id: "SYMPTOM", text: "Welche Beschwerden?", type: "textarea", required: true },
  ],
  answers: { SYMPTOM: "Husten" },
  noteText: "Beschwerden: Husten",
  derivedValues: {},
  attentionHints: [],
  visibleQuestionIds: ["SYMPTOM"],
};

async function settle() {
  await act(async () => {
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
  });
}

async function renderDisclosure() {
  const container = document.createElement("div");
  container.innerHTML = '<div data-inbox-shell="preserved">Inbox</div>';
  document.body.appendChild(container);
  const mount = document.createElement("div");
  container.appendChild(mount);
  const root = createRoot(mount);
  await act(async () => root.render(
    <QuestionnaireDetailsDisclosure sessionId="session-1" />,
  ));
  return { container, root };
}

async function toggle(details: HTMLDetailsElement, open: boolean) {
  await act(async () => {
    details.open = open;
    details.dispatchEvent(new Event("toggle", { bubbles: true }));
  });
  await settle();
}

beforeEach(() => {
  fetchMock.mockReset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

it("lädt beim ersten Aufklappen genau einmal und verwendet danach den Cache", async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, detail }),
  });
  const { container, root } = await renderDisclosure();
  const detailsElement = container.querySelector("details")!;

  expect(fetchMock).not.toHaveBeenCalled();
  expect(container.textContent).not.toContain("Husten");

  await toggle(detailsElement, true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith("/api/questionnaire/session-1", {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  expect(container.textContent).toContain("Husten");

  await toggle(detailsElement, false);
  await toggle(detailsElement, true);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
});

it("zeigt während des Abrufs einen kleinen Ladezustand in derselben Karte", async () => {
  let resolveFetch!: (value: unknown) => void;
  fetchMock.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));
  const { container, root } = await renderDisclosure();
  const detailsElement = container.querySelector("details")!;

  await act(async () => {
    detailsElement.open = true;
    detailsElement.dispatchEvent(new Event("toggle", { bubbles: true }));
  });
  expect(container.querySelector('[data-q-details-loading="session-1"]')).not.toBeNull();

  resolveFetch({ ok: true, json: async () => ({ ok: true, detail }) });
  await settle();
  expect(container.querySelector('[data-q-details-loading="session-1"]')).toBeNull();

  await act(async () => root.unmount());
});

it("begrenzt einen Abruffehler auf die Karte und lässt die Inbox bestehen", async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    json: async () => ({ ok: false, error: "Antworten vorübergehend nicht verfügbar." }),
  });
  const { container, root } = await renderDisclosure();
  const detailsElement = container.querySelector("details")!;

  await toggle(detailsElement, true);

  expect(container.querySelector('[data-q-details-error="session-1"]')?.textContent)
    .toContain("Antworten vorübergehend nicht verfügbar.");
  expect(container.querySelector('[data-inbox-shell="preserved"]')?.textContent).toBe("Inbox");

  await act(async () => root.unmount());
});
