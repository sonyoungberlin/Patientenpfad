/** @jest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { M2PrefillClient } from "@/app/cases/[id]/m2/M2PrefillClient";
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
  title: "Erreichbarkeit des Patienten",
  category: CheckpointCategory.O,
  status: "TO_DO",
  m4: { type: "ACTION", text: "Hinweis" },
};

const initialProps = {
  caseId: "case-123",
  checkpoints: [checkpoint],
  m1SnapshotInitial: {
    blocks: {
      kommunikation: "unklar",
      medizinische_lage: "klar",
      versorgung_im_alltag: "klar",
      pflegebeobachtung: "klar",
    },
  },
  initialPrefillBySource: { mfa: {}, conversation: {} },
  initialPreparationMode: "mfa",
};

let container: HTMLDivElement;
let root: Root;
let fetchMock: jest.Mock;
let originalClipboard: PropertyDescriptor | undefined;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
    .IS_REACT_ACT_ENVIRONMENT = true;
  originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  fetchMock = jest.fn().mockResolvedValue({ ok: true } as Response);
  global.fetch = fetchMock as typeof fetch;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  if (originalClipboard) {
    Object.defineProperty(navigator, "clipboard", originalClipboard);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
  jest.restoreAllMocks();
});

async function render(initialPreparationMode = "mfa") {
  await act(async () => {
    root.render(
      <M2PrefillClient {...initialProps} initialPreparationMode={initialPreparationMode} />,
    );
  });
}

async function changeSelect(selector: string, value: string) {
  const select = container.querySelector<HTMLSelectElement>(selector);
  if (!select) throw new Error(`Missing select ${selector}`);
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("M2 MFA-Kurzdokumentation – Momentaufnahme", () => {
  it("bietet zwei Hauptauswahlen, kopiert den Text und lässt M2-Antworten unberührt", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await render();

    const section = container.querySelector("[data-mfa-documentation]");
    expect(section).not.toBeNull();
    const activities = container.querySelector<HTMLSelectElement>(
      "[data-mfa-documentation-activity]",
    )!;
    expect(Array.from(activities.options).map((option) => option.value)).toContain(
      "contact-details-checked",
    );
    expect(Array.from(activities.options).map((option) => option.value)).not.toContain(
      "medication-information-compared",
    );
    expect(container.querySelectorAll("[data-mfa-documentation] select")).toHaveLength(2);

    const answer = container.querySelector<HTMLButtonElement>(
      '[data-m2-answer="K01:MFA-K01-01:ja"]',
    )!;
    await act(async () => answer.click());
    await changeSelect("[data-mfa-documentation-activity]", "communication-record-reviewed");
    await changeSelect("[data-mfa-documentation-next-step]", "identify-contact-person");
    const additionalText = container.querySelector<HTMLTextAreaElement>(
      "[data-mfa-documentation-additional]",
    )!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(
        additionalText,
        "Telefonische Rückfrage vereinbart",
      );
      additionalText.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(container.querySelector("[data-mfa-documentation-preview]")?.textContent).toBe(
      "MFA: Krankenblatt gesichtet. Kontaktperson wird ermittelt. Ergänzung: Telefonische Rückfrage vereinbart.",
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-mfa-documentation-copy]")!.click();
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(
      "MFA: Krankenblatt gesichtet. Kontaktperson wird ermittelt. Ergänzung: Telefonische Rückfrage vereinbart.",
    );
    expect(container.querySelector<HTMLSelectElement>("[data-mfa-documentation-activity]")?.value)
      .toBe("");
    expect(container.querySelector<HTMLSelectElement>("[data-mfa-documentation-next-step]")?.value)
      .toBe("");
    expect(container.querySelector<HTMLTextAreaElement>("[data-mfa-documentation-additional]")?.value)
      .toBe("");
    expect(answer.className).toContain("active");
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-m2-save-draft]")!.click();
      await Promise.resolve();
    });
    const savedBody = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      prefill: Record<string, Record<string, string>>;
    };
    expect(savedBody.prefill.K01?.["MFA-K01-01"]).toBe("ja");
    expect(savedBody).not.toHaveProperty("documentation");
  });

  it("behält Auswahl und Vorschau bei fehlgeschlagenem Kopieren", async () => {
    const writeText = jest.fn().mockRejectedValue(new Error("clipboard denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await render();
    await changeSelect("[data-mfa-documentation-activity]", "communication-record-reviewed");
    await changeSelect("[data-mfa-documentation-next-step]", "identify-contact-person");

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-mfa-documentation-copy]")!.click();
      await Promise.resolve();
    });

    expect(container.querySelector<HTMLSelectElement>("[data-mfa-documentation-activity]")?.value)
      .toBe("communication-record-reviewed");
    expect(container.querySelector("[data-mfa-documentation-preview]")?.textContent).toBe(
      "MFA: Krankenblatt gesichtet. Kontaktperson wird ermittelt.",
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("nicht kopiert");
  });

  it("blendet die Dokumentation im Patientengespräch aus und stellt sie nach erneutem Mount nicht wieder her", async () => {
    await render();
    await changeSelect("[data-mfa-documentation-activity]", "communication-record-reviewed");
    await changeSelect("[data-mfa-documentation-next-step]", "identify-contact-person");
    await act(async () => {
      window.dispatchEvent(new CustomEvent("m2-set-mode", { detail: "patient" }));
    });
    expect(container.querySelector("[data-mfa-documentation]")).toBeNull();

    await act(async () => {
      await root.unmount();
      root = createRoot(container);
    });
    await render();
    expect(container.querySelector<HTMLSelectElement>("[data-mfa-documentation-activity]")?.value)
      .toBe("");
    expect(container.querySelector<HTMLSelectElement>("[data-mfa-documentation-next-step]")?.value)
      .toBe("");
  });
});