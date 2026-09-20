/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import InquiryListClient from "@/app/inquiries/InquiryListClient";
import InquiryM3Client from "@/app/inquiries/[id]/m3/InquiryM3Client";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

const template = {
  id: "tpl-1",
  templateName: "Praxisvorlage",
  labels: "AU",
  dateLabel: "20.09.2026",
};

const m3Props = {
  sessionId: "sess-1",
  sections: [],
  actionCheckpoints: [],
  introCheckpoints: [],
  initialCheckpointStatuses: {},
  initialActionStatuses: {},
  initialExplanationOutputStatuses: {},
  initialResponseGoalSelection: {},
  actionIds: [],
  actionOrigins: {},
  initialGeneratedOutput: null,
  isConfirmed: false,
};

describe("Inquiry-Template-Verwaltungsaktionen", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("zeigt USER die Verwendung, aber keine Löschaktion", () => {
    act(() => {
      root.render(
        <InquiryListClient templates={[template]} canManageTemplates={false} />,
      );
    });

    expect(container.querySelector('[aria-label="Vorlage verwenden: Praxisvorlage"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Löschen: Praxisvorlage"]')).toBeNull();
  });

  it("zeigt OWNER die Löschaktion", () => {
    act(() => {
      root.render(
        <InquiryListClient templates={[template]} canManageTemplates />,
      );
    });

    expect(container.querySelector('[aria-label="Löschen: Praxisvorlage"]')).not.toBeNull();
  });

  it("zeigt Save-as-template nur OWNER", () => {
    act(() => {
      root.render(<InquiryM3Client {...m3Props} canManageTemplates={false} />);
    });
    expect(container.textContent).not.toContain("Aktuellen Stand als Vorlage speichern");

    act(() => {
      root.render(<InquiryM3Client {...m3Props} canManageTemplates />);
    });
    expect(container.textContent).toContain("Aktuellen Stand als Vorlage speichern");
  });
});