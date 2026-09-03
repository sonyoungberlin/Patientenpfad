/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const refreshMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import QuestionnaireAutoDownloadController from "@/components/questionnaire/QuestionnaireAutoDownloadController";
import { QUESTIONNAIRE_AUTO_DEVICE_STORAGE_KEY } from "@/lib/questionnaire/autoDownloadDeviceClient";

const fetchMock = jest.fn();
global.fetch = fetchMock;

function statusResponse(enabled: boolean, isCurrentDevice: boolean) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ enabled, isCurrentDevice, canManage: false }),
  };
}

function pdfResponse(filename = "20260903_Test.pdf") {
  return {
    ok: true,
    status: 200,
    headers: new Headers({
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
    }),
    blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
  };
}

const noContentResponse = { ok: true, status: 204 };

async function settle() {
  await act(async () => {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
  });
}

async function renderController() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<QuestionnaireAutoDownloadController />));
  await settle();
  return { container, root };
}

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset();
  refreshMock.mockReset();
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: jest.fn(() => "123e4567-e89b-42d3-a456-426614174000"),
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: jest.fn(() => "blob:test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: jest.fn(),
  });
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("speichert lokal nur die Geräte-ID und pollt auf fremden Geräten nicht nach PDFs", async () => {
  fetchMock.mockResolvedValue(statusResponse(true, false));
  const { container, root } = await renderController();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe(
    "/api/practice/questionnaire-auto-download",
  );
  expect(Object.keys(window.localStorage)).toEqual([
    QUESTIONNAIRE_AUTO_DEVICE_STORAGE_KEY,
  ]);
  expect(window.localStorage.getItem(QUESTIONNAIRE_AUTO_DEVICE_STORAGE_KEY)).toBe(
    "123e4567-e89b-42d3-a456-426614174000",
  );
  expect(container.textContent).toBe("");

  await act(async () => root.unmount());
  container.remove();
});

it("lädt mehrere PDFs strikt sequenziell und aktualisiert die Inbox", async () => {
  fetchMock
    .mockResolvedValueOnce(statusResponse(true, true))
    .mockResolvedValueOnce(pdfResponse("eins.pdf"))
    .mockResolvedValueOnce(pdfResponse("zwei.pdf"))
    .mockResolvedValueOnce(noContentResponse);

  const { container, root } = await renderController();

  expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
    "/api/practice/questionnaire-auto-download",
    "/api/questionnaire/auto-download/next",
    "/api/questionnaire/auto-download/next",
    "/api/questionnaire/auto-download/next",
  ]);
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
  expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  expect(refreshMock).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain("Automatischer PDF-Download aktiv");

  await act(async () => root.unmount());
  container.remove();
});

it("begrenzt einen Zyklus auf zehn Downloads", async () => {
  fetchMock.mockResolvedValueOnce(statusResponse(true, true));
  for (let index = 0; index < 10; index += 1) {
    fetchMock.mockResolvedValueOnce(pdfResponse(`${index}.pdf`));
  }

  const { container, root } = await renderController();

  expect(fetchMock).toHaveBeenCalledTimes(11);
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(10);
  expect(refreshMock).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
  container.remove();
});

it("zeigt bei einem aktiven Downloadfehler den manuellen Fallback", async () => {
  fetchMock
    .mockResolvedValueOnce(statusResponse(true, true))
    .mockResolvedValueOnce({ ok: false, status: 500, headers: new Headers() });

  const { container, root } = await renderController();

  expect(container.textContent).toContain("Automatischer Download fehlgeschlagen");
  expect(refreshMock).not.toHaveBeenCalled();

  await act(async () => root.unmount());
  container.remove();
});