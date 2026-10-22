import { buildOfficeBlocks } from "@/lib/office/officeBlocks";
import { buildOfficeSummaryText } from "@/lib/office/summary";
import { deriveHrSummaryStatus } from "@/lib/office/hrGovernance";
import { OfficeCheckpointKind, OfficeCheckpointState, type OfficeCheckpointSnapshot } from "@/lib/office/types";
import { OfficeWriteKind, OfficeWriteOutputKind, type OfficeWriteTemplate } from "@/lib/office/writeModules";
import { evaluateOfficeWriteModules } from "@/lib/office/writeRenderer";

function checkpoint(id: string, state: OfficeCheckpointState): OfficeCheckpointSnapshot {
  return {
    id,
    title: id,
    kind: OfficeCheckpointKind.FACT,
    state,
    not_required_allowed: state === OfficeCheckpointState.NOT_REQUIRED,
    not_required_reason: state === OfficeCheckpointState.NOT_REQUIRED ? "Für diesen Fall nicht einschlägig." : "",
  };
}

describe("Office NOT_REQUIRED status", () => {
  it("wird weder als Nachweis erledigt noch als offener Blocker behandelt", () => {
    const item = checkpoint("CP-OPTIONAL", OfficeCheckpointState.NOT_REQUIRED);
    const blocks = buildOfficeBlocks({ checkpoints: [item] });
    expect(blocks[0]?.status).toBe("nicht_erforderlich");
    expect(blocks[0]?.actions).toEqual([]);

    const summary = buildOfficeSummaryText({
      topicTitle: "Test",
      checkpoints: [item],
    });
    expect(summary).toContain("Nicht erforderlich");
    expect(summary).toContain("Für diesen Fall nicht einschlägig.");
    const clearedSection = summary.split("Geklaerte Bereiche\n")[1]?.split("\n\n")[0] ?? "";
    expect(clearedSection).not.toContain("CP-OPTIONAL");
  });

  it("stellt einen teilweise nicht erforderlichen Abschnitt nicht als vollständig belegt dar", () => {
    const blocks = buildOfficeBlocks({
      checkpoints: [
        checkpoint("CP-DONE", OfficeCheckpointState.YES),
        checkpoint("CP-OPTIONAL", OfficeCheckpointState.NOT_REQUIRED),
      ],
    });
    expect(blocks[0]?.status).toBe("mit_nicht_erforderlich");
  });

  it("behandelt NOT_REQUIRED in HR-Governance nicht als Freigabenachweis", () => {
    const summary = deriveHrSummaryStatus(
      ["HR-GOV-A", "HR-GOV-B", "HR-GOV-C", "HR-GOV-D"].map((id) =>
        checkpoint(id, OfficeCheckpointState.NOT_REQUIRED),
      ),
    );
    expect(summary.status).toBe("AUSSTEHEND");
  });

  it("blockiert keine Folgeaktion als offen, aber erfüllt keine YES-Bedingung", () => {
    const template: OfficeWriteTemplate = {
      id: "status-check",
      label: "Statusprüfung",
      outputKind: OfficeWriteOutputKind.STELLUNGNAHME,
      writeKind: OfficeWriteKind.AUTHORITY_RESPONSE,
      trigger: {
        topicIds: [],
        blockedWhenAnyOpen: ["CP-OPTIONAL"],
        allOf: [{ checkpointId: "CP-OPTIONAL", state: "YES" }],
      },
      inputSchema: [],
      bodyTemplate: "Text",
      smoothingEnabled: false,
      audience: "INTERN",
      estimatedLength: "SHORT",
    };
    const result = evaluateOfficeWriteModules({
      topicId: "test",
      checkpoints: [checkpoint("CP-OPTIONAL", OfficeCheckpointState.NOT_REQUIRED)],
      templates: [template],
    })[0];
    expect(result?.isAvailable).toBe(false);
    expect(result?.unavailableReason).toContain("muss zuerst als geklärt");
  });
});
