import {
  OfficeCheckpointKind,
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";

export const OFFICE_TOPIC_HIRING_REPLACEMENT = "arzt-anstellen-nachbesetzung";
export const OFFICE_TOPIC_KV_BILLING = "kv-schreiben-abrechnungsrueckfrage";

export type OfficeTopicId =
  | typeof OFFICE_TOPIC_HIRING_REPLACEMENT
  | typeof OFFICE_TOPIC_KV_BILLING;

export type OfficeTopic = {
  id: OfficeTopicId;
  title: string;
};

export type OfficeCheckpointTemplate = {
  id: string;
  title: string;
  kind: OfficeCheckpointKind;
};

const TOPICS: readonly OfficeTopic[] = [
  {
    id: OFFICE_TOPIC_HIRING_REPLACEMENT,
    title: "Arzt anstellen / Nachbesetzung",
  },
  {
    id: OFFICE_TOPIC_KV_BILLING,
    title: "KV-Schreiben / Abrechnungsrueckfrage",
  },
] as const;

const CHECKPOINTS_BY_TOPIC: Record<OfficeTopicId, readonly OfficeCheckpointTemplate[]> = {
  [OFFICE_TOPIC_HIRING_REPLACEMENT]: [
    {
      id: "HR-01",
      title: "Ausloeser und Dringlichkeit dokumentiert",
      kind: OfficeCheckpointKind.FACT,
    },
    {
      id: "HR-02",
      title: "Mindestanforderungen an die Stelle geklaert",
      kind: OfficeCheckpointKind.RULE,
    },
    {
      id: "HR-03",
      title: "Rueckmeldung durch Praxisleitung/Partner eingeholt",
      kind: OfficeCheckpointKind.ASSESSMENT,
    },
    {
      id: "HR-04",
      title: "Entscheidungspfad fuer Nachbesetzung benannt",
      kind: OfficeCheckpointKind.DECISION,
    },
    {
      id: "HR-05",
      title: "Zustaendige Antwortquelle fuer offene Punkte benannt",
      kind: OfficeCheckpointKind.SOURCE,
    },
  ],
  [OFFICE_TOPIC_KV_BILLING]: [
    {
      id: "KV-01",
      title: "Beanstandeter Sachverhalt aus dem Schreiben erfasst",
      kind: OfficeCheckpointKind.FACT,
    },
    {
      id: "KV-02",
      title: "Frist und formale Anforderungen geprueft",
      kind: OfficeCheckpointKind.RULE,
    },
    {
      id: "KV-03",
      title: "Interne fachliche Einschaetzung eingeholt",
      kind: OfficeCheckpointKind.ASSESSMENT,
    },
    {
      id: "KV-04",
      title: "Vorgehen zur Rueckmeldung entschieden",
      kind: OfficeCheckpointKind.DECISION,
    },
    {
      id: "KV-05",
      title: "Antwortquelle fuer fehlende Informationen benannt",
      kind: OfficeCheckpointKind.SOURCE,
    },
  ],
};

export function listOfficeTopics(): readonly OfficeTopic[] {
  return TOPICS;
}

export function isOfficeTopicId(value: string): value is OfficeTopicId {
  return TOPICS.some((topic) => topic.id === value);
}

export function getOfficeTopic(topicId: OfficeTopicId): OfficeTopic {
  const topic = TOPICS.find((item) => item.id === topicId);
  if (!topic) {
    throw new Error(`Unknown office topic: ${topicId}`);
  }
  return topic;
}

export function getOfficeCheckpointCatalog(
  topicId: OfficeTopicId,
): readonly OfficeCheckpointTemplate[] {
  return CHECKPOINTS_BY_TOPIC[topicId] ?? [];
}

export function buildInitialSnapshotForTopic(
  topicId: OfficeTopicId,
): OfficeCheckpointSnapshot[] {
  return getOfficeCheckpointCatalog(topicId).map((checkpoint) => ({
    id: checkpoint.id,
    title: checkpoint.title,
    kind: checkpoint.kind,
    state: OfficeCheckpointState.OPEN,
    known_note: "",
    missing_note: "",
    answer_source: "",
  }));
}
