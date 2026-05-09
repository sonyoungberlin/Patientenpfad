import {
  OfficeCheckpointKind,
  OfficeCheckpointState,
  type OfficeCheckpointSnapshot,
} from "@/lib/office/types";

export const OFFICE_MANAGEMENT_KIND_ANLASS = "ANLASS";
export const OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST = "PFLICHT_FRIST";
export const OFFICE_MANAGEMENT_KIND_VERANTWORTUNG = "VERANTWORTUNG";
export const OFFICE_MANAGEMENT_KIND_NACHWEIS = "NACHWEIS";
export const OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG = "ENTSCHEIDUNG";
export const OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE = "EXTERNE_STELLE";
export const OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT = "RISIKO_ABHAENGIGKEIT";

export type OfficeManagementCheckpointKind =
  | typeof OFFICE_MANAGEMENT_KIND_ANLASS
  | typeof OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST
  | typeof OFFICE_MANAGEMENT_KIND_VERANTWORTUNG
  | typeof OFFICE_MANAGEMENT_KIND_NACHWEIS
  | typeof OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG
  | typeof OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE
  | typeof OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT;

const OFFICE_MANAGEMENT_KINDS: readonly OfficeManagementCheckpointKind[] = [
  OFFICE_MANAGEMENT_KIND_ANLASS,
  OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
  OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
  OFFICE_MANAGEMENT_KIND_NACHWEIS,
  OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
  OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
  OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT,
] as const;

export const OFFICE_TOPIC_HIRING_REPLACEMENT = "arzt-anstellen-nachbesetzung";
export const OFFICE_TOPIC_KV_BILLING = "kv-schreiben-abrechnungsrueckfrage";
export const OFFICE_TOPIC_REGRESS = "regress-wirtschaftlichkeitspruefung";
export const OFFICE_TOPIC_CLOSURE_COVERAGE = "praxisschliessung-urlaubsvertretung";
export const OFFICE_TOPIC_SEAT_APPROVAL = "arztsitz-zulassung-genehmigungen";
export const OFFICE_TOPIC_APPLICATION_MANAGEMENT = "antragsmanagement-fristen-zustaendigkeiten";
export const OFFICE_TOPIC_CONTINUING_EDUCATION = "weiterbildung-fortbildungspunkte-nachweise";
export const OFFICE_TOPIC_REPORTING_DUTIES = "meldepflichten-zustaendige-stellen";

export type OfficeTopicId =
  | typeof OFFICE_TOPIC_HIRING_REPLACEMENT
  | typeof OFFICE_TOPIC_KV_BILLING
  | typeof OFFICE_TOPIC_REGRESS
  | typeof OFFICE_TOPIC_CLOSURE_COVERAGE
  | typeof OFFICE_TOPIC_SEAT_APPROVAL
  | typeof OFFICE_TOPIC_APPLICATION_MANAGEMENT
  | typeof OFFICE_TOPIC_CONTINUING_EDUCATION
  | typeof OFFICE_TOPIC_REPORTING_DUTIES;

export type OfficeTopic = {
  id: OfficeTopicId;
  title: string;
};

export type OfficeCheckpointTemplate = {
  id: string;
  title: string;
  kind: OfficeCheckpointKind;
  officeKind?: OfficeManagementCheckpointKind;
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
  {
    id: OFFICE_TOPIC_REGRESS,
    title: "Regresspruefung / Wirtschaftlichkeitspruefung",
  },
  {
    id: OFFICE_TOPIC_CLOSURE_COVERAGE,
    title: "Praxisschliessung / Urlaubsvertretung",
  },
  {
    id: OFFICE_TOPIC_SEAT_APPROVAL,
    title: "Arztsitz / Zulassung / Genehmigungen",
  },
  {
    id: OFFICE_TOPIC_APPLICATION_MANAGEMENT,
    title: "Antragsmanagement mit Fristen und Zustaendigkeiten",
  },
  {
    id: OFFICE_TOPIC_CONTINUING_EDUCATION,
    title: "Weiterbildung / Fortbildungspunkte / Nachweise",
  },
  {
    id: OFFICE_TOPIC_REPORTING_DUTIES,
    title: "Meldepflichten und zustaendige Stellen",
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
  [OFFICE_TOPIC_REGRESS]: [
    {
      id: "RG-01",
      title: "Anlass und gepruefter Zeitraum dokumentiert",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
    },
    {
      id: "RG-02",
      title: "Pflichten, Fristen und Formvorgaben geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
    },
    {
      id: "RG-03",
      title: "Interne Verantwortung fuer die Bearbeitung benannt",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
    },
    {
      id: "RG-04",
      title: "Erforderliche Nachweise und Unterlagen zusammengestellt",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
    },
    {
      id: "RG-05",
      title: "Entscheidung zum Vorgehen verbindlich festgelegt",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
    },
    {
      id: "RG-06",
      title: "Zustaendige externe Stelle und Kontaktkanal dokumentiert",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
    },
    {
      id: "RG-07",
      title: "Risiken und Abhaengigkeiten transparent bewertet",
      kind: OfficeCheckpointKind.ASSESSMENT,
      officeKind: OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT,
    },
  ],
  [OFFICE_TOPIC_CLOSURE_COVERAGE]: [
    {
      id: "UV-01",
      title: "Anlass, Zeitraum und betroffene Leistungen erfasst",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
    },
    {
      id: "UV-02",
      title: "Pflichten, Fristen und Informationswege geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
    },
    {
      id: "UV-03",
      title: "Verantwortung fuer Planung und Kommunikation benannt",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
    },
    {
      id: "UV-04",
      title: "Vertretungsnachweise und interne Unterlagen gesichert",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
    },
    {
      id: "UV-05",
      title: "Entscheidung zum Vertretungsmodell getroffen",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
    },
    {
      id: "UV-06",
      title: "Externe Stellen und Kontaktkanaele abgestimmt",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
    },
  ],
  [OFFICE_TOPIC_SEAT_APPROVAL]: [
    {
      id: "ZA-01",
      title: "Anlass und Zielbild fuer Arztsitz/Zulassung dokumentiert",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
    },
    {
      id: "ZA-02",
      title: "Pflichten, Fristen und Verfahrensregeln geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
    },
    {
      id: "ZA-03",
      title: "Verantwortung fuer alle Verfahrensschritte zugewiesen",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
    },
    {
      id: "ZA-04",
      title: "Antragsnachweise und erforderliche Unterlagen geprueft",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
    },
    {
      id: "ZA-05",
      title: "Entscheidung zu Reihenfolge und Freigaben getroffen",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
    },
    {
      id: "ZA-06",
      title: "Externe Stelle und Kommunikationsweg festgelegt",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
    },
  ],
  [OFFICE_TOPIC_APPLICATION_MANAGEMENT]: [
    {
      id: "AM-01",
      title: "Anlass und Antragstyp klar beschrieben",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
    },
    {
      id: "AM-02",
      title: "Pflichtschritte, Fristen und Einreichungsregeln geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
    },
    {
      id: "AM-03",
      title: "Verantwortung und Vertretung eindeutig festgelegt",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
    },
    {
      id: "AM-04",
      title: "Nachweise und Dokumentenstand vollstaendig erfasst",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
    },
    {
      id: "AM-05",
      title: "Entscheidung zur Einreichung und Nachsteuerung getroffen",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
    },
    {
      id: "AM-06",
      title: "Risiken und Abhaengigkeiten im Ablauf bewertet",
      kind: OfficeCheckpointKind.ASSESSMENT,
      officeKind: OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT,
    },
  ],
  [OFFICE_TOPIC_CONTINUING_EDUCATION]: [
    {
      id: "WB-01",
      title: "Anlass und betroffene Rollen dokumentiert",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
    },
    {
      id: "WB-02",
      title: "Pflichten, Fristen und Nachweisregeln geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
    },
    {
      id: "WB-03",
      title: "Verantwortung fuer Nachverfolgung festgelegt",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
    },
    {
      id: "WB-04",
      title: "Nachweise, Punkte und Dokumentation zusammengefuehrt",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
    },
    {
      id: "WB-05",
      title: "Entscheidung zu Massnahmen und Priorisierung getroffen",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
    },
    {
      id: "WB-06",
      title: "Externe Stelle fuer Nachweise abgestimmt",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
    },
  ],
  [OFFICE_TOPIC_REPORTING_DUTIES]: [
    {
      id: "MP-01",
      title: "Meldeanlass und betroffene Einheit dokumentiert",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
    },
    {
      id: "MP-02",
      title: "Meldepflichten, Fristen und Formvorgaben geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
    },
    {
      id: "MP-03",
      title: "Verantwortung fuer Meldung und Freigabe benannt",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
    },
    {
      id: "MP-04",
      title: "Meldenachweise und Pflichtunterlagen erfasst",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
    },
    {
      id: "MP-05",
      title: "Entscheidung zur finalen Abgabe getroffen",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
    },
    {
      id: "MP-06",
      title: "Zustaendige externe Stelle und Kanal dokumentiert",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
    },
  ],
};

export function listOfficeManagementCheckpointKinds(): readonly OfficeManagementCheckpointKind[] {
  return OFFICE_MANAGEMENT_KINDS;
}

export function isOfficeManagementCheckpointKind(
  value: string,
): value is OfficeManagementCheckpointKind {
  return (OFFICE_MANAGEMENT_KINDS as readonly string[]).includes(value);
}

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
    ...(checkpoint.officeKind ? { office_kind: checkpoint.officeKind } : {}),
    state: OfficeCheckpointState.OPEN,
    known_note: "",
    missing_note: "",
    answer_source: "",
    deadline: "",
    responsible_role: "",
    authority: "",
    required_documents: [],
    escalation_needed: false,
  }));
}
