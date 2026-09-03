/**
 * @jest-environment jsdom
 *
 * Tests für den direkten Office-Bewerbungsfragebogen – Du/Sie-Ansprache.
 */

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { NextRequest } from "next/server";

const mockFetch = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

global.fetch = mockFetch;

import OfficeQuestionnaireCreateClient from "@/components/office/OfficeQuestionnaireCreateClient";

const BLOCKS = [{ id: "BEWERBER_KONTAKT", label: "Kontaktdaten" }];

beforeEach(() => {
  mockFetch.mockReset();
});

describe("OfficeQuestionnaireCreateClient – salutation", () => {
  async function render() {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<OfficeQuestionnaireCreateClient blocks={BLOCKS} />);
    });
    return { container, root };
  }

  async function submit(container: HTMLElement) {
    const reference = container.querySelector<HTMLInputElement>(
      "#office-q-recipient",
    )!;
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      setValue.call(reference, "Anna Müller");
      reference.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const form = container.querySelector<HTMLFormElement>("form")!;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  }

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("zeigt Sie und Du und verwendet Sie als Default", async () => {
    const { container, root } = await render();

    expect(container.textContent).toContain("Sie");
    expect(container.textContent).toContain("Du");
    expect(
      container.querySelector<HTMLInputElement>('[data-testid="salutation-sie"]')!.checked,
    ).toBe(true);
    expect(
      container.querySelector<HTMLInputElement>('[data-testid="salutation-du"]')!.checked,
    ).toBe(false);

    await act(async () => root.unmount());
  });

  it("sendet die ausgewählte Du-Ansprache im POST-Body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, link: "https://example.test/q/token-1" }),
    });
    const { container, root } = await render();
    const du = container.querySelector<HTMLInputElement>('[data-testid="salutation-du"]')!;

    await act(async () => du.click());
    await submit(container);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as Record<string, unknown>;
    expect(body.salutation).toBe("du");
    expect(body.context).toBeUndefined();

    await act(async () => root.unmount());
  });
});
