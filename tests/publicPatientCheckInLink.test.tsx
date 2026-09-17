/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import PublicPatientCheckInLink from "@/components/practice/PublicPatientCheckInLink";

jest.mock("qrcode", () => ({
  __esModule: true,
  default: { toDataURL: jest.fn() },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("PublicPatientCheckInLink", () => {
  it("verwendet für Öffnen und QR-Code exakt dieselbe öffentliche URL", async () => {
    const link = "https://praxis.example.com/formular/praxis-am-markt/check-in";
    const toDataURL = QRCode.toDataURL as jest.Mock;
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    toDataURL.mockResolvedValue("data:image/png;base64,public-check-in");
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(<PublicPatientCheckInLink link={link} />);
      await Promise.resolve();
    });

    expect(toDataURL).toHaveBeenCalledWith(link, expect.objectContaining({ width: 280 }));
    expect(container.querySelector<HTMLInputElement>("[data-testid='patient-check-in-link-input']")?.value).toBe(link);
    expect(container.querySelector<HTMLAnchorElement>("a[target='_blank']")?.href).toBe(link);
    await act(async () => {
      container.querySelector<HTMLButtonElement>("button")?.click();
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith(link);
    const download = container.querySelector<HTMLAnchorElement>("[data-testid='patient-check-in-qr-download']");
    expect(download?.href).toBe("data:image/png;base64,public-check-in");
    expect(download?.download).toBe("patienten-check-in-qr.png");

    await act(async () => root.unmount());
  });
});