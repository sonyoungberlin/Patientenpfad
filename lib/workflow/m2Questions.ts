import type { WorkflowRole } from "./types";
import {
  WORKFLOW_TOPIC_AU,
  WORKFLOW_TOPIC_REZEPT,
  WORKFLOW_TOPIC_UEBERWEISUNG,
  WORKFLOW_TOPIC_HEILMITTEL,
  WORKFLOW_TOPIC_HILFSMITTEL,
  WORKFLOW_TOPIC_KRANKENTRANSPORT,
  WORKFLOW_TOPIC_HYPERTONIE,
  WORKFLOW_TOPIC_DIABETES_TYP_2,
  WORKFLOW_TOPIC_ADIPOSITAS,
  WORKFLOW_TOPIC_EISENMANGEL,
  WORKFLOW_TOPIC_SCHILDDRUESE,
  type WorkflowTopicId,
} from "./processCatalog";

export type WorkflowM2Question = {
  id: string;
  text: string;
};

/**
 * M2-Fragen pro M3-Checkpoint und Rolle.
 * Analog zu lib/office/m2Questions.ts, aber auf WF-Checkpoint-IDs gemappt.
 */
type M2QuestionsByCheckpoint = Record<
  string,
  { MFA?: readonly WorkflowM2Question[]; ARZT?: readonly WorkflowM2Question[] }
>;

function orientationQuestions(...hints: string[]): readonly WorkflowM2Question[] {
  return hints.map((hint, index) => ({
    id: `M2-${String(index + 1).padStart(2, "0")}`,
    text: `Ist zu berücksichtigen, dass ${hint}?`,
  }));
}

const M2_QUESTIONS_BY_TOPIC: Record<WorkflowTopicId, M2QuestionsByCheckpoint> = {
  [WORKFLOW_TOPIC_AU]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "AU-Zeitraum (Von/Bis) eingetragen?" },
        { id: "M2-02", text: "ICD-10 und Ausstellungsdatum eingetragen?" },
        { id: "M2-03", text: "Erst-/Folgebescheinigung angegeben?" },
      ],
      ARZT: [
        { id: "M2-01", text: "ICD-10 zur dokumentierten Diagnose passend?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "AU-Begründung im Krankenblatt vorhanden?" },
        { id: "M2-02", text: "Kontaktart dokumentiert (Praxisbesuch, Video, Telefon)?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Befund oder Beschwerden für die AU dokumentiert?" },
        { id: "M2-02", text: "Kontaktart für AU-Ausstellung dokumentiert?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Mehrere AU-Anfragen in kurzer Zeit vorhanden?" },
        { id: "M2-02", text: "Besondere Rahmenbedingungen dokumentiert (Jobcenter, Arbeitgeber, Prüfung)?" },
      ],
      ARZT: [
        { id: "M2-01", text: "AU-Häufung in der Akte dokumentiert?" },
        { id: "M2-02", text: "Verlaufseinordnung zu den AU-Anfragen vorhanden?" },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Wiedervorstellungstermin vereinbart oder Abschluss vermerkt?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Weiteres Vorgehen nach der AU festgelegt?" },
        { id: "M2-02", text: "Umgang mit möglicher Verlängerungsanfrage festgelegt?" },
      ],
    },
  },

  [WORKFLOW_TOPIC_REZEPT]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "Diagnose oder Anlass für das Medikament angegeben?" },
        { id: "M2-02", text: "Verordnungsart angegeben (Akutverordnung oder Dauermedikation)?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Therapiestatus angegeben (neu, fortgeführt, geändert, übernommen)?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "Diagnose in der Akte vorhanden?" },
        { id: "M2-02", text: "Änderungsanlass dokumentiert (falls Änderung)?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Veranlassung der Therapieentscheidung dokumentiert?" },
        { id: "M2-02", text: "Änderungsanlass dokumentiert (falls Änderung)?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Bisheriger Therapieverlauf in der Akte dokumentiert?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Therapieverlauf dokumentiert (Labor, Verlaufseintrag, Rückmeldung)?" },
        { id: "M2-02", text: "Letzte Überprüfung dokumentiert (falls Langzeittherapie oder BtM)?" },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Kontrolltermin vereinbart oder kein Kontrollbedarf vermerkt?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Kontroll- oder Folgeverordnungstermin festgelegt?" },
      ],
    },
  },

  [WORKFLOW_TOPIC_UEBERWEISUNG]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "Fachrichtung oder Einrichtung angegeben?" },
        { id: "M2-02", text: "Dringlichkeit angegeben?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Fragestellung für den Facharzt formuliert?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "Anlass der Überweisung dokumentiert?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Indikation für die Überweisung dokumentiert?" },
        { id: "M2-02", text: "Eigene Vordiagnostik oder Vorbehandlung dokumentiert?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Frühere Überweisung zum selben Thema vorhanden?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Überweisungsart angegeben (Abklärung, Mitbehandlung, Weitergabe)?" },
        { id: "M2-02", text: "Relevante Vorbefunde für den Facharzt benannt?" },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Erwarteter Rücklauf definiert (Befundbericht, Empfehlung)?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Erwarteter Rücklauf und weiteres Vorgehen dokumentiert?" },
        { id: "M2-02", text: "Patient über Ziel der Überweisung informiert?" },
      ],
    },
  },

  [WORKFLOW_TOPIC_HEILMITTEL]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "Heilmittelart, Menge und Frequenz eingetragen?" },
        { id: "M2-02", text: "Diagnosegruppe eingetragen?" },
        { id: "M2-03", text: "Erst-/Folgeverordnung angegeben?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Therapieziel benannt?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "Diagnose oder Funktionseinschränkung angegeben?" },
        { id: "M2-02", text: "Aktueller Behandlungsbedarf in der Akte dokumentiert?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Indikation für Verordnung ausreichend dokumentiert?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Therapieerfolg der Vorbehandlung dokumentiert (falls Folgeverordnung)?" },
        { id: "M2-02", text: "Frühere Therapieerfahrungen des Patienten bekannt?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Therapieverlauf dokumentiert?" },
        { id: "M2-02", text: "Begründung für Folgeverordnung in der Akte vorhanden?" },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Kontroll- oder Verlaufsprüfung geplant?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Erfolgskriterium für die Therapie definiert?" },
      ],
    },
  },

  [WORKFLOW_TOPIC_HILFSMITTEL]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "Hilfsmittel und Diagnose eindeutig angegeben?" },
        { id: "M2-02", text: "Versorgungsart angegeben (Erstversorgung, Ersatz, Reparatur)?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Hilfsmittelzweck benannt?" },
        { id: "M2-02", text: "Bedarfsfeststellung dokumentiert?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "Erkrankung oder Einschränkung als Begründung angegeben?" },
        { id: "M2-02", text: "Aktueller Bedarf dokumentiert?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Medizinische Indikation für das Hilfsmittel dokumentiert?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Frühere Hilfsmittelversorgung oder Antrag dokumentiert?" },
        { id: "M2-02", text: "Situationsveränderung dokumentiert (falls Folgeversorgung)?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Früherer Hilfsmittelbedarf in der Akte thematisiert?" },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Nächster Schritt für Patient oder Praxis festgelegt?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Kontrolltermin für Versorgung geplant?" },
      ],
    },
  },

  [WORKFLOW_TOPIC_KRANKENTRANSPORT]: {
    "WF-C01": {
      MFA: [
        { id: "M2-01", text: "Datum, Transportziel und Transportart angegeben?" },
        { id: "M2-02", text: "Einzel- oder Serienfahrt angegeben?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Begründung für Transportart in der Akte vorhanden?" },
      ],
    },
    "WF-C02": {
      MFA: [
        { id: "M2-01", text: "Erkrankung oder Einschränkung als Transportbegründung angegeben?" },
        { id: "M2-02", text: "Dringlichkeit angegeben?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Mobilitätseinschränkung in der Akte dokumentiert?" },
        { id: "M2-02", text: "Begründung für gewählte Transportart dokumentiert?" },
      ],
    },
    "WF-C03": {
      MFA: [
        { id: "M2-01", text: "Frühere Transportverordnungen vorhanden?" },
        { id: "M2-02", text: "Besondere Anforderungen dokumentiert (Rollstuhl, Sauerstoff, Begleitung)?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Grunderkrankung als Ursache des Transportbedarfs dokumentiert?" },
        { id: "M2-02", text: "Transportbedarf als dauerhaft oder vorübergehend eingestuft?" },
      ],
    },
    "WF-C04": {
      MFA: [
        { id: "M2-01", text: "Rücktransport oder Folgefahrten benötigt?" },
      ],
      ARZT: [
        { id: "M2-01", text: "Folgeschritte nach dem Transport festgelegt?" },
      ],
    },
  },

  [WORKFLOW_TOPIC_HYPERTONIE]: {
    "HT-C01": {
      ARZT: orientationQuestions(
        "erhöhte Praxiswerte möglichst mit einer 24-Stunden-Blutdruckmessung bestätigt werden und eine Heimmessung eine Alternative ist, wenn ABPM nicht verfügbar oder abgelehnt wird",
        "eine erneute Praxismessung nach 3–4 Wochen ohne ABPM/HBPM nur eine Notlösung ist und ein einzelner unauffälliger Praxiswert eine Hypertonie nicht sicher ausschließt",
        "nach bestätigter Diagnose Ruhe-EKG, Urin-ACR und Basislabor zur hausärztlichen Basisabklärung gehören und weiterführende apparative Diagnostik einen konkreten Anlass braucht",
      ),
    },
    "HT-C02": {
      ARZT: orientationQuestions(
        "der Praxis-Referenzzielwert unter 140/90 mmHg liegt, Heimwerte anders eingeordnet werden und das individuelle Ziel Alter, Risiken, Gebrechlichkeit und Lebenserwartung berücksichtigt",
        "bei erforderlicher Kombinationstherapie Fixkombinationen die Einnahme vereinfachen können",
        "Bewegung in moderater Intensität zur Behandlung gehört und vor intensiverer sportlicher Belastung eine Belastungsuntersuchung erwogen werden sollte",
      ),
    },
    "HT-C03": {
      ARZT: orientationQuestions(
        "nach Therapieeinleitung, Dosisanpassung oder Umstellung eine erste klinische Verlaufskontrolle nach 4–6 Wochen vorgesehen ist",
        "bei stabiler Zielwerteinstellung ohne relevante Begleiterkrankung eine jährliche Kontrolle ausreichen kann, während relevante Komorbiditäten wie Herzinsuffizienz oder CKD kürzere Intervalle erfordern können",
        "Nierenfunktion und Elektrolyte nicht pauschal monatlich kontrolliert werden müssen und ihr Monitoring besonders unter Diuretika oder Spironolacton am Verlauf und Kontrollrhythmus auszurichten ist",
      ),
    },
    "HT-C04": {
      ARZT: orientationQuestions(
        "unkomplizierte stabile Hypertonie primär hausärztlich betreut wird und kardiologische Mitbeurteilung bei kardialen Beschwerden, Endorganschäden oder Verdacht auf Belastungshypertonie gezielt erwogen wird",
        "eGFR-Abfall über 20 Prozent, eGFR unter 45 ml/min/1,73 m², neue Proteinurie oder Verdacht auf Nierenarterienstenose Anlass zur nephrologischen Abstimmung sein können",
        "bei nicht erreichtem Zielblutdruck trotz ausdosierter Dreierkombination einschließlich Diuretikum eine Abklärung im Hypertoniezentrum angezeigt sein kann",
      ),
    },
    "HT-C05": {
      MFA: orientationQuestions(
        "standardisierte Praxisblutdruckmessungen nach ärztlicher Festlegung an qualifizierte MFA delegiert werden können",
        "strukturierte Heimblutdruckprotokolle und eine Schulung zur Messkompetenz die ärztliche Verlaufsbeurteilung unterstützen können",
      ),
      ARZT: orientationQuestions(
        "standardisierte Praxisblutdruckmessungen 5 Minuten Ruhe, drei Messungen im Abstand von 2 Minuten und die Mittelung der zweiten und dritten Messung vorsehen",
        "ein Heimblutdruckprotokoll üblicherweise sieben Tage mit Messungen morgens und abends nach Ruhe umfasst und ein Heimwert ab 135/85 mmHg entsprechend einzuordnen ist",
        "Salzreduktion, Bewegung, Tabakverzicht und Beratung zu riskantem Alkoholkonsum zur Lebensstilberatung gehören und ein Hyponatriämierisiko bei der Salzempfehlung zu beachten ist",
      ),
    },
    "HT-C06": {
      ARZT: orientationQuestions(
        "stark erhöhte Werte ohne akute Organsymptome von einer hypertensiven Notfallsituation mit akuten Organsymptomen unterschieden werden müssen und die Situation ärztlich einzuordnen ist",
        "bei stark erhöhtem Blutdruck zusammen mit akuten Organsymptomen wie Brustschmerz, Ruhedyspnoe oder Schlaganfallverdacht eine sofortige stationäre Notfallversorgung erforderlich ist",
        "eGFR-Abfall, neue Proteinurie, Nebenwirkungen, blutdrucksteigernde Begleitmedikation oder Adhärenzbarrieren eine ärztliche Neubewertung auslösen können",
      ),
    },
  },

  [WORKFLOW_TOPIC_DIABETES_TYP_2]: {
    "DM2-C01": {
      ARZT: orientationQuestions(
        "bei fehlenden typischen Symptomen die Diagnosesicherung durch wiederholte beziehungsweise mehrere pathologische Laborbefunde und die klinische Situation zusammen einzuordnen sind",
        "für Nüchternplasmaglukose unterschiedliche Risikogrenzen der Fachgesellschaften vertreten werden und Grenzbefunde nicht unkritisch zur Überdiagnostik führen sollten",
        "ein oGTT hausärztlich nicht routinemäßig erforderlich ist und bei diskrepanten NPG- und HbA1c-Befunden gezielt erwogen werden kann",
      ),
    },
    "DM2-C02": {
      ARZT: orientationQuestions(
        "es keinen starren HbA1c-Einheitszielwert gibt und ein individueller Zielkorridor Alter, Lebenserwartung, Komorbiditäten und Patientenwunsch berücksichtigen soll",
        "bei kardiovaskulärer Erkrankung, Herzinsuffizienz oder CKD eine frühe kardiorenale Wirkstoffwahl einschließlich SGLT2-Inhibitor oder GLP-1-Rezeptoragonist zu prüfen ist",
        "Metformin bei eGFR unter 30 ml/min kontraindiziert ist und bei eGFR von 30–59 ml/min Dosis und Nierenfunktion besonders zu beachten sind",
      ),
    },
    "DM2-C03": {
      ARZT: orientationQuestions(
        "HbA1c-Kontrollen meist alle 3–6 Monate erfolgen und bei stabiler Lebensstiltherapie längere, bei Umstellungen kürzere Intervalle passend sein können",
        "quartalsweise DMP-Dokumentation nicht mit allgemeinen medizinischen Untersuchungsintervallen gleichzusetzen ist und Augen- sowie Nervenuntersuchungen risikoadaptiert geplant werden",
        "bei moderatem HbA1c ohne Herzinsuffizienz der Nutzen einer dualen Kombination nicht automatisch belegt ist und Hypoglykämien oder Gebrechlichkeit eine Deeskalation nahelegen können",
      ),
    },
    "DM2-C04": {
      ARZT: orientationQuestions(
        "eine jährliche eGFR-Bestimmung bei Typ-2-Diabetes als grundlegender Verlaufspunkt empfohlen wird",
        "beim UACR-Screening unterschiedliche Leitlinienpositionen bestehen und Indikation sowie Bereitschaft zu einer möglichen Therapieeskalation gemeinsam einzuordnen sind",
        "die Urin-Proteomanalyse CKD273 laut G-BA-Beschluss nicht zur GKV-Regelversorgung gehört und UACR/eGFR etablierte Verfahren sind",
      ),
    },
    "DM2-C05": {
      MFA: orientationQuestions(
        "der Austausch mit der Augenarztpraxis über standardisierte Mitteilungsbögen organisatorisch unterstützt werden kann",
        "Patientinnen und Patienten vorübergehend nach Mydriasis nicht selbst fahren sollten und die Aufklärung organisatorisch mitgedacht werden kann",
      ),
      ARZT: orientationQuestions(
        "diabetische Retinopathie anfangs symptomlos sein kann und deshalb eine systematische augenärztliche Untersuchung mit Mydriasis wichtig ist",
        "bei geringem Risiko ein zweijähriges, bei Risikofaktoren wie HbA1c über 7,5 Prozent, Hypertonie oder langer Diabetesdauer ein jährliches Intervall empfohlen wird",
        "standardisierte Mitteilungsbögen und die Aufklärung über das 2–4-stündige Fahrverbot nach Mydriasis zur augenärztlichen Mitbetreuung gehören",
      ),
    },
    "DM2-C06": {
      ARZT: orientationQuestions(
        "ein Neuropathie-Screening alle 1–2 Jahre Groß- und Kleinfasertest kombinieren kann und Reflexe optional sind",
        "Fußkontrollen je nach DSPN, pAVK, Deformität und Ulkusvorgeschichte unterschiedlich häufig erforderlich sein können und kein einheitliches Intervall für alle gilt",
        "jährlich psychische und kardiovaskuläre Risiken sowie gezielt mögliche autonome Neuropathie berücksichtigt werden können",
      ),
    },
    "DM2-C07": {
      MFA: orientationQuestions(
        "ein evaluiertes Schulungsangebot zeitnah nach Erstdiagnose und bei Zielverfehlung eine Wiederholungsschulung organisatorisch unterstützt werden kann",
        "Aufgaben im Praxisteam und eine mögliche MFA-Delegation im Rahmen der ärztlichen Festlegung klar zugeordnet werden können",
        "vor Basismassnahmen ein gemeinsames Assessment zu Ernährung und Bewegung sinnvoll ist und routinemäßige BZ-Selbstmessungen ohne Hypoglykämierisiko nicht indiziert sind",
      ),
      ARZT: orientationQuestions(
        "ein evaluiertes Schulungsangebot zeitnah nach Erstdiagnose und bei Zielverfehlung eine Wiederholungsschulung sinnvoll sein kann",
        "diabetologische Mitbetreuung bei komplexer Entgleisung, rezidivierenden Hypoglykämien, eGFR unter 30 ml/min oder diabetischem Fußsyndrom erwogen wird",
        "vor Basismassnahmen ein gemeinsames Assessment zu Ernährung und Bewegung gehört und routinemäßige BZ-Selbstmessungen ohne Hypoglykämierisiko nicht indiziert sind",
      ),
    },
    "DM2-C08": {
      MFA: orientationQuestions(
        "akute Symptome wie Polyurie, Polydipsie, Gewichtsverlust oder Sehstörung zeitnah ärztlich rückgemeldet und die vorgesehene Akutabklärung organisiert werden sollten",
      ),
      ARZT: orientationQuestions(
        "bei diabetesspezifischen Akutsymptomen eine sofortige Glukose- und situationsgerechte Ketonprüfung zum Ausschluss einer Dekompensation erwogen wird",
        "neue Fußläsionen, Druckstellen, Claudicatio oder plötzliche Sehstörungen Routineintervalle unterbrechen und eine sofortige ärztliche Beurteilung erfordern",
        "anhaltende Normoglykämie ohne Medikation oder zunehmende Gebrechlichkeit eine individuelle Neubewertung von Diagnose und Therapiezielen auslösen können, ohne automatisch eine Fehldiagnose zu bedeuten",
      ),
    },
  },

  [WORKFLOW_TOPIC_ADIPOSITAS]: {
    "AD-C01": {
      ARZT: orientationQuestions(
        "der BMI zur Graduierung dient und der relative Gewichtsverlauf ergänzend die Dynamik abbildet, ohne daraus ein allgemeines monatliches Wiegegebot abzuleiten",
        "Taillenumfang zu Beginn optional ergänzen kann und Hautfaltenmessungen laut Vorlage keinen Zusatznutzen haben",
        "TSH dem Ausschluss einer manifesten Hypothyreose dient und Cushing- oder Genanalysen nur bei begründetem Verdacht oder Bariatrieplanung erwogen werden",
      ),
    },
    "AD-C02": {
      ARZT: orientationQuestions(
        "ab BMI 25 kg/m² relevante Begleiterkrankungen wie Hypertonie, Typ-2-Diabetes, Dyslipidämie, KHK, OSAS, Gicht und Reflux gezielt berücksichtigt werden können",
        "Blutdruck, Nüchternglukose und Lipide zur kardiometabolischen Einordnung gehören",
        "FIB-4 eine optionale Risikostratifizierung ist und Ultraschall beziehungsweise Triglyzeride nicht pauschal als hausärztliche Routine angesetzt werden sollten",
      ),
    },
    "AD-C03": {
      ARZT: orientationQuestions(
        "ein Gewichtsverlust von 5–10 Prozent innerhalb von 6–12 Monaten ein möglicher individueller Zielkorridor ist und bereits geringere Verluste Parameter verbessern können",
        "eine tragfähige Energiereduktion wichtiger als eine bestimmte Makronährstoffverteilung ist und Präferenzen einbezogen werden sollten",
        "Jojo-Erfahrungen und Stigmatisierung neutral und in People-First-Sprache angesprochen werden sollten",
      ),
    },
    "AD-C04": {
      MFA: orientationQuestions(
        "Anthropometrie und Blutdruckmessung an das Praxisteam delegiert werden können",
        "die ärztliche Notwendigkeitsbescheinigung für Ernährungsberatung in der ärztlichen Verantwortung bleibt",
        "Aufgaben im Praxisteam und mögliche Unterstützung beim Selbstmanagement gemeinsam festgelegt werden können",
      ),
      ARZT: orientationQuestions(
        "Ernährungsumstellung, Bewegung und Verhaltensmodifikation als multimodale Basistherapie zusammengehören",
        "Anthropometrie und Blutdruckmessung delegierbar sind, die Notwendigkeitsbescheinigung nach § 43 SGB V aber ärztliche Verantwortung bleibt",
        "Selbstmanagement-Unterstützung und gegebenenfalls evaluierte digitale Angebote individuell vereinbart werden können, statt ein allgemeines Wiegegebot vorzugeben",
      ),
    },
    "AD-C05": {
      ARZT: orientationQuestions(
        "regelmäßige Verlaufskontrollen, zum Beispiel im Abstand von sechs Monaten, abhängig vom Verlauf geplant werden können",
        "hs-CRP oder Triglyzeride ohne konkrete klinische Konsequenz nicht routinemäßig nachbestimmt werden sollten",
        "DMP-Programmanforderungen von medizinisch begründeten Kontrollen der S3-Leitlinie zu unterscheiden sind",
      ),
    },
    "AD-C06": {
      ARZT: orientationQuestions(
        "medikamentöse Optionen nur ergänzend zur Basistherapie und nach individueller Indikation eingeordnet werden",
        "bei persistierender GPT-Erhöhung oder auffälligem FIB-4 beziehungsweise bei Binge-Eating oder Depression eine gezielte fachärztliche oder psychosoziale Mitbetreuung erwogen werden kann",
        "ein Adipositaszentrum insbesondere bei BMI ab 35 kg/m² mit schweren Komorbiditäten oder Verdacht auf syndromale beziehungsweise monogene Formen in Betracht kommt",
      ),
    },
    "AD-C07": {
      ARZT: orientationQuestions(
        "nach erfolgreicher Gewichtsabnahme eine langfristige Gewichtserhaltung mitgedacht werden sollte",
        "Gewichtszunahme oder Therapieabbruch Anlass zur individuellen ärztlichen Neubewertung sein können, aber kein starrer 3–5-Prozent-Auslöser für alle gilt",
        "neu verordnete potenziell gewichtszunehmende Arzneimittel eine erneute Betrachtung des Gewichtsmanagements auslösen können",
      ),
    },
  },

  [WORKFLOW_TOPIC_EISENMANGEL]: {
    "EI-C01": {
      ARZT: orientationQuestions(
        "leere Eisenspeicher nicht automatisch eine Eisenmangelanämie bedeuten und Schwellenwerte aus der seit 30.10.2026 abgelaufenen S1-Leitlinie nicht als aktuelle Standards übernommen werden dürfen",
        "Ferritin als Akut-Phase-Protein bei Entzündung, Malignom sowie Herz- oder Niereninsuffizienz nicht isoliert beurteilt werden sollte und keine universellen Ferritin-/TfS-Grenzen gelten",
        "Maßnahmen von Symptomen, Anämiegrad und Ursache abhängen und GKV-Erstattung für orale Eisenpräparate laut G-BA auf schwerwiegende Eisenmangelanämie begrenzt ist",
      ),
    },
    "EI-C02": {
      ARZT: orientationQuestions(
        "Hb, MCV und MCH die Einordnung unterstützen und ein normozytäres Blutbild Eisenmangel nicht sicher ausschließt",
        "Ferritin im Kontext von Transferrinsättigung, Entzündungszeichen und Nierenfunktion interpretiert werden kann, statt einen einzelnen Laborwert als ausreichend anzusehen",
        "Spezialparameter wie sTfR, Retikulozyten-Hb, Hepcidin oder Thomas-Plot nur bei konkreter Fragestellung erwogen werden und der Thomas-Plot methodische Grenzen hat",
      ),
    },
    "EI-C03": {
      ARZT: orientationQuestions(
        "Entzündung über Hepcidin die Eisenverfügbarkeit verändern und einen Eisenmangel verdecken kann",
        "bei chronischer Nierenkrankheit eine renale Anämie zusätzlich zu berücksichtigen ist und Grenzwerte aus der abgelaufenen S1-Leitlinie nicht pauschal gelten",
        "eine Anämie bei chronischer Erkrankung nicht automatisch isolierter Eisenmangel ist und die Grunderkrankung in die Einordnung gehört",
      ),
    },
    "EI-C04": {
      ARZT: orientationQuestions(
        "Eisensubstitution eine Ursacheneinordnung nicht ersetzt und die S3-Leitlinie AWMF 001-024 ausschließlich den präoperativen Kontext betrifft",
        "Alter, Geschlecht, Menstruationsstatus und Vorgeschichte die mögliche Ursachensuche beeinflussen können",
        "Endoskopie nicht pauschal für alle erforderlich ist und die aus der abgelaufenen S1-Leitlinie übernommenen Indikationsangaben aktuell geprüft werden müssen",
      ),
    },
    "EI-C05": {
      MFA: orientationQuestions(
        "Einnahmehinweise zu oralem Eisen und mögliche Wechselwirkungen verständlich vermittelt werden können, wobei konkrete Vorgaben aus der abgelaufenen S1-Leitlinie aktuell zu prüfen sind",
        "die Vorbereitung einer intravenösen Gabe einschließlich Überwachung nur nach ärztlicher Indikation und geltendem Praxisstandard organisiert wird",
      ),
      ARZT: orientationQuestions(
        "orale Eisensubstitution häufig ein möglicher erster Behandlungsweg ist, Dosierung und Dauer aus der abgelaufenen S1-Leitlinie aber keine unbesehen aktuellen Standards sind",
        "Einnahmebedingungen und mögliche Wechselwirkungen besprochen werden können, ohne einen pauschalen PPI-Abstand als Regel festzuschreiben",
        "intravenöses Eisen eine begründete Indikation braucht und die S3-Leitlinie nur den präoperativen Sonderfall abdeckt; die S1-Angabe zur 30-minütigen Überwachung ist nach deren Ablauf keine aktuelle Vorgabe",
      ),
    },
    "EI-C06": {
      ARZT: orientationQuestions(
        "es keine starren Routine-Kalenderintervalle gibt und das aus der abgelaufenen S1 stammende allgemeine Zeitfenster von 4–12 Wochen nicht als aktuelle Leitlinienvorgabe gelten darf",
        "präoperative Verlaufskontrollen aus der S3-Leitlinie nur im präoperativen Geltungsbereich zu sehen sind und EPO einen gesonderten Verlauf erfordert",
        "ein normalisierter Hb-Wert nicht automatisch volle Eisenspeicher bedeutet und die aus der abgelaufenen S1 stammenden Zielwerte nicht pauschal anzuwenden sind",
      ),
    },
    "EI-C07": {
      MFA: orientationQuestions(
        "die Terminierung einer ärztlich festgelegten Nüchtern-Blutentnahme und das Einholen externer Berichte organisatorisch unterstützt werden können",
        "Patientinnen und Patienten verständliche Einnahme- und Nebenwirkungshinweise erhalten können, konkrete Empfehlungen aus der abgelaufenen S1 aber aktuell zu prüfen sind",
        "mögliche Blutungszeichen oder eine akute Verschlechterung zeitnah ärztlich rückgemeldet werden sollten und Indikation sowie Behandlung ärztlich bleiben",
      ),
      ARZT: orientationQuestions(
        "MFA Verlaufskontrollen organisatorisch vorbereiten können, während Indikationsstellung, Verordnung und Behandlung ärztliche Aufgaben bleiben",
        "verständliche Einnahmehinweise und die Einordnung möglicher Nebenwirkungen zur Versorgung gehören und Aussagen aus der abgelaufenen S1 aktuell zu prüfen sind",
        "Blutungszeichen, akute Verschlechterung der Anämiesymptomatik oder schwere Unverträglichkeit eine zeitnahe ärztliche Neubewertung erfordern können",
      ),
    },
  },

  [WORKFLOW_TOPIC_SCHILDDRUESE]: {
    "SD-C01": {
      ARZT: orientationQuestions(
        "ein erhöhter TSH-Wert vor Therapieeinleitung zunächst bestätigt und altersabhängig eingeordnet werden kann",
        "bei der TSH-Einordnung Alter, Symptome und Begleiterkrankungen relevant sind und einzelne Grenzwerte nicht für alle gleich gelten",
        "die Diagnostik stufenweise mit basal TSH beginnt, fT4 bei pathologischem TSH und TPO-Antikörper gezielt ergänzt werden",
      ),
    },
    "SD-C02": {
      ARZT: orientationQuestions(
        "Sonographie bei Tastbefund, Inzidentalom oder lokalen Symptomen erwogen wird und bei unauffälliger Palpation kein allgemeines Screening vorgesehen ist",
        "Knotenwachstum allein kein Malignitätskriterium ist und der Befund insgesamt eingeordnet werden muss",
        "Szintigraphie nur bei passender klinischer Konstellation und fachlicher Indikation erwogen wird; die in der Vorlage genannten TSH- und Größenwerte sind keine universelle Regel",
      ),
    },
    "SD-C03": {
      ARZT: orientationQuestions(
        "bei erniedrigtem TSH fT4, fT3 und TRAK zur Unterscheidung möglicher Ursachen beitragen",
        "bei negativen TRAK und passendem Knotenbefund eine Autonomieabklärung einschließlich möglicher Szintigraphie gezielt erwogen werden kann",
        "vor Radioiodtherapie oder Operation bei Morbus Basedow eine endokrine Orbitopathie fachlich beurteilt werden sollte",
      ),
    },
    "SD-C04": {
      MFA: orientationQuestions(
        "Hinweise zur Einnahme von L‑Thyroxin nach ärztlicher Festlegung verständlich vermittelt werden können und Dosisänderungen ärztlich bleiben",
      ),
      ARZT: orientationQuestions(
        "L‑Thyroxin üblicherweise nüchtern mit zeitlichem Abstand zum Frühstück oder abends eingenommen wird und die Tablette am Tag der Blutentnahme erst danach genommen wird",
        "Abstände zu Eisen und Kalzium beachtet werden sollten, aber kein pauschaler PPI-Zeitabstand aus der Vorlage abgeleitet wird",
        "bei Schwangerschaft eine zeitnahe ärztliche Neubewertung des erhöhten L‑Thyroxin-Bedarfs und der Kontrollen erforderlich sein kann, ohne eine automatische Dosisentscheidung abzuleiten",
      ),
    },
    "SD-C05": {
      MFA: orientationQuestions(
        "eine geplante Radioiodtherapie organisatorisch mit der Nuklearmedizin abgestimmt wird und Medikamentenpausen nicht eigenständig festgelegt werden",
      ),
      ARZT: orientationQuestions(
        "Thiamazol oder Carbimazol laut Vorlage häufig als thyreostatische Erstwahl gelten und Aufklärung sowie Blutbild bei Fieber beachtet werden",
        "eine Pause von Thyreostatika vor Radioiodtherapie fachärztlich mit der Nuklearmedizin abgestimmt werden muss und die genannte Frist keine eigenständige Anweisung ist",
        "Kontrazeption, Stillzeit und Iodexposition vor Radioiodtherapie rechtzeitig fachärztlich koordiniert werden sollten",
      ),
    },
    "SD-C06": {
      MFA: orientationQuestions(
        "die organisatorische Recall-Planung an Diagnose und ärztlich festgelegtem Intervall ausgerichtet wird, statt einheitliche Kontrollen für alle Schilddrüsenerkrankungen anzusetzen",
      ),
      ARZT: orientationQuestions(
        "TSH nach Neueinstellung oder Dosisänderung erst nach ausreichendem Abstand und bei stabiler Euthyreose in größeren Intervallen kontrolliert werden kann",
        "unverdächtige Schilddrüsenknoten nicht automatisch regelmäßige Bildkontrollen benötigen und Kontrollen vom Risikobefund abhängen",
        "Kontrollen unter Thyreostatika, nach Operation oder Radioiodtherapie unterschiedliche Intervalle haben und postoperative Kalziumhinweise keine Dosierungsanleitung sind",
      ),
    },
    "SD-C07": {
      ARZT: orientationQuestions(
        "Persistenz eines erhöhten TSH trotz Einnahmeprüfung oder Verdacht auf zentrale Hypothyreose eine endokrinologische Mitbeurteilung begründen kann",
        "Malignitätsverdacht, follikuläre Neoplasie, auffälliges Kalzitonin oder Kompressionszeichen eine chirurgische Beurteilung erforderlich machen können",
        "nuklearmedizinische Mitbeurteilung bei passender Hyperthyreose- und Knoten-Konstellation gezielt erwogen wird",
      ),
    },
    "SD-C08": {
      MFA: orientationQuestions(
        "neu aufgetretene Heiserkeit, Stridor, Schluckstörung oder postoperative Kribbelparästhesien zeitnah an die ärztliche Beurteilung weitergegeben werden sollten",
      ),
      ARZT: orientationQuestions(
        "neue Heiserkeit, Stridor, Schluckstörung oder rasches Knotenwachstum eine zeitnahe ärztliche Neubewertung erfordern können",
        "Kribbelparästhesien oder Muskelkrämpfe nach Schilddrüsenoperation auf eine mögliche Kalziumstörung hinweisen und ärztlich beurteilt werden müssen, ohne daraus eine Dosierungsanleitung zu machen",
        "Schwangerschaftseintritt oder TSH-Entgleisungen eine zeitnahe ärztliche Neubewertung erfordern und Dosisanpassungen der ärztlichen Entscheidung vorbehalten bleiben",
      ),
    },
  },
};

export function getM2QuestionsForCheckpoint(
  topicId: WorkflowTopicId,
  checkpointId: string,
  role: WorkflowRole,
): readonly WorkflowM2Question[] {
  const byCheckpoint = M2_QUESTIONS_BY_TOPIC[topicId];
  if (!byCheckpoint) return [];
  const byRole = byCheckpoint[checkpointId];
  if (!byRole) return [];
  return byRole[role] ?? [];
}
