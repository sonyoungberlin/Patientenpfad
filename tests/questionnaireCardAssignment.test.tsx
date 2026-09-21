import { renderToStaticMarkup } from "react-dom/server";

jest.mock("./../components/questionnaire/QuestionnaireDeleteButton", () => () => null);
jest.mock("./../components/questionnaire/QuestionnaireRestoreButton", () => () => null);
jest.mock("./../components/questionnaire/QuestionnairePatientAssignment", () =>
  ({ downloadArtifacts = true }: { downloadArtifacts?: boolean }) => (
    <span data-download-artifacts={String(downloadArtifacts)} />
  ),
);
jest.mock("./../components/questionnaire/QuestionnaireDetailsDisclosure", () => () => null);
jest.mock("./../components/questionnaire/KioskCheckInActions", () => ({ KioskCheckInActions: () => null }));
jest.mock("./../components/questionnaire/PublicCheckInActions", () => ({ PublicCheckInActions: () => null }));

import QuestionnaireCard from "../components/questionnaire/QuestionnaireCard";

const baseProps = {
  id: "session-1",
  displayedAt: new Date("2026-09-21T10:00:00.000Z"),
  patientReference: null,
  blockLabels: "Kontakt",
  displayStatus: "completed",
  statusLabel: "Abgeschlossen",
  submittedBy: "patient",
};

describe("QuestionnaireCard assignment download policy", () => {
  it.each([
    ["website", "false", {}],
    ["digital_request_follow_up", "false", {}],
    ["public_check_in", "false", { publicHandoffStatus: "waiting" }],
    ["kiosk_direct", "false", { kioskHandoffStatus: "waiting" }],
  ])("uses central auto-download for %s", (source, expected, handoffProps) => {
    const markup = renderToStaticMarkup(
      <QuestionnaireCard {...baseProps} source={source} {...handoffProps} />,
    );
    expect(markup).toContain(`data-download-artifacts="${expected}"`);
  });
});