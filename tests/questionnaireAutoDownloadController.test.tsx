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

function statusResponse(
  enabled: boolean,
  isCurrentDevice: boolean,
  mode: "BROWSER" | "WINDOWS" = "BROWSER",
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ mode, enabled, isCurrentDevice, canManage: false }),
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

function gdtResponse(filename = "20260903_Test.gdt") {
  return {
    ok: true,
    status: 200,
    headers: new Headers({
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${filename}"`,
    }),
    blob: async () => new Blob(["gdt"], { type: "application/octet-stream" }),
  };
}

function xmlResponse(
  contentType: "application/xml" | "application/xml; charset=utf-8",
  filename = "20260912_81426_Bescheinigung.xml",
) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({
      "content-type": contentType,
      "content-disposition": `attachment; filename="${filename}"`,
    }),
    blob: async () => new Blob(["xml"], { type: contentType }),
  };
}

const noContentResponse = { ok: true, status: 204 };
const downloadedFilenames: string[] = [];

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
  downloadedFilenames.length = 0;
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
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloadedFilenames.push(this.download);
  });
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

it("lädt PDF, XML und GDT als separate Artefakte sequenziell", async () => {
  fetchMock
    .mockResolvedValueOnce(statusResponse(true, true))
    .mockResolvedValueOnce(pdfResponse("fragebogen.pdf"))
    .mockResolvedValueOnce(xmlResponse(
      "application/xml; charset=utf-8",
      "fragebogen.xml",
    ))
    .mockResolvedValueOnce(gdtResponse("fragebogen.gdt"))
    .mockResolvedValueOnce(noContentResponse);

  const { container, root } = await renderController();

  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(3);
  expect(URL.createObjectURL).toHaveBeenCalledTimes(3);
  expect(downloadedFilenames).toEqual([
    "fragebogen.pdf",
    "fragebogen.xml",
    "fragebogen.gdt",
  ]);
  expect(refreshMock).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
  container.remove();
});

it.each([
  "application/xml",
  "application/xml; charset=utf-8",
] as const)("akzeptiert XML mit Content-Type %s und übernimmt den Server-Dateinamen", async (contentType) => {
  fetchMock
    .mockResolvedValueOnce(statusResponse(true, true))
    .mockResolvedValueOnce(xmlResponse(contentType))
    .mockResolvedValueOnce(noContentResponse);

  const { container, root } = await renderController();

  expect(downloadedFilenames).toEqual([
    "20260912_81426_Bescheinigung.xml",
  ]);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(refreshMock).toHaveBeenCalledTimes(1);

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

it("verwendet weiterhin das Polling-Intervall von zehn Sekunden", async () => {
  const intervalSpy = jest.spyOn(window, "setInterval");
  fetchMock.mockResolvedValue(statusResponse(false, false));

  const { container, root } = await renderController();

  expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 10_000);

  await act(async () => root.unmount());
  container.remove();
});

it("startet im Windows-Modus weder Browser-Polling noch Timer oder Visibility-Listener", async () => {
  const intervalSpy = jest.spyOn(window, "setInterval");
  const listenerSpy = jest.spyOn(document, "addEventListener");
  fetchMock.mockResolvedValue(statusResponse(false, false, "WINDOWS"));

  const { container, root } = await renderController();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/practice/questionnaire-auto-download",
    expect.any(Object),
  );
  expect(intervalSpy).not.toHaveBeenCalled();
  expect(listenerSpy).not.toHaveBeenCalledWith(
    "visibilitychange",
    expect.any(Function),
  );
  expect(container.textContent).toBe("");

  await act(async () => root.unmount());
  container.remove();
});

it("behält das bestehende Fehlerverhalten für unbekannte MIME-Types bei", async () => {
  fetchMock
    .mockResolvedValueOnce(statusResponse(true, true))
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/plain" }),
    });

  const { container, root } = await renderController();

  expect(container.textContent).toContain("Automatischer Download fehlgeschlagen");
  expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  expect(refreshMock).not.toHaveBeenCalled();

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