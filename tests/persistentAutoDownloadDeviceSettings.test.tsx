/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import PersistentAutoDownloadDeviceSettings from "@/components/practice/PersistentAutoDownloadDeviceSettings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = jest.fn();
global.fetch = fetchMock;

function response(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
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
  await act(async () => root.render(<PersistentAutoDownloadDeviceSettings />));
  await settle();
  return { container, root };
}

beforeEach(() => fetchMock.mockReset());

afterEach(() => jest.restoreAllMocks());

it("legt ein Gerät an und zeigt den einmaligen Enrollment-Code", async () => {
  fetchMock
    .mockResolvedValueOnce(response({ ok: true, devices: [] }))
    .mockResolvedValueOnce(response({
      ok: true,
      device: { id: "device-1", name: "Praxisserver" },
      enrollmentCode: "enrollment-code",
      enrollmentExpiresAt: "2026-09-13T12:15:00.000Z",
    }, 201))
    .mockResolvedValueOnce(response({
      ok: true,
      devices: [{
        id: "device-1",
        name: "Praxisserver",
        is_active: true,
        revoked_at: null,
        last_seen_at: null,
        created_at: "2026-09-13T12:00:00.000Z",
        enrollment_expires_at: "2026-09-13T12:15:00.000Z",
        enrolled: false,
      }],
    }));
  const { container, root } = await renderSettings();
  const input = container.querySelector<HTMLInputElement>('input[name="name"]')!;
  const form = container.querySelector<HTMLFormElement>("form")!;

  await act(async () => {
    input.value = "Praxisserver";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await settle();

  expect(fetchMock.mock.calls[1][1]).toMatchObject({
    method: "POST",
    body: JSON.stringify({ name: "Praxisserver" }),
  });
  expect(container.querySelector<HTMLInputElement>('[aria-label="Enrollment-Code"]')?.value)
    .toBe("enrollment-code");
  expect(container.textContent).toContain("Praxisserver");

  await act(async () => root.unmount());
  container.remove();
});

it("deaktiviert ein Gerät über die praxisgebundene Verwaltungsroute", async () => {
  fetchMock
    .mockResolvedValueOnce(response({
      ok: true,
      devices: [{
        id: "device-1",
        name: "Praxisserver",
        is_active: true,
        revoked_at: null,
        last_seen_at: null,
        created_at: "2026-09-13T12:00:00.000Z",
        enrollment_expires_at: null,
        enrolled: true,
      }],
    }))
    .mockResolvedValueOnce(response({ ok: true }))
    .mockResolvedValueOnce(response({ ok: true, devices: [] }));
  const { container, root } = await renderSettings();

  await act(async () => {
    Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent === "Deaktivieren")!
      .click();
  });
  await settle();

  expect(fetchMock.mock.calls[1]).toEqual([
    "/api/practice/auto-download-devices/device-1",
    expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ action: "deactivate" }),
    }),
  ]);

  await act(async () => root.unmount());
  container.remove();
});
