/**
 * @jest-environment jsdom
 *
 * Tests für OfficeApplicationDetailClient – Du/Sie-Ansprache
 *
 * Prüft:
 * - Ansprache-Selector ist sichtbar (Radio-Buttons)
 * - Default-Ansprache ist "sie"
 * - Auswahl "du" möglich
 * - Beim Versand wird salutation im POST-Body mitgeschickt
 * - Default "sie" wird auch beim Versand ohne Änderung geschickt
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

import { OfficeApplicationDetailClient } from "@/components/office/OfficeApplicationDetailClient";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const BLOCKS = [{ id: "BEWERBER_KONTAKT", label: "Kontaktdaten" }];

function defaultProps() {
  return {
    applicationId: "app-1",
    submitterName: "Anna Müller",
    roleLabels: ["MFA"],
    initialSelectedBlockIds: ["BEWERBER_KONTAKT"],
    blocks: BLOCKS,
    isSent: false,
  };
}

async function renderComponent(
  props: React.ComponentProps<typeof OfficeApplicationDetailClient>,
): Promise<{ container: HTMLElement; root: ReturnType<typeof createRoot> }> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<OfficeApplicationDetailClient {...props} />);
  });
  return { container, root };
}

async function cleanup(
  root: ReturnType<typeof createRoot>,
  container: HTMLElement,
) {
  await act(async () => {
    root.unmount();
  });
  document.body.removeChild(container);
}

afterEach(() => {
  mockFetch.mockReset();
  mockRouterPush.mockReset();
});

// ---------------------------------------------------------------------------
// Sichtbarkeit
// ---------------------------------------------------------------------------

describe("OfficeApplicationDetailClient – Ansprache-Selector", () => {
  it("zeigt 'sie'-Radio-Button", async () => {
    const { container, root } = await renderComponent(defaultProps());
    const radio = container.querySelector<HTMLInputElement>(
      '[data-testid="salutation-sie"]',
    );
    expect(radio).not.toBeNull();
    await cleanup(root, container);
  });

  it("zeigt 'du'-Radio-Button", async () => {
    const { container, root } = await renderComponent(defaultProps());
    const radio = container.querySelector<HTMLInputElement>(
      '[data-testid="salutation-du"]',
    );
    expect(radio).not.toBeNull();
    await cleanup(root, container);
  });

  it("Default ist 'sie'", async () => {
    const { container, root } = await renderComponent(defaultProps());
    const sieTgl = container.querySelector<HTMLInputElement>(
      '[data-testid="salutation-sie"]',
    );
    const duTgl = container.querySelector<HTMLInputElement>(
      '[data-testid="salutation-du"]',
    );
    expect(sieTgl!.checked).toBe(true);
    expect(duTgl!.checked).toBe(false);
    await cleanup(root, container);
  });

  it("Ansprache-Selector ist deaktiviert wenn isSent=true", async () => {
    const { container, root } = await renderComponent(
      { ...defaultProps(), isSent: true },
    );
    const sieTgl = container.querySelector<HTMLInputElement>(
      '[data-testid="salutation-sie"]',
    );
    expect(sieTgl!.disabled).toBe(true);
    await cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// Interaktion
// ---------------------------------------------------------------------------

describe("OfficeApplicationDetailClient – Du wählen", () => {
  it("kann auf 'du' umgestellt werden", async () => {
    const { container, root } = await renderComponent(defaultProps());

    const duTgl = container.querySelector<HTMLInputElement>(
      '[data-testid="salutation-du"]',
    )!;

    await act(async () => {
      duTgl.click();
    });

    expect(duTgl.checked).toBe(true);
    const sieTgl = container.querySelector<HTMLInputElement>(
      '[data-testid="salutation-sie"]',
    )!;
    expect(sieTgl.checked).toBe(false);

    await cleanup(root, container);
  });
});

// ---------------------------------------------------------------------------
// Versand: salutation im POST-Body
// ---------------------------------------------------------------------------

describe("OfficeApplicationDetailClient – Versand mit salutation", () => {
  it("schickt salutation='sie' (Default) im process-POST-Body", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    const { container, root } = await renderComponent(defaultProps());
    const sendBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="send-questionnaire-btn"]',
    )!;

    await act(async () => {
      sendBtn.click();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [processUrl, processOpts] = mockFetch.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(processUrl).toContain("/process");
    expect(processOpts.method).toBe("POST");
    const body = JSON.parse(processOpts.body as string) as Record<string, unknown>;
    expect(body.salutation).toBe("sie");

    await cleanup(root, container);
  });

  it("schickt salutation='du' wenn Du ausgewählt wurde", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    const { container, root } = await renderComponent(defaultProps());

    const duTgl = container.querySelector<HTMLInputElement>(
      '[data-testid="salutation-du"]',
    )!;
    await act(async () => {
      duTgl.click();
    });

    const sendBtn = container.querySelector<HTMLButtonElement>(
      '[data-testid="send-questionnaire-btn"]',
    )!;
    await act(async () => {
      sendBtn.click();
    });

    const [, processOpts] = mockFetch.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(processOpts.body as string) as Record<string, unknown>;
    expect(body.salutation).toBe("du");

    await cleanup(root, container);
  });
});
