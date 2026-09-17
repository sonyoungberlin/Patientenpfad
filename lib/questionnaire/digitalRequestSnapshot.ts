import { topicLabel } from "@/lib/digitalRequests/topics";

export type DigitalRequestFollowUpSnapshot = {
  submitter_name: string | null;
  birth_date: string | null;
  submitter_email: string | null;
  patient_relationship: string | null;
  request_intent: string | null;
  concern_text: string | null;
  requested_topics: string[] | null;
};

export type DigitalRequestInboxContext = DigitalRequestFollowUpSnapshot & {
  patient_relationship_label: string | null;
  request_intent_label: string | null;
  requested_topic_labels: string[];
};

export function buildDigitalRequestFollowUpSnapshot(input: {
  submitter_name?: string | null;
  birth_date?: string | null;
  submitter_email?: string | null;
  patient_relationship?: string | null;
  request_intent?: string | null;
  concern_text?: string | null;
  requested_topics?: unknown;
}): DigitalRequestFollowUpSnapshot {
  return {
    submitter_name: input.submitter_name ?? null,
    birth_date: input.birth_date ?? null,
    submitter_email: input.submitter_email ?? null,
    patient_relationship: input.patient_relationship ?? null,
    request_intent: input.request_intent ?? null,
    concern_text: input.concern_text ?? null,
    requested_topics: Array.isArray(input.requested_topics)
      ? input.requested_topics.filter((topic): topic is string => typeof topic === "string")
      : null,
  };
}

export function parseDigitalRequestInboxContext(
  value: unknown,
): DigitalRequestInboxContext | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const snapshot = buildDigitalRequestFollowUpSnapshot({
    submitter_name: typeof raw.submitter_name === "string" ? raw.submitter_name : null,
    birth_date: typeof raw.birth_date === "string" ? raw.birth_date : null,
    submitter_email: typeof raw.submitter_email === "string" ? raw.submitter_email : null,
    patient_relationship: typeof raw.patient_relationship === "string" ? raw.patient_relationship : null,
    request_intent: typeof raw.request_intent === "string" ? raw.request_intent : null,
    concern_text: typeof raw.concern_text === "string" ? raw.concern_text : null,
    requested_topics: raw.requested_topics,
  });

  return {
    ...snapshot,
    patient_relationship_label:
      snapshot.patient_relationship === "existing_patient"
        ? "Bestandspatient/in"
        : snapshot.patient_relationship === "new_patient"
          ? "Neupatient/in"
          : null,
    request_intent_label:
      snapshot.request_intent === "existing_appointment"
        ? "Termin vereinbaren"
        : snapshot.request_intent === "digital_request"
          ? "Digitale Anfrage senden"
          : null,
    requested_topic_labels: (snapshot.requested_topics ?? []).map(topicLabel),
  };
}