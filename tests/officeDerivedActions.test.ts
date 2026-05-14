import { deriveTopicActions } from "@/lib/office/derivedActions";
import {
  OFFICE_TOPIC_EXTENDED_OPENING_HOURS,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
} from "@/lib/office/checkpointCatalog";
import { OfficeCheckpointKind, OfficeCheckpointState } from "@/lib/office/types";

describe("office derived actions", () => {
  it("state YES uebersteuert M2 und erzeugt keine offenen actions", () => {
    const actions = deriveTopicActions({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.YES,
          m2_answers: {
            "M2-01": "NO",
            "M2-02": "UNCLEAR",
          },
        },
      ],
    });

    expect(actions).toHaveLength(0);
  });

  it("state NO erzeugt genau eine nicht_vollstaendig-action auch bei M2 YES", () => {
    const actions = deriveTopicActions({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.NO,
          m2_answers: {
            "M2-01": "YES",
            "M2-02": "YES",
          },
        },
      ],
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]?.status).toBe("nicht_vollstaendig");
    expect(actions[0]?.text).toBe("Nicht ausreichend geklaert");
  });

  it("state OPEN bleibt M2-getrieben fuer NO/UNCLEAR", () => {
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

    expect(actions).toHaveLength(2);
    expect(actions.some((action) => action.status === "nicht_vollstaendig")).toBe(true);
    expect(actions.some((action) => action.status === "offen")).toBe(true);
    expect(actions[0]?.text).toContain("Nachweis fehlt");
  });

  it("mapped status und fachliche antwortquelle", () => {
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
    expect(actions[0]?.status).toBe("nicht_vollstaendig");
    expect(actions[0]?.answerOwner).toBe("Praxisleitung / Arbeitgeberunterlagen");
    expect(actions[0]?.type).toBe("internal_decision_pending");
  });

  it("setzt fuer UNCLEAR den status offen", () => {
    const actions = deriveTopicActions({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "UNCLEAR",
          },
        },
      ],
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]?.status).toBe("offen");
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
    expect(actions[0]?.text).toBe("Offen: Arbeitszeiten festlegen");
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
            "M2-02": "NO",
            "M2-03": "NO",
          },
        },
      ],
    });

    expect(actions).toHaveLength(1);
  });

  it("nutzt fuer approbation keine BACKOFFICE-quelle", () => {
    const actions = deriveTopicActions({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-APPROBATION",
          title: "Approbation",
          kind: OfficeCheckpointKind.DECISION,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-02": "NO",
          },
        },
      ],
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]?.answerOwner).toBe("Aerztekammer / Approbationsnachweis / Register");
    expect(actions[0]?.answerOwner).not.toContain("BACKOFFICE");
  });

  it("enthaelt keine severity-felder im public output", () => {
    const actions = deriveTopicActions({
      topicId: OFFICE_TOPIC_HIRING_REPLACEMENT,
      checkpoints: [
        {
          id: "NC-LANR_BSNR_ZUORDNUNG",
          title: "LANR und BSNR zugeordnet",
          kind: OfficeCheckpointKind.RULE,
          state: OfficeCheckpointState.OPEN,
          m2_answers: {
            "M2-01": "NO",
          },
        },
      ],
    });

    expect(actions).toHaveLength(1);
    expect("severity" in (actions[0] as object)).toBe(false);
  });
});
