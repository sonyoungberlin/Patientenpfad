import {
  OfficeCheckpointType,
  OfficeCheckpointKind,
  OfficeFailureEffect,
  OfficeOutcomeAudience,
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
export const OFFICE_TOPIC_PLAUSIBILITY_BILLING = "plausibilitaetspruefung-abrechnung";
export const OFFICE_TOPIC_HONORAR_NOTICE_REVIEW = "honorarbescheid-pruefung";
export const OFFICE_TOPIC_REGRESS = "regress-wirtschaftlichkeitspruefung";
export const OFFICE_TOPIC_CLOSURE_COVERAGE = "praxisschliessung-urlaubsvertretung";
export const OFFICE_TOPIC_SEAT_APPROVAL = "arztsitz-zulassung-genehmigungen";
export const OFFICE_TOPIC_APPLICATION_MANAGEMENT = "antragsmanagement-fristen-zustaendigkeiten";
export const OFFICE_TOPIC_CONTINUING_EDUCATION = "weiterbildung-fortbildungspunkte-nachweise";
export const OFFICE_TOPIC_CME_GENERAL_MEDICINE = "fortbildungspunkte-allgemeinmedizin";
export const OFFICE_TOPIC_MFA_HIRING = "mfa-einstellung";
export const OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING = "mfa-azubi-unter-18-einstellung";
export const OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE = "medizinisches-geraet-anschaffung";
export const OFFICE_TOPIC_DATA_PROTECTION_INCIDENT = "datenschutzvorfall";
export const OFFICE_TOPIC_EXTENDED_OPENING_HOURS = "oeffnungszeiten-erweiterung-praxis";
export const OFFICE_TOPIC_REPORTING_DUTIES = "meldepflichten-zustaendige-stellen";

export type OfficeTopicId =
  | typeof OFFICE_TOPIC_HIRING_REPLACEMENT
  | typeof OFFICE_TOPIC_KV_BILLING
  | typeof OFFICE_TOPIC_PLAUSIBILITY_BILLING
  | typeof OFFICE_TOPIC_HONORAR_NOTICE_REVIEW
  | typeof OFFICE_TOPIC_REGRESS
  | typeof OFFICE_TOPIC_CLOSURE_COVERAGE
  | typeof OFFICE_TOPIC_SEAT_APPROVAL
  | typeof OFFICE_TOPIC_APPLICATION_MANAGEMENT
  | typeof OFFICE_TOPIC_CONTINUING_EDUCATION
  | typeof OFFICE_TOPIC_CME_GENERAL_MEDICINE
  | typeof OFFICE_TOPIC_MFA_HIRING
  | typeof OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING
  | typeof OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE
  | typeof OFFICE_TOPIC_DATA_PROTECTION_INCIDENT
  | typeof OFFICE_TOPIC_EXTENDED_OPENING_HOURS
  | typeof OFFICE_TOPIC_REPORTING_DUTIES;

export type OfficeTopic = {
  id: OfficeTopicId;
  title: string;
};

export type OfficeCheckpointTemplate = {
  id: string;
  title: string;
  checkpointType?: OfficeCheckpointType;
  failureEffect?: OfficeFailureEffect;
  outcomeAudience?: OfficeOutcomeAudience[];
  kind: OfficeCheckpointKind;
  officeKind?: OfficeManagementCheckpointKind;
  governanceCategory?: "BEFUGNIS" | "GENEHMIGUNG" | "STRUKTUR" | "COMPLIANCE";
  legalRefs?: readonly string[];
  requiredEvidenceKeys?: readonly string[];
  optionalEvidenceKeys?: readonly string[];
  authorityKeys?: readonly string[];
  decisionRuleKey?: string;
  m4RuleKey?: string;
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
    id: OFFICE_TOPIC_PLAUSIBILITY_BILLING,
    title: "Plausibilitätsprüfung / Abrechnungsauffälligkeiten",
  },
  {
    id: OFFICE_TOPIC_HONORAR_NOTICE_REVIEW,
    title: "Prüfung Honorarbescheid KV",
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
    id: OFFICE_TOPIC_CME_GENERAL_MEDICINE,
    title: "Fortbildungspunkte Allgemeinmedizin überwachen",
  },
  {
    id: OFFICE_TOPIC_MFA_HIRING,
    title: "Einstellung Medizinische Fachangestellte",
  },
  {
    id: OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
    title: "Einstellung MFA-Auszubildende unter 18 Jahren",
  },
  {
    id: OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE,
    title: "Neues medizinisches Gerät anschaffen",
  },
  {
    id: OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
    title: "Datenschutzvorfall bearbeiten",
  },
  {
    id: OFFICE_TOPIC_EXTENDED_OPENING_HOURS,
    title: "Erweiterung der Praxisöffnungszeiten",
  },
  {
    id: OFFICE_TOPIC_REPORTING_DUTIES,
    title: "Meldepflichten und zustaendige Stellen",
  },
] as const;

const CHECKPOINTS_BY_TOPIC: Record<OfficeTopicId, readonly OfficeCheckpointTemplate[]> = {
  [OFFICE_TOPIC_HIRING_REPLACEMENT]: [
    {
      id: "NC-REGISTERSTATUS",
      title: "Registerstatus",
      kind: OfficeCheckpointKind.DECISION,
    },
    {
      id: "NC-APPROBATION",
      title: "Approbation",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.GATEKEEPER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "NC-FACHARZTQUALIFIKATION",
      title: "Facharztqualifikation",
      kind: OfficeCheckpointKind.DECISION,
    },
    {
      id: "NC-BERUFSHAFTPFLICHT",
      title: "Berufshaftpflicht",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "NC-TAETIGKEITSUMFANG",
      title: "Taetigkeitsumfang",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "NC-EXTERNE_STELLE",
      title: "Zustaendige externe Stelle",
      kind: OfficeCheckpointKind.DECISION,
    },
    {
      id: "NC-ANTRAGSWEG",
      title: "Antragsweg",
      kind: OfficeCheckpointKind.DECISION,
    },
    {
      id: "NC-GENEHMIGUNGSSTATUS",
      title: "Genehmigungsstatus",
      kind: OfficeCheckpointKind.DECISION,
    },
    {
      id: "NC-BETRIEBSSTAETTENSTRUKTUR",
      title: "Betriebsstaettenstruktur",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "NC-ARBEITSVERTRAG_FREIGABE",
      title: "Arbeitsvertrag freigegeben",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
    },
    {
      id: "NC-LANR_BSNR_ZUORDNUNG",
      title: "LANR und BSNR zugeordnet",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "NC-SYSTEMZUGRIFFE_EINGERICHTET",
      title: "Systemzugriffe eingerichtet",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
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
  [OFFICE_TOPIC_PLAUSIBILITY_BILLING]: [
    {
      id: "PL-01",
      title: "Quartalsprofil geprüft",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "PL-02",
      title: "Tagesprofile geprüft",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "PL-03",
      title: "Leistung vollständig dokumentiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.GATEKEEPER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "PL-04",
      title: "Genehmigungspflichtige Leistungen geprüft",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
      failureEffect: OfficeFailureEffect.GATEKEEPER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "PL-05",
      title: "Persönliche Leistungserbringung gesichert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "PL-06",
      title: "Abrechnung vor Versand intern freigegeben",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
  ],
  [OFFICE_TOPIC_HONORAR_NOTICE_REVIEW]: [
    {
      id: "HB-01",
      title: "Fallzahlen abgeglichen",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "HB-02",
      title: "Abgerechnete GOP vergütet",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.GATEKEEPER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "HB-03",
      title: "Kürzungen nachvollziehbar",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
    },
    {
      id: "HB-04",
      title: "Genehmigungen berücksichtigt",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "HB-05",
      title: "RLV und QZV geprüft",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "HB-06",
      title: "Widerspruchsfrist überwacht",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
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
    {
      id: "UV-PATIENTENINFO",
      title: "Patienteninformation veröffentlicht",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "UV-NOTFALLVERSORGUNG",
      title: "Notfallversorgung geregelt",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
    },
    {
      id: "UV-TERMINMANAGEMENT",
      title: "Termine angepasst",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "UV-ABRECHNUNGSZUORDNUNG",
      title: "Abrechnungszuordnung Vertretung festgelegt",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
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
  [OFFICE_TOPIC_CME_GENERAL_MEDICINE]: [
    {
      id: "FB-01",
      title: "Fortbildungszeitraum dokumentiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "FB-02",
      title: "Punkte vollständig erfasst",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "FB-03",
      title: "Nachweise archiviert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "FB-04",
      title: "Fristen überwacht",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
    },
    {
      id: "FB-05",
      title: "Meldung an Ärztekammer geprüft",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "FB-06",
      title: "Sanktionsrisiken bewertet",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
    },
    {
      id: "FB-AUFHOLPLAN",
      title: "Aufholplan dokumentiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
    },
  ],
  [OFFICE_TOPIC_MFA_HIRING]: [
    {
      id: "MF-01",
      title: "Berufsabschluss geprüft",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "MF-02",
      title: "Arbeitsvertrag freigegeben",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
    },
    {
      id: "MF-03",
      title: "Personalunterlagen vollständig",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "MF-04",
      title: "Sozialversicherung angemeldet",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "MF-05",
      title: "Zugriffsrechte eingerichtet",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "MF-06",
      title: "Einarbeitung dokumentiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
  ],
  [OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING]: [
    {
      id: "MA-01",
      title: "Jugendarbeitsschutz geprüft",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
    },
    {
      id: "MA-02",
      title: "Erstuntersuchung nachgewiesen",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.GATEKEEPER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "MA-03",
      title: "Ausbildungsvertrag registriert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "MA-04",
      title: "Arbeitszeiten begrenzt",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
    },
    {
      id: "MA-05",
      title: "Einwilligungen vollständig",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "MA-06",
      title: "Unterweisungen dokumentiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
  ],
  [OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE]: [
    {
      id: "MG-01",
      title: "Medizinprodukt bewertet",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
    },
    {
      id: "MG-02",
      title: "Genehmigungspflicht geprüft",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
    },
    {
      id: "MG-03",
      title: "Einweisung dokumentiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.GATEKEEPER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "MG-04",
      title: "Wartung organisiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "MG-05",
      title: "Abrechnungsfähigkeit geprüft",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
    },
    {
      id: "MG-06",
      title: "Gerätedokumentation archiviert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
  ],
  [OFFICE_TOPIC_DATA_PROTECTION_INCIDENT]: [
    {
      id: "DS-01",
      title: "Vorfall dokumentiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
    {
      id: "DS-02",
      title: "Betroffene Daten bewertet",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
    },
    {
      id: "DS-03",
      title: "Meldepflicht geprüft",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
    },
    {
      id: "DS-04",
      title: "Zugriffe gesichert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.GATEKEEPER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "DS-05",
      title: "Betroffene informiert",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
    },
    {
      id: "DS-06",
      title: "Folgemaßnahmen umgesetzt",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [
        OfficeOutcomeAudience.BACKOFFICE,
        OfficeOutcomeAudience.CHEF,
      ],
    },
  ],
  [OFFICE_TOPIC_EXTENDED_OPENING_HOURS]: [
    {
      id: "OE-01",
      title: "Personalverfügbarkeit geprüft",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
    },
    {
      id: "OE-02",
      title: "Arbeitszeiten angepasst",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
    },
    {
      id: "OE-03",
      title: "KV-Anforderungen geprüft",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
    },
    {
      id: "OE-04",
      title: "Patienteninformation veröffentlicht",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "OE-05",
      title: "Dienstplanung dokumentiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "OE-06",
      title: "Praxisbetrieb abgesichert",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
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

// Temporary additive fallback only.
// These defaults are intentionally neutral and MUST NOT be interpreted as
// final fachliche Typisierung. Final values will be set explicitly per checkpoint
// in a dedicated migration patch.
function getCheckpointTypeWithLegacyFallback(
  checkpoint: OfficeCheckpointTemplate,
): OfficeCheckpointType {
  return checkpoint.checkpointType ?? OfficeCheckpointType.KONTEXT_INFORMATION;
}

// Temporary additive fallback only.
// No semantic derivation from legacy fields (kind/officeKind) is performed here.
function getFailureEffectWithLegacyFallback(
  checkpoint: OfficeCheckpointTemplate,
): OfficeFailureEffect {
  return checkpoint.failureEffect ?? OfficeFailureEffect.NONE;
}

// Temporary additive fallback only.
// Audience defaults to BACKOFFICE until explicit per-checkpoint mapping is added.
function getOutcomeAudienceWithLegacyFallback(
  checkpoint: OfficeCheckpointTemplate,
): OfficeOutcomeAudience[] {
  if (checkpoint.outcomeAudience && checkpoint.outcomeAudience.length > 0) {
    return checkpoint.outcomeAudience;
  }
  return [OfficeOutcomeAudience.BACKOFFICE];
}

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
    checkpointType: getCheckpointTypeWithLegacyFallback(checkpoint),
    failureEffect: getFailureEffectWithLegacyFallback(checkpoint),
    outcomeAudience: getOutcomeAudienceWithLegacyFallback(checkpoint),
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
