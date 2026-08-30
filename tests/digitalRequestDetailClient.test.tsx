/**
 * @jest-environment jsdom
 *
 * Interaktive Tests für DigitalRequestDetailClient.
 *
 * Abgedeckt:
 *  1. "Fragebogen senden"-Button sichtbar wenn patient_reference gesetzt + Block ausgewählt
 *  2. Button deaktiviert wenn patient_reference fehlt
 *  3. Button deaktiviert wenn kein Block ausgewählt
 *  4. sent-Anfrage (isSent=true) → kein Send-Button
 *  5. Klick ruft zuerst PATCH, dann process auf
 *  6. Erfolgreicher Versand zeigt Erfolgsmeldung
 *  7. Mailfehler zeigt Fehlermeldung, Formular bleibt bearbeitbar
 *  8. Ablehnen-Button sichtbar/versteckt
 *  9. Ablehnen-Klick → POST /reject → reject-notice sichtbar
 * 10. Ablehnen-Fehler → Fehlermeldung
 * 11. Löschen-Button sichtbar/versteckt
 * 12. Löschen: confirm=false → kein fetch
 * 13. Löschen: confirm=true → DELETE → router.push
 * 14. Löschen-Fehler → Fehlermeldung
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

// ---------------------------------------------------------------------------
// useRouter-Mock (muss vor dem Komponenten-Import stehen)
// ---------------------------------------------------------------------------

const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

import { DigitalRequestDetailClient } from "@/components/DigitalRequestDetailClient";

// ---------------------------------------------------------------------------
// fetch-Mock
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

const BLOCKS = [{ id: "IDENTITAET", label: "Identität" }];

function defaultProps(
  over: Partial<React.ComponentProps<typeof DigitalRequestDetailClient>> = {},
): React.ComponentProps<typeof DigitalRequestDetailClient> {
  return {
    requestId: "dr-1",
    initialPatientReference: "PAT-001",
    initialSelectedBlockIds: ["IDENTITAET"],
    blocks: BLOCKS,
    isSent: false,
    ...over,
  };
}

async function renderComponent(
  props: React.ComponentProps<typeof DigitalRequestDetailClient>,
): Promise<{ container: HTMLElement; root: ReturnType<typeof createRoot> }> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<DigitalRequestDetailClient {...props} />);
  });
  return { container, root };
}

async function cleanup(root: ReturnType<typeof createRoot>, container: HTMLElement) {
  await act(async () => { root.unmount(); });
  document.body.removeChild(container);
}

// ---------------------------------------------------------------------------
// Tests: Button-Sichtbarkeit (initiale Render-Zustände)
// ---------------------------------------------------------------------------

describe("DigitalRequestDetailClient — Button-Sichtbarkeit", () => {
  afterEach(() => { mockFetch.mockReset(); });

  it("zeigt 'Fragebogen senden'-Button wenn patient_reference und Block vorhanden", async () => {
    const { container, root } = await renderComponent(defaultProps());
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="send-questionnaire-btn"]',
    );
    expect(btn).not.toBeNull();
    expect(btn!.disabled).toBe(false);
    await cleanup(root, container);
  });

  it("Button ist deaktiviert wenn patient_reference leer", async () => {
    const { container, root } = await renderComponent(
      defaultProps({ initialPatientReference: "" }),
    );
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="send-questionnaire-btn"]',
    );
    expect(btn).not.toBeNull();
    expect(btn!.disabled).toBe(true);
    await cleanup(root, container);
  });

  it("Button ist deaktiviert wenn keine Blöcke ausgewählt", async () => {
    const { container, root } = await renderComponent(
      defaultProps({ initialSelectedBlockIds: [] }),
    );
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="send-questionnaire-btn"]',
    );
    expect(btn).not.toBeNull();
    expect(btn!.disabled).toBe(true);
    await cleanup(root, container);
  });

  it("kein Send-Button wenn isSent=true", async () => {
    const { container, root } = await renderComponent(defaultProps({ isSent: true }));
    const btn = container.querySelector('[data-testid="send-questionnaire-btn"]');
    expect(btn).toBeNull();
    await cleanup(root, container);
  });

  it("zeigt nur übergebene Confirmation-Texte als Checkboxen ohne Texteditor", async () => {
    const { container, root } = await renderComponent(defaultProps({
      practiceConfirmationSlots: [
        { id: "PRACTICE_CONFIRMATION_1", text: "Erklärung 1" },
        { id: "PRACTICE_CONFIRMATION_3", text: "Erklärung 3" },
      ],
    }));
    expect(container.querySelectorAll("[data-confirmation-choice]")).toHaveLength(2);
    expect(container.textContent).toContain("Erklärung 1");
    expect(container.querySelector("textarea")).toBeNull();
    await cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// Tests: Klick-Interaktion
// ---------------------------------------------------------------------------

describe("DigitalRequestDetailClient — Send-Interaktion", () => {
  afterEach(() => { mockFetch.mockReset(); });

  it("ruft zuerst PATCH und dann process auf", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, status: "sent" }),
      });

    const { container, root } = await renderComponent(defaultProps());
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="send-questionnaire-btn"]',
    )!;

    await act(async () => { btn.click(); });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [call1Url, call1Opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(call1Url).toContain("/api/digital-requests/dr-1");
    expect(call1Opts.method).toBe("PATCH");

    const [call2Url, call2Opts] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(call2Url).toContain("/api/digital-requests/dr-1/process");
    expect(call2Opts.method).toBe("POST");

    await cleanup(root, container);
  });

  it("sendet ausgewählte Confirmation-ID ohne editierbaren Text", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, status: "sent" }) });
    const { container, root } = await renderComponent(defaultProps({
      practiceConfirmationSlots: [
        { id: "PRACTICE_CONFIRMATION_1", text: "Servertext" },
      ],
    }));
    const checkbox = container.querySelector<HTMLInputElement>(
      '[data-confirmation-choice="PRACTICE_CONFIRMATION_1"]',
    )!;
    await act(async () => checkbox.click());
    await act(async () => container.querySelector<HTMLButtonElement>(
      '[data-testid="send-questionnaire-btn"]',
    )!.click());

    const processOptions = mockFetch.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(String(processOptions.body))).toEqual({
      selected_confirmation_ids: ["PRACTICE_CONFIRMATION_1"],
    });
    expect(String(processOptions.body)).not.toContain("Servertext");
    await cleanup(root, container);
  });

  it("zeigt Erfolgsmeldung nach erfolgreichem Versand", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, status: "sent" }) });

    const { container, root } = await renderComponent(defaultProps());
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="send-questionnaire-btn"]',
    )!;

    await act(async () => { btn.click(); });

    expect(container.querySelector('[data-testid="send-success-notice"]')).not.toBeNull();
    // Nach erfolgreichem Versand: Send-Button nicht mehr sichtbar
    expect(container.querySelector('[data-testid="send-questionnaire-btn"]')).toBeNull();

    await cleanup(root, container);
  });

  it("zeigt Fehlermeldung und lässt Formular bearbeitbar bei Mailfehler", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ ok: false, error: "Mailversand fehlgeschlagen." }),
      });

    const { container, root } = await renderComponent(defaultProps());
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="send-questionnaire-btn"]',
    )!;

    await act(async () => { btn.click(); });

    const errorEl = container.querySelector('[data-testid="send-error"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toContain("Mailversand fehlgeschlagen");

    // Formular bleibt bearbeitbar (Send-Button noch sichtbar)
    expect(container.querySelector('[data-testid="send-questionnaire-btn"]')).not.toBeNull();

    await cleanup(root, container);
  });

  it("zeigt Fehlermeldung wenn PATCH-Schritt fehlschlägt", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: "Validierungsfehler." }),
    });

    const { container, root } = await renderComponent(defaultProps());
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-testid="send-questionnaire-btn"]',
    )!;

    await act(async () => { btn.click(); });

    // process darf NICHT aufgerufen worden sein
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const errorEl = container.querySelector('[data-testid="send-error"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toContain("Validierungsfehler");

    await cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// Tests: Ablehnen-Button
// ---------------------------------------------------------------------------

describe("DigitalRequestDetailClient — Ablehnen-Button", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockRouterPush.mockReset();
  });

  it("zeigt reject-btn wenn isSent=false und isRejected=false", async () => {
    const { container, root } = await renderComponent(defaultProps());
    expect(container.querySelector('[data-testid="reject-btn"]')).not.toBeNull();
    await cleanup(root, container);
  });

  it("kein reject-btn wenn isSent=true", async () => {
    const { container, root } = await renderComponent(defaultProps({ isSent: true }));
    expect(container.querySelector('[data-testid="reject-btn"]')).toBeNull();
    await cleanup(root, container);
  });

  it("kein reject-btn wenn isRejected=true (Prop)", async () => {
    const { container, root } = await renderComponent(defaultProps({ isRejected: true }));
    expect(container.querySelector('[data-testid="reject-btn"]')).toBeNull();
    await cleanup(root, container);
  });

  it("Klick auf reject-btn → POST /reject → reject-notice sichtbar, reject-btn weg", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, status: "rejected" }),
    });

    const { container, root } = await renderComponent(defaultProps());
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="reject-btn"]')!;

    await act(async () => { btn.click(); });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/digital-requests/dr-1/reject");
    expect(opts.method).toBe("POST");

    // reject-notice ist jetzt sichtbar
    expect(container.querySelector('[data-testid="reject-notice"]')).not.toBeNull();
    // reject-btn ist weg
    expect(container.querySelector('[data-testid="reject-btn"]')).toBeNull();

    await cleanup(root, container);
  });

  it("zeigt reject-Fehlermeldung wenn POST fehlschlägt", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ ok: false, error: "Mail konnte nicht gesendet werden." }),
    });

    const { container, root } = await renderComponent(defaultProps());
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="reject-btn"]')!;

    await act(async () => { btn.click(); });

    const errEl = container.querySelector('[data-testid="reject-error"]');
    expect(errEl).not.toBeNull();
    expect(errEl!.textContent).toContain("Mail");

    // reject-btn noch sichtbar (Fehlerfall)
    expect(container.querySelector('[data-testid="reject-btn"]')).not.toBeNull();

    await cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// Tests: Löschen-Button
// ---------------------------------------------------------------------------

describe("DigitalRequestDetailClient — Löschen-Button", () => {
  let originalConfirm: typeof window.confirm;

  beforeEach(() => {
    mockFetch.mockReset();
    mockRouterPush.mockReset();
    originalConfirm = window.confirm;
  });
  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it("zeigt delete-btn wenn canDelete=true", async () => {
    const { container, root } = await renderComponent(defaultProps({ canDelete: true }));
    expect(container.querySelector('[data-testid="delete-btn"]')).not.toBeNull();
    await cleanup(root, container);
  });

  it("kein delete-btn wenn isSent=true", async () => {
    const { container, root } = await renderComponent(defaultProps({ isSent: true }));
    expect(container.querySelector('[data-testid="delete-btn"]')).toBeNull();
    await cleanup(root, container);
  });

  it("confirm=false → kein fetch-Aufruf", async () => {
    window.confirm = jest.fn().mockReturnValue(false);
    const { container, root } = await renderComponent(defaultProps({ canDelete: true }));
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="delete-btn"]')!;

    await act(async () => { btn.click(); });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();

    await cleanup(root, container);
  });

  it("confirm=true → DELETE fetch → router.push('/digital-requests')", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const { container, root } = await renderComponent(defaultProps({ canDelete: true }));
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="delete-btn"]')!;

    await act(async () => { btn.click(); });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/digital-requests/dr-1");
    expect(opts.method).toBe("DELETE");

    expect(mockRouterPush).toHaveBeenCalledWith("/digital-requests");

    await cleanup(root, container);
  });

  it("zeigt delete-Fehlermeldung wenn DELETE fehlschlägt", async () => {
    window.confirm = jest.fn().mockReturnValue(true);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ ok: false, error: "Anfrage konnte nicht gelöscht werden." }),
    });

    const { container, root } = await renderComponent(defaultProps({ canDelete: true }));
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="delete-btn"]')!;

    await act(async () => { btn.click(); });

    const errEl = container.querySelector('[data-testid="delete-error"]');
    expect(errEl).not.toBeNull();
    expect(errEl!.textContent).toContain("gelöscht werden");

    // router.push wurde NICHT aufgerufen
    expect(mockRouterPush).not.toHaveBeenCalled();

    await cleanup(root, container);
  });
});
