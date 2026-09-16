/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

const refreshMock = jest.fn();
const downloadMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
jest.mock("@/lib/questionnaire/downloadFileResponse", () => ({
  downloadFileResponse: (...args: unknown[]) => downloadMock(...args),
}));

import QuestionnairePatientAssignment from "@/components/questionnaire/QuestionnairePatientAssignment";

const fetchMock = jest.fn();
global.fetch = fetchMock;

async function settle() {
  await act(async () => {
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  refreshMock.mockReset();
  downloadMock.mockReset().mockResolvedValue(undefined);
});

it("lädt nach Patientenzuordnung PDF und genau eine GDT sequenziell", async () => {
  const patchResponse = { ok: true, status: 200 };
  const pdfResponse = { ok: true, status: 200 };
  const gdtResponse = { ok: true, status: 200 };
  fetchMock
    .mockResolvedValueOnce(patchResponse)
    .mockResolvedValueOnce(pdfResponse)
    .mockResolvedValueOnce(gdtResponse);

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<QuestionnairePatientAssignment sessionId="session-1" />));

  await act(async () => container.querySelector<HTMLButtonElement>("[data-q-assign]")!.click());
  const input = container.querySelector<HTMLInputElement>("input")!;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, " 79383 ");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const submitButton = Array.from(container.querySelectorAll("button"))
    .find((button) => button.textContent === "PDF ersetzen")!;
  await act(async () => submitButton.click());
  await settle();

  expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
    "/api/questionnaire/session-1",
    "/api/questionnaire/session-1/pdf",
    "/api/questionnaire/session-1/gdt",
  ]);
  expect(downloadMock.mock.calls).toEqual([
    [pdfResponse, "Fragebogen.pdf"],
    [gdtResponse, "Fragebogen.gdt"],
  ]);
  expect(refreshMock).toHaveBeenCalledTimes(1);
  expect(container.querySelector("[data-q-assign]")).not.toBeNull();

  await act(async () => root.unmount());
  container.remove();
});

it("behandelt einen bereits konkurrierend geclaimten GDT-Download als Erfolg", async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: true, status: 200 })
    .mockResolvedValueOnce({ ok: true, status: 200 })
    .mockResolvedValueOnce({ ok: true, status: 204 });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<QuestionnairePatientAssignment sessionId="session-1" />));
  await act(async () => container.querySelector<HTMLButtonElement>("[data-q-assign]")!.click());
  const input = container.querySelector<HTMLInputElement>("input")!;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, "79383");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const submitButton = Array.from(container.querySelectorAll("button"))
    .find((button) => button.textContent === "PDF ersetzen")!;
  await act(async () => submitButton.click());
  await settle();

  expect(downloadMock).toHaveBeenCalledTimes(1);
  expect(refreshMock).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
  container.remove();
});

it("ordnet einen Kiosk-Check-in ohne PDF- oder GDT-Download zu", async () => {
  fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <QuestionnairePatientAssignment sessionId="session-1" downloadArtifacts={false} />,
  ));
  await act(async () => container.querySelector<HTMLButtonElement>("[data-q-assign]")!.click());
  const input = container.querySelector<HTMLInputElement>("input")!;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, "79383");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const submitButton = Array.from(container.querySelectorAll("button"))
    .find((button) => button.textContent === "Zuordnen")!;
  await act(async () => submitButton.click());
  await settle();

  expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
    "/api/questionnaire/session-1",
  ]);
  expect(downloadMock).not.toHaveBeenCalled();
  expect(refreshMock).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
  container.remove();
});