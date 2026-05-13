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
      {
        id: "M2-01",
        text: "Welcher aktuelle Registerstatus ist fuer die betroffene Person dokumentiert?",
      },
      {
        id: "M2-02",
        text: "Welche Evidenz liegt zum Registerstatus vor (z. B. Registerauszug, bestaetigte Auskunft)?",
      },
      {
        id: "M2-03",
        text: "Wer kann den Registerstatus bei Bedarf verbindlich bestaetigen?",
      },
    ],
    "NC-APPROBATION": [
      {
        id: "M2-01",
        text: "Ist die Approbation mit gueltigem Stand dokumentiert?",
      },
      {
        id: "M2-02",
        text: "Welche Unterlage oder Quelle belegt den Approbationsstatus belastbar?",
      },
      {
        id: "M2-03",
        text: "Wer kann offene Rueckfragen zur Approbation beantworten?",
      },
    ],
    "NC-FACHARZTQUALIFIKATION": [
      {
        id: "M2-01",
        text: "Welche Facharztqualifikation ist fuer den Fall relevant?",
      },
      {
        id: "M2-02",
        text: "Welche Evidenz liegt zur Facharztqualifikation vor?",
      },
      {
        id: "M2-03",
        text: "Wer kann die Facharztqualifikation verbindlich bestaetigen?",
      },
    ],
    "NC-BERUFSHAFTPFLICHT": [
      {
        id: "M2-01",
        text: "Wie ist der aktuelle Status der Berufshaftpflicht dokumentiert?",
      },
      {
        id: "M2-02",
        text: "Welche Quelle belegt den Haftpflichtstatus nachvollziehbar?",
      },
      {
        id: "M2-03",
        text: "Wer ist Ansprechpartner fuer fehlende Informationen zur Berufshaftpflicht?",
      },
    ],
    "NC-TAETIGKEITSUMFANG": [
      {
        id: "M2-01",
        text: "Welcher geplante Taetigkeitsumfang ist aktuell festgehalten?",
      },
      {
        id: "M2-02",
        text: "Welche Evidenz stuetzt diesen Taetigkeitsumfang?",
      },
      {
        id: "M2-03",
        text: "Wer kann den Taetigkeitsumfang final bestaetigen?",
      },
    ],
    "NC-EXTERNE_STELLE": [
      {
        id: "M2-01",
        text: "Welche externe Stelle ist fuer den Fall zustaendig?",
      },
      {
        id: "M2-02",
        text: "Woraus ergibt sich die Zuständigkeit dieser Stelle?",
      },
      {
        id: "M2-03",
        text: "Wer kann die Zuständigkeit bei Bedarf verifizieren?",
      },
    ],
    "NC-ANTRAGSWEG": [
      {
        id: "M2-01",
        text: "Welcher Antrags- oder Anzeigeweg ist fuer den Fall vorgesehen?",
      },
      {
        id: "M2-02",
        text: "Welche Quelle beschreibt diesen Weg verbindlich?",
      },
      {
        id: "M2-03",
        text: "Wer kann offene Fragen zum Antragsweg beantworten?",
      },
    ],
    "NC-GENEHMIGUNGSSTATUS": [
      {
        id: "M2-01",
        text: "Welcher aktuelle Genehmigungsstatus ist dokumentiert?",
      },
      {
        id: "M2-02",
        text: "Welche Evidenz stuetzt den dokumentierten Genehmigungsstatus?",
      },
      {
        id: "M2-03",
        text: "Wer kann den Genehmigungsstatus verbindlich bestaetigen?",
      },
    ],
    "NC-BETRIEBSSTAETTENSTRUKTUR": [
      {
        id: "M2-01",
        text: "Welche Betriebsstaettenstruktur ist fuer den Fall hinterlegt?",
      },
      {
        id: "M2-02",
        text: "Welche Evidenz liegt zur Betriebsstaettenstruktur vor?",
      },
      {
        id: "M2-03",
        text: "Wer kann die Betriebsstaettenstruktur bei Bedarf bestaetigen?",
      },
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
      {
        id: "M2-01",
        text: "Ist belastbar bestaetigt, dass die Person berufsrechtlich als Arzt taetig sein darf?",
      },
      {
        id: "M2-02",
        text: "Wer kann den aktuellen Arztregisterstatus verbindlich bestaetigen?",
      },
      {
        id: "M2-03",
        text: "Wodurch ist die fachliche Befaehigung fuer die vorgesehene Taetigkeit eindeutig belegt?",
      },
      {
        id: "M2-04",
        text: "Ist fuer diese Aussage eine externe Bestaetigung durch KV Berlin oder Aerztekammer noetig?",
      },
    ],
    "HR-GOV-B": [
      {
        id: "M2-01",
        text: "Liegt ein belastbarer Verfahrensstand vor, aus dem die Genehmigungsfaehigkeit ableitbar ist?",
      },
      {
        id: "M2-02",
        text: "Wer kann den aktuellen Stand beim Zulassungsausschuss verbindlich bestaetigen?",
      },
      {
        id: "M2-03",
        text: "Welche Evidenz stuetzt die Aussage, dass keine erkennbaren Zulassungshindernisse bestehen?",
      },
      {
        id: "M2-04",
        text: "Ist eine externe Rueckbestaetigung durch Zulassungsausschuss oder KV Berlin ausstehend?",
      },
    ],
    "HR-GOV-C": [
      {
        id: "M2-01",
        text: "Ist die aktuelle Leitungsstruktur der Praxis bzw. des MVZ fuer den Fall regelkonform belegt?",
      },
      {
        id: "M2-02",
        text: "Wer in der Praxisleitung kann die Strukturkonformitaet verbindlich bestaetigen?",
      },
      {
        id: "M2-03",
        text: "Welche Evidenz belegt die Vereinbarkeit von Praxis-/MVZ-Struktur und geplanter Anstellung?",
      },
      {
        id: "M2-04",
        text: "Ist fuer verbleibende Strukturfragen eine externe Einordnung durch KV Berlin erforderlich?",
      },
    ],
    "HR-GOV-D": [
      {
        id: "M2-01",
        text: "Ist belastbar nachgewiesen, dass die Berufspflichten-Compliance fuer die Taetigkeitsaufnahme gesichert ist?",
      },
      {
        id: "M2-02",
        text: "Wer kann den aktuellen Status zu Haftpflicht und Fortbildung verbindlich bestaetigen?",
      },
      {
        id: "M2-03",
        text: "Welche Evidenz stuetzt die Aussage, dass keine compliance-kritische Luecke fuer den Start besteht?",
      },
      {
        id: "M2-04",
        text: "Ist fuer diese Aussage eine externe Bestaetigung durch Aerztekammer oder KV Berlin erforderlich?",
      },
    ],
  },
  [OFFICE_TOPIC_KV_BILLING]: {
    "KV-01": [
      { id: "M2-01", text: "Was beanstandet das KV-Schreiben konkret?" },
      { id: "M2-02", text: "Welche Nachweise dazu liegen bereits vor?" },
    ],
    "KV-02": [
      { id: "M2-01", text: "Welche Frist und formalen Anforderungen sind gesetzt?" },
      { id: "M2-02", text: "Welche formalen Informationen fehlen noch?" },
    ],
    "KV-03": [
      { id: "M2-01", text: "Welche interne Einschaetzung liegt aktuell vor?" },
      { id: "M2-02", text: "Welche fachliche Rueckmeldung fehlt noch?" },
    ],
    "KV-04": [
      { id: "M2-01", text: "Welches Vorgehen fuer die Rueckmeldung wurde festgelegt?" },
      { id: "M2-02", text: "Welche Entscheidung ist noch offen?" },
    ],
    "KV-05": [
      { id: "M2-01", text: "Wer kann offene Abrechnungsfragen verbindlich beantworten?" },
      { id: "M2-02", text: "Welche Kontaktstelle ist dafuer zustaendig?" },
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
      { id: "M2-03", text: "Wurde die Kürzung intern bewertet?" },
    ],
    "HB-04": [
      { id: "M2-01", text: "Lagen gültige KV-Genehmigungen vor?" },
      { id: "M2-02", text: "Wurden genehmigungspflichtige Leistungen vergütet?" },
      { id: "M2-03", text: "Sind Genehmigungsnachweise archiviert?" },
    ],
    "HB-05": [
      { id: "M2-01", text: "Wurde das RLV geprüft?" },
      { id: "M2-02", text: "Wurden QZV-Zuweisungen kontrolliert?" },
      { id: "M2-03", text: "Sind Quotierungen nachvollziehbar?" },
    ],
    "HB-06": [
      { id: "M2-01", text: "Wurde das Zustellungsdatum dokumentiert?" },
      { id: "M2-02", text: "Ist die Widerspruchsfrist noch offen?" },
      { id: "M2-03", text: "Wurde über einen Widerspruch entschieden?" },
    ],
  },
  [OFFICE_TOPIC_REGRESS]: {
    "RG-01": [
      { id: "M2-01", text: "Welcher Anlass wurde beanstandet und welcher Zeitraum ist betroffen?" },
      { id: "M2-02", text: "Welche Basisfakten sind bereits gesichert dokumentiert?" },
    ],
    "RG-02": [
      { id: "M2-01", text: "Welche Fristen und Formvorgaben gelten konkret?" },
      { id: "M2-02", text: "Welche Regelpunkte sind noch unklar oder offen?" },
    ],
    "RG-03": [
      { id: "M2-01", text: "Wer fuehrt den Fall fachlich und organisatorisch?" },
      { id: "M2-02", text: "Wer vertritt die Verantwortung bei Abwesenheit?" },
    ],
    "RG-04": [
      { id: "M2-01", text: "Welche Nachweise liegen bereits vollstaendig vor?" },
      { id: "M2-02", text: "Welche Unterlagen muessen noch beschafft werden?" },
    ],
    "RG-05": [
      { id: "M2-01", text: "Welches Vorgehen wurde verbindlich entschieden?" },
      { id: "M2-02", text: "Welche Freigabe fehlt fuer die Umsetzung noch?" },
    ],
    "RG-06": [
      { id: "M2-01", text: "Welche externe Stelle ist fuer Rueckfragen zustaendig?" },
      { id: "M2-02", text: "Ueber welchen Kanal erfolgt die Kommunikation?" },
    ],
    "RG-07": [
      { id: "M2-01", text: "Welche Risiken sind aktuell absehbar?" },
      { id: "M2-02", text: "Welche Abhaengigkeiten koennen den Ablauf verzoegern?" },
    ],
  },
  [OFFICE_TOPIC_CLOSURE_COVERAGE]: {
    "UV-01": [
      { id: "M2-01", text: "Welcher Zeitraum und welche Leistungen sind von der Schliessung betroffen?" },
      { id: "M2-02", text: "Welche internen Angaben zum Anlass sind bereits gesichert?" },
    ],
    "UV-02": [
      { id: "M2-01", text: "Welche Melde- und Informationsfristen muessen eingehalten werden?" },
      { id: "M2-02", text: "Welche formalen Pflichten sind noch nicht abschliessend geklaert?" },
    ],
    "UV-03": [
      { id: "M2-01", text: "Wer verantwortet die operative Vertretungsplanung?" },
      { id: "M2-02", text: "Wer verantwortet die externe Kommunikation?" },
    ],
    "UV-04": [
      { id: "M2-01", text: "Welche Vertretungsnachweise liegen vor?" },
      { id: "M2-02", text: "Welche Unterlagen muessen fuer den Zeitraum noch ergaenzt werden?" },
    ],
    "UV-05": [
      { id: "M2-01", text: "Welches Vertretungsmodell wurde freigegeben?" },
      { id: "M2-02", text: "Welche Entscheidung ist noch offen?" },
    ],
    "UV-06": [
      { id: "M2-01", text: "Welche externe Stelle wurde informiert?" },
      { id: "M2-02", text: "Welcher Kontaktkanal wird verbindlich genutzt?" },
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
      { id: "M2-01", text: "Welches Zielbild fuer Sitz/Zulassung wird verfolgt?" },
      { id: "M2-02", text: "Welche Ausgangsdaten sind bereits belastbar vorhanden?" },
    ],
    "ZA-02": [
      { id: "M2-01", text: "Welche Fristen und Verfahrensregeln gelten fuer den Fall?" },
      { id: "M2-02", text: "Welche formalen Anforderungen sind noch unklar?" },
    ],
    "ZA-03": [
      { id: "M2-01", text: "Wer ist fuer welchen Verfahrensschritt verantwortlich?" },
      { id: "M2-02", text: "Welche Vertretung ist fuer Engpaesse festgelegt?" },
    ],
    "ZA-04": [
      { id: "M2-01", text: "Welche Antragsnachweise sind bereits vorhanden?" },
      { id: "M2-02", text: "Welche Unterlagen fehlen noch bis zur Einreichung?" },
    ],
    "ZA-05": [
      { id: "M2-01", text: "Welche Reihenfolge der Schritte wurde entschieden?" },
      { id: "M2-02", text: "Welche Freigabe fehlt fuer den naechsten Schritt?" },
    ],
    "ZA-06": [
      { id: "M2-01", text: "Welche externe Stelle ist federfuehrend?" },
      { id: "M2-02", text: "Wie wird die Kommunikation dokumentiert und nachgehalten?" },
    ],
  },
  [OFFICE_TOPIC_APPLICATION_MANAGEMENT]: {
    "AM-01": [
      { id: "M2-01", text: "Welcher Antrag liegt vor und welches Ziel wird verfolgt?" },
      { id: "M2-02", text: "Welche Kerninformationen zum Anlass sind gesichert?" },
    ],
    "AM-02": [
      { id: "M2-01", text: "Welche Fristen und Einreichungsvorgaben sind bindend?" },
      { id: "M2-02", text: "Welche Pflichtschritte sind noch offen?" },
    ],
    "AM-03": [
      { id: "M2-01", text: "Wer ist fuer Erstellung, Pruefung und Einreichung zustaendig?" },
      { id: "M2-02", text: "Wie ist die Vertretung bei Ausfall geregelt?" },
    ],
    "AM-04": [
      { id: "M2-01", text: "Welche Nachweise liegen bereits vollstaendig vor?" },
      { id: "M2-02", text: "Welche Dokumente fehlen fuer die Einreichung noch?" },
    ],
    "AM-05": [
      { id: "M2-01", text: "Welche Entscheidung zur Einreichung wurde getroffen?" },
      { id: "M2-02", text: "Welche Entscheidung ist noch zu eskalieren?" },
    ],
    "AM-06": [
      { id: "M2-01", text: "Welche Risiken bedrohen den fristgerechten Abschluss?" },
      { id: "M2-02", text: "Welche Abhaengigkeiten koennen den Antrag blockieren?" },
    ],
  },
  [OFFICE_TOPIC_CONTINUING_EDUCATION]: {
    "WB-01": [
      { id: "M2-01", text: "Welche Rollen oder Personen sind vom Nachweisthema betroffen?" },
      { id: "M2-02", text: "Welche Ausgangslage ist bereits dokumentiert?" },
    ],
    "WB-02": [
      { id: "M2-01", text: "Welche Fristen und Regeln fuer Punkte/Nachweise gelten?" },
      { id: "M2-02", text: "Welche Pflichtvorgaben sind noch nicht abschliessend geklaert?" },
    ],
    "WB-03": [
      { id: "M2-01", text: "Wer verantwortet die Nachverfolgung je Person?" },
      { id: "M2-02", text: "Wer prueft die Vollstaendigkeit vor Fristablauf?" },
    ],
    "WB-04": [
      { id: "M2-01", text: "Welche Nachweise/Punkte liegen bereits vor?" },
      { id: "M2-02", text: "Welche Belege muessen noch nachgereicht werden?" },
    ],
    "WB-05": [
      { id: "M2-01", text: "Welche Massnahmen wurden priorisiert?" },
      { id: "M2-02", text: "Welche Entscheidung steht noch aus?" },
    ],
    "WB-06": [
      { id: "M2-01", text: "Welche externe Stelle bestaetigt die Nachweise?" },
      { id: "M2-02", text: "Wie erfolgt die Uebermittlung an die externe Stelle?" },
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
      { id: "M2-02", text: "Existiert eine Erinnerungsfunktion?" },
      { id: "M2-03", text: "Wurde bei Punktedefizit reagiert?" },
    ],
    "FB-05": [
      { id: "M2-01", text: "Wurden Punkte an die Ärztekammer übertragen?" },
      { id: "M2-02", text: "Ist die Übertragung bestätigt?" },
      { id: "M2-03", text: "Wurden Übertragungsfehler geprüft?" },
    ],
    "FB-06": [
      { id: "M2-01", text: "Wurde ein Punktedefizit bewertet?" },
      { id: "M2-02", text: "Sind mögliche Honorarkürzungen bekannt?" },
      { id: "M2-03", text: "Wurde ein Maßnahmenplan festgelegt?" },
    ],
    "FB-AUFHOLPLAN": [
      { id: "M2-01", text: "Existiert ein Fortbildungsplan?" },
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
      { id: "M2-01", text: "Existiert ein Wartungsplan?" },
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
      { id: "M2-02", text: "Wurde das Risiko bewertet?" },
      { id: "M2-03", text: "Sind betroffene Personen identifiziert?" },
    ],
    "DS-03": [
      { id: "M2-01", text: "Wurde intern geprüft, ob eine Meldepflicht besteht?" },
      { id: "M2-02", text: "Wurde die maßgebliche Meldefrist intern bewertet?" },
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
      { id: "M2-03", text: "Sind Wiederholungsrisiken bewertet?" },
    ],
  },
  [OFFICE_TOPIC_EXTENDED_OPENING_HOURS]: {
    "OE-01": [
      { id: "M2-01", text: "Ist ausreichend Personal eingeplant?" },
      { id: "M2-02", text: "Sind ärztliche Zeiten abgedeckt?" },
      { id: "M2-03", text: "Wurden Ausfallrisiken bewertet?" },
    ],
    "OE-02": [
      { id: "M2-01", text: "Wurden Arbeitszeiten angepasst?" },
      { id: "M2-02", text: "Sind Ruhezeiten berücksichtigt?" },
      { id: "M2-03", text: "Wurden Vertragsänderungen dokumentiert?" },
    ],
    "OE-03": [
      { id: "M2-01", text: "Wurden KV-relevante Anforderungen intern geprüft?" },
      { id: "M2-02", text: "Wurde bewertet, ob eine Meldung erforderlich ist?" },
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
      { id: "M2-01", text: "Welches meldepflichtige Ereignis liegt vor?" },
      { id: "M2-02", text: "Welche Basisdaten sind bereits belastbar erfasst?" },
    ],
    "MP-02": [
      { id: "M2-01", text: "Welche Meldefrist und welche Formvorgaben gelten?" },
      { id: "M2-02", text: "Welche Pflichtteile der Meldung sind noch offen?" },
    ],
    "MP-03": [
      { id: "M2-01", text: "Wer erstellt, prueft und gibt die Meldung frei?" },
      { id: "M2-02", text: "Wie ist die Vertretung fuer den Meldeweg geregelt?" },
    ],
    "MP-04": [
      { id: "M2-01", text: "Welche Nachweise sind fuer die Meldung vorhanden?" },
      { id: "M2-02", text: "Welche Unterlagen fehlen noch bis zur finalen Abgabe?" },
    ],
    "MP-05": [
      { id: "M2-01", text: "Welche Entscheidung zur finalen Abgabe wurde getroffen?" },
      { id: "M2-02", text: "Welche interne Freigabe ist noch erforderlich?" },
    ],
    "MP-06": [
      { id: "M2-01", text: "Welche externe Stelle ist fuer die Meldung zustaendig?" },
      { id: "M2-02", text: "Welcher Kanal ist fuer Rueckfragen verbindlich?" },
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
