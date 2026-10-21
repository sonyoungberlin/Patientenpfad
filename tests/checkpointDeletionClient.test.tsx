/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import CheckpointDetailClient from "@/app/admin/practice-processes/checkpoints/[checkpointId]/CheckpointDetailClient";

const push = jest.fn();
const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("Checkpoint löschen", () => {
  let originalConfirm: typeof window.confirm;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalConfirm = window.confirm;
    originalFetch = global.fetch;
    push.mockReset();
    refresh.mockReset();
  });

  afterEach(() => {
    window.confirm = originalConfirm;
    global.fetch = originalFetch;
    document.body.replaceChildren();
  });

  it("löscht persistierte Checkpoints erst nach Bestätigung", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }) as jest.Mock;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<CheckpointDetailClient
        initialDraft={{
          title: "Mein Checkpoint",
          description: "",
          orientationHint: "",
          orientationAnchors: [{ id: "cp-a1", text: "Anker" }],
        }}
        fixedId="mein-checkpoint"
        canDelete
      />);
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-delete-checkpoint]")?.click();
      await Promise.resolve();
    });

    expect(window.confirm).toHaveBeenCalledWith("Checkpoint „Mein Checkpoint“ wirklich dauerhaft löschen?");
    expect(global.fetch).toHaveBeenCalledWith("/api/admin/checkpoints/mein-checkpoint", { method: "DELETE" });
    expect(push).toHaveBeenCalledWith("/admin/practice-processes/checkpoints");
    await act(async () => root.unmount());
  });

  it("zeigt für reine Katalog-Checkpoints keinen Löschbutton", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<CheckpointDetailClient
        initialDraft={{
          title: "Katalog-Checkpoint",
          description: "",
          orientationHint: "",
          orientationAnchors: [{ id: "cp-a1", text: "Anker" }],
        }}
        fixedId="katalog-checkpoint"
      />);
    });

    expect(container.querySelector("[data-delete-checkpoint]")).toBeNull();
    await act(async () => root.unmount());
  });
});

describe("Checkpoint speichern", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    push.mockReset();
    refresh.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    document.body.replaceChildren();
  });

  it("übernimmt beim Save die serverseitig persistierte Anchor-ID", async () => {
    const persistedAnchorId = "9e860f4a-2b96-4f45-8f6b-f5061a6f2a88";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        checkpoint: {
          id: "mein-checkpoint",
          title: "Mein Checkpoint",
          description: "",
          orientationHint: "",
          orientationAnchors: [
            { id: "mein-checkpoint-a1", text: "Bestehender Anker" },
            { id: persistedAnchorId, text: "Neuer Anker" },
          ],
        },
      }),
    }) as jest.Mock;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<CheckpointDetailClient
        initialDraft={{
          title: "Mein Checkpoint",
          description: "",
          orientationHint: "",
          orientationAnchors: [{ id: "mein-checkpoint-a1", text: "Bestehender Anker" }],
        }}
        fixedId="mein-checkpoint"
      />);
    });

    await act(async () => {
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "+ Orientierungsfrage")?.click();
    });
    const anchorIdLabel = [...container.querySelectorAll("span")]
      .find((span) => span.textContent === "ID: mein-checkpoint-a2");
    const newAnchorInput = anchorIdLabel?.parentElement?.querySelectorAll("input")[1];
    expect(newAnchorInput).toBeDefined();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(newAnchorInput, "Neuer Anker");
      newAnchorInput?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "Speichern")?.click();
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/checkpoints/mein-checkpoint",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(container.textContent).toContain(`ID: ${persistedAnchorId}`);
    expect(container.textContent).not.toContain("ID: mein-checkpoint-a2");
    expect(container.textContent).toContain("Erfolgreich gespeichert.");
    await act(async () => root.unmount());
  });
});