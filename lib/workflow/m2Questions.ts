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

function orientationHints(...hints: string[]): readonly WorkflowM2Question[] {
  return hints.map((hint, index) => ({
    id: `ORI-${String(index + 1).padStart(2, "0")}`,
    text: hint,
  }));
}

function sharedOrientation(hint: string): M2QuestionsByCheckpoint[string] {
  const questions = orientationHints(hint);
  return { MFA: questions, ARZT: questions };
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
    "HT-C01": sharedOrientation("Diagnose mit ABPM bestätigen, alternativ 7-Tage-Heimmessung; einzelne Praxiswerte reichen nicht"),
    "HT-C02": sharedOrientation("Ziel meist <140/90 mmHg in der Praxis, <135/85 zu Hause; individuell nach Risiko und Gebrechlichkeit"),
    "HT-C03": sharedOrientation("Nach Therapiebeginn/-änderung nach 4–6 Wochen kontrollieren; Labor nach Verlauf und Medikation"),
    "HT-C04": sharedOrientation("Stabil jährlich; bei Herzinsuffizienz/CKD meist alle 3 Monate kontrollieren"),
    "HT-C05": sharedOrientation("Kardiologie bei Beschwerden/Organschaden; Nephrologie bei eGFR <45, Abfall >20 % oder Proteinurie"),
    "HT-C06": sharedOrientation("Praxis-RR standardisiert messen; >180/110 mit akuten Organsymptomen sofort notfallmedizinisch versorgen"),
  },

  [WORKFLOW_TOPIC_DIABETES_TYP_2]: {
    "DM2-C01": sharedOrientation("Bei fehlenden Symptomen Diagnose durch Wiederholungsbefund sichern; oGTT nur bei diskordanten Werten"),
    "DM2-C02": sharedOrientation("HbA1c-Ziel individuell; kardiorenale Erkrankung früh bei der Medikamentenwahl berücksichtigen"),
    "DM2-C03": sharedOrientation("HbA1c meist alle 3–6 Monate, nach Umstellung etwa alle 3 Monate; DMP-Doku getrennt betrachten"),
    "DM2-C04": sharedOrientation("eGFR mindestens jährlich; UACR nach Leitlinie, Risiko und möglicher Therapiekonsequenz"),
    "DM2-C05": sharedOrientation("Augenarzt: alle 2 Jahre bei geringem Risiko, jährlich bei Risikofaktoren"),
    "DM2-C06": sharedOrientation("Fußkontrolle jährlich ohne Risiko; 6-monatlich bei DSPN/pAVK, 3-monatlich bei beidem/Deformität, 1–3 Monate nach Ulkus"),
    "DM2-C07": sharedOrientation("Schulung zeitnah nach Diagnose und erneut bei Bedarf; Diabetologie bei komplexem Verlauf"),
    "DM2-C08": sharedOrientation("Akutsymptome: Glukose/Ketone ärztlich prüfen; neue Fußläsion sofort beurteilen"),
  },

  [WORKFLOW_TOPIC_ADIPOSITAS]: {
    "AD-C01": sharedOrientation("BMI zur Einordnung; Gewichtstrend individuell, kein monatliches Wiegegebot"),
    "AD-C02": sharedOrientation("Begleiterkrankungen, Blutdruck, Glukose und Lipide prüfen; FIB-4 optional"),
    "AD-C03": sharedOrientation("Ziel gemeinsam festlegen; 5–10 % Gewichtsabnahme in 6–12 Monaten als möglicher Korridor"),
    "AD-C04": sharedOrientation("Basistherapie verbindet Ernährung, Bewegung und Verhalten; Messungen ans Team delegierbar"),
    "AD-C05": sharedOrientation("Verlauf regelmäßig, etwa halbjährlich, prüfen; Labor nur bei klinischer Konsequenz"),
    "AD-C06": sharedOrientation("Medikation nur ergänzend; Zentrum bei BMI ≥35 plus schweren Komorbiditäten erwägen"),
    "AD-C07": sharedOrientation("Gewichtserhaltung planen; Zunahme individuell bewerten, keine starre Prozent-Schwelle"),
  },

  [WORKFLOW_TOPIC_EISENMANGEL]: {
    "EI-C01": sharedOrientation("Eisenmangel ist nicht automatisch Anämie; Ferritin im klinischen Kontext werten"),
    "EI-C02": sharedOrientation("Basislabor: Blutbild, Ferritin, TfS, CRP und Kreatinin/eGFR"),
    "EI-C03": sharedOrientation("Entzündung und CKD verändern die Einordnung; keine universellen Grenzwerte"),
    "EI-C04": sharedOrientation("Ursache nach Alter, Geschlecht und Symptomen suchen; keine Endoskopie für alle"),
    "EI-C05": sharedOrientation("Orales Eisen häufig zuerst; i.v. nur begründet, S3-Regeln nur präoperativ"),
    "EI-C06": sharedOrientation("Verlauf individuell festlegen; keine starren Routine-Laborintervalle"),
    "EI-C07": sharedOrientation("Blutungszeichen, Atemnot oder Synkope zeitnah ärztlich beurteilen"),
  },

  [WORKFLOW_TOPIC_SCHILDDRUESE]: {
    "SD-C01": sharedOrientation("TSH >4 mU/l vor Therapie nach 4 Wochen bestätigen und altersgerecht bewerten"),
    "SD-C02": sharedOrientation("Knoten-Sonografie bei Tastbefund, Zufallsbefund oder lokalen Symptomen; kein Screening"),
    "SD-C03": sharedOrientation("Niedriges TSH: fT4, fT3, TRAK; Szintigrafie nur gezielt nach Befund"),
    "SD-C04": sharedOrientation("L‑Thyroxin nüchtern; mindestens 2 Stunden Abstand zu Eisen/Kalzium"),
    "SD-C05": sharedOrientation("Unter Thiamazol/Carbimazol bei Fieber sofort Blutbild; RIT-Pausen fachärztlich abstimmen"),
    "SD-C06": sharedOrientation("TSH 8 Wochen nach Dosisänderung; stabile Hypothyreose meist alle 6–24 Monate"),
    "SD-C07": sharedOrientation("Endokrinologie bei persistierendem TSH; Chirurgie bei Knotenverdacht/Kompression"),
    "SD-C08": sharedOrientation("Heiserkeit, Stridor, Schluckstörung oder postoperative Krämpfe ärztlich prüfen"),
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
