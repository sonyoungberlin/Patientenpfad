import {
  buildDigitalRequestFollowUpSnapshot,
  parseDigitalRequestInboxContext,
} from "@/lib/questionnaire/digitalRequestSnapshot";
import { buildQuestionnaireInboxDetail } from "@/lib/questionnaire/inboxDetail";

const baseSession = {
  patient_reference: null,
  submitted_at: new Date("2026-09-17T10:00:00.000Z"),
  selected_block_ids: [],
  deduplicated_questions: [],
  answers: null,
  frozen_blocks: null,
  source: "digital_request_follow_up",
  session_kind: "patient_communication",
  internal_workflow_id: null,
};

describe("DigitalRequest-Follow-up-Snapshot", () => {
  it("übernimmt die ursprünglichen Daten und zentrale Topic-Labels", () => {
    const context = parseDigitalRequestInboxContext(buildDigitalRequestFollowUpSnapshot({
      submitter_name: "Erika Muster",
      birth_date: "1980-01-02",
      submitter_email: "erika@example.com",
      patient_relationship: "new_patient",
      request_intent: "digital_request",
      concern_text: "Bitte um Rückruf",
      requested_topics: ["AU", "PRESCRIPTION"],
    }));

    expect(context).toEqual(expect.objectContaining({
      submitter_name: "Erika Muster",
      birth_date: "1980-01-02",
      submitter_email: "erika@example.com",
      patient_relationship_label: "Neupatient/in",
      request_intent_label: "Digitale Anfrage senden",
      concern_text: "Bitte um Rückruf",
      requested_topic_labels: ["Arbeitsunfähigkeitsbescheinigung", "Rezept"],
    }));
  });

  it("stellt den Inbox-Kontext oberhalb der Antworten bereit", () => {
    const detail = buildQuestionnaireInboxDetail({
      ...baseSession,
      digital_request_snapshot: {
        submitter_name: "Erika Muster",
        birth_date: null,
        submitter_email: "erika@example.com",
        patient_relationship: "existing_patient",
        request_intent: "existing_appointment",
        concern_text: "Terminfrage",
        requested_topics: ["REFERRAL"],
      },
    });

    expect(detail.digitalRequestContext).toEqual(expect.objectContaining({
      submitter_name: "Erika Muster",
      patient_relationship_label: "Bestandspatient/in",
      request_intent_label: "Termin vereinbaren",
      requested_topic_labels: ["Überweisung"],
    }));
    expect(detail.questions).toEqual([]);
  });

  it("bleibt ohne oder mit beschädigtem Snapshot kompatibel", () => {
    expect(buildQuestionnaireInboxDetail(baseSession).digitalRequestContext).toBeNull();
    expect(parseDigitalRequestInboxContext({ requested_topics: [1, null] }))
      .toEqual(expect.objectContaining({ requested_topics: [], requested_topic_labels: [] }));
  });
});