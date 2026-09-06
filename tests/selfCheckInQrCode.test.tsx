/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import { SelfCheckInQrCode } from "@/components/SelfCheckInQrCode";

jest.mock("qrcode", () => ({
  __esModule: true,
  default: { toDataURL: jest.fn() },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("SelfCheckInQrCode", () => {
  it("erzeugt das PNG nur aus der bereinigten Referenz und bietet Download an", async () => {
    const toDataURL = QRCode.toDataURL as jest.Mock;
    toDataURL.mockResolvedValue("data:image/png;base64,qr-png");
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(<SelfCheckInQrCode reference=" 001234 " />);
      await Promise.resolve();
    });

    expect(toDataURL).toHaveBeenCalledWith(
      "001234",
      expect.objectContaining({ width: 280 }),
    );
    const download = container.querySelector<HTMLAnchorElement>(
      "[data-self-check-in-qr-download]",
    );
    expect(download?.textContent).toBe("QR-Code speichern");
    expect(download?.getAttribute("download")).toBe("self-check-in-qr.png");
    expect(download?.getAttribute("href")).toBe("data:image/png;base64,qr-png");
    const visibleReference = container.querySelector(
      "[data-self-check-in-reference]",
    );
    expect(visibleReference?.textContent).toBe("001234");
    expect(container.textContent).not.toContain("Nutzen Sie bei Ihrem nächsten Besuch");

    await act(async () => root.unmount());
  });
});