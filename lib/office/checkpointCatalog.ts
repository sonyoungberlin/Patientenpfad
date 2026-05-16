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
      legalRefs: ["SGB_V_PAR_95", "HEILBERG_BLN"],
      authorityKeys: ["AERZTEKAMMER_BERLIN"],
      requiredEvidenceKeys: ["REGISTERAUSZUG_AERZTE"],
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
      legalRefs: ["BAEO_PAR_3"],
      authorityKeys: ["AERZTEKAMMER_BERLIN"],
      requiredEvidenceKeys: ["APPROBATIONSURKUNDE"],
    },
    {
      id: "NC-FACHARZTQUALIFIKATION",
      title: "Facharztqualifikation",
      kind: OfficeCheckpointKind.DECISION,
      legalRefs: ["HEILBERG_BLN"],
      authorityKeys: ["AERZTEKAMMER_BERLIN"],
      requiredEvidenceKeys: ["FACHARZTURKUNDE"],
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
      legalRefs: ["BAEO_PAR_21"],
      authorityKeys: ["AERZTEKAMMER_BERLIN"],
      requiredEvidenceKeys: ["BERUFSHAFTPFLICHT_NACHWEIS"],
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
      legalRefs: ["SGB_V_PAR_95", "AERZTE_ZV_PAR_32B"],
      authorityKeys: ["ZULASSUNGSAUSSCHUSS_BERLIN"],
    },
    {
      id: "NC-EXTERNE_STELLE",
      title: "Zustaendige externe Stelle",
      kind: OfficeCheckpointKind.DECISION,
      legalRefs: ["SGB_V_PAR_95", "AERZTE_ZV_PAR_32B"],
      authorityKeys: [
        "ZULASSUNGSAUSSCHUSS_BERLIN",
        "KV_BERLIN",
        "AERZTEKAMMER_BERLIN",
      ],
    },
    {
      id: "NC-ANTRAGSWEG",
      title: "Antragsweg",
      kind: OfficeCheckpointKind.DECISION,
      legalRefs: ["AERZTE_ZV_PAR_32B", "SGB_V_PAR_95"],
      authorityKeys: ["ZULASSUNGSAUSSCHUSS_BERLIN"],
    },
    {
      id: "NC-GENEHMIGUNGSSTATUS",
      title: "Genehmigungsstatus",
      kind: OfficeCheckpointKind.DECISION,
      legalRefs: ["AERZTE_ZV_PAR_32B", "SGB_V_PAR_95"],
      authorityKeys: ["ZULASSUNGSAUSSCHUSS_BERLIN", "KV_BERLIN"],
      requiredEvidenceKeys: ["ANSTELLUNGSGENEHMIGUNG_ZA"],
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
      legalRefs: ["BMV_AE", "SGB_V_PAR_95"],
      authorityKeys: ["KV_BERLIN"],
    },
    {
      id: "NC-ARBEITSVERTRAG_FREIGABE",
      title: "Arbeitsvertrag freigegeben",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["NACHWG", "AERZTE_ZV_PAR_32B"],
      requiredEvidenceKeys: ["ARBEITSVERTRAG"],
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
      legalRefs: ["SGB_V_PAR_295", "BMV_AE"],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["LANR_BSNR_BESTAETIGUNG"],
    },
    {
      id: "NC-SYSTEMZUGRIFFE_EINGERICHTET",
      title: "Systemzugriffe eingerichtet",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["DSGVO_ART_32"],
      optionalEvidenceKeys: ["DS_TOM_DOKU"],
    },
  ],
  [OFFICE_TOPIC_KV_BILLING]: [
    {
      id: "KV-01",
      title: "Beanstandeter Sachverhalt aus dem Schreiben erfasst",
      kind: OfficeCheckpointKind.FACT,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["KV_SCHREIBEN_ABRECHNUNG"],
    },
    {
      id: "KV-02",
      title: "Frist und formale Anforderungen geprueft",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_106D"],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["KV_SCHREIBEN_ABRECHNUNG"],
    },
    {
      id: "KV-03",
      title: "Interne fachliche Einschaetzung eingeholt",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      optionalEvidenceKeys: [
        "QUARTALSPROFIL_PVS",
        "ABRECHNUNGSDATENEXPORT",
        "HONORARBESCHEID_KV",
      ],
    },
    {
      id: "KV-04",
      title: "Vorgehen zur Rueckmeldung entschieden",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_106D"],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["STELLUNGNAHME_KV_PLAUSIBILITAET"],
    },
    {
      id: "KV-05",
      title: "Antwortquelle fuer fehlende Informationen benannt",
      kind: OfficeCheckpointKind.SOURCE,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      authorityKeys: ["KV_BERLIN"],
      optionalEvidenceKeys: [
        "ABRECHNUNGSDATENEXPORT",
        "QUARTALSPROFIL_PVS",
        "HONORARBESCHEID_KV",
      ],
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
      legalRefs: ["SGB_V_PAR_106D", "SGB_V_PAR_106A"],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["QUARTALSPROFIL_PVS"],
      optionalEvidenceKeys: ["STELLUNGNAHME_KV_PLAUSIBILITAET"],
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
      legalRefs: ["SGB_V_PAR_106D", "SGB_V_PAR_106A"],
      authorityKeys: ["KV_BERLIN"],
      optionalEvidenceKeys: [
        "TAGESPROFIL_PVS",
        "ZEITPROFIL_PVS",
        "STELLUNGNAHME_KV_PLAUSIBILITAET",
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
      legalRefs: ["SGB_V_PAR_295", "BMV_AE"],
      optionalEvidenceKeys: ["ABRECHNUNGSDATENEXPORT"],
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
      legalRefs: ["BMV_AE"],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["GENEHMIGUNG_LEISTUNG_KV"],
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
      legalRefs: ["BMV_AE"],
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
      optionalEvidenceKeys: ["FREIGABE_ABRECHNUNG_INTERN"],
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
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["HONORARBESCHEID_KV"],
      optionalEvidenceKeys: ["ABRECHNUNGSDATENEXPORT", "QUARTALSPROFIL_PVS"],
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
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["HONORARBESCHEID_KV"],
      optionalEvidenceKeys: ["ABRECHNUNGSDATENEXPORT"],
    },
    {
      id: "HB-03",
      title: "Kürzungen nachvollziehbar",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["SGB_V_PAR_106D"],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["HONORARBESCHEID_KV"],
    },
    {
      id: "HB-04",
      title: "Genehmigungen berücksichtigt",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["GENEHMIGUNG_LEISTUNG_KV"],
      optionalEvidenceKeys: ["HONORARBESCHEID_KV"],
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
      legalRefs: ["SGB_V_PAR_87B"],
      authorityKeys: ["KV_BERLIN"],
      optionalEvidenceKeys: ["RLV_QZV_MITTEILUNG_KV", "HONORARBESCHEID_KV"],
    },
    {
      id: "HB-06",
      title: "Widerspruchsfrist überwacht",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["SGG_PAR_84"],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["HONORARBESCHEID_KV"],
      optionalEvidenceKeys: ["WIDERSPRUCH_KV"],
    },
  ],
  [OFFICE_TOPIC_REGRESS]: [
    {
      id: "RG-01",
      title: "Anlass und gepruefter Zeitraum dokumentiert",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_106", "SGB_V_PAR_106B"],
      optionalEvidenceKeys: ["PRUEFBESCHEID_PRUEFUNGSSTELLE", "ANHOERUNG_PRUEFUNGSSTELLE"],
    },
    {
      id: "RG-02",
      title: "Pflichten, Fristen und Formvorgaben geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_106", "SGB_V_PAR_106B", "SGG_PAR_84"],
    },
    {
      id: "RG-03",
      title: "Interne Verantwortung fuer die Bearbeitung benannt",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "RG-04",
      title: "Erforderliche Nachweise und Unterlagen zusammengestellt",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_106B"],
      requiredEvidenceKeys: ["VERORDNUNGSDATEN_PVS"],
      optionalEvidenceKeys: [
        "PRAXISBESONDERHEITEN_DOKU",
        "MEDIZINISCHE_BEGRUENDUNG",
      ],
    },
    {
      id: "RG-05",
      title: "Entscheidung zum Vorgehen verbindlich festgelegt",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["SGG_PAR_84", "SGB_V_PAR_106C"],
      optionalEvidenceKeys: [
        "STELLUNGNAHME_PRUEFUNGSSTELLE",
        "WIDERSPRUCH_PRUEFUNGSSTELLE",
      ],
    },
    {
      id: "RG-06",
      title: "Zustaendige externe Stelle und Kontaktkanal dokumentiert",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_106C"],
      authorityKeys: ["PRUEFUNGSSTELLE_BERLIN", "KV_BERLIN"],
      requiredEvidenceKeys: ["PRUEFBESCHEID_PRUEFUNGSSTELLE"],
    },
    {
      id: "RG-07",
      title: "Risiken und Abhaengigkeiten transparent bewertet",
      kind: OfficeCheckpointKind.ASSESSMENT,
      officeKind: OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
    },
  ],
  [OFFICE_TOPIC_CLOSURE_COVERAGE]: [
    {
      id: "UV-01",
      title: "Anlass, Zeitraum und betroffene Leistungen erfasst",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["AERZTE_ZV_PAR_32"],
    },
    {
      id: "UV-02",
      title: "Pflichten, Fristen und Informationswege geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["AERZTE_ZV_PAR_32"],
      authorityKeys: ["KV_BERLIN", "AERZTEKAMMER_BERLIN"],
    },
    {
      id: "UV-03",
      title: "Verantwortung fuer Planung und Kommunikation benannt",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "UV-04",
      title: "Vertretungsnachweise und interne Unterlagen gesichert",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE, OfficeOutcomeAudience.CHEF],
      requiredEvidenceKeys: ["VERTRETUNGSREGELUNG"],
      optionalEvidenceKeys: ["DIENSTPLAN"],
    },
    {
      id: "UV-05",
      title: "Entscheidung zum Vertretungsmodell getroffen",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["AERZTE_ZV_PAR_32"],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["VERTRETUNGSREGELUNG"],
    },
    {
      id: "UV-06",
      title: "Externe Stellen und Kontaktkanaele abgestimmt",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["AERZTE_ZV_PAR_32"],
      authorityKeys: ["KV_BERLIN"],
    },
    {
      id: "UV-PATIENTENINFO",
      title: "Patienteninformation veröffentlicht",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      requiredEvidenceKeys: ["PATIENTENINFO_AUSHANG"],
    },
    {
      id: "UV-NOTFALLVERSORGUNG",
      title: "Notfallversorgung geregelt",
      kind: OfficeCheckpointKind.ASSESSMENT,
      officeKind: OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
      authorityKeys: ["KV_BERLIN"],
      optionalEvidenceKeys: ["NOTFALL_RUFNUMMERN"],
    },
    {
      id: "UV-TERMINMANAGEMENT",
      title: "Termine angepasst",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      optionalEvidenceKeys: ["DIENSTPLAN"],
    },
    {
      id: "UV-ABRECHNUNGSZUORDNUNG",
      title: "Abrechnungszuordnung Vertretung festgelegt",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [
        OfficeOutcomeAudience.CHEF,
        OfficeOutcomeAudience.BACKOFFICE,
      ],
      legalRefs: ["BMV_AE", "SGB_V_PAR_295"],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["LANR_BSNR_BESTAETIGUNG"],
    },
  ],
  [OFFICE_TOPIC_SEAT_APPROVAL]: [
    {
      id: "ZA-01",
      title: "Anlass und Zielbild fuer Arztsitz/Zulassung dokumentiert",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_95"],
    },
    {
      id: "ZA-02",
      title: "Pflichten, Fristen und Verfahrensregeln geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_95", "AERZTE_ZV_PAR_18", "AERZTE_ZV_PAR_24"],
    },
    {
      id: "ZA-03",
      title: "Verantwortung fuer alle Verfahrensschritte zugewiesen",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "ZA-04",
      title: "Antragsnachweise und erforderliche Unterlagen geprueft",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.GATEKEEPER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE, OfficeOutcomeAudience.CHEF],
      legalRefs: ["AERZTE_ZV_PAR_18"],
      requiredEvidenceKeys: [
        "APPROBATIONSURKUNDE",
        "FACHARZTURKUNDE",
        "REGISTERAUSZUG_AERZTE",
      ],
      optionalEvidenceKeys: [
        "BERUFSHAFTPFLICHT_NACHWEIS",
        "ANTRAG_ZULASSUNG_ZA",
        "GENEHMIGUNGSANTRAG_KV",
      ],
    },
    {
      id: "ZA-05",
      title: "Entscheidung zu Reihenfolge und Freigaben getroffen",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["SGB_V_PAR_95"],
      optionalEvidenceKeys: [
        "ZULASSUNGSBESCHEID_ZA",
        "ANSTELLUNGSGENEHMIGUNG_ZA",
        "GENEHMIGUNG_LEISTUNG_KV",
      ],
    },
    {
      id: "ZA-06",
      title: "Externe Stelle und Kommunikationsweg festgelegt",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
      checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["AERZTE_ZV_PAR_32B"],
      authorityKeys: [
        "ZULASSUNGSAUSSCHUSS_BERLIN",
        "KV_BERLIN",
        "AERZTEKAMMER_BERLIN",
      ],
      requiredEvidenceKeys: ["ZULASSUNGSBESCHEID_ZA"],
    },
  ],
  [OFFICE_TOPIC_APPLICATION_MANAGEMENT]: [
    {
      id: "AM-01",
      title: "Anlass und Antragstyp klar beschrieben",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "AM-02",
      title: "Pflichtschritte, Fristen und Einreichungsregeln geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      authorityKeys: [
        "KV_BERLIN",
        "ZULASSUNGSAUSSCHUSS_BERLIN",
        "AERZTEKAMMER_BERLIN",
        "GESUNDHEITSAMT_BERLIN",
      ],
      requiredEvidenceKeys: ["ANTRAG_EXTERNE_STELLE"],
    },
    {
      id: "AM-03",
      title: "Verantwortung und Vertretung eindeutig festgelegt",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "AM-04",
      title: "Nachweise und Dokumentenstand vollstaendig erfasst",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE, OfficeOutcomeAudience.CHEF],
      authorityKeys: [
        "KV_BERLIN",
        "ZULASSUNGSAUSSCHUSS_BERLIN",
        "AERZTEKAMMER_BERLIN",
        "GESUNDHEITSAMT_BERLIN",
      ],
      requiredEvidenceKeys: ["ANTRAG_EXTERNE_STELLE"],
      optionalEvidenceKeys: [
        "EINGANGSBESTAETIGUNG_EXTERNE_STELLE",
        "BESCHEID_EXTERNE_STELLE",
      ],
    },
    {
      id: "AM-05",
      title: "Entscheidung zur Einreichung und Nachsteuerung getroffen",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      optionalEvidenceKeys: [
        "ANTRAG_EXTERNE_STELLE",
        "EINGANGSBESTAETIGUNG_EXTERNE_STELLE",
      ],
    },
    {
      id: "AM-06",
      title: "Risiken und Abhaengigkeiten im Ablauf bewertet",
      kind: OfficeCheckpointKind.ASSESSMENT,
      officeKind: OFFICE_MANAGEMENT_KIND_RISIKO_ABHAENGIGKEIT,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["SGG_PAR_84"],
      authorityKeys: ["KV_BERLIN", "ZULASSUNGSAUSSCHUSS_BERLIN"],
      optionalEvidenceKeys: ["BESCHEID_EXTERNE_STELLE", "WIDERSPRUCH_KV"],
    },
  ],
  [OFFICE_TOPIC_CONTINUING_EDUCATION]: [
    {
      id: "WB-01",
      title: "Anlass und betroffene Rollen dokumentiert",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "WB-02",
      title: "Pflichten, Fristen und Nachweisregeln geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_95D"],
      authorityKeys: ["AERZTEKAMMER_BERLIN"],
    },
    {
      id: "WB-03",
      title: "Verantwortung fuer Nachverfolgung festgelegt",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "WB-04",
      title: "Nachweise, Punkte und Dokumentation zusammengefuehrt",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_95D"],
      authorityKeys: ["AERZTEKAMMER_BERLIN"],
      requiredEvidenceKeys: ["FORTBILDUNGSZERTIFIKAT"],
      optionalEvidenceKeys: ["FORTBILDUNGSPUNKTEKONTO_AUSZUG"],
    },
    {
      id: "WB-05",
      title: "Entscheidung zu Massnahmen und Priorisierung getroffen",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["SGB_V_PAR_95D"],
      optionalEvidenceKeys: ["FORTBILDUNGS_AUFHOLPLAN"],
    },
    {
      id: "WB-06",
      title: "Externe Stelle fuer Nachweise abgestimmt",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_95D"],
      authorityKeys: ["AERZTEKAMMER_BERLIN"],
      optionalEvidenceKeys: ["FORTBILDUNGSPUNKTEKONTO_AUSZUG"],
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
      legalRefs: ["SGB_V_PAR_95D"],
    },
    {
      id: "FB-02",
      title: "Punkte vollständig erfasst",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_95D"],
      authorityKeys: ["AERZTEKAMMER_BERLIN"],
      requiredEvidenceKeys: ["FORTBILDUNGSZERTIFIKAT"],
      optionalEvidenceKeys: ["FORTBILDUNGSPUNKTEKONTO_AUSZUG"],
    },
    {
      id: "FB-03",
      title: "Nachweise archiviert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      requiredEvidenceKeys: ["FORTBILDUNGSZERTIFIKAT"],
      optionalEvidenceKeys: ["FORTBILDUNGSPUNKTEKONTO_AUSZUG"],
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
      legalRefs: ["SGB_V_PAR_95D"],
    },
    {
      id: "FB-05",
      title: "Meldung an Ärztekammer geprüft",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_V_PAR_95D"],
      authorityKeys: ["AERZTEKAMMER_BERLIN", "KV_BERLIN"],
      requiredEvidenceKeys: ["FORTBILDUNGSZERTIFIKAT"],
    },
    {
      id: "FB-06",
      title: "Sanktionsrisiken bewertet",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["SGB_V_PAR_95D"],
      authorityKeys: ["KV_BERLIN"],
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
      legalRefs: ["SGB_V_PAR_95D"],
      optionalEvidenceKeys: ["FORTBILDUNGS_AUFHOLPLAN"],
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
      legalRefs: ["BBIG_PAR_37"],
      authorityKeys: ["AERZTEKAMMER_BERLIN"],
      requiredEvidenceKeys: ["MFA_BERUFSABSCHLUSS"],
    },
    {
      id: "MF-02",
      title: "Arbeitsvertrag freigegeben",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["NACHWG"],
      requiredEvidenceKeys: ["ARBEITSVERTRAG"],
    },
    {
      id: "MF-03",
      title: "Personalunterlagen vollständig",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["ESTG_PAR_39E"],
      requiredEvidenceKeys: ["PERSONALAKTE_GRUNDDATEN", "LOHNSTEUERMERKMALE_ELSTAM"],
    },
    {
      id: "MF-04",
      title: "Sozialversicherung angemeldet",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.EXTERNE_BESTAETIGUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["SGB_IV_PAR_28A", "SGB_IV_PAR_8"],
      authorityKeys: ["MINIJOB_ZENTRALE", "KRANKENKASSE_EINZUGSSTELLE"],
      requiredEvidenceKeys: ["SV_ANMELDUNG"],
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
      legalRefs: ["DSGVO_ART_32"],
      optionalEvidenceKeys: ["DS_TOM_DOKU"],
    },
    {
      id: "MF-06",
      title: "Einarbeitung dokumentiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      optionalEvidenceKeys: ["EINARBEITUNGSPLAN"],
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
      authorityKeys: ["LAGETSI_BERLIN"],
    },
    {
      id: "MA-02",
      title: "Erstuntersuchung nachgewiesen",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.GATEKEEPER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["JARBSCHG_PAR_32"],
      requiredEvidenceKeys: ["JARBSCHG_ERSTUNTERSUCHUNG"],
      optionalEvidenceKeys: ["JARBSCHG_NACHUNTERSUCHUNG"],
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
      legalRefs: ["BBIG_PAR_10", "BBIG_PAR_11"],
      authorityKeys: ["AERZTEKAMMER_BERLIN"],
      requiredEvidenceKeys: ["AUSBILDUNGSVERTRAG_MFA"],
    },
    {
      id: "MA-04",
      title: "Arbeitszeiten begrenzt",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["JARBSCHG_PAR_8", "JARBSCHG_PAR_11"],
      authorityKeys: ["LAGETSI_BERLIN"],
    },
    {
      id: "MA-05",
      title: "Einwilligungen vollständig",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      requiredEvidenceKeys: ["EINWILLIGUNG_ERZIEHUNGSBERECHTIGTE"],
    },
    {
      id: "MA-06",
      title: "Unterweisungen dokumentiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["JARBSCHG_PAR_29"],
      authorityKeys: ["BG_BGW"],
      requiredEvidenceKeys: ["JUGEND_UNTERWEISUNG_DOKU"],
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
      legalRefs: ["MPBETREIBV_PAR_3", "MPBETREIBV_PAR_4"],
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
      legalRefs: ["MPBETREIBV_PAR_4", "MPBETREIBV_PAR_11"],
      requiredEvidenceKeys: ["MP_EINWEISUNGSPROTOKOLL"],
      optionalEvidenceKeys: ["MEDIZINPRODUKTEBUCH"],
    },
    {
      id: "MG-04",
      title: "Wartung organisiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: [
        "MPBETREIBV_PAR_7",
        "MPBETREIBV_PAR_12",
        "MPBETREIBV_PAR_15",
        "MPBETREIBV_ANLAGE_2",
      ],
      authorityKeys: ["LAGETSI_BERLIN"],
      optionalEvidenceKeys: [
        "MP_WARTUNGSNACHWEIS",
        "MP_STK_PROTOKOLL",
        "MP_MTK_PROTOKOLL",
        "MP_NAECHSTE_KONTROLLE_KENNZEICHNUNG",
      ],
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
      legalRefs: [
        "MPBETREIBV_PAR_11",
        "MPBETREIBV_PAR_13",
        "MPBETREIBV_PAR_14",
      ],
      requiredEvidenceKeys: ["MEDIZINPRODUKTEBUCH", "MP_BESTANDSVERZEICHNIS"],
      optionalEvidenceKeys: ["MP_FUNKTIONS_PRUEFUNG"],
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
      legalRefs: ["DSGVO_ART_33", "DSGVO_ART_5"],
      requiredEvidenceKeys: ["DS_VORFALL_PROTOKOLL"],
    },
    {
      id: "DS-02",
      title: "Betroffene Daten bewertet",
      kind: OfficeCheckpointKind.ASSESSMENT,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["DSGVO_ART_33", "DSGVO_ART_32"],
      requiredEvidenceKeys: ["DS_RISIKOBEWERTUNG"],
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
      legalRefs: ["DSGVO_ART_33", "BLN_DSG"],
      authorityKeys: ["BERLIN_DATENSCHUTZBEAUFTRAGTE"],
      requiredEvidenceKeys: ["DS_MELDUNG_AUFSICHT"],
    },
    {
      id: "DS-04",
      title: "Zugriffe gesichert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.GATEKEEPER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["DSGVO_ART_32"],
      optionalEvidenceKeys: ["DS_TOM_DOKU"],
    },
    {
      id: "DS-05",
      title: "Betroffene informiert",
      kind: OfficeCheckpointKind.DECISION,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
      legalRefs: ["DSGVO_ART_34"],
      requiredEvidenceKeys: ["DS_BETROFFENEN_INFO"],
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
      legalRefs: ["DSGVO_ART_5", "DSGVO_ART_32"],
      requiredEvidenceKeys: ["DS_MASSNAHMENPLAN"],
      optionalEvidenceKeys: ["DS_TOM_DOKU"],
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
      legalRefs: ["AERZTE_ZV_PAR_19A"],
      authorityKeys: ["KV_BERLIN"],
      requiredEvidenceKeys: ["SPRECHZEITEN_MELDUNG_KV"],
    },
    {
      id: "OE-04",
      title: "Patienteninformation veröffentlicht",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["AERZTE_ZV_PAR_19A"],
      requiredEvidenceKeys: ["PATIENTENINFO_SPRECHZEITEN"],
    },
    {
      id: "OE-05",
      title: "Dienstplanung dokumentiert",
      kind: OfficeCheckpointKind.RULE,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      optionalEvidenceKeys: ["DIENSTPLAN_PRAXIS"],
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
      legalRefs: ["AERZTE_ZV_PAR_19A"],
      authorityKeys: ["KV_BERLIN"],
    },
  ],
  [OFFICE_TOPIC_REPORTING_DUTIES]: [
    {
      id: "MP-01",
      title: "Meldeanlass und betroffene Einheit dokumentiert",
      kind: OfficeCheckpointKind.FACT,
      officeKind: OFFICE_MANAGEMENT_KIND_ANLASS,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
    },
    {
      id: "MP-02",
      title: "Meldepflichten, Fristen und Formvorgaben geprueft",
      kind: OfficeCheckpointKind.RULE,
      officeKind: OFFICE_MANAGEMENT_KIND_PFLICHT_FRIST,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["IFSG_PAR_6", "IFSG_PAR_7", "IFSG_PAR_8", "IFSG_PAR_9"],
    },
    {
      id: "MP-03",
      title: "Verantwortung fuer Meldung und Freigabe benannt",
      kind: OfficeCheckpointKind.DEPENDENCY,
      officeKind: OFFICE_MANAGEMENT_KIND_VERANTWORTUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.CHEF, OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["IFSG_PAR_8"],
    },
    {
      id: "MP-04",
      title: "Meldenachweise und Pflichtunterlagen erfasst",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_NACHWEIS,
      checkpointType: OfficeCheckpointType.NACHWEIS_PFLICHT,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE, OfficeOutcomeAudience.CHEF],
      legalRefs: ["IFSG_PAR_9"],
      requiredEvidenceKeys: ["IFSG_MELDUNG"],
    },
    {
      id: "MP-05",
      title: "Entscheidung zur finalen Abgabe getroffen",
      kind: OfficeCheckpointKind.DECISION,
      officeKind: OFFICE_MANAGEMENT_KIND_ENTSCHEIDUNG,
      checkpointType: OfficeCheckpointType.INTERNE_ENTSCHEIDUNG,
      failureEffect: OfficeFailureEffect.BLOCKER,
      outcomeAudience: [OfficeOutcomeAudience.CHEF],
    },
    {
      id: "MP-06",
      title: "Zustaendige externe Stelle und Kanal dokumentiert",
      kind: OfficeCheckpointKind.SOURCE,
      officeKind: OFFICE_MANAGEMENT_KIND_EXTERNE_STELLE,
      checkpointType: OfficeCheckpointType.REGEL_PARAMETER,
      failureEffect: OfficeFailureEffect.RISK,
      outcomeAudience: [OfficeOutcomeAudience.BACKOFFICE],
      legalRefs: ["IFSG_PAR_8", "IFSG_PAR_9"],
      authorityKeys: ["GESUNDHEITSAMT_BERLIN"],
      requiredEvidenceKeys: ["IFSG_MELDUNG"],
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
