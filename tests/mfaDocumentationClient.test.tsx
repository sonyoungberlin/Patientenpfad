/** @jest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { M2PrefillClient } from "@/app/cases/[id]/m2/M2PrefillClient";
import { M2MfaModeClient } from "@/app/cases/[id]/m2/M2MfaModeClient";
import { M2PatientConversationClient } from "@/app/cases/[id]/m2/M2PatientConversationClient";
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

async function toggleCheckbox(selector: string) {
  const checkbox = container.querySelector<HTMLInputElement>(selector);
  if (!checkbox) throw new Error(`Missing checkbox ${selector}`);
  await act(async () => {
    checkbox.click();
  });
}

describe("M2 MFA-Kurzdokumentation – Momentaufnahme", () => {
  it("wechselt Druckbutton und PDF-Ziel mit dem aktiven M2-Modus", async () => {
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    await act(async () => {
      root.render(
        <>
          <M2PatientConversationClient />
          <M2MfaModeClient />
          <M2PrefillClient {...initialProps} />
        </>,
      );
    });

    expect(container.querySelector('[data-m2-print-button="mfa"]')).not.toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-m2-patient-conversation-button]")?.click();
    });
    expect(container.querySelector('[data-m2-print-button="conversation"]')).not.toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-m2-print-button="conversation"]')?.click();
    });
    expect(open).toHaveBeenLastCalledWith(
      "/api/cases/case-123/m2/pdf?mode=conversation",
      "_blank",
      "noopener,noreferrer",
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-m2-mfa-mode-button]")?.click();
    });
    expect(container.querySelector('[data-m2-print-button="mfa"]')).not.toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-m2-print-button="mfa"]')?.click();
    });
    expect(open).toHaveBeenLastCalledWith(
      "/api/cases/case-123/m2/pdf?mode=mfa",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("bietet zwei Hauptauswahlen, kopiert den Text und lässt M2-Antworten unberührt", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await render();

    const section = container.querySelector("[data-mfa-documentation]");
    expect(section).not.toBeNull();
    expect(container.querySelector('[data-mfa-documentation-activity-option="contact-details-checked"]'))
      .not.toBeNull();
    expect(container.querySelector('[data-mfa-documentation-activity-option="medication-information-compared"]'))
      .toBeNull();

    const answer = container.querySelector<HTMLButtonElement>(
      '[data-m2-answer="K01:MFA-K01-01:ja"]',
    )!;
    await act(async () => answer.click());
    await toggleCheckbox('[data-mfa-documentation-activity-option="communication-record-reviewed"]');
    await toggleCheckbox('[data-mfa-documentation-activity-option="contact-attempt-made"]');
    await toggleCheckbox('[data-mfa-documentation-activity-option="contact-details-checked"]');
    await toggleCheckbox('[data-mfa-documentation-activity-option="contact-details-checked"]');
    expect(container.querySelector<HTMLInputElement>(
      '[data-mfa-documentation-activity-option="contact-details-checked"]',
    )?.checked).toBe(false);
    await toggleCheckbox('[data-mfa-documentation-activity-option="contact-details-checked"]');
    await toggleCheckbox('[data-mfa-documentation-activity-option="digital-offers-discussed"]');
    await toggleCheckbox('[data-mfa-documentation-next-step-option="identify-contact-person"]');
    await toggleCheckbox('[data-mfa-documentation-next-step-option="contact-patient-again"]');
    await toggleCheckbox('[data-mfa-documentation-next-step-option="update-contact-details"]');
    await toggleCheckbox('[data-mfa-documentation-next-step-option="offer-digital-support"]');
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
      "MFA: Krankenblatt gesichtet; Kontaktversuch unternommen; Kontaktdaten geprüft; Digitale Praxisangebote besprochen. Weiteres Vorgehen: Kontaktperson ermitteln; Patient erneut kontaktieren; Kontaktdaten aktualisieren; Unterstützung bei digitalen Angeboten anbieten. Ergänzung: Telefonische Rückfrage vereinbart.",
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-mfa-documentation-copy]")!.click();
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(
      "MFA: Krankenblatt gesichtet; Kontaktversuch unternommen; Kontaktdaten geprüft; Digitale Praxisangebote besprochen. Weiteres Vorgehen: Kontaktperson ermitteln; Patient erneut kontaktieren; Kontaktdaten aktualisieren; Unterstützung bei digitalen Angeboten anbieten. Ergänzung: Telefonische Rückfrage vereinbart.",
    );
    expect(container.querySelectorAll<HTMLInputElement>("[data-mfa-documentation-activity-option]:checked"))
      .toHaveLength(0);
    expect(container.querySelectorAll<HTMLInputElement>("[data-mfa-documentation-next-step-option]:checked"))
      .toHaveLength(0);
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
    await toggleCheckbox('[data-mfa-documentation-activity-option="communication-record-reviewed"]');
    await toggleCheckbox('[data-mfa-documentation-activity-option="contact-attempt-made"]');
    await toggleCheckbox('[data-mfa-documentation-next-step-option="identify-contact-person"]');
    await toggleCheckbox('[data-mfa-documentation-next-step-option="contact-patient-again"]');

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-mfa-documentation-copy]")!.click();
      await Promise.resolve();
    });

    expect(container.querySelector<HTMLInputElement>(
      '[data-mfa-documentation-activity-option="communication-record-reviewed"]',
    )?.checked).toBe(true);
    expect(container.querySelector<HTMLInputElement>(
      '[data-mfa-documentation-activity-option="contact-attempt-made"]',
    )?.checked).toBe(true);
    expect(container.querySelector<HTMLInputElement>(
      '[data-mfa-documentation-next-step-option="identify-contact-person"]',
    )?.checked).toBe(true);
    expect(container.querySelector<HTMLInputElement>(
      '[data-mfa-documentation-next-step-option="contact-patient-again"]',
    )?.checked).toBe(true);
    expect(container.querySelector("[data-mfa-documentation-preview]")?.textContent).toBe(
      "MFA: Krankenblatt gesichtet; Kontaktversuch unternommen. Weiteres Vorgehen: Kontaktperson ermitteln; Patient erneut kontaktieren.",
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("nicht kopiert");
  });

  it("blendet die Dokumentation im Patientengespräch aus und stellt sie nach erneutem Mount nicht wieder her", async () => {
    await render();
    await toggleCheckbox('[data-mfa-documentation-activity-option="communication-record-reviewed"]');
    await toggleCheckbox('[data-mfa-documentation-next-step-option="identify-contact-person"]');
    await act(async () => {
      window.dispatchEvent(new CustomEvent("m2-set-mode", { detail: "patient" }));
    });
    expect(container.querySelector("[data-mfa-documentation]")).toBeNull();

    await act(async () => {
      await root.unmount();
      root = createRoot(container);
    });
    await render();
    expect(container.querySelectorAll<HTMLInputElement>("[data-mfa-documentation-activity-option]:checked"))
      .toHaveLength(0);
    expect(container.querySelectorAll<HTMLInputElement>("[data-mfa-documentation-next-step-option]:checked"))
      .toHaveLength(0);
  });
});