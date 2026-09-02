/**
 * @jest-environment jsdom
 */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import InquiryM3Client, {
  type M3ActionData,
  type M3SectionData,
} from "@/app/inquiries/[id]/m3/InquiryM3Client";
import { INQUIRY_CHECKPOINT_CATALOG_V2 } from "@/lib/inquiries/inquiryCheckpointCatalog";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const VIDEO_ACTION_IDS = [
  "BOOK_APPOINTMENT",
  "VIDEO_CONSULTATION_BOOK",
  "APPOINTMENT_OR_VIDEO_CONSULTATION",
] as const;

function actionData(id: string): M3ActionData {
  const checkpoint = INQUIRY_CHECKPOINT_CATALOG_V2[id];
  return {
    id,
    label: checkpoint.label,
    actionCategory: checkpoint.actionCategory,
  };
}

function sectionData(inquiryId: "AU" | "APPOINTMENT"): M3SectionData {
  const boundId = inquiryId === "AU" ? "CARE_CHANNEL_CHOICE" : "ACUTE_OPEN_CONSULTATION_ACTION";
  const bound = INQUIRY_CHECKPOINT_CATALOG_V2[boundId];
  return {
    inquiryId,
    label: inquiryId,
    decisionCheckpointId: "",
    decisionLabel: "",
    decisionQuestions: [],
    specificCheckpoints: [],
    boundActionCheckpoints: [{
      id: boundId,
      label: bound.label,
      actionCategory: bound.actionCategory,
      hideWhenAny: [],
    }],
  };
}

function renderClient(inquiryId: "AU" | "APPOINTMENT") {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const actionCheckpoints = VIDEO_ACTION_IDS.map(actionData);
  const actionOrigins = Object.fromEntries(
    VIDEO_ACTION_IDS.map((id) => [id, [inquiryId]]),
  );

  act(() => {
    root.render(
      <InquiryM3Client
        sessionId="session-1"
        sections={[sectionData(inquiryId)]}
        actionCheckpoints={actionCheckpoints}
        introCheckpoints={[]}
        initialCheckpointStatuses={{}}
        initialActionStatuses={{}}
        initialExplanationOutputStatuses={{}}
        initialResponseGoalSelection={{}}
        actionIds={[...VIDEO_ACTION_IDS]}
        actionOrigins={actionOrigins}
        initialGeneratedOutput={null}
        isConfirmed={false}
        practiceConfirmationSlots={[]}
      />,
    );
  });

  return { container, root };
}

function cleanup(root: Root, container: HTMLDivElement) {
  act(() => root.unmount());
  container.remove();
}

function rowForLabel(container: HTMLElement, label: string): HTMLElement {
  const labelNode = Array.from(container.querySelectorAll("div")).find(
    (node) => node.textContent === label,
  );
  if (!labelNode?.parentElement) throw new Error(`Action row not found: ${label}`);
  return labelNode.parentElement;
}

describe("InquiryM3Client – manuelle Single-Origin-Actions", () => {
  it.each(["AU", "APPOINTMENT"] as const)(
    "zeigt Video-Actions für %s ohne initialen ACTIVE-Status",
    (inquiryId) => {
      const { container, root } = renderClient(inquiryId);

      expect(container.textContent).toContain("Videosprechstunde vereinbaren");
      expect(container.textContent).toContain("Persönlicher Termin oder Videosprechstunde");
      expect(rowForLabel(container, "Videosprechstunde vereinbaren").querySelectorAll("button")).toHaveLength(2);
      expect(rowForLabel(container, "Persönlicher Termin oder Videosprechstunde").querySelectorAll("button")).toHaveLength(2);

      cleanup(root, container);
    },
  );

  it("aktiviert Video manuell und deaktiviert die beiden Alternativen", () => {
    const { container, root } = renderClient("AU");
    const videoRow = rowForLabel(container, "Videosprechstunde vereinbaren");
    const activeButton = Array.from(videoRow.querySelectorAll("button")).find(
      (button) => button.textContent === "Aktiv",
    );

    act(() => activeButton?.click());

    expect(container.textContent).toContain("Bitte vereinbaren Sie einen Termin zur Videosprechstunde.");
    expect(container.textContent).not.toContain("Termine können über den Online-Kalender vereinbart werden.");
    expect(container.textContent).not.toContain(
      "Bitte vereinbaren Sie einen persönlichen Termin oder einen Termin zur Videosprechstunde.",
    );

    cleanup(root, container);
  });
});