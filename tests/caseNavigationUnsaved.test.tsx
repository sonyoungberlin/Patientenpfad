/** @jest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { M2PrefillClient } from "@/app/cases/[id]/m2/M2PrefillClient";
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

const checkpoint: ActiveCheckpoint = {
  id: "K01",
  block_id: "kommunikation",
  type: CheckpointType.PRESENCE_CHECK,
  perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
  title: "Erreichbarkeit",
  category: CheckpointCategory.O,
  status: "TO_DO",
  m4: { type: "NOTICE", text: "Hinweis" },
};

let container: HTMLDivElement;
let root: Root;
const originalFetch = global.fetch;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
    .IS_REACT_ACT_ENVIRONMENT = true;
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

function expectInternalNavigationWarns(): void {
  const confirmMock = jest.spyOn(window, "confirm").mockReturnValue(false);
  const link = document.createElement("a");
  link.href = "/cases/case-123/m2";
  document.body.appendChild(link);

  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  link.dispatchEvent(click);

  expect(confirmMock).toHaveBeenCalledWith(
    "Wenn Sie die Seite verlassen, gehen nicht gespeicherte Änderungen verloren.",
  );
  expect(click.defaultPrevented).toBe(true);
  link.remove();
}

describe("Warnung bei ungespeicherter Fallnavigation", () => {
  it("M2 blockiert den Rückweg zur Liste bis die ungespeicherten Änderungen bestätigt sind", async () => {
    await act(async () => {
      root.render(
        <M2PrefillClient
          caseId="case-123"
          checkpoints={[checkpoint]}
          initialPrefillBySource={{ mfa: {}, conversation: {} }}
          initialPreparationMode="mfa"
        />,
      );
    });

    const answer = container.querySelector<HTMLButtonElement>(
      '[data-m2-answer="K01:MFA-K01-01:ja"]',
    );
    expect(answer).not.toBeNull();
    await act(async () => answer?.click());

    expectInternalNavigationWarns();
  });

  it("M3 blockiert den Rückweg nach M2 bei ungespeicherten Bewertungsänderungen", async () => {
    let resolveSave!: (response: Response) => void;
    global.fetch = jest.fn(
      () => new Promise<Response>((resolve) => { resolveSave = resolve; }),
    ) as typeof fetch;
    await act(async () => {
      root.render(
        <M3ChecklistClient caseId="case-123" initialCheckpoints={[checkpoint]} />,
      );
    });

    const statusButton = container.querySelector<HTMLButtonElement>(
      '[data-status-button="K01:OK"]',
    );
    expect(statusButton).not.toBeNull();
    await act(async () => {
      statusButton?.click();
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    expectInternalNavigationWarns();

    await act(async () => {
      resolveSave({ ok: true } as Response);
      await Promise.resolve();
    });
  });
});