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
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
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
