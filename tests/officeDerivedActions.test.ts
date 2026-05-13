import { deriveTopicActions } from "@/lib/office/derivedActions";
import {
  OFFICE_TOPIC_EXTENDED_OPENING_HOURS,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
} from "@/lib/office/checkpointCatalog";
import { OfficeCheckpointKind, OfficeCheckpointState } from "@/lib/office/types";

describe("office derived actions", () => {
  it("erzeugt nur fuer NO/UNCLEAR Aktionen und ignoriert YES", () => {
    const actions = deriveTopicActions({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "YES",
            "M2-02": "NO",
            "M2-03": "UNCLEAR",
          },
        },
      ],
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]?.text).toBe("Nachweis fehlt");
  });

  it("mapped severity aus failureEffect und owner aus outcomeAudience", () => {
    const actions = deriveTopicActions({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-ARBEITSVERTRAG_FREIGABE",
          title: "Arbeitsvertrag freigegeben",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
          },
        },
      ],
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]?.severity).toBe("high");
    expect(actions[0]?.owner).toBe("CHEF");
    expect(actions[0]?.type).toBe("internal_decision_pending");
  });

  it("priorisiert topic actions nach severity", () => {
    const actions = deriveTopicActions({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
          },
        },
        {
          id: "NC-SYSTEMZUGRIFFE_EINGERICHTET",
          title: "Systemzugriffe eingerichtet",
          kind: OfficeCheckpointKind.ASSESSMENT,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
          },
        },
      ],
    });

    expect(actions).toHaveLength(2);
    expect(actions[0]?.severity).toBe("critical");
    expect(actions[1]?.severity).toBe("medium");
  });

  it("nutzt deklarative text-overrides", () => {
    const actions = deriveTopicActions({
      topicId: OFFICE_TOPIC_EXTENDED_OPENING_HOURS,
      checkpoints: [
        {
          id: "OE-02",
          title: "Arbeitszeiten angepasst",
          kind: OfficeCheckpointKind.RULE,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
          },
        },
      ],
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]?.text).toBe("Arbeitszeiten festlegen");
  });

  it("dedupliziert gleiche actions je checkpoint", () => {
    const actions = deriveTopicActions({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
            "M2-02": "UNCLEAR",
            "M2-03": "NO",
          },
        },
      ],
    });

    expect(actions).toHaveLength(1);
  });
});
