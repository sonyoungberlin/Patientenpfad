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
      { id: "M2-02", text: "Ist dieser Umfang mit dem Zulassungsausschuss abgestimmt oder genehmigt?" },
    ],
    "NC-EXTERNE_STELLE": [
      { id: "M2-01", text: "Ist bekannt, ob die Anstellung eine Genehmigung durch den Zulassungsausschuss, eine Anzeige bei der KV oder beides erfordert?" },
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
      { id: "M2-01", text: "Gibt es bekannte Hindernisse für die Anstellung oder Zulassung?" },
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
      { id: "M2-01", text: "Ist aus dem KV-Schreiben klar, welche GOPs oder Leistungen beanstandet werden?" },
      { id: "M2-02", text: "Ist bekannt, ob es um Plausibilitaet, Abrechnungskorrektur oder eine formale Rueckfrage geht?" },
    ],
    "KV-02": [
      { id: "M2-01", text: "Ist die Frist zur Stellungnahme aus dem KV-Schreiben bekannt und notiert?" },
      { id: "M2-02", text: "Ist klar, in welcher Form (schriftlich, per Portal, per Fax) die KV eine Antwort erwartet?" },
    ],
    "KV-03": [
      { id: "M2-01", text: "Gibt es in der Patientenakte Eintraege, die die beanstandete Leistung erklaeren?" },
      { id: "M2-02", text: "Ist mit dem zustaendigen Arzt geklaert, warum die Leistung so abgerechnet wurde?" },
    ],
    "KV-04": [
      { id: "M2-01", text: "Ist entschieden, ob die Praxis widerspricht, korrigiert oder die Beanstandung akzeptiert?" },
      { id: "M2-02", text: "Ist die Antwort von der Praxisleitung freigegeben?" },
    ],
    "KV-05": [
      { id: "M2-01", text: "Ist bekannt, welcher KV-Bereich (Abrechnung, Plausibilitaet) fuer dieses Schreiben zustaendig ist?" },
      { id: "M2-02", text: "Liegen Kontaktdaten des zustaendigen KV-Ansprechpartners vor, falls Rueckfragen noetig sind?" },
    ],
  },
  [OFFICE_TOPIC_PLAUSIBILITY_BILLING]: {
    "PL-01": [
      { id: "M2-01", text: "Ist klar, welche GOP oder welcher Arzt die auffälligen Zeitwerte ausgelöst hat?" },
      { id: "M2-02", text: "Gibt es eine nachvollziehbare Erklärung für die auffälligen Quartalswerte?" },
    ],
    "PL-02": [
      { id: "M2-01", text: "Sind die konkret auffälligen Tage aus der Prüfung bekannt?" },
      { id: "M2-02", text: "Gibt es für diese Tage eine nachvollziehbare Erklärung?" },
    ],
    "PL-03": [
      { id: "M2-01", text: "Ist klar, welche Leistung fachlich oder formal beanstandet wird?" },
      { id: "M2-02", text: "Fehlt ein konkreter Dokumentationsbestandteil wie Befund, Diagnose oder Indikation?" },
    ],
    "PL-04": [
      { id: "M2-01", text: "Ist klar, welche genehmigungspflichtige Leistung betroffen ist?" },
      { id: "M2-02", text: "Liegt die passende KV-Genehmigung aktuell vor?" },
    ],
    "PL-05": [
      { id: "M2-01", text: "Ist klar, welcher Arzt die Leistung erbracht hat und ob die LANR korrekt ist?" },
      { id: "M2-02", text: "Gibt es Leistungen, bei denen persönliche Leistungserbringung zweifelhaft ist?" },
    ],
    "PL-06": [
      { id: "M2-01", text: "Haben Praxisleitung oder verantwortlicher Arzt die Abrechnung freigegeben?" },
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
      { id: "M2-02", text: "Gibt es GOPs, die ohne erkennbare Begruendung fehlen oder gestrichen wurden?" },
    ],
    "HB-03": [
      { id: "M2-01", text: "Ist klar, warum die KV im Bescheid gekuerzt hat?" },
      { id: "M2-02", text: "Gibt es Kuerzungen, die aus Praxissicht nicht nachvollziehbar sind?" },
    ],
    "HB-04": [
      { id: "M2-01", text: "Wurden Leistungen abgerechnet, fuer die eine KV-Genehmigung erforderlich war?" },
      { id: "M2-02", text: "Liegt die entsprechende Genehmigung vor und wurde sie im Bescheid beruecksichtigt?" },
    ],
    "HB-05": [
      { id: "M2-01", text: "Ist das Regelleistungsvolumen (RLV) fuer dieses Quartal bekannt?" },
      { id: "M2-02", text: "Gibt es auffaellige Quotierungen oder Kappungen, die erklaert werden muessen?" },
    ],
    "HB-06": [
      { id: "M2-01", text: "Ist das Zustellungsdatum des Bescheids bekannt?" },
      { id: "M2-02", text: "Ist entschieden, ob Widerspruch eingelegt wird, und ist die Frist noch offen?" },
    ],
  },
  [OFFICE_TOPIC_REGRESS]: {
    "RG-01": [
      { id: "M2-01", text: "Ist aus dem Bescheid klar, welche Verordnung oder Leistung beanstandet wird?" },
      { id: "M2-02", text: "Ist der geprufte Zeitraum aus dem Bescheid bekannt?" },
      { id: "M2-03", text: "Ist bekannt, ob es sich um einen Individualregress oder eine Gruppenprüfung handelt?" },
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
      { id: "M2-02", text: "Gibt es Diagnosen oder Befunde, die die beanstandete Verordnung begruenden?" },
      { id: "M2-03", text: "Sind Praxisbesonderheiten (z. B. besondere Patientengruppe, Schwerpunkt) dokumentiert?" },
    ],
    "RG-05": [
      { id: "M2-01", text: "Ist entschieden, ob eine Stellungnahme eingereicht oder der Regress anerkannt wird?" },
      { id: "M2-02", text: "Wurde eingeschaetzt, ob externe Beratung (KV, Anwalt) noetig ist?" },
    ],
    "RG-06": [
      { id: "M2-01", text: "Ist die zustaendige Pruefungsstelle aus dem Bescheid erfasst?" },
      { id: "M2-02", text: "Ist der Adressat fuer die Stellungnahme eindeutig benannt?" },
    ],
    "RG-07": [
      { id: "M2-01", text: "Ist die moegliche Forderung so hoch, dass externe Beratung sinnvoll ist?" },
      { id: "M2-02", text: "Sind weitere aehnliche Pruefungen oder Regressfaelle bekannt?" },
    ],
  },
  [OFFICE_TOPIC_CLOSURE_COVERAGE]: {
    "UV-01": [
      { id: "M2-01", text: "Ist klar, für welchen Zeitraum die Praxis schließt oder wer wie lange abwesend ist?" },
      { id: "M2-02", text: "Betrifft die Schließung alle Ärzte der Praxis oder nur einzelne Personen?" },
    ],
    "UV-02": [
      { id: "M2-01", text: "Ist bekannt, ob und bis wann die KV über die Schließung informiert werden muss?" },
      { id: "M2-02", text: "Ist bekannt, ob für den Zeitraum eine ärztliche Vertretung organisiert werden muss?" },
    ],
    "UV-03": [
      { id: "M2-01", text: "Ist klar, wer die Vertretungsarrangements organisiert und die KV informiert?" },
      { id: "M2-02", text: "Ist bekannt, wer während der Schließung für Rückfragen von Patienten erreichbar ist?" },
    ],
    "UV-04": [
      { id: "M2-01", text: "Liegt eine schriftliche Vertretungsvereinbarung mit dem Vertretungsarzt vor?" },
      { id: "M2-02", text: "Ist der Vertretungsarzt namentlich bekannt und der KV gemeldet?" },
    ],
    "UV-05": [
      { id: "M2-01", text: "Ist entschieden, wie Patientinnen und Patienten während der Schließung versorgt werden?" },
      { id: "M2-02", text: "Hat die Praxisleitung das Vertretungsmodell freigegeben?" },
    ],
    "UV-06": [
      { id: "M2-01", text: "Ist die KV Berlin über Schließung und ggf. Vertretungsarzt informiert?" },
      { id: "M2-02", text: "Ist bekannt, ob zusätzlich eine andere Stelle informiert werden muss?" },
    ],
    "UV-PATIENTENINFO": [
      { id: "M2-01", text: "Hängt ein Aushang an der Praxistür mit Schließungszeitraum und Vertretungsinfos?" },
      { id: "M2-02", text: "Ist die Telefonansage mit aktuellen Infos zu Schließung und Notfallkontakt aktualisiert?" },
    ],
    "UV-NOTFALLVERSORGUNG": [
      { id: "M2-01", text: "Ist geregelt, wohin Patienten im Notfall gehen können?" },
      { id: "M2-02", text: "Gibt es Patienten mit dringendem Versorgungsbedarf, die proaktiv informiert werden müssen?" },
    ],
    "UV-TERMINMANAGEMENT": [
      { id: "M2-01", text: "Sind alle Termine im Schließungszeitraum abgesagt oder verschoben?" },
      { id: "M2-02", text: "Wurden Patienten mit dringenden Folgebedarfen (z. B. Rezepte, Überweisungen) rechtzeitig kontaktiert?" },
    ],
    "UV-ABRECHNUNGSZUORDNUNG": [
      { id: "M2-01", text: "Ist klar, unter welcher LANR und BSNR der Vertretungsarzt abrechnet?" },
      { id: "M2-02", text: "Ist abgestimmt, ob der Vertretungsarzt auf Praxisschein oder eigene Scheine behandelt?" },
    ],
  },
  [OFFICE_TOPIC_SEAT_APPROVAL]: {
    "ZA-01": [
      { id: "M2-01", text: "Ist klar, welches Verfahren angestrebt wird (z. B. Neuzulassung, Nachbesetzung, Anstellungsgenehmigung, Ermaechtigung)?" },
      { id: "M2-02", text: "Ist bekannt, ob der Sitz oder das Fachgebiet am Standort ueberhaupt frei bzw. zulassungsfaehig ist?" },
    ],
    "ZA-02": [
      { id: "M2-01", text: "Ist bekannt, wann der Antrag spaetestens eingereicht werden muss?" },
      { id: "M2-02", text: "Ist bekannt, wann der Zulassungsausschuss ueber den Antrag entscheidet?" },
    ],
    "ZA-03": [
      { id: "M2-01", text: "Ist klar, wer in der Praxis den Antrag zusammenstellt und einreicht?" },
      { id: "M2-02", text: "Ist bekannt, wer bei Abwesenheit die Frist und den Eingang ueberwacht?" },
    ],
    "ZA-04": [
      { id: "M2-01", text: "Liegen Approbationsurkunde, Facharzt-Urkunde und aktueller Arztregistereintrag vor?" },
      { id: "M2-02", text: "Ist die Berufshaftpflicht aktuell gueltig und liegt der Nachweis vor?" },
    ],
    "ZA-05": [
      { id: "M2-01", text: "Ist entschieden, ob vor dem Antrag noch eine Rueckfrage bei KV oder Zulassungsausschuss noetig ist?" },
      { id: "M2-02", text: "Hat die Praxisleitung die Einreichung freigegeben?" },
    ],
    "ZA-06": [
      { id: "M2-01", text: "Ist bekannt, an welche Stelle der Antrag zu richten ist (Zulassungsausschuss, KV Berlin oder Aerztekammer Berlin)?" },
      { id: "M2-02", text: "Liegen Einreichungsadresse und bevorzugter Uebermittlungsweg (Post, Fax, Portal) vor?" },
    ],
  },
  [OFFICE_TOPIC_APPLICATION_MANAGEMENT]: {
    "AM-01": [
      { id: "M2-01", text: "Ist klar, was konkret beantragt wird (z. B. welche Leistung, Genehmigung oder Berechtigung)?" },
      { id: "M2-02", text: "Ist bekannt, an welche Stelle der Antrag geschickt werden muss?" },
    ],
    "AM-02": [
      { id: "M2-01", text: "Ist die Einreichungsfrist bekannt und notiert?" },
      { id: "M2-02", text: "Ist klar, ob vor der Einreichung noch Unterlagen oder Genehmigungen von Dritten fehlen?" },
    ],
    "AM-03": [
      { id: "M2-01", text: "Ist klar, wer den Antrag erstellt und einreicht?" },
      { id: "M2-02", text: "Ist bekannt, wer die Frist ueberwacht, falls die zust\u00e4ndige Person ausfaellt?" },
    ],
    "AM-04": [
      { id: "M2-01", text: "Liegen alle notwendigen Unterlagen fuer die Einreichung vor?" },
      { id: "M2-02", text: "Gibt es Unterlagen, die noch beschafft werden muessen?" },
    ],
    "AM-05": [
      { id: "M2-01", text: "Ist entschieden, ob der Antrag jetzt eingereicht werden kann oder vorher noch Ruecksprache noetig ist?" },
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
      { id: "M2-02", text: "Hat die KV bereits wegen fehlender Fortbildungspunkte angefragt oder erinnert?" },
    ],
    "WB-03": [
      { id: "M2-01", text: "Ist festgelegt, wer den Punktestand prüft und fehlende Nachweise einsammelt?" },
      { id: "M2-02", text: "Ist festgelegt, wer die betroffene Person rechtzeitig erinnert?" },
    ],
    "WB-04": [
      { id: "M2-01", text: "Ist bekannt, wie viele Fortbildungspunkte aktuell vorhanden sind?" },
      { id: "M2-02", text: "Liegen Zertifikate oder Punktekontoauszüge als Nachweis vor?" },
    ],
    "WB-05": [
      { id: "M2-01", text: "Ist festgelegt, welche Fortbildungen als nächstes absolviert werden sollen?" },
      { id: "M2-02", text: "Ist realistisch, dass fehlende Punkte noch rechtzeitig erreicht werden?" },
    ],
    "WB-06": [
      { id: "M2-01", text: "Ist bekannt, ob Punkte automatisch oder manuell bei der Ärztekammer eingetragen werden?" },
      { id: "M2-02", text: "Liegt ein aktueller Punktekontoauszug der Ärztekammer vor?" },
    ],
  },
  [OFFICE_TOPIC_CME_GENERAL_MEDICINE]: {
    "FB-01": [
      { id: "M2-01", text: "Ist bekannt, in welchem 5-Jahres-Zyklus der Arzt aktuell ist und wann dieser endet?" },
      { id: "M2-02", text: "Ist bekannt, wie viel Zeit bis zum Ende des Zyklus noch verbleibt?" },
    ],
    "FB-02": [
      { id: "M2-01", text: "Ist bekannt, wie viele Fortbildungspunkte der Arzt aktuell im Ärztekammer-Konto hat?" },
      { id: "M2-02", text: "Gibt es Fortbildungen, die zwar absolviert wurden, aber noch nicht im Konto eingetragen sind?" },
    ],
    "FB-03": [
      { id: "M2-01", text: "Liegen Teilnahmebescheinigungen oder Zertifikate für die absolvierten Fortbildungen vor?" },
      { id: "M2-02", text: "Gibt es Fortbildungen, für die noch kein Nachweis vorliegt oder die bei der Ärztekammer noch ausstehen?" },
    ],
    "FB-04": [
      { id: "M2-01", text: "Reicht die verbleibende Zeit aus, um noch fehlende Punkte bis zum Fristende zu sammeln?" },
      { id: "M2-02", text: "Ist klar, wer in der Praxis den Punktestand und die Frist im Blick behält?" },
    ],
    "FB-05": [
      { id: "M2-01", text: "Sind alle absolvierten Fortbildungen im Ärztekammer-Konto eingetragen und bestätigt?" },
      { id: "M2-02", text: "Hat die KV Berlin bereits eine Anfrage wegen fehlender Fortbildungspunkte geschickt?" },
    ],
    "FB-06": [
      { id: "M2-01", text: "Ist bekannt, ob bei Fristablauf eine Honorarkürzung droht (25 % pro Quartal, danach mehr)?" },
      { id: "M2-02", text: "Gibt es Anzeichen, dass ein Honorareinbehalt bereits läuft oder unmittelbar bevorsteht?" },
    ],
    "FB-AUFHOLPLAN": [
      { id: "M2-01", text: "Ist ein realistischer Plan vorhanden, wie die fehlenden Punkte vor Fristende noch erreicht werden können?" },
      { id: "M2-02", text: "Sind konkrete Fortbildungstermine oder -kurse bereits gebucht oder fest eingeplant?" },
    ],
  },
  [OFFICE_TOPIC_MFA_HIRING]: {
    "MF-01": [
      { id: "M2-01", text: "Liegt der MFA-Abschlussnachweis vor?" },
      { id: "M2-02", text: "Gibt es Zusatzqualifikationen, die für den geplanten Einsatz wichtig sind?" },
    ],
    "MF-02": [
      { id: "M2-01", text: "Ist der Arbeitsvertrag mit Beginn, Stunden und Vergütung vollständig unterschrieben?" },
      { id: "M2-02", text: "Ist geklärt, ob Vergütung und Arbeitszeit zum geplanten Einsatz passen?" },
    ],
    "MF-03": [
      { id: "M2-01", text: "Liegen Steuer-ID und Sozialversicherungsnummer für die Lohnbuchhaltung vor?" },
      { id: "M2-02", text: "Ist die neue MFA in der Lohnbuchhaltung angelegt?" },
    ],
    "MF-04": [
      { id: "M2-01", text: "Ist geklärt, ob Vollzeit, Teilzeit oder Minijob vorliegt?" },
      { id: "M2-02", text: "Ist die Sozialversicherung passend dazu angemeldet?" },
    ],
    "MF-05": [
      { id: "M2-01", text: "Hat die neue MFA Zugriff auf die Systeme, die sie für ihre Aufgaben braucht?" },
      { id: "M2-02", text: "Wurde der Umgang mit Patientendaten und Schweigepflicht erklärt?" },
    ],
    "MF-06": [
      { id: "M2-01", text: "Ist klar, in welche Aufgaben die neue MFA zuerst eingearbeitet wird?" },
      { id: "M2-02", text: "Sind die Pflichtunterweisungen wie Datenschutz und Hygiene erledigt?" },
    ],
  },
  [OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING]: {
    "MA-01": [
      { id: "M2-01", text: "Ist bekannt, welche Tätigkeiten für Minderjährige in der Praxis nicht erlaubt oder eingeschränkt sind?" },
      { id: "M2-02", text: "Ist der Dienstplan so geplant, dass Arbeitszeitgrenzen und Berufsschule eingehalten werden?" },
    ],
    "MA-02": [
      { id: "M2-01", text: "Liegt die ärztliche Erstuntersuchung vor dem Ausbildungsbeginn vor?" },
      { id: "M2-02", text: "Ist bekannt, wann eine Nachuntersuchung nötig wird?" },
    ],
    "MA-03": [
      { id: "M2-01", text: "Ist der Ausbildungsvertrag von Praxis, Azubi und Erziehungsberechtigten unterschrieben?" },
      { id: "M2-02", text: "Liegt die Bestätigung der Ärztekammer Berlin zum Ausbildungsvertrag vor?" },
    ],
    "MA-04": [
      { id: "M2-01", text: "Sind Berufsschultage im Dienstplan berücksichtigt?" },
      { id: "M2-02", text: "Sind Abenddienste, Überstunden und Pausen für den Azubi passend geregelt?" },
    ],
    "MA-05": [
      { id: "M2-01", text: "Liegt die Einwilligung der Erziehungsberechtigten vor?" },
      { id: "M2-02", text: "Sind Notfallkontakte der Erziehungsberechtigten in der Praxis hinterlegt?" },
    ],
    "MA-06": [
      { id: "M2-01", text: "Wurde der Azubi in Datenschutz und Schweigepflicht eingewiesen?" },
      { id: "M2-02", text: "Sind die Pflichtunterweisungen für Jugendliche schriftlich belegt?" },
    ],
  },
  [OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE]: {
    "MG-01": [
      { id: "M2-01", text: "Ist klar, welches Gerät angeschafft wird und wofür es eingesetzt werden soll?" },
      { id: "M2-02", text: "Ist die Geräteklasse oder Risikoklasse bekannt?" },
    ],
    "MG-02": [
      { id: "M2-01", text: "Ist bekannt, ob für Betrieb oder Abrechnung eine Genehmigung nötig ist?" },
      { id: "M2-02", text: "Ist bekannt, ob Fachkundenachweise erforderlich sind?" },
    ],
    "MG-03": [
      { id: "M2-01", text: "Ist festgelegt, wer in die Bedienung eingewiesen werden muss?" },
      { id: "M2-02", text: "Ist die Einweisung schriftlich nachweisbar?" },
    ],
    "MG-04": [
      { id: "M2-01", text: "Ist bekannt, ob für das Gerät STK oder MTK erforderlich ist?" },
      { id: "M2-02", text: "Ist klar, bis wann die erste Kontrolle oder Wartung fällig ist?" },
    ],
    "MG-05": [
      { id: "M2-01", text: "Ist klar, mit welcher GOP die Leistung abgerechnet werden soll?" },
      { id: "M2-02", text: "Sind die Dokumentationsanforderungen für diese Leistung bekannt?" },
    ],
    "MG-06": [
      { id: "M2-01", text: "Ist das Gerät im Medizinproduktebuch oder Bestandsverzeichnis erfasst?" },
      { id: "M2-02", text: "Liegt die CE-Konformitätserklärung des Herstellers vor?" },
    ],
  },
  [OFFICE_TOPIC_DATA_PROTECTION_INCIDENT]: {
    "DS-01": [
      { id: "M2-01", text: "Ist klar, was genau passiert ist (z. B. falsche E-Mail, verlorenes Gerät, unberechtigter Zugriff)?" },
      { id: "M2-02", text: "Ist bekannt, wann der Vorfall passiert ist oder entdeckt wurde?" },
    ],
    "DS-02": [
      { id: "M2-01", text: "Sind Patientendaten oder andere personenbezogene Daten betroffen?" },
      { id: "M2-02", text: "Sind besonders sensible Daten betroffen, z. B. Diagnosen oder Behandlungsinformationen?" },
    ],
    "DS-03": [
      { id: "M2-01", text: "Ist bekannt, ob eine Meldung an die Berliner Datenschutzbehörde nötig ist?" },
      { id: "M2-02", text: "Läuft die 72-Stunden-Frist noch oder ist sie bereits abgelaufen?" },
    ],
    "DS-04": [
      { id: "M2-01", text: "Sind betroffene Zugänge, Geräte oder Systeme gesperrt oder gesichert?" },
      { id: "M2-02", text: "Ist die Ursache des Vorfalls gefunden und behoben?" },
    ],
    "DS-05": [
      { id: "M2-01", text: "Müssen betroffene Patientinnen oder Patienten informiert werden?" },
      { id: "M2-02", text: "Ist die Information bereits erfolgt oder vorbereitet?" },
    ],
    "DS-06": [
      { id: "M2-01", text: "Ist bekannt, wodurch der Vorfall möglich wurde?" },
      { id: "M2-02", text: "Sind Maßnahmen eingeleitet, damit so etwas nicht erneut passiert?" },
    ],
  },
  [OFFICE_TOPIC_EXTENDED_OPENING_HOURS]: {
    "OE-01": [
      { id: "M2-01", text: "Ist klar, für welche Tage und Uhrzeiten die Öffnungszeiten erweitert werden sollen?" },
      { id: "M2-02", text: "Steht ausreichend ärztliches und nicht-ärztliches Personal für diese Zeiten zur Verfügung?" },
    ],
    "OE-02": [
      { id: "M2-01", text: "Sind die neuen Arbeitszeiten mit den betroffenen Mitarbeitenden abgestimmt?" },
      { id: "M2-02", text: "Sind Pausen und Ruhezeiten bei den neuen Diensten eingeplant?" },
    ],
    "OE-03": [
      { id: "M2-01", text: "Ist bekannt, ob die neuen Sprechzeiten der KV gemeldet werden müssen?" },
      { id: "M2-02", text: "Ist geprüft, ob die Praxis mit den neuen Zeiten die Mindestsprechstunden erfüllt?" },
    ],
    "OE-04": [
      { id: "M2-01", text: "Sind Aushang, Website und Online-Profile mit den neuen Zeiten aktualisiert?" },
      { id: "M2-02", text: "Ist die Telefonansage mit den neuen Zeiten aktualisiert?" },
    ],
    "OE-05": [
      { id: "M2-01", text: "Gibt es einen Dienstplan für die neuen Sprechstunden?" },
      { id: "M2-02", text: "Ist geregelt, wer bei Ausfall in den neuen Zeiten einspringt?" },
    ],
    "OE-06": [
      { id: "M2-01", text: "Sind PVS, Telefon und Empfang für die neuen Sprechzeiten einsatzbereit?" },
      { id: "M2-02", text: "Ist geklärt, ob Schließdienst, Alarm oder Notfallkontakte angepasst werden müssen?" },
    ],
  },
  [OFFICE_TOPIC_REPORTING_DUTIES]: {
    "MP-01": [
      { id: "M2-01", text: "Ist klar, welche Krankheit, welcher Erreger oder welcher Vorfall die Meldung ausloest?" },
      { id: "M2-02", text: "Ist klar, ob die Praxis selbst melden muss oder ob das Labor meldet?" },
    ],
    "MP-02": [
      { id: "M2-01", text: "Ist bekannt, bis wann spaetestens gemeldet werden muss?" },
      { id: "M2-02", text: "Ist klar, ob die Meldung namentlich erfolgen muss?" },
    ],
    "MP-03": [
      { id: "M2-01", text: "Ist klar, welche Person in der Praxis die Meldung erstellt und abschickt?" },
      { id: "M2-02", text: "Ist bekannt, wer bei Abwesenheit die Meldung uebernimmt?" },
    ],
    "MP-04": [
      { id: "M2-01", text: "Liegen Patientendaten, Diagnose und Untersuchungsergebnis vor, die fuer die Meldung erforderlich sind?" },
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
  [OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION]: {},
  [OFFICE_TOPIC_WORKTIME_CHANGE]: {
    "AZ-01": [
      { id: "M2-01", text: "Ist der neue Stundenumfang intern klar und schriftlich festgehalten?" },
      { id: "M2-02", text: "Ist das Datum, ab dem die neue Arbeitszeit gilt, intern kommuniziert?" },
    ],
    "AZ-02": [
      { id: "M2-01", text: "Sind die konkreten Arbeitstage und Einsatzzeiten intern bekannt und abgestimmt?" },
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
      { id: "M2-01", text: "Sind Zeiterfassungssystem und Praxissoftware auf den neuen Stundenumfang angepasst?" },
      { id: "M2-02", text: "Sind alle betroffenen Systeme (z. B. Terminplanung, Dienstplan-Tool) aktualisiert?" },
    ],
    "AZ-06": [
      { id: "M2-01", text: "Sind alle betroffenen Kolleginnen und Kollegen ueber die Aenderung informiert?" },
      { id: "M2-02", text: "Sind Zustaendigkeiten und Vertretungen fuer die geaenderten Zeiten intern abgestimmt?" },
    ],
    "AZ-07": [
      { id: "M2-01", text: "Sind alle offenen organisatorischen Aufgaben aus der Umstellung intern verteilt und terminiert?" },
      { id: "M2-02", text: "Gibt es noch ungeklaerte operative Punkte, die vor dem Stichtag erledigt sein muessen?" },
    ],
  },
  [OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE]: {
    "DS-01": [
      { id: "M2-01", text: "Ist intern klar beschrieben, welches System umgestellt wird und welche Ablaeufe davon betroffen sind?" },
      { id: "M2-02", text: "Ist ein grober Zeitplan fuer die Umstellung intern kommuniziert?" },
    ],
    "DS-02": [
      { id: "M2-01", text: "Ist intern eindeutig festgelegt, wer die Gesamtverantwortung fuer die Umstellung traegt?" },
      { id: "M2-02", text: "Sind Teilzustaendigkeiten (z. B. Koordination, Schulung, Abnahme) intern benannt?" },
    ],
    "DS-03": [
      { id: "M2-01", text: "Ist geklart, welche Daten und Dokumente aus dem alten System uebernommen werden muessen?" },
      { id: "M2-02", text: "Ist intern festgelegt, wer die Datenubernahme koordiniert und abzeichnet?" },
    ],
    "DS-04": [
      { id: "M2-01", text: "Sind alle betroffenen Mitarbeiterinnen und Mitarbeiter ueber die Systemumstellung informiert?" },
      { id: "M2-02", text: "Sind Fragen und Bedenken aus dem Team intern aufgenommen und adressiert?" },
    ],
    "DS-05": [
      { id: "M2-01", text: "Sind Schulungstermine fuer alle betroffenen Mitarbeiterinnen und Mitarbeiter abgestimmt?" },
      { id: "M2-02", text: "Sind Lernziele und Inhalte fuer die Schulung intern festgelegt?" },
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
      { id: "M2-01", text: "Ist die interne Freigabe fuer den Go-live erteilt und dokumentiert?" },
      { id: "M2-02", text: "Sind alle offenen Punkte aus der Umstellungsvorbereitung vor dem Go-live abgearbeitet?" },
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
