import {
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CME_GENERAL_MEDICINE,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  OFFICE_TOPIC_EXTENDED_OPENING_HOURS,
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_HONORAR_NOTICE_REVIEW,
  OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
  OFFICE_TOPIC_KV_BILLING,
  OFFICE_TOPIC_MFA_HIRING,
  OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE,
  OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
  OFFICE_TOPIC_PLAUSIBILITY_BILLING,
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_REPORTING_DUTIES,
  OFFICE_TOPIC_SEAT_APPROVAL,
  type OfficeTopicId,
} from "@/lib/office/checkpointCatalog";

export type OfficeM2Question = {
  id: string;
  text: string;
};

export type OfficeM2QuestionsByCheckpoint = Record<string, readonly OfficeM2Question[]>;

const M2_QUESTIONS_BY_TOPIC: Record<OfficeTopicId, OfficeM2QuestionsByCheckpoint> = {
  [OFFICE_TOPIC_HIRING_REPLACEMENT]: {
    "NC-REGISTERSTATUS": [
      { id: "M2-01", text: "Ist der aktuelle Arztregisterstatus fuer die betroffene Person dokumentiert?" },
      { id: "M2-02", text: "Liegt ein prueffaehiger Nachweis zum Registerstatus vor?" },
    ],
    "NC-APPROBATION": [
      { id: "M2-01", text: "Ist die Approbation mit gueltigem Stand dokumentiert?" },
      { id: "M2-02", text: "Liegt ein prueffaehiger Nachweis des aktuellen Approbationsstatus vor?" },
    ],
    "NC-FACHARZTQUALIFIKATION": [
      { id: "M2-01", text: "Ist die relevante Facharztqualifikation fuer den Fall dokumentiert?" },
      { id: "M2-02", text: "Liegt ein prueffaehiger Nachweis der Facharztqualifikation vor?" },
    ],
    "NC-BERUFSHAFTPFLICHT": [
      { id: "M2-01", text: "Ist die Berufshaftpflicht aktuell gueltig und intern dokumentiert?" },
      { id: "M2-02", text: "Liegt ein prueffaehiger Haftpflichtnachweis vor?" },
    ],
    "NC-TAETIGKEITSUMFANG": [
      { id: "M2-01", text: "Ist der geplante Taetigkeitsumfang fuer den Einsatz intern festgehalten?" },
      { id: "M2-02", text: "Liegt ein Nachweis oder eine Vereinbarung zum Taetigkeitsumfang vor?" },
    ],
    "NC-EXTERNE_STELLE": [
      { id: "M2-01", text: "Ist die zustaendige externe Stelle fuer den Anstellungsfall dokumentiert?" },
      { id: "M2-02", text: "Ist die Grundlage fuer die Zustaendigkeit dieser Stelle intern bekannt?" },
    ],
    "NC-ANTRAGSWEG": [
      { id: "M2-01", text: "Ist der vorgesehene Antrags- oder Anzeigeweg fuer den Fall dokumentiert?" },
      { id: "M2-02", text: "Ist die verbindliche Grundlage fuer diesen Antragsweg bekannt?" },
    ],
    "NC-GENEHMIGUNGSSTATUS": [
      { id: "M2-01", text: "Ist der aktuelle Genehmigungsstatus intern dokumentiert?" },
      { id: "M2-02", text: "Liegt ein Nachweis fuer den dokumentierten Genehmigungsstatus vor?" },
    ],
    "NC-BETRIEBSSTAETTENSTRUKTUR": [
      { id: "M2-01", text: "Ist die relevante Betriebsstaettenstruktur fuer den Anstellungsfall hinterlegt?" },
      { id: "M2-02", text: "Liegt ein Nachweis zur Betriebsstaettenstruktur vor?" },
    ],
    "NC-ARBEITSVERTRAG_FREIGABE": [
      { id: "M2-01", text: "Wurde der Arbeitsvertrag unterschrieben?" },
      { id: "M2-02", text: "Sind Arbeitszeiten festgelegt?" },
      { id: "M2-03", text: "Wurde die Vergütung freigegeben?" },
    ],
    "NC-LANR_BSNR_ZUORDNUNG": [
      { id: "M2-01", text: "Ist die LANR hinterlegt?" },
      { id: "M2-02", text: "Ist die BSNR korrekt zugeordnet?" },
      { id: "M2-03", text: "Wurden Abrechnungsdaten geprüft?" },
    ],
    "NC-SYSTEMZUGRIFFE_EINGERICHTET": [
      { id: "M2-01", text: "Sind PVS-Zugänge eingerichtet?" },
      { id: "M2-02", text: "Wurden Rollenrechte vergeben?" },
      { id: "M2-03", text: "Ist der Zugriff dokumentiert?" },
    ],
    "HR-GOV-A": [
      { id: "M2-01", text: "Ist bestaetigt, dass die Person aktuell zur aerztlichen Taetigkeit zugelassen ist?" },
      { id: "M2-02", text: "Liegt ein aktueller Nachweis des Arztregisterstatus vor?" },
      { id: "M2-03", text: "Ist eine externe Bestaetigung durch KV Berlin oder Aerztekammer erforderlich?" },
    ],
    "HR-GOV-B": [
      { id: "M2-01", text: "Liegt ein dokumentierter Verfahrensstand vor, der eine Zulassung grundsaetzlich ermoeglicht?" },
      { id: "M2-02", text: "Sind keine erkennbaren Zulassungshindernisse aktenkundig?" },
      { id: "M2-03", text: "Ist eine externe Rueckbestaetigung durch Zulassungsausschuss oder KV Berlin ausstehend?" },
    ],
    "HR-GOV-C": [
      { id: "M2-01", text: "Ist dokumentiert, dass die Praxisleitung die geplante Anstellung genehmigt hat?" },
      { id: "M2-02", text: "Ist die Vereinbarkeit von Praxisstruktur und geplanter Anstellung geprueft?" },
      { id: "M2-03", text: "Ist eine externe Einordnung durch KV Berlin fuer verbleibende Strukturfragen erforderlich?" },
    ],
    "HR-GOV-D": [
      { id: "M2-01", text: "Ist nachgewiesen, dass Haftpflicht und Fortbildung vor Dienstbeginn den Anforderungen entsprechen?" },
      { id: "M2-02", text: "Liegt ein aktueller Nachweis zu Haftpflicht und Fortbildungsstatus vor?" },
      { id: "M2-03", text: "Ist eine externe Bestaetigung durch Aerztekammer oder KV Berlin erforderlich?" },
    ],
  },
  [OFFICE_TOPIC_KV_BILLING]: {
    "KV-01": [
      { id: "M2-01", text: "Ist der Beanstandungsgegenstand des KV-Schreibens vollstaendig erfasst?" },
      { id: "M2-02", text: "Sind die betroffenen Abrechnungszeitraeume oder -ziffern eindeutig benannt?" },
    ],
    "KV-02": [
      { id: "M2-01", text: "Ist die Antwortfrist der KV intern hinterlegt?" },
      { id: "M2-02", text: "Sind die formalen Anforderungen fuer die Stellungnahme bekannt?" },
    ],
    "KV-03": [
      { id: "M2-01", text: "Liegt eine interne Einschaetzung zur Berechtigung der Beanstandung vor?" },
      { id: "M2-02", text: "Ist der aerztliche Klaerungsbedarf fuer die Stellungnahme dokumentiert?" },
    ],
    "KV-04": [
      { id: "M2-01", text: "Ist die Reaktionsstrategie auf das KV-Schreiben intern freigegeben?" },
      { id: "M2-02", text: "Kann die beschlossene Reaktion fristgerecht umgesetzt werden?" },
    ],
    "KV-05": [
      { id: "M2-01", text: "Ist der zustaendige KV-Ansprechpartner fuer diesen Fall dokumentiert?" },
      { id: "M2-02", text: "Ist der Kommunikationskanal fuer Rueckfragen an die KV festgelegt?" },
    ],
  },
  [OFFICE_TOPIC_PLAUSIBILITY_BILLING]: {
    "PL-01": [
      { id: "M2-01", text: "Wurde das Quartalsprofil vor Abgabe geprüft?" },
      { id: "M2-02", text: "Gibt es auffällige Quartalszeitwerte?" },
      { id: "M2-03", text: "Wurde eine interne Klärung dokumentiert?" },
    ],
    "PL-02": [
      { id: "M2-01", text: "Wurden Tagesprofile auf auffällige Zeitwerte geprüft?" },
      { id: "M2-02", text: "Sind auffällige Tage fachlich erklärbar?" },
      { id: "M2-03", text: "Liegt ein Dienstplanabgleich vor?" },
    ],
    "PL-03": [
      { id: "M2-01", text: "Ist die abgerechnete Leistung in der Behandlungsdokumentation nachvollziehbar?" },
      { id: "M2-02", text: "Fehlen Dokumentationsbestandteile für einzelne Leistungen?" },
      { id: "M2-03", text: "Wurde die Dokumentation ärztlich geprüft?" },
    ],
    "PL-04": [
      { id: "M2-01", text: "Wurden genehmigungspflichtige Leistungen identifiziert?" },
      { id: "M2-02", text: "Liegt die erforderliche KV-Genehmigung vor?" },
      { id: "M2-03", text: "Sind Qualifikationsnachweise dokumentiert?" },
    ],
    "PL-05": [
      { id: "M2-01", text: "Ist die persönliche Leistungserbringung nachvollziehbar zugeordnet?" },
      { id: "M2-02", text: "Sind Delegation und LANR-Zuordnung geprüft?" },
      { id: "M2-03", text: "Gibt es unklare Arztbezüge in der Abrechnung?" },
    ],
    "PL-06": [
      { id: "M2-01", text: "Wurde die Quartalsabrechnung intern final geprüft?" },
      { id: "M2-02", text: "Liegt eine Freigabe durch Praxisleitung oder ärztliche Leitung vor?" },
      { id: "M2-03", text: "Sind Korrekturen vor Versand dokumentiert?" },
    ],
  },
  [OFFICE_TOPIC_HONORAR_NOTICE_REVIEW]: {
    "HB-01": [
      { id: "M2-01", text: "Wurden die Fallzahlen mit dem PVS abgeglichen?" },
      { id: "M2-02", text: "Stimmen die Scheine mit der Quartalsabrechnung überein?" },
      { id: "M2-03", text: "Sind auffällige Fallzahlabweichungen dokumentiert?" },
    ],
    "HB-02": [
      { id: "M2-01", text: "Wurden alle abgerechneten GOP vergütet?" },
      { id: "M2-02", text: "Sind Zuschläge im Bescheid enthalten?" },
      { id: "M2-03", text: "Wurden gestrichene GOP identifiziert?" },
    ],
    "HB-03": [
      { id: "M2-01", text: "Sind Kürzungen im Bescheid begründet?" },
      { id: "M2-02", text: "Liegt eine Plausibilitätsmaßnahme vor?" },
      { id: "M2-03", text: "Ist eine interne Einschätzung zur Kürzung dokumentiert?" },
    ],
    "HB-04": [
      { id: "M2-01", text: "Lagen gültige KV-Genehmigungen vor?" },
      { id: "M2-02", text: "Wurden genehmigungspflichtige Leistungen vergütet?" },
      { id: "M2-03", text: "Sind Genehmigungsnachweise archiviert?" },
    ],
    "HB-05": [
      { id: "M2-01", text: "Ist das Regelleistungsvolumen (RLV) fuer das Quartal geprueft?" },
      { id: "M2-02", text: "Wurden QZV-Zuweisungen (Zusatzvolumen fuer Sonderleistungen) nachvollzogen?" },
      { id: "M2-03", text: "Sind auffaellige Quotierungen oder Kappungen im Bescheid dokumentiert und eingeordnet?" },
    ],
    "HB-06": [
      { id: "M2-01", text: "Wurde das Zustellungsdatum dokumentiert?" },
      { id: "M2-02", text: "Ist die Widerspruchsfrist noch offen?" },
      { id: "M2-03", text: "Wurde über einen Widerspruch entschieden?" },
    ],
  },
  [OFFICE_TOPIC_REGRESS]: {
    "RG-01": [
      { id: "M2-01", text: "Ist der Beanstandungsanlass aus dem Regressschreiben eindeutig dokumentiert?" },
      { id: "M2-02", text: "Ist der betroffene Pruefzeitraum intern erfasst?" },
    ],
    "RG-02": [
      { id: "M2-01", text: "Ist die Stellungnahmefrist intern hinterlegt?" },
      { id: "M2-02", text: "Sind die formalen Anforderungen des Pruefverfahrens bekannt?" },
    ],
    "RG-03": [
      { id: "M2-01", text: "Ist die fachliche und organisatorische Fallverantwortung intern zugewiesen?" },
      { id: "M2-02", text: "Ist eine Vertretungsregelung fuer den Fall dokumentiert?" },
    ],
    "RG-04": [
      { id: "M2-01", text: "Liegen alle fuer die Stellungnahme benoetigten Nachweise vollstaendig vor?" },
      { id: "M2-02", text: "Ist dokumentiert, ob noch Unterlagen beschafft werden muessen?" },
    ],
    "RG-05": [
      { id: "M2-01", text: "Ist eine verbindliche Entscheidung zur Reaktion auf das Regressverfahren getroffen?" },
      { id: "M2-02", text: "Ist die Freigabe fuer die naechsten Umsetzungsschritte erteilt?" },
    ],
    "RG-06": [
      { id: "M2-01", text: "Ist die zustaendige externe Stelle fuer Rueckfragen dokumentiert?" },
      { id: "M2-02", text: "Ist der verbindliche Kommunikationskanal mit der externen Stelle festgelegt?" },
    ],
    "RG-07": [
      { id: "M2-01", text: "Sind bekannte Risiken fuer den Verfahrensablauf intern erfasst?" },
      { id: "M2-02", text: "Sind kritische Abhaengigkeiten identifiziert, die den Ablauf gefaehrden koennten?" },
    ],
  },
  [OFFICE_TOPIC_CLOSURE_COVERAGE]: {
    "UV-01": [
      { id: "M2-01", text: "Ist der Schliessungszeitraum intern dokumentiert?" },
      { id: "M2-02", text: "Ist der Anlass der Schliessung vollstaendig erfasst?" },
    ],
    "UV-02": [
      { id: "M2-01", text: "Sind die geltenden Melde- und Informationsfristen intern hinterlegt?" },
      { id: "M2-02", text: "Sind die formalen Pflichten fuer die Schliessungsphase geprueft?" },
    ],
    "UV-03": [
      { id: "M2-01", text: "Ist die Verantwortung fuer die Vertretungsplanung intern namentlich zugewiesen?" },
      { id: "M2-02", text: "Ist eine Vertretungsregelung fuer die externe Kommunikation waehrend der Schliessung dokumentiert?" },
    ],
    "UV-04": [
      { id: "M2-01", text: "Liegen die erforderlichen Vertretungsnachweise vor?" },
      { id: "M2-02", text: "Ist dokumentiert, ob noch Unterlagen fuer den Schliessungszeitraum ergaenzt werden muessen?" },
    ],
    "UV-05": [
      { id: "M2-01", text: "Ist das Vertretungsmodell fuer die Schliessung intern freigegeben?" },
      { id: "M2-02", text: "Sind noch offene Klaerungspunkte zur Vertretung intern dokumentiert?" },
    ],
    "UV-06": [
      { id: "M2-01", text: "Ist die zustaendige externe Stelle fuer die Schliessung informiert?" },
      { id: "M2-02", text: "Ist der Kommunikationskanal mit der externen Stelle intern festgelegt?" },
    ],
    "UV-PATIENTENINFO": [
      { id: "M2-01", text: "Wurde ein Aushang erstellt?" },
      { id: "M2-02", text: "Sind Vertretungsdaten veröffentlicht?" },
      { id: "M2-03", text: "Wurde die Website aktualisiert?" },
    ],
    "UV-NOTFALLVERSORGUNG": [
      { id: "M2-01", text: "Sind Notfallkontakte hinterlegt?" },
      { id: "M2-02", text: "Wurde der ärztliche Bereitschaftsdienst angegeben?" },
      { id: "M2-03", text: "Sind kritische Patienten berücksichtigt?" },
    ],
    "UV-TERMINMANAGEMENT": [
      { id: "M2-01", text: "Wurden Termine rechtzeitig verschoben?" },
      { id: "M2-02", text: "Sind Patienten informiert worden?" },
      { id: "M2-03", text: "Wurden Recall-Termine angepasst?" },
    ],
    "UV-ABRECHNUNGSZUORDNUNG": [
      { id: "M2-01", text: "Ist die LANR korrekt hinterlegt?" },
      { id: "M2-02", text: "Wurde die Abrechnungszuordnung geprüft?" },
      { id: "M2-03", text: "Sind Zuständigkeiten für die Vertretungsabrechnung festgelegt?" },
    ],
  },
  [OFFICE_TOPIC_SEAT_APPROVAL]: {
    "ZA-01": [
      { id: "M2-01", text: "Ist der Anlass fuer das Zulassungsverfahren intern klar dokumentiert?" },
      { id: "M2-02", text: "Ist der angestrebte Verfahrenstyp eindeutig bestimmt?" },
    ],
    "ZA-02": [
      { id: "M2-01", text: "Ist die geltende Antragsfrist bekannt und intern hinterlegt?" },
      { id: "M2-02", text: "Sind die Verfahrensregeln des Zulassungsausschusses fuer diesen Fall geprueft?" },
    ],
    "ZA-03": [
      { id: "M2-01", text: "Sind die Zustaendigkeiten fuer die einzelnen Verfahrensschritte intern zugewiesen?" },
      { id: "M2-02", text: "Ist eine Vertretungsregelung fuer Engpaesse im Verfahrensablauf dokumentiert?" },
    ],
    "ZA-04": [
      { id: "M2-01", text: "Liegen alle fuer den Antrag benoetigten Nachweise vollstaendig vor?" },
      { id: "M2-02", text: "Ist dokumentiert, ob noch fehlende Unterlagen beschafft werden muessen?" },
    ],
    "ZA-05": [
      { id: "M2-01", text: "Ist die Entscheidung zur Einreichungsreihenfolge intern freigegeben?" },
      { id: "M2-02", text: "Ist die Freigabe fuer den naechsten Verfahrensschritt erteilt?" },
    ],
    "ZA-06": [
      { id: "M2-01", text: "Ist die federfuehrende externe Stelle fuer das Verfahren dokumentiert?" },
      { id: "M2-02", text: "Ist der Kommunikationsweg mit der externen Stelle verbindlich festgelegt?" },
    ],
  },
  [OFFICE_TOPIC_APPLICATION_MANAGEMENT]: {
    "AM-01": [
      { id: "M2-01", text: "Ist der Antragsanlass intern klar beschrieben?" },
      { id: "M2-02", text: "Ist der Antragstyp eindeutig bestimmt?" },
    ],
    "AM-02": [
      { id: "M2-01", text: "Sind alle bindenden Einreichungsfristen bekannt und intern hinterlegt?" },
      { id: "M2-02", text: "Sind die Pflichtschritte bis zur Einreichung vollstaendig identifiziert?" },
    ],
    "AM-03": [
      { id: "M2-01", text: "Sind Erstellung, Pruefung und Einreichung intern klar zugewiesen?" },
      { id: "M2-02", text: "Ist eine Vertretungsregelung fuer den Ausfall dokumentiert?" },
    ],
    "AM-04": [
      { id: "M2-01", text: "Liegen alle fuer die Einreichung benoetigten Nachweise vollstaendig vor?" },
      { id: "M2-02", text: "Ist dokumentiert, ob noch fehlende Dokumente beschafft werden muessen?" },
    ],
    "AM-05": [
      { id: "M2-01", text: "Ist die Entscheidung zur Einreichung intern freigegeben?" },
      { id: "M2-02", text: "Ist eine Eskalation fuer offene Entscheidungspunkte eingeleitet?" },
    ],
    "AM-06": [
      { id: "M2-01", text: "Sind bekannte Risiken fuer den fristgerechten Abschluss intern erfasst?" },
      { id: "M2-02", text: "Sind Abhaengigkeiten identifiziert, die den Antrag blockieren koennten?" },
    ],
  },
  [OFFICE_TOPIC_CONTINUING_EDUCATION]: {
    "WB-01": [
      { id: "M2-01", text: "Ist der Anlass fuer das Fortbildungsthema intern erfasst?" },
      { id: "M2-02", text: "Sind die betroffenen Personen oder Rollen dokumentiert?" },
    ],
    "WB-02": [
      { id: "M2-01", text: "Sind die geltenden Fortbildungsfristen bekannt und intern hinterlegt?" },
      { id: "M2-02", text: "Sind die Nachweisregeln der zustaendigen Stelle geprueft?" },
    ],
    "WB-03": [
      { id: "M2-01", text: "Ist die Verantwortung fuer die Nachverfolgung je betroffener Person zugewiesen?" },
      { id: "M2-02", text: "Ist dokumentiert, ob die Vollstaendigkeit vor Fristablauf geprueft wird?" },
    ],
    "WB-04": [
      { id: "M2-01", text: "Liegen alle erforderlichen Fortbildungsnachweise vollstaendig vor?" },
      { id: "M2-02", text: "Ist dokumentiert, ob noch fehlende Belege nachgereicht werden muessen?" },
    ],
    "WB-05": [
      { id: "M2-01", text: "Sind konkrete Massnahmen zur Schliessung von Fortbildungsluecken priorisiert?" },
      { id: "M2-02", text: "Ist eine Entscheidung zu offenen Priorisierungsfragen getroffen?" },
    ],
    "WB-06": [
      { id: "M2-01", text: "Ist die zustaendige externe Stelle fuer die Nachweisuebermittlung dokumentiert?" },
      { id: "M2-02", text: "Ist der Uebermittlungsweg an die externe Stelle verbindlich festgelegt?" },
    ],
  },
  [OFFICE_TOPIC_CME_GENERAL_MEDICINE]: {
    "FB-01": [
      { id: "M2-01", text: "Ist der aktuelle Fortbildungszeitraum dokumentiert?" },
      { id: "M2-02", text: "Wurde das Startdatum des Zyklus erfasst?" },
      { id: "M2-03", text: "Ist das Fristende hinterlegt?" },
    ],
    "FB-02": [
      { id: "M2-01", text: "Sind alle Fortbildungspunkte erfasst?" },
      { id: "M2-02", text: "Wurden externe Fortbildungen nachgetragen?" },
      { id: "M2-03", text: "Ist der aktuelle Punktestand vollständig?" },
    ],
    "FB-03": [
      { id: "M2-01", text: "Sind Teilnahmebescheinigungen archiviert?" },
      { id: "M2-02", text: "Sind digitale Nachweise abrufbar?" },
      { id: "M2-03", text: "Wurden fehlende Nachweise angefordert?" },
    ],
    "FB-04": [
      { id: "M2-01", text: "Wird die Frist regelmäßig kontrolliert?" },
      { id: "M2-02", text: "Ist eine Erinnerung oder Wiedervorlage fuer die Fortbildungsfrist eingerichtet?" },
      { id: "M2-03", text: "Wurde bei Punktedefizit reagiert?" },
    ],
    "FB-05": [
      { id: "M2-01", text: "Wurden Punkte an die Ärztekammer übertragen?" },
      { id: "M2-02", text: "Ist die Übertragung bestätigt?" },
      { id: "M2-03", text: "Wurden Übertragungsfehler geprüft?" },
    ],
    "FB-06": [
      { id: "M2-01", text: "Ist ein Punktedefizit festgestellt und dokumentiert?" },
      { id: "M2-02", text: "Sind mögliche Honorarkürzungen bekannt?" },
      { id: "M2-03", text: "Wurde ein Maßnahmenplan festgelegt?" },
    ],
    "FB-AUFHOLPLAN": [
      { id: "M2-01", text: "Liegt ein Fortbildungsplan fuer den Aufholzeitraum vor?" },
      { id: "M2-02", text: "Sind konkrete Termine festgelegt?" },
      { id: "M2-03", text: "Wird der Fortschritt überwacht?" },
    ],
  },
  [OFFICE_TOPIC_MFA_HIRING]: {
    "MF-01": [
      { id: "M2-01", text: "Liegt ein MFA-Abschlussnachweis vor?" },
      { id: "M2-02", text: "Wurde die Qualifikation geprüft?" },
      { id: "M2-03", text: "Sind Zusatzqualifikationen dokumentiert?" },
    ],
    "MF-02": [
      { id: "M2-01", text: "Wurde der Arbeitsvertrag unterschrieben?" },
      { id: "M2-02", text: "Sind Arbeitszeiten festgelegt?" },
      { id: "M2-03", text: "Wurde die Vergütung freigegeben?" },
    ],
    "MF-03": [
      { id: "M2-01", text: "Liegt die Steuer-ID vor?" },
      { id: "M2-02", text: "Sind Bankdaten erfasst?" },
      { id: "M2-03", text: "Ist die Personalakte vollständig?" },
    ],
    "MF-04": [
      { id: "M2-01", text: "Wurde die Anmeldung zur Sozialversicherung durchgeführt?" },
      { id: "M2-02", text: "Liegt die Meldungsbestätigung vor?" },
      { id: "M2-03", text: "Wurde die Krankenkasse erfasst?" },
    ],
    "MF-05": [
      { id: "M2-01", text: "Sind PVS-Zugänge eingerichtet?" },
      { id: "M2-02", text: "Wurden Rollenrechte geprüft?" },
      { id: "M2-03", text: "Ist der Zugriff dokumentiert?" },
    ],
    "MF-06": [
      { id: "M2-01", text: "Wurde eine Einarbeitung durchgeführt?" },
      { id: "M2-02", text: "Sind Hygieneschulungen dokumentiert?" },
      { id: "M2-03", text: "Wurde der Einarbeitungsplan archiviert?" },
    ],
  },
  [OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING]: {
    "MA-01": [
      { id: "M2-01", text: "Wurden Jugendarbeitsschutzregeln geprüft?" },
      { id: "M2-02", text: "Sind verbotene Tätigkeiten ausgeschlossen?" },
      { id: "M2-03", text: "Wurden Pausenregelungen festgelegt?" },
    ],
    "MA-02": [
      { id: "M2-01", text: "Liegt die Erstuntersuchung vor?" },
      { id: "M2-02", text: "Ist die Bescheinigung gültig?" },
      { id: "M2-03", text: "Wurde die Bescheinigung archiviert?" },
    ],
    "MA-03": [
      { id: "M2-01", text: "Wurde der Ausbildungsvertrag unterschrieben?" },
      { id: "M2-02", text: "Wurde der Vertrag eingereicht?" },
      { id: "M2-03", text: "Liegt die Registrierungsbestätigung vor?" },
    ],
    "MA-04": [
      { id: "M2-01", text: "Sind tägliche Arbeitszeiten begrenzt?" },
      { id: "M2-02", text: "Werden Ruhezeiten eingehalten?" },
      { id: "M2-03", text: "Sind Berufsschulzeiten berücksichtigt?" },
    ],
    "MA-05": [
      { id: "M2-01", text: "Liegt die Zustimmung der Sorgeberechtigten vor?" },
      { id: "M2-02", text: "Sind Kontaktdaten vollständig?" },
      { id: "M2-03", text: "Wurden Notfallinformationen erfasst?" },
    ],
    "MA-06": [
      { id: "M2-01", text: "Wurde eine Hygieneeinweisung durchgeführt?" },
      { id: "M2-02", text: "Sind Arbeitsschutzunterweisungen dokumentiert?" },
      { id: "M2-03", text: "Wurde die Schweigepflicht erklärt?" },
    ],
  },
  [OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE]: {
    "MG-01": [
      { id: "M2-01", text: "Liegt eine CE-Kennzeichnung vor?" },
      { id: "M2-02", text: "Wurde der Einsatzzweck festgelegt?" },
      { id: "M2-03", text: "Ist das Gerät inventarisiert?" },
    ],
    "MG-02": [
      { id: "M2-01", text: "Wurde die KV-Genehmigungspflicht geprüft?" },
      { id: "M2-02", text: "Sind Fachkundenachweise erforderlich?" },
      { id: "M2-03", text: "Liegt eine Genehmigungsbestätigung vor?" },
    ],
    "MG-03": [
      { id: "M2-01", text: "Wurde eine Geräteeinweisung durchgeführt?" },
      { id: "M2-02", text: "Sind Teilnehmer dokumentiert?" },
      { id: "M2-03", text: "Liegt ein Einweisungsnachweis vor?" },
    ],
    "MG-04": [
      { id: "M2-01", text: "Liegt ein Wartungsplan fuer das Geraet vor?" },
      { id: "M2-02", text: "Sind Prüffristen hinterlegt?" },
      { id: "M2-03", text: "Wurde ein Wartungsdienst beauftragt?" },
    ],
    "MG-05": [
      { id: "M2-01", text: "Sind abrechenbare Leistungen definiert?" },
      { id: "M2-02", text: "Wurden GOP-Anforderungen geprüft?" },
      { id: "M2-03", text: "Ist die Dokumentation abrechnungsfähig?" },
    ],
    "MG-06": [
      { id: "M2-01", text: "Sind Handbücher archiviert?" },
      { id: "M2-02", text: "Liegt die Konformitätserklärung vor?" },
      { id: "M2-03", text: "Sind Wartungsnachweise abgelegt?" },
    ],
  },
  [OFFICE_TOPIC_DATA_PROTECTION_INCIDENT]: {
    "DS-01": [
      { id: "M2-01", text: "Wurde der Vorfall zeitnah erfasst?" },
      { id: "M2-02", text: "Sind Zeitpunkt und Ursache dokumentiert?" },
      { id: "M2-03", text: "Wurden beteiligte Systeme benannt?" },
    ],
    "DS-02": [
      { id: "M2-01", text: "Sind Patientendaten betroffen?" },
      { id: "M2-02", text: "Ist das Schadensrisiko fuer betroffene Personen eingeschaetzt?" },
      { id: "M2-03", text: "Sind betroffene Personen identifiziert?" },
    ],
    "DS-03": [
      { id: "M2-01", text: "Wurde intern geprüft, ob eine Meldepflicht besteht?" },
      { id: "M2-02", text: "Ist bekannt, ob die 72-Stunden-Meldefrist noch laeuft oder bereits abgelaufen ist?" },
      { id: "M2-03", text: "Wurde die Entscheidung zur Meldung dokumentiert?" },
    ],
    "DS-04": [
      { id: "M2-01", text: "Wurden Zugänge gesperrt?" },
      { id: "M2-02", text: "Sind Passwörter geändert worden?" },
      { id: "M2-03", text: "Wurden Systeme überprüft?" },
    ],
    "DS-05": [
      { id: "M2-01", text: "Wurden Betroffene informiert?" },
      { id: "M2-02", text: "Ist die Information dokumentiert?" },
      { id: "M2-03", text: "Wurden Rückfragen bearbeitet?" },
    ],
    "DS-06": [
      { id: "M2-01", text: "Wurden Schutzmaßnahmen angepasst?" },
      { id: "M2-02", text: "Wurde das Team unterwiesen?" },
      { id: "M2-03", text: "Ist eingeschaetzt, ob sich ein aehnlicher Vorfall wiederholen koennte?" },
    ],
  },
  [OFFICE_TOPIC_EXTENDED_OPENING_HOURS]: {
    "OE-01": [
      { id: "M2-01", text: "Ist ausreichend Personal eingeplant?" },
      { id: "M2-02", text: "Sind ärztliche Zeiten abgedeckt?" },
      { id: "M2-03", text: "Ist fuer moegliche Personalausfaelle eine Vertretungsregelung vorhanden?" },
    ],
    "OE-02": [
      { id: "M2-01", text: "Wurden Arbeitszeiten angepasst?" },
      { id: "M2-02", text: "Sind Ruhezeiten berücksichtigt?" },
      { id: "M2-03", text: "Wurden Vertragsänderungen dokumentiert?" },
    ],
    "OE-03": [
      { id: "M2-01", text: "Wurden KV-relevante Anforderungen intern geprüft?" },
      { id: "M2-02", text: "Ist geprueft, ob eine Meldung bei der KV erforderlich ist?" },
      { id: "M2-03", text: "Wurde die Entscheidung zur KV-Meldung dokumentiert?" },
    ],
    "OE-04": [
      { id: "M2-01", text: "Wurden neue Zeiten veröffentlicht?" },
      { id: "M2-02", text: "Ist die Website aktualisiert?" },
      { id: "M2-03", text: "Wurde die Telefonansage angepasst?" },
    ],
    "OE-05": [
      { id: "M2-01", text: "Existiert ein aktualisierter Dienstplan?" },
      { id: "M2-02", text: "Sind Vertretungen geregelt?" },
      { id: "M2-03", text: "Wurden Bereitschaften dokumentiert?" },
    ],
    "OE-06": [
      { id: "M2-01", text: "Sind IT-Systeme verfügbar?" },
      { id: "M2-02", text: "Ist die Versorgung sichergestellt?" },
      { id: "M2-03", text: "Wurden Sicherheitsmaßnahmen geprüft?" },
    ],
  },
  [OFFICE_TOPIC_REPORTING_DUTIES]: {
    "MP-01": [
      { id: "M2-01", text: "Ist das meldepflichtige Ereignis intern klar dokumentiert?" },
      { id: "M2-02", text: "Sind die relevanten Basisdaten fuer die Meldung vollstaendig erfasst?" },
    ],
    "MP-02": [
      { id: "M2-01", text: "Ist die geltende Meldefrist bekannt und intern hinterlegt?" },
      { id: "M2-02", text: "Sind die Formvorgaben fuer die Meldung geprueft?" },
    ],
    "MP-03": [
      { id: "M2-01", text: "Sind Erstellung, Pruefung und Freigabe der Meldung intern zugewiesen?" },
      { id: "M2-02", text: "Ist eine Vertretungsregelung fuer den Meldeweg dokumentiert?" },
    ],
    "MP-04": [
      { id: "M2-01", text: "Liegen alle fuer die Meldung erforderlichen Nachweise vor?" },
      { id: "M2-02", text: "Ist dokumentiert, ob noch fehlende Unterlagen beschafft werden muessen?" },
    ],
    "MP-05": [
      { id: "M2-01", text: "Ist die Entscheidung zur finalen Abgabe der Meldung getroffen?" },
      { id: "M2-02", text: "Ist die interne Freigabe fuer die Abgabe erteilt?" },
    ],
    "MP-06": [
      { id: "M2-01", text: "Ist die zustaendige externe Stelle fuer die Meldung dokumentiert?" },
      { id: "M2-02", text: "Ist der verbindliche Meldekanal festgelegt?" },
    ],
  },
};

const LEGACY_HR_CHECKPOINT_ID_MAP: Record<string, string> = {
  "HR-01": "HR-GOV-A",
  "HR-02": "HR-GOV-A",
  "HR-03": "HR-GOV-C",
  "HR-04": "HR-GOV-B",
  "HR-05": "HR-GOV-D",
};

export function getM2QuestionsForTopic(
  topicId: OfficeTopicId,
): OfficeM2QuestionsByCheckpoint {
  return M2_QUESTIONS_BY_TOPIC[topicId] ?? {};
}

export function getM2QuestionsForCheckpoint(
  topicId: OfficeTopicId,
  checkpointId: string,
): readonly OfficeM2Question[] {
  const byCheckpoint = M2_QUESTIONS_BY_TOPIC[topicId];
  if (!byCheckpoint) return [];

  const effectiveCheckpointId =
    topicId === OFFICE_TOPIC_HIRING_REPLACEMENT
      ? (LEGACY_HR_CHECKPOINT_ID_MAP[checkpointId] ?? checkpointId)
      : checkpointId;

  return byCheckpoint[effectiveCheckpointId] ?? [];
}
