/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

import QuestionnaireAutoDownloadDeviceSettings from "@/components/practice/QuestionnaireAutoDownloadDeviceSettings";
import { QUESTIONNAIRE_AUTO_DEVICE_STORAGE_KEY } from "@/lib/questionnaire/autoDownloadDeviceClient";

const fetchMock = jest.fn();
global.fetch = fetchMock;

function response(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

async function settle() {
  await act(async () => {
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
  });
}

async function renderSettings() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<QuestionnaireAutoDownloadDeviceSettings />);
  });
  await settle();
  return { container, root };
}

beforeEach(() => {
  window.localStorage.clear();
  fetchMock.mockReset();
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: jest.fn(() => "123e4567-e89b-42d3-a456-426614174000"),
  });
});

afterEach(() => jest.restoreAllMocks());

it("aktiviert diesen Computer und speichert lokal nur die Geräte-ID", async () => {
  fetchMock
    .mockResolvedValueOnce(
      response({ enabled: false, isCurrentDevice: false, canManage: true }),
    )
    .mockResolvedValueOnce(response({ ok: true }))
    .mockResolvedValueOnce(
      response({ enabled: true, isCurrentDevice: true, canManage: true }),
    );
  const { container, root } = await renderSettings();

  expect(container.textContent).toContain("Nicht eingerichtet");
  expect(container.textContent).toContain(
    "Chrome muss automatische Downloads für Patientenpfad erlauben",
  );
  await act(async () => {
    container.querySelector<HTMLButtonElement>("button")!.click();
  });
  await settle();

  expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PUT" });
  expect(container.textContent).toContain(
    "Automatischer Download ist auf diesem Computer aktiv.",
  );
  expect(Object.keys(window.localStorage)).toEqual([
    QUESTIONNAIRE_AUTO_DEVICE_STORAGE_KEY,
  ]);

  await act(async () => root.unmount());
  container.remove();
});

it("ersetzt ein anderes Gerät erst nach Bestätigung", async () => {
  fetchMock
    .mockResolvedValueOnce(
      response({ enabled: true, isCurrentDevice: false, canManage: true }),
    )
    .mockResolvedValueOnce(response({ ok: true }))
    .mockResolvedValueOnce(
      response({ enabled: true, isCurrentDevice: true, canManage: true }),
    );
  const confirmMock = jest.spyOn(window, "confirm").mockReturnValue(true);
  const { container, root } = await renderSettings();

  expect(container.textContent).toContain(
    "Automatischer Download ist auf einem anderen Computer aktiv.",
  );
  await act(async () => {
    container.querySelector<HTMLButtonElement>("button")!.click();
  });
  await settle();

  expect(confirmMock).toHaveBeenCalledWith(
    "Der automatische Download wird künftig auf diesem Computer ausgeführt.\nDas bisherige Download-Gerät wird deaktiviert.",
  );
  expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PUT" });

  await act(async () => root.unmount());
  container.remove();
});

it("deaktiviert den automatischen Download auf dem aktiven Gerät", async () => {
  fetchMock
    .mockResolvedValueOnce(
      response({ enabled: true, isCurrentDevice: true, canManage: true }),
    )
    .mockResolvedValueOnce(response({ ok: true }))
    .mockResolvedValueOnce(
      response({ enabled: false, isCurrentDevice: false, canManage: true }),
    );
  const { container, root } = await renderSettings();

  expect(container.textContent).toContain("Automatischen Download deaktivieren");
  await act(async () => {
    container.querySelector<HTMLButtonElement>("button")!.click();
  });
  await settle();

  expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
  expect(container.textContent).toContain("Nicht eingerichtet");

  await act(async () => root.unmount());
  container.remove();
});