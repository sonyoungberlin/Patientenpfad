/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { M2TokenFormClient } from "@/app/m2-link/[token]/M2TokenFormClient";

jest.mock("@/components/SelfCheckInQrCode", () => ({
  SelfCheckInQrCode: ({ reference }: { reference: string }) => (
    <div data-self-check-in-qr data-reference={reference}>{reference}</div>
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const fetchMock = jest.fn();
global.fetch = fetchMock;

describe("M2TokenFormClient QR-Abschluss", () => {
  beforeEach(() => fetchMock.mockReset());

  it("zeigt QR erst nach erfolgreichem Submit", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <M2TokenFormClient
          token="token-1"
          checkpoints={[]}
          patientReference="001234"
          selfCheckInQrReference="001234"
        />,
      );
    });

    expect(container.querySelector("[data-self-check-in-qr]")).toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-open-questionnaire]")!.click();
    });
    expect(container.querySelector("[data-self-check-in-qr]")).toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-m2-submit]")!.click();
      await Promise.resolve();
    });

    expect(container.querySelector("[data-m2-submitted]")).not.toBeNull();
    expect(container.querySelector("[data-reference='001234']")).not.toBeNull();
    expect(container.textContent).toContain("Fragebogen abgeschlossen");
    expect(container.textContent).toContain("Vielen Dank.");
    expect(container.textContent).toContain("001234");
    expect(container.querySelector("[data-patient-reference-value]")?.textContent).toBe("001234");
    expect(container.textContent?.match(/001234/g)).toHaveLength(2);

    await act(async () => root.unmount());
  });

  it("lässt die bestehende Dankesansicht ohne QR unverändert", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(<M2TokenFormClient token="token-1" checkpoints={[]} />);
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-open-questionnaire]")!.click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-m2-submit]")!.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Fragebogen abgeschlossen");
    expect(container.textContent).toContain("Vielen Dank.");
    expect(container.querySelector("[data-self-check-in-qr]")).toBeNull();
    expect(container.textContent).not.toContain("001234");
    expect(container.textContent).not.toContain("Ihre Patienten-ID");

    await act(async () => root.unmount());
  });

  it("zeigt eine vorhandene Patienten-ID unabhängig vom QR-Flag", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(
        <M2TokenFormClient
          token="token-1"
          checkpoints={[]}
          patientReference=" 001234 "
        />,
      );
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-open-questionnaire]")!.click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-m2-submit]")!.click();
      await Promise.resolve();
    });

    expect(container.querySelector("[data-patient-reference-value]")?.textContent).toBe("001234");
    expect(container.querySelector("[data-self-check-in-qr]")).toBeNull();

    await act(async () => root.unmount());
  });
});