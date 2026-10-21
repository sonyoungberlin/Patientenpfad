/** @jest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { M3ChecklistClient } from "@/app/cases/[id]/m3/M3ChecklistClient";
import {
  CheckpointCategory,
  CheckpointPerspective,
  CheckpointType,
  type ActiveCheckpoint,
} from "@/lib/types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

const firstCheckpoint: ActiveCheckpoint = {
  id: "K01",
  block_id: "kommunikation",
  type: CheckpointType.PRESENCE_CHECK,
  perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
  title: "Erreichbarkeit",
  category: CheckpointCategory.M,
  status: "TO_DO",
  m4: { type: "ACTION", text: "Hinweis" },
};

const secondCheckpoint: ActiveCheckpoint = {
  ...firstCheckpoint,
  id: "K02",
  title: "Termine",
};

let container: HTMLDivElement;
let root: Root;
let fetchMock: jest.Mock;
const originalFetch = global.fetch;

function successResponse(): Response {
  return { ok: true } as Response;
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
    .IS_REACT_ACT_ENVIRONMENT = true;
  fetchMock = jest.fn().mockResolvedValue(successResponse());
  global.fetch = fetchMock as typeof fetch;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

async function renderM3(
  checkpoints: ActiveCheckpoint[] = [firstCheckpoint, secondCheckpoint],
  doctorConfirmed = false,
) {
  await act(async () => {
    root.render(
      <M3ChecklistClient
        caseId="case-123"
        initialCheckpoints={checkpoints}
        doctorConfirmed={doctorConfirmed}
      />,
    );
  });
}

function statusButton(checkpointId: string, status: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(
    `[data-status-button="${checkpointId}:${status}"]`,
  );
  if (!button) throw new Error(`Missing status button ${checkpointId}:${status}`);
  return button;
}

describe("M3-Bewertungen zwischenspeichern", () => {
  it("speichert einen Status vor der Anzeige als ausgewählt und löst keine Bestätigung aus", async () => {
    await renderM3([firstCheckpoint]);

    await act(async () => statusButton("K01", "OK").click());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cases/case-123/checkpoint/update",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          checkpoint_id: "K01",
          status: "OK",
          expected_clinical_status: "none",
        }),
      }),
    );
    expect(statusButton("K01", "OK").className).toContain("active");
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/cases/case-123/close",
      expect.anything(),
    );
  });

  it("serialisiert schnelle Bewertungen verschiedener Checkpoints", async () => {
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    fetchMock
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => { resolveFirst = resolve; }),
      )
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => { resolveSecond = resolve; }),
      );
    await renderM3();

    await act(async () => {
      statusButton("K01", "OK").click();
      statusButton("K02", "OK").click();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst(successResponse());
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveSecond(successResponse());
      await Promise.resolve();
    });
    expect(statusButton("K01", "OK").className).toContain("active");
    expect(statusButton("K02", "OK").className).toContain("active");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      checkpoint_id: "K01",
      status: "OK",
      expected_clinical_status: "none",
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      checkpoint_id: "K02",
      status: "OK",
      expected_clinical_status: "none",
    });
  });

  it("speichert schnelle Änderungen desselben Checkpoints in Klickreihenfolge", async () => {
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    fetchMock
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => { resolveFirst = resolve; }),
      )
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => { resolveSecond = resolve; }),
      );
    await renderM3([firstCheckpoint]);

    await act(async () => {
      statusButton("K01", "OK").click();
      statusButton("K01", "TO_DO").click();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst(successResponse());
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveSecond(successResponse());
      await Promise.resolve();
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      checkpoint_id: "K01",
      status: "OK",
      expected_clinical_status: "none",
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      checkpoint_id: "K01",
      status: "TO_DO",
      expected_clinical_status: "none",
    });
    expect(statusButton("K01", "TO_DO").className).toContain("active");
    expect(statusButton("K01", "OK").className).not.toContain("active");
  });

  it("zeigt bei Speicherfehlern eine Warnung und behauptet keinen neuen gespeicherten Status", async () => {
    fetchMock.mockResolvedValue({ ok: false } as Response);
    await renderM3([firstCheckpoint]);

    await act(async () => statusButton("K01", "OK").click());

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Bewertung konnte nicht gespeichert werden",
    );
    expect(statusButton("K01", "TO_DO").className).toContain("active");
    expect(statusButton("K01", "OK").className).not.toContain("active");
  });

  it("sendet für bestätigte Fälle keine Bewertungsänderung", async () => {
    await renderM3([firstCheckpoint], true);

    expect(statusButton("K01", "OK").disabled).toBe(true);
    await act(async () => statusButton("K01", "OK").click());

    expect(fetchMock).not.toHaveBeenCalled();
  });
});