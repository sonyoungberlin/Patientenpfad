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
  OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
  OFFICE_TOPIC_WORKTIME_CHANGE,
  OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE,
  OFFICE_TOPIC_VACATION_TEAM_COORDINATION,
  OFFICE_TOPIC_RESPONSIBILITY_COORDINATION,
  OFFICE_TOPIC_TRAINING_COORDINATION,
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
      { id: "M2-01", text: "Ist der neue Arzt aktuell im Arztregister der Ärztekammer Berlin eingetragen?" },
      { id: "M2-02", text: "Hat die Ärztekammer den Registerstatus bestätigt?" },
    ],
    "NC-APPROBATION": [
      { id: "M2-01", text: "Liegt die Approbationsurkunde vor?" },
      { id: "M2-02", text: "Ist die Approbation aktuell gültig (keine Ruhens- oder Widerrufsbescheide)?" },
    ],
    "NC-FACHARZTQUALIFIKATION": [
      { id: "M2-01", text: "Liegt die Facharzt-Urkunde für das relevante Fachgebiet vor?" },
      { id: "M2-02", text: "Passt die Qualifikation zum geplanten Tätigkeitsbereich in der Praxis?" },
    ],
    "NC-BERUFSHAFTPFLICHT": [
      { id: "M2-01", text: "Liegt ein aktueller Nachweis der Berufshaftpflicht für die geplante Tätigkeit vor?" },
      { id: "M2-02", text: "Deckt die Haftpflicht auch die spezifische Tätigkeitsform ab (z. B. Anstellung, BAG, Nebenbetriebsstätte)?" },
    ],
    "NC-TAETIGKEITSUMFANG": [
      { id: "M2-01", text: "Ist klar, in welchem Umfang der neue Arzt tätig sein soll (Vollzeit, Teilzeit, Wochenstunden)?" },
      { id: "M2-02", text: "Hat der Zulassungsausschuss den geplanten Tätigkeitsumfang bestätigt?" },
    ],
    "NC-EXTERNE_STELLE": [
      { id: "M2-01", text: "Ist bekannt, welches Verfahren (Genehmigung, Anzeige) für diese Anstellung erforderlich ist?" },
      { id: "M2-02", text: "Ist der zuständige Ansprechpartner bei der externen Stelle bekannt?" },
    ],
    "NC-ANTRAGSWEG": [
      { id: "M2-01", text: "Ist der Antrag auf Anstellungsgenehmigung beim Zulassungsausschuss Berlin gestellt?" },
      { id: "M2-02", text: "Ist bekannt, welche Unterlagen für den Antrag noch fehlen?" },
    ],
    "NC-GENEHMIGUNGSSTATUS": [
      { id: "M2-01", text: "Liegt die Anstellungsgenehmigung des Zulassungsausschusses vor?" },
      { id: "M2-02", text: "Ist bekannt, bis wann mit einer Entscheidung zu rechnen ist?" },
    ],
    "NC-BETRIEBSSTAETTENSTRUKTUR": [
      { id: "M2-01", text: "Ist die Praxis-BSNR als Beschäftigungsort für den neuen Arzt vorgesehen?" },
      { id: "M2-02", text: "Ist geklärt, ob der neue Arzt auch an weiteren Betriebsstätten arbeitet?" },
    ],
    "NC-ARBEITSVERTRAG_FREIGABE": [
      { id: "M2-01", text: "Ist der Arbeitsvertrag mit Beginn, Stunden und Vergütung vollständig unterschrieben?" },
      { id: "M2-02", text: "Hat die Praxisleitung den Vertrag freigegeben?" },
    ],
    "NC-LANR_BSNR_ZUORDNUNG": [
      { id: "M2-01", text: "Hat der neue Arzt eine LANR, die der Praxis-BSNR korrekt zugeordnet ist?" },
      { id: "M2-02", text: "Ist bestätigt, dass der neue Arzt über diese Zuordnung abrechnen darf?" },
    ],
    "NC-SYSTEMZUGRIFFE_EINGERICHTET": [
      { id: "M2-01", text: "Hat der neue Arzt PVS-Zugriff passend zu seiner Tätigkeit?" },
      { id: "M2-02", text: "Wurden Schweigepflicht und Datenschutz erklärt?" },
    ],
    "HR-GOV-A": [
      { id: "M2-01", text: "Ist bestätigt, dass der neue Arzt aktuell ärztlich tätig sein darf?" },
      { id: "M2-02", text: "Liegt ein aktueller Nachweis dazu vor?" },
    ],
    "HR-GOV-B": [
      { id: "M2-01", text: "Sind der Praxisleitung Hindernisse bekannt, die der Anstellung entgegenstehen?" },
      { id: "M2-02", text: "Liegt eine Rückmeldung der zuständigen Stelle vor?" },
    ],
    "HR-GOV-C": [
      { id: "M2-01", text: "Hat die Praxisleitung die geplante Anstellung freigegeben?" },
      { id: "M2-02", text: "Passt die Anstellung zum Sitz, Fachgebiet und Standort der Praxis?" },
    ],
    "HR-GOV-D": [
      { id: "M2-01", text: "Liegen Haftpflicht- und Fortbildungsnachweise für den neuen Arzt vor?" },
      { id: "M2-02", text: "Sind diese Nachweise für die geplante Tätigkeit ausreichend?" },
    ],
  },
  [OFFICE_TOPIC_KV_BILLING]: {
    "KV-01": [
      { id: "M2-01", text: "Ist aus dem KV-Schreiben klar, welche Leistungen beanstandet werden?" },
      { id: "M2-02", text: "Ist intern bekannt, um welche Art von KV-Vorgang es sich handelt?" },
    ],
    "KV-02": [
      { id: "M2-01", text: "Ist die Frist zur Stellungnahme intern schriftlich festgehalten?" },
      { id: "M2-02", text: "Ist klar, in welcher Form (schriftlich, per Portal, per Fax) die KV eine Antwort erwartet?" },
    ],
    "KV-03": [
      { id: "M2-01", text: "Gibt es in der Patientenakte Eintraege, die die beanstandete Leistung erklaeren?" },
      { id: "M2-02", text: "Ist mit dem zustaendigen Arzt geklaert, warum die Leistung so abgerechnet wurde?" },
    ],
    "KV-04": [
      { id: "M2-01", text: "Ist intern entschieden, wie die Praxis auf die KV-Beanstandung reagiert?" },
      { id: "M2-02", text: "Ist die Antwort von der Praxisleitung freigegeben?" },
    ],
    "KV-05": [
      { id: "M2-01", text: "Ist bekannt, welcher KV-Bereich (Abrechnung, Plausibilitaet) fuer dieses Schreiben zustaendig ist?" },
      { id: "M2-02", text: "Liegen Kontaktdaten des zustaendigen KV-Ansprechpartners vor, falls Rueckfragen noetig sind?" },
    ],
  },
  [OFFICE_TOPIC_PLAUSIBILITY_BILLING]: {
    "PL-01": [
      { id: "M2-01", text: "Ist intern bekannt, worauf die auffälligen Zeitwerte zurückzuführen sind?" },
      { id: "M2-02", text: "Gibt es eine nachvollziehbare Erklärung für die auffälligen Quartalswerte?" },
    ],
    "PL-02": [
      { id: "M2-01", text: "Sind die konkret auffälligen Tage aus der Prüfung bekannt?" },
      { id: "M2-02", text: "Gibt es für diese Tage eine nachvollziehbare Erklärung?" },
    ],
    "PL-03": [
      { id: "M2-01", text: "Ist intern bekannt, welche Leistung in der Plausibilitätsprüfung beanstandet wird?" },
      { id: "M2-02", text: "Fehlt ein konkreter Dokumentationsbestandteil wie Befund, Diagnose oder Indikation?" },
    ],
    "PL-04": [
      { id: "M2-01", text: "Ist klar, welche genehmigungspflichtige Leistung betroffen ist?" },
      { id: "M2-02", text: "Liegt die passende KV-Genehmigung aktuell vor?" },
    ],
    "PL-05": [
      { id: "M2-01", text: "Ist die korrekte LANR-Zuordnung für die beanstandete Leistung intern geprüft?" },
      { id: "M2-02", text: "Gibt es Leistungen, bei denen persönliche Leistungserbringung zweifelhaft ist?" },
    ],
    "PL-06": [
      { id: "M2-01", text: "Hat die zuständige Person in der Praxis die Antwort an die KV freigegeben?" },
      { id: "M2-02", text: "Gibt es noch offene Punkte, bevor die Antwort oder Korrektur an die KV geht?" },
    ],
  },
  [OFFICE_TOPIC_HONORAR_NOTICE_REVIEW]: {
    "HB-01": [
      { id: "M2-01", text: "Stimmt die im Bescheid ausgewiesene Fallzahl mit den eigenen PVS-Daten ueberein?" },
      { id: "M2-02", text: "Gibt es Faelle, die abgerechnet wurden, aber im Bescheid nicht auftauchen?" },
    ],
    "HB-02": [
      { id: "M2-01", text: "Wurden alle abgerechneten GOPs im Bescheid tatsaechlich verguetet?" },
      { id: "M2-02", text: "Gibt es im Bescheid nicht verguetete GOPs ohne erkennbare Begruendung?" },
    ],
    "HB-03": [
      { id: "M2-01", text: "Ist klar, warum die KV im Bescheid gekuerzt hat?" },
      { id: "M2-02", text: "Gibt es Kuerzungen, die aus Praxissicht nicht nachvollziehbar sind?" },
    ],
    "HB-04": [
      { id: "M2-01", text: "Wurden Leistungen abgerechnet, fuer die eine KV-Genehmigung erforderlich war?" },
      { id: "M2-02", text: "Ist die KV-Genehmigung fuer die betreffende Leistung im Bescheid beruecksichtigt?" },
    ],
    "HB-05": [
      { id: "M2-01", text: "Ist das Regelleistungsvolumen (RLV) fuer dieses Quartal bekannt?" },
      { id: "M2-02", text: "Gibt es Kuerzungen im Bescheid, die intern erklaert werden muessen?" },
    ],
    "HB-06": [
      { id: "M2-01", text: "Ist das Zustellungsdatum des Bescheids bekannt?" },
      { id: "M2-02", text: "Ist intern entschieden, ob Widerspruch gegen den Bescheid eingelegt wird?" },
    ],
  },
  [OFFICE_TOPIC_REGRESS]: {
    "RG-01": [
      { id: "M2-01", text: "Ist aus dem Bescheid eindeutig, was konkret beanstandet wird?" },
      { id: "M2-02", text: "Ist der geprufte Zeitraum aus dem Bescheid bekannt?" },
      { id: "M2-03", text: "Ist intern bekannt, um welche Art von Regressverfahren es sich handelt?" },
    ],
    "RG-02": [
      { id: "M2-01", text: "Ist die Frist zur Stellungnahme aus dem Bescheid notiert?" },
      { id: "M2-02", text: "Ist klar, ob ein mehrstufiges Verfahren (Anhoerung, Bescheid, Widerspruch) vorliegt?" },
    ],
    "RG-03": [
      { id: "M2-01", text: "Ist intern festgelegt, wer die Stellungnahme vorbereitet?" },
      { id: "M2-02", text: "Ist klar, welcher Arzt oder welche Aerztin die medizinische Pruefung uebernimmt?" },
    ],
    "RG-04": [
      { id: "M2-01", text: "Liegen Verordnungsdaten aus dem PVS fuer den betroffenen Zeitraum vor?" },
      { id: "M2-02", text: "Gibt es in der Patientenakte dokumentierte klinische Begruendungen fuer die beanstandete Verordnung?" },
      { id: "M2-03", text: "Sind Praxisbesonderheiten (z. B. besondere Patientengruppe, Schwerpunkt) dokumentiert?" },
    ],
    "RG-05": [
      { id: "M2-01", text: "Ist intern entschieden, wie auf den Regressbescheid reagiert wird?" },
      { id: "M2-02", text: "Wurde eingeschaetzt, ob externe Beratung (KV, Anwalt) noetig ist?" },
    ],
    "RG-06": [
      { id: "M2-01", text: "Ist die zustaendige Pruefungsstelle aus dem Bescheid erfasst?" },
      { id: "M2-02", text: "Ist der Adressat fuer die Stellungnahme eindeutig benannt?" },
    ],
    "RG-07": [
      { id: "M2-01", text: "Ist die moegliche Forderung so hoch, dass externe Beratung sinnvoll ist?" },
      { id: "M2-02", text: "Sind weitere laufende Regressverfahren fuer diese Praxis bekannt?" },
    ],
  },
  [OFFICE_TOPIC_CLOSURE_COVERAGE]: {
    "UV-01": [
      { id: "M2-01", text: "Ist der Abwesenheitszeitraum aller betroffenen Personen intern festgelegt?" },
      { id: "M2-02", text: "Ist intern festgelegt, welche Personen von der Abwesenheit betroffen sind?" },
    ],
    "UV-02": [
      { id: "M2-01", text: "Ist intern geklaert, ob die KV ueber die Schliessung informiert werden muss?" },
      { id: "M2-02", text: "Ist bekannt, ob für den Zeitraum eine ärztliche Vertretung organisiert werden muss?" },
    ],
    "UV-03": [
      { id: "M2-01", text: "Ist intern festgelegt, wer die Vertretung und KV-Kommunikation koordiniert?" },
      { id: "M2-02", text: "Ist bekannt, wer während der Schließung für Rückfragen von Patienten erreichbar ist?" },
    ],
    "UV-04": [
      { id: "M2-01", text: "Liegt eine schriftliche Vertretungsvereinbarung mit dem Vertretungsarzt vor?" },
      { id: "M2-02", text: "Ist der Vertretungsarzt der KV namentlich gemeldet?" },
    ],
    "UV-05": [
      { id: "M2-01", text: "Ist entschieden, wie Patientinnen und Patienten während der Schließung versorgt werden?" },
      { id: "M2-02", text: "Hat die Praxisleitung das Vertretungsmodell freigegeben?" },
    ],
    "UV-06": [
      { id: "M2-01", text: "Ist die KV Berlin ueber die Praxisschliessung informiert?" },
      { id: "M2-02", text: "Ist bekannt, ob zusätzlich eine andere Stelle informiert werden muss?" },
    ],
    "UV-PATIENTENINFO": [
      { id: "M2-01", text: "Ist ein Patientenaushang mit Schliessungshinweis an der Praxistuer angebracht?" },
      { id: "M2-02", text: "Ist die Telefonansage auf den Schliesszungszeitraum aktualisiert?" },
    ],
    "UV-NOTFALLVERSORGUNG": [
      { id: "M2-01", text: "Ist geregelt, wohin Patienten im Notfall gehen können?" },
      { id: "M2-02", text: "Gibt es Patienten mit dringendem Versorgungsbedarf, die proaktiv informiert werden müssen?" },
    ],
    "UV-TERMINMANAGEMENT": [
      { id: "M2-01", text: "Sind alle Termine im Schliesszungszeitraum intern abgestimmt?" },
      { id: "M2-02", text: "Wurden Patienten mit dringenden Folgebedarfen (z. B. Rezepte, Überweisungen) rechtzeitig kontaktiert?" },
    ],
    "UV-ABRECHNUNGSZUORDNUNG": [
      { id: "M2-01", text: "Ist die Abrechnungszuordnung fuer den Vertretungsarzt intern geklaert?" },
      { id: "M2-02", text: "Ist intern abgestimmt, nach welchem Abrechnungsmodell der Vertretungsarzt behandelt?" },
    ],
  },
  [OFFICE_TOPIC_SEAT_APPROVAL]: {
    "ZA-01": [
      { id: "M2-01", text: "Ist klar, welches Verfahren angestrebt wird (z. B. Neuzulassung, Nachbesetzung, Anstellungsgenehmigung, Ermaechtigung)?" },
      { id: "M2-02", text: "Ist bekannt, ob am Standort ein zulassungsfaehiger Sitz fuer das angestrebte Fachgebiet verfuegbar ist?" },
    ],
    "ZA-02": [
      { id: "M2-01", text: "Ist bekannt, wann der Antrag spaetestens eingereicht werden muss?" },
      { id: "M2-02", text: "Ist bekannt, wann der Zulassungsausschuss ueber den Antrag entscheidet?" },
    ],
    "ZA-03": [
      { id: "M2-01", text: "Ist intern festgelegt, wer den Antrag zusammenstellt?" },
      { id: "M2-02", text: "Ist eine Vertretungsregelung fuer die Fristueberwachung beim Zulassungsantrag intern festgelegt?" },
    ],
    "ZA-04": [
      { id: "M2-01", text: "Liegen alle erforderlichen Qualifikationsnachweise fuer den Zulassungsantrag vollstaendig vor?" },
      { id: "M2-02", text: "Liegt ein aktueller Nachweis der gueltigen Berufshaftpflicht vor?" },
    ],
    "ZA-05": [
      { id: "M2-01", text: "Ist intern geklaert, ob vor der Einreichung noch eine Rueckfrage bei einer zustaendigen Stelle noetig ist?" },
      { id: "M2-02", text: "Hat die Praxisleitung die Einreichung freigegeben?" },
    ],
    "ZA-06": [
      { id: "M2-01", text: "Ist die zustaendige Einreichungsstelle fuer den Antrag bekannt?" },
      { id: "M2-02", text: "Ist bekannt, auf welchem Weg der Antrag eingereicht werden soll?" },
    ],
  },
  [OFFICE_TOPIC_APPLICATION_MANAGEMENT]: {
    "AM-01": [
      { id: "M2-01", text: "Ist klar, was konkret beantragt wird (z. B. welche Leistung, Genehmigung oder Berechtigung)?" },
      { id: "M2-02", text: "Ist bekannt, an welche Stelle der Antrag geschickt werden muss?" },
    ],
    "AM-02": [
      { id: "M2-01", text: "Ist die Einreichungsfrist intern schriftlich festgehalten?" },
      { id: "M2-02", text: "Ist intern geklaert, ob vor der Einreichung noch Unterlagen von Dritten fehlen?" },
    ],
    "AM-03": [
      { id: "M2-01", text: "Ist die verantwortliche Person fuer die Antragstellung intern festgelegt?" },
      { id: "M2-02", text: "Ist bekannt, wer die Frist ueberwacht, falls die zust\u00e4ndige Person ausfaellt?" },
    ],
    "AM-04": [
      { id: "M2-01", text: "Liegen alle notwendigen Unterlagen fuer die Einreichung vor?" },
      { id: "M2-02", text: "Gibt es Unterlagen, die noch beschafft werden muessen?" },
    ],
    "AM-05": [
      { id: "M2-01", text: "Ist intern entschieden, ob der Antrag zur Einreichung freigegeben ist?" },
      { id: "M2-02", text: "Hat die Praxisleitung die Einreichung freigegeben?" },
    ],
    "AM-06": [
      { id: "M2-01", text: "Gibt es noch fehlende Voraussetzungen, ohne die der Antrag scheitern koennte?" },
      { id: "M2-02", text: "Ist realistisch, dass der Antrag rechtzeitig vollstaendig vorliegt?" },
    ],
  },
  [OFFICE_TOPIC_CONTINUING_EDUCATION]: {
    "WB-01": [
      { id: "M2-01", text: "Ist klar, welcher Arzt oder welche Ärztin vom Fortbildungsnachweis betroffen ist?" },
      { id: "M2-02", text: "Ist bekannt, wodurch der Fall ausgelöst wurde (z. B. KV-Anfrage, Fristablauf, neuer Arzt)?" },
    ],
    "WB-02": [
      { id: "M2-01", text: "Ist bekannt, bis wann der Fortbildungsnachweis erbracht werden muss?" },
      { id: "M2-02", text: "Hat die KV die Praxis bereits wegen fehlender Fortbildungspunkte kontaktiert?" },
    ],
    "WB-03": [
      { id: "M2-01", text: "Ist intern festgelegt, wer fuer das Fortbildungsmanagement zustaendig ist?" },
      { id: "M2-02", text: "Ist festgelegt, wer die betroffene Person rechtzeitig erinnert?" },
    ],
    "WB-04": [
      { id: "M2-01", text: "Ist bekannt, wie viele Fortbildungspunkte aktuell vorhanden sind?" },
      { id: "M2-02", text: "Liegt ein aktueller Nachweis ueber den Fortbildungspunktestand vor?" },
    ],
    "WB-05": [
      { id: "M2-01", text: "Ist festgelegt, welche Fortbildungen als nächstes absolviert werden sollen?" },
      { id: "M2-02", text: "Ist realistisch, dass fehlende Punkte noch rechtzeitig erreicht werden?" },
    ],
    "WB-06": [
      { id: "M2-01", text: "Ist bekannt, wie absolvierte Fortbildungen im Aerztekammer-Konto eingetragen werden?" },
      { id: "M2-02", text: "Liegt ein aktueller Punktekontoauszug der Ärztekammer vor?" },
    ],
  },
  [OFFICE_TOPIC_CME_GENERAL_MEDICINE]: {
    "FB-01": [
      { id: "M2-01", text: "Ist das Enddatum des aktuellen 5-Jahres-Fortbildungszyklus bekannt?" },
      { id: "M2-02", text: "Ist bekannt, wie viel Zeit bis zum Ende des Zyklus noch verbleibt?" },
    ],
    "FB-02": [
      { id: "M2-01", text: "Ist bekannt, wie viele Fortbildungspunkte der Arzt aktuell im Ärztekammer-Konto hat?" },
      { id: "M2-02", text: "Gibt es Fortbildungen, die zwar absolviert wurden, aber noch nicht im Konto eingetragen sind?" },
    ],
    "FB-03": [
      { id: "M2-01", text: "Liegen Nachweise fuer alle absolvierten Fortbildungen vor?" },
      { id: "M2-02", text: "Gibt es absolvierte Fortbildungen, die noch nicht im Aerztekammer-Konto eingetragen sind?" },
    ],
    "FB-04": [
      { id: "M2-01", text: "Reicht die verbleibende Zeit aus, um noch fehlende Punkte bis zum Fristende zu sammeln?" },
      { id: "M2-02", text: "Ist intern festgelegt, wer die Fortbildungsfrist ueberwacht?" },
    ],
    "FB-05": [
      { id: "M2-01", text: "Sind alle absolvierten Fortbildungen im Aerztekammer-Konto eingetragen?" },
      { id: "M2-02", text: "Hat die KV Berlin bereits eine Anfrage wegen fehlender Fortbildungspunkte geschickt?" },
    ],
    "FB-06": [
      { id: "M2-01", text: "Ist bekannt, ob bei Fristablauf eine Honorarkürzung droht (25 % pro Quartal, danach mehr)?" },
      { id: "M2-02", text: "Gibt es Hinweise auf einen bevorstehenden Honorareinbehalt durch die KV?" },
    ],
    "FB-AUFHOLPLAN": [
      { id: "M2-01", text: "Ist ein realistischer Plan vorhanden, wie die fehlenden Punkte vor Fristende noch erreicht werden können?" },
      { id: "M2-02", text: "Sind konkrete Fortbildungstermine vor dem Fristende verbindlich geplant?" },
    ],
  },
  [OFFICE_TOPIC_MFA_HIRING]: {
    "MF-01": [
      { id: "M2-01", text: "Liegt der MFA-Abschlussnachweis vor?" },
      { id: "M2-02", text: "Gibt es Zusatzqualifikationen, die für den geplanten Einsatz wichtig sind?" },
    ],
    "MF-02": [
      { id: "M2-01", text: "Ist der Arbeitsvertrag von beiden Seiten unterschrieben?" },
      { id: "M2-02", text: "Ist intern geprueft, ob die Vertragsbedingungen zum geplanten Einsatz passen?" },
    ],
    "MF-03": [
      { id: "M2-01", text: "Liegen alle Lohnbuchhaltungsdaten fuer die neue MFA vor?" },
      { id: "M2-02", text: "Ist die neue MFA in der Lohnbuchhaltung angelegt?" },
    ],
    "MF-04": [
      { id: "M2-01", text: "Ist die Beschaeftigungsform fuer die neue MFA intern festgelegt?" },
      { id: "M2-02", text: "Ist die Sozialversicherung passend dazu angemeldet?" },
    ],
    "MF-05": [
      { id: "M2-01", text: "Hat die neue MFA Zugriff auf die Systeme, die sie für ihre Aufgaben braucht?" },
      { id: "M2-02", text: "Ist die neue MFA in ihre Datenschutzpflichten eingewiesen?" },
    ],
    "MF-06": [
      { id: "M2-01", text: "Ist klar, in welche Aufgaben die neue MFA zuerst eingearbeitet wird?" },
      { id: "M2-02", text: "Sind alle Pflichtunterweisungen fuer die neue MFA abgeschlossen?" },
    ],
  },
  [OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING]: {
    "MA-01": [
      { id: "M2-01", text: "Sind die Taetigkeitsbeschraenkungen fuer Minderjaehrige in der Praxis bekannt?" },
      { id: "M2-02", text: "Ist der Dienstplan auf die gesetzlichen Arbeitszeitvorgaben fuer Minderjaehrige ausgerichtet?" },
    ],
    "MA-02": [
      { id: "M2-01", text: "Liegt die ärztliche Erstuntersuchung vor dem Ausbildungsbeginn vor?" },
      { id: "M2-02", text: "Ist bekannt, wann eine Nachuntersuchung nötig wird?" },
    ],
    "MA-03": [
      { id: "M2-01", text: "Ist der Ausbildungsvertrag von allen erforderlichen Personen unterschrieben?" },
      { id: "M2-02", text: "Liegt die Bestätigung der Ärztekammer Berlin zum Ausbildungsvertrag vor?" },
    ],
    "MA-04": [
      { id: "M2-01", text: "Sind Berufsschultage im Dienstplan berücksichtigt?" },
      { id: "M2-02", text: "Sind die Arbeitszeitregelungen fuer den Azubi entsprechend den gesetzlichen Vorgaben eingehalten?" },
    ],
    "MA-05": [
      { id: "M2-01", text: "Liegt die Einwilligung der Erziehungsberechtigten vor?" },
      { id: "M2-02", text: "Sind Notfallkontakte der Erziehungsberechtigten in der Praxis hinterlegt?" },
    ],
    "MA-06": [
      { id: "M2-01", text: "Ist der Azubi in seine Datenschutzpflichten eingewiesen?" },
      { id: "M2-02", text: "Sind die Pflichtunterweisungen für Jugendliche schriftlich belegt?" },
    ],
  },
  [OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE]: {
    "MG-01": [
      { id: "M2-01", text: "Ist das anzuschaffende Geraet mit seinem Einsatzbereich intern festgelegt?" },
      { id: "M2-02", text: "Ist die Risikoklasse des Geraets bekannt?" },
    ],
    "MG-02": [
      { id: "M2-01", text: "Ist intern bekannt, welche Genehmigungsanforderungen fuer dieses Geraet gelten?" },
      { id: "M2-02", text: "Ist bekannt, ob Fachkundenachweise erforderlich sind?" },
    ],
    "MG-03": [
      { id: "M2-01", text: "Ist festgelegt, wer in die Bedienung eingewiesen werden muss?" },
      { id: "M2-02", text: "Ist die Einweisung schriftlich nachweisbar?" },
    ],
    "MG-04": [
      { id: "M2-01", text: "Ist die zutreffende Pruefpflicht fuer das Geraet bekannt?" },
      { id: "M2-02", text: "Ist der Termin fuer die erste vorgeschriebene Pruefung des Geraets bekannt?" },
    ],
    "MG-05": [
      { id: "M2-01", text: "Ist klar, mit welcher GOP die Leistung abgerechnet werden soll?" },
      { id: "M2-02", text: "Sind die Dokumentationsanforderungen für diese Leistung bekannt?" },
    ],
    "MG-06": [
      { id: "M2-01", text: "Ist das Geraet in den vorgeschriebenen internen Registern erfasst?" },
      { id: "M2-02", text: "Liegt die CE-Konformitätserklärung des Herstellers vor?" },
    ],
  },
  [OFFICE_TOPIC_DATA_PROTECTION_INCIDENT]: {
    "DS-01": [
      { id: "M2-01", text: "Ist klar, was genau passiert ist (z. B. falsche E-Mail, verlorenes Gerät, unberechtigter Zugriff)?" },
      { id: "M2-02", text: "Ist der Zeitpunkt des Datenschutzvorfalls intern bekannt?" },
    ],
    "DS-02": [
      { id: "M2-01", text: "Sind durch den Vorfall personenbezogene Daten betroffen?" },
      { id: "M2-02", text: "Sind besonders schutzbeduertige personenbezogene Daten vom Vorfall betroffen?" },
    ],
    "DS-03": [
      { id: "M2-01", text: "Ist bekannt, ob eine Meldung an die Berliner Datenschutzbehörde nötig ist?" },
      { id: "M2-02", text: "Ist bekannt, ob die 72-Stunden-Meldefrist noch laeuft?" },
    ],
    "DS-04": [
      { id: "M2-01", text: "Sind alle vom Vorfall betroffenen Zugaenge und Systeme intern gesichert?" },
      { id: "M2-02", text: "Ist die Ursache des Datenschutzvorfalls behoben?" },
    ],
    "DS-05": [
      { id: "M2-01", text: "Müssen betroffene Patientinnen oder Patienten informiert werden?" },
      { id: "M2-02", text: "Ist die Benachrichtigung der betroffenen Personen eingeleitet?" },
    ],
    "DS-06": [
      { id: "M2-01", text: "Ist bekannt, wodurch der Vorfall möglich wurde?" },
      { id: "M2-02", text: "Sind Maßnahmen eingeleitet, damit so etwas nicht erneut passiert?" },
    ],
  },
  [OFFICE_TOPIC_EXTENDED_OPENING_HOURS]: {
    "OE-01": [
      { id: "M2-01", text: "Sind die neuen Sprechzeiten intern konkret festgelegt?" },
      { id: "M2-02", text: "Ist die Personalabdeckung fuer alle neuen Sprechzeiten sichergestellt?" },
    ],
    "OE-02": [
      { id: "M2-01", text: "Sind die neuen Arbeitszeiten mit den betroffenen Mitarbeitenden abgestimmt?" },
      { id: "M2-02", text: "Sind die vorgeschriebenen Ruhezeiten bei den neuen Diensten beruecksichtigt?" },
    ],
    "OE-03": [
      { id: "M2-01", text: "Ist bekannt, ob die neuen Sprechzeiten der KV gemeldet werden müssen?" },
      { id: "M2-02", text: "Ist geprüft, ob die Praxis mit den neuen Zeiten die Mindestsprechstunden erfüllt?" },
    ],
    "OE-04": [
      { id: "M2-01", text: "Sind alle Patienteninformationskanaele mit den neuen Sprechzeiten aktualisiert?" },
      { id: "M2-02", text: "Ist die Telefonansage mit den neuen Zeiten aktualisiert?" },
    ],
    "OE-05": [
      { id: "M2-01", text: "Gibt es einen Dienstplan für die neuen Sprechstunden?" },
      { id: "M2-02", text: "Ist geregelt, wer bei Ausfall in den neuen Zeiten einspringt?" },
    ],
    "OE-06": [
      { id: "M2-01", text: "Sind alle praxisinternen Systeme fuer die neuen Sprechzeiten einsatzbereit?" },
      { id: "M2-02", text: "Ist intern geklaert, ob die Sicherheitsregelungen auf die neuen Sprechzeiten angepasst werden muessen?" },
    ],
  },
  [OFFICE_TOPIC_REPORTING_DUTIES]: {
    "MP-01": [
      { id: "M2-01", text: "Ist intern klar, welcher Sachverhalt die Meldepflicht ausloest?" },
      { id: "M2-02", text: "Ist intern geklaert, wer fuer die Meldung an das Gesundheitsamt zustaendig ist?" },
    ],
    "MP-02": [
      { id: "M2-01", text: "Ist bekannt, bis wann spaetestens gemeldet werden muss?" },
      { id: "M2-02", text: "Ist klar, ob die Meldung namentlich erfolgen muss?" },
    ],
    "MP-03": [
      { id: "M2-01", text: "Ist intern festgelegt, wer die Meldung erstellt?" },
      { id: "M2-02", text: "Ist bekannt, wer bei Abwesenheit die Meldung uebernimmt?" },
    ],
    "MP-04": [
      { id: "M2-01", text: "Liegen alle fuer die Meldung erforderlichen Patientenangaben vor?" },
      { id: "M2-02", text: "Ist die Meldung (Formular oder digitale Uebermittlung) bereit zur Abgabe?" },
    ],
    "MP-05": [
      { id: "M2-01", text: "Ist entschieden, ueber welchen Weg die Meldung abgegeben wird?" },
      { id: "M2-02", text: "Ist klar, wer die Meldung vor dem Versand freigibt?" },
    ],
    "MP-06": [
      { id: "M2-01", text: "Ist bekannt, welches Gesundheitsamt fuer diesen Fall zustaendig ist?" },
      { id: "M2-02", text: "Liegen Kontaktdaten des zustaendigen Gesundheitsamts (Fax, Online-Portal oder Adresse) vor?" },
    ],
  },
  [OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION]: {
    "AA-01": [
      { id: "M2-01", text: "Ist das Austrittsdatum intern schriftlich festgehalten?" },
      { id: "M2-02", text: "Ist der genaue Taetigkeitsumfang bis zum Austritt intern dokumentiert?" },
    ],
    "AA-02": [
      { id: "M2-01", text: "Ist geregelt, wer die laufenden Patientenfaelle in der Uebergangsphase betreut?" },
      { id: "M2-02", text: "Sind Vertretungsregelungen fuer kurzfristige Engpaesse in der Uebergangszeit festgelegt?" },
    ],
    "AA-03": [
      { id: "M2-01", text: "Sind alle offenen Patientenfaelle identifiziert und einer Folgezustaendigkeit zugeordnet?" },
      { id: "M2-02", text: "Ist die Uebergabe der Patientenunterlagen und Befunde intern dokumentiert?" },
    ],
    "AA-04": [
      { id: "M2-01", text: "Ist festgelegt, welche Systemzugriffe zum Austrittsdatum deaktiviert werden muessen?" },
      { id: "M2-02", text: "Ist intern geklaert, wer die Deaktivierung der Zugaenge veranlasst und prueft?" },
    ],
    "AA-05": [
      { id: "M2-01", text: "Ist intern abgestimmt, welche Patienten ueber den Austritt informiert werden muessen?" },
      { id: "M2-02", text: "Sind Form und Zeitpunkt der Patientenkommunikation festgelegt?" },
    ],
    "AA-06": [
      { id: "M2-01", text: "Sind alle relevanten Teammitglieder ueber den Austritt und die Konsequenzen informiert?" },
      { id: "M2-02", text: "Sind interne Zustaendigkeiten nach dem Austritt klar geregelt?" },
    ],
    "AA-07": [
      { id: "M2-01", text: "Sind alle organisatorischen Aufgaben, die durch den Austritt entstehen, intern erfasst?" },
      { id: "M2-02", text: "Ist fuer jede Folgeaufgabe eine Zustaendigkeit und ein Zeitrahmen benannt?" },
    ],
  },
  [OFFICE_TOPIC_WORKTIME_CHANGE]: {
    "AZ-01": [
      { id: "M2-01", text: "Ist der neue Stundenumfang intern schriftlich festgehalten?" },
      { id: "M2-02", text: "Ist das Datum, ab dem die neue Arbeitszeit gilt, intern kommuniziert?" },
    ],
    "AZ-02": [
      { id: "M2-01", text: "Sind die neuen Arbeitstage und Einsatzzeiten intern abgestimmt?" },
      { id: "M2-02", text: "Sind Vertretungsregelungen fuer die neuen Einsatzzeiten bereits besprochen?" },
    ],
    "AZ-03": [
      { id: "M2-01", text: "Ist der Dienstplan auf die neuen Einsatzzeiten aktualisiert?" },
      { id: "M2-02", text: "Ist die Anpassung des Dienstplans intern freigegeben?" },
    ],
    "AZ-04": [
      { id: "M2-01", text: "Ist das Lohnbuero (intern oder extern) ueber den neuen Stundenumfang informiert?" },
      { id: "M2-02", text: "Ist sichergestellt, dass die Information rechtzeitig vor dem Abrechnungsstichtag vorliegt?" },
    ],
    "AZ-05": [
      { id: "M2-01", text: "Ist das Zeiterfassungssystem auf den neuen Stundenumfang aktualisiert?" },
      { id: "M2-02", text: "Sind die betroffenen Planungssysteme auf den neuen Stundenumfang aktualisiert?" },
    ],
    "AZ-06": [
      { id: "M2-01", text: "Sind alle betroffenen Kolleginnen und Kollegen ueber die Aenderung informiert?" },
      { id: "M2-02", text: "Sind die Zustaendigkeiten fuer die geaenderten Einsatzzeiten intern abgestimmt?" },
    ],
    "AZ-07": [
      { id: "M2-01", text: "Sind alle offenen Aufgaben aus der Arbeitszeitumstellung intern verteilt?" },
      { id: "M2-02", text: "Gibt es noch ungeklaerte operative Punkte, die vor dem Stichtag erledigt sein muessen?" },
    ],
  },
  [OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE]: {
    "DS-01": [
      { id: "M2-01", text: "Ist der Umfang der geplanten Systemumstellung intern dokumentiert?" },
      { id: "M2-02", text: "Ist ein grober Zeitplan fuer die Umstellung intern kommuniziert?" },
    ],
    "DS-02": [
      { id: "M2-01", text: "Ist intern eindeutig festgelegt, wer die Gesamtverantwortung fuer die Umstellung traegt?" },
      { id: "M2-02", text: "Sind Teilzustaendigkeiten (z. B. Koordination, Schulung, Abnahme) intern benannt?" },
    ],
    "DS-03": [
      { id: "M2-01", text: "Ist intern festgelegt, welche Inhalte aus dem alten System uebernommen werden muessen?" },
      { id: "M2-02", text: "Ist intern festgelegt, wer die Datenubernahme koordiniert?" },
    ],
    "DS-04": [
      { id: "M2-01", text: "Sind alle betroffenen Mitarbeiterinnen und Mitarbeiter ueber die Systemumstellung informiert?" },
      { id: "M2-02", text: "Sind offene Fragen des Teams zur Systemumstellung intern erfasst?" },
    ],
    "DS-05": [
      { id: "M2-01", text: "Sind Schulungstermine fuer alle betroffenen Mitarbeiterinnen und Mitarbeiter abgestimmt?" },
      { id: "M2-02", text: "Sind die Schulungsinhalte fuer die neue Software intern festgelegt?" },
    ],
    "DS-06": [
      { id: "M2-01", text: "Ist intern geklart, wie die Praxis bei einem technischen Ausfall waehrend der Umstellungsphase weiterarbeitet?" },
      { id: "M2-02", text: "Sind Notfallablaeufe (z. B. Papierformulare, manuelle Prozesse) intern kommuniziert?" },
    ],
    "DS-07": [
      { id: "M2-01", text: "Sind Patientinnen und Patienten ueber Aenderungen in den digitalen Ablaeufen informiert (z. B. Online-Termine, Kontaktwege)?" },
      { id: "M2-02", text: "Ist intern abgestimmt, ueber welche Kanaele (Aushang, Website, Empfang) kommuniziert wird?" },
    ],
    "DS-08": [
      { id: "M2-01", text: "Ist die interne Freigabe fuer den Go-live erteilt?" },
      { id: "M2-02", text: "Sind alle offenen Punkte aus der Umstellungsvorbereitung vor dem Go-live abgearbeitet?" },
    ],
  },
  [OFFICE_TOPIC_VACATION_TEAM_COORDINATION]: {
    "UT-01": [
      { id: "M2-01", text: "Ist intern klar, wer in welchem Zeitraum abwesend ist?" },
      { id: "M2-02", text: "Sind alle geplanten Abwesenheiten intern kommuniziert?" },
    ],
    "UT-02": [
      { id: "M2-01", text: "Ist geprueft, ob die Praxis im Urlaubszeitraum ausreichend besetzt ist?" },
      { id: "M2-02", text: "Gibt es Zeitraeume mit kritisch niedriger Besetzung, die intern geloest werden muessen?" },
    ],
    "UT-03": [
      { id: "M2-01", text: "Sind fuer alle abwesenden Personen konkrete Vertretungen benannt?" },
      { id: "M2-02", text: "Sind die Zustaendigkeiten fuer die Vertretungszeit intern abgestimmt?" },
    ],
    "UT-04": [
      { id: "M2-01", text: "Ist der Dienstplan auf den Urlaubszeitraum angepasst?" },
      { id: "M2-02", text: "Ist die Dienstplananpassung intern freigegeben?" },
    ],
    "UT-05": [
      { id: "M2-01", text: "Sind Patientinnen und Patienten ueber relevante Abwesenheiten informiert?" },
      { id: "M2-02", text: "Ist intern abgestimmt, ueber welche Kanaele kommuniziert wird (Aushang, Ansage, Website)?" },
    ],
    "UT-06": [
      { id: "M2-01", text: "Sind alle laufenden Aufgaben intern uebergeben?" },
      { id: "M2-02", text: "Ist sichergestellt, dass keine dringenden Aufgaben waehrend der Abwesenheit liegenbleiben?" },
    ],
    "UT-07": [
      { id: "M2-01", text: "Sind alle Ablaeufe fuer den laufenden Praxisbetrieb waehrend der Abwesenheit sichergestellt?" },
      { id: "M2-02", text: "Gibt es ungeklaerte operative Luecken, die vor Urlaubsbeginn geschlossen werden muessen?" },
    ],
    "UT-08": [
      { id: "M2-01", text: "Ist intern geklart, welche Aufgaben nach der Rueckkehr als erstes uebernommen werden?" },
      { id: "M2-02", text: "Ist der Wiederanlauf nach der Rueckkehr fuer alle betroffenen Personen abgestimmt?" },
    ],
  },
  [OFFICE_TOPIC_RESPONSIBILITY_COORDINATION]: {
    "RZ-01": [
      { id: "M2-01", text: "Sind die Rollen und Aufgabenbereiche in der Praxis intern beschrieben?" },
      { id: "M2-02", text: "Ist intern klar, wer welchen Bereich in der Praxis verantwortet?" },
    ],
    "RZ-02": [
      { id: "M2-01", text: "Sind die wiederkehrenden Aufgaben (Rezeption, Abrechnung, Bestellwesen etc.) konkreten Personen zugewiesen?" },
      { id: "M2-02", text: "Gibt es Aufgaben ohne klare Zustaendigkeit, die im Alltag zu Unsicherheiten fuehren?" },
    ],
    "RZ-03": [
      { id: "M2-01", text: "Ist intern bekannt, wer bei Anfragen externer Stellen zustaendig ist?" },
      { id: "M2-02", text: "Sind externe Ansprechpartner fuer das Team zugaenglich dokumentiert?" },
    ],
    "RZ-04": [
      { id: "M2-01", text: "Gibt es eine allgemeine Regelung, wer welche Funktion bei laengerer Abwesenheit uebernimmt?" },
      { id: "M2-02", text: "Ist die strukturelle Vertretungsregel unabhaengig vom konkreten Urlaubsfall geregelt?" },
    ],
    "RZ-05": [
      { id: "M2-01", text: "Ist intern bekannt, wer bei ungeplanten Problemen angesprochen wird?" },
      { id: "M2-02", text: "Sind die Eskalationswege auch fuer neue oder vertretende Mitarbeitende verstaendlich?" },
    ],
    "RZ-06": [
      { id: "M2-01", text: "Ist die Aufgabenverteilung im Team besprochen worden?" },
      { id: "M2-02", text: "Gibt es noch ungeklaerte Punkte zur Aufgabenverteilung im Team?" },
    ],
    "RZ-07": [
      { id: "M2-01", text: "Gibt es einen definierten Uebergabeprozess fuer Personalveraenderungen?" },
      { id: "M2-02", text: "Ist sichergestellt, dass implizites Wissen bei Personalaenderungen nicht verloren geht?" },
    ],
    "RZ-08": [
      { id: "M2-01", text: "Ist die Zustaendigkeitsstruktur intern freigegeben?" },
      { id: "M2-02", text: "Sind alle Beteiligten ueber die finale Rollenverteilung informiert?" },
    ],
  },
  [OFFICE_TOPIC_TRAINING_COORDINATION]: {
    "FO-01": [
      { id: "M2-01", text: "Ist das Thema der geplanten Schulung intern festgelegt?" },
      { id: "M2-02", text: "Wissen alle Beteiligten, warum diese Schulung intern durchgefuehrt wird?" },
    ],
    "FO-02": [
      { id: "M2-01", text: "Ist intern abgestimmt, wer an der Schulung teilnimmt?" },
      { id: "M2-02", text: "Gibt es einen festgelegten Termin fuer die Schulungsveranstaltung?" },
    ],
    "FO-03": [
      { id: "M2-01", text: "Ist die gesamte Schulungslogistik intern organisiert?" },
      { id: "M2-02", text: "Gibt es noch offene Logistik-Punkte, die vor dem Termin geklaert werden muessen?" },
    ],
    "FO-04": [
      { id: "M2-01", text: "Wurden alle Beteiligten rechtzeitig ueber den Schulungstermin informiert?" },
      { id: "M2-02", text: "Sind alle relevanten Hinweise zur Schulung an die Beteiligten mitgeteilt?" },
    ],
    "FO-05": [
      { id: "M2-01", text: "Ist dokumentiert, wer an der Schulung teilgenommen hat?" },
      { id: "M2-02", text: "Sind fehlende Teilnehmende intern dokumentiert?" },
    ],
    "FO-06": [
      { id: "M2-01", text: "Ist die Schulungsdokumentation intern erstellt worden?" },
      { id: "M2-02", text: "Sind offene Punkte aus der Schulung intern festgehalten?" },
    ],
    "FO-07": [
      { id: "M2-01", text: "Wurden Folgeaufgaben aus der Schulung intern konkreten Personen zugewiesen?" },
      { id: "M2-02", text: "Ist intern entschieden, ob eine Folgeschulung geplant wird?" },
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
