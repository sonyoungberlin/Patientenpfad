export type M2Answer = "ja" | "nein" | "unklar";

export type M2Question = {
  id: string;
  text: string;
};

/**
 * Strukturierte M2-Antworten pro Checkpoint.
 * Schlüssel: Fragen-ID (z. B. "M2-01"), Wert: Antwort.
 */
export type M2CheckpointAnswers = Record<string, M2Answer>;

/**
 * Prefill-Daten für eine gesamte M2-Session.
 * Schlüssel: Checkpoint-ID (z. B. "K01"), Wert: Antworten pro Frage.
 */
export type M2PrefillData = Record<string, M2CheckpointAnswers>;

/**
 * Statischer Katalog der M2-Fragen pro Checkpoint K01–K08.
 * Quelle: docs/checkpoints/CP-K01.md bis CP-K08.md
 */
export const M2_QUESTIONS: Record<string, M2Question[]> = {
  K01: [
    {
      id: "M2-01",
      text: "Sind Sie telefonisch und per SMS erreichbar?",
    },
    {
      id: "M2-02",
      text: "Sind Sie per E-Mail oder über unser Praxissystem erreichbar?",
    },
    {
      id: "M2-03",
      text: "Falls Sie selbst nicht gut erreichbar sind: Können wir Sie über eine Kontaktperson erreichen?",
    },
    {
      id: "M2-04",
      text: "Können Sie Informationen oder Nachrichten auf Deutsch gut verstehen?",
    },
  ],
  K02: [
    {
      id: "M2-01",
      text: "Ist es Ihnen grundsätzlich möglich, Termine in unserer Praxis wahrzunehmen?",
    },
    {
      id: "M2-02",
      text: "Haben Sie aktuell Schwierigkeiten, Termine in unserer Praxis wahrzunehmen (z. B. aufgrund eingeschränkter Mobilität oder organisatorischer Gründe)?",
    },
    {
      id: "M2-03",
      text: "Können Sie Unterstützung organisieren, um Termine wahrzunehmen (z. B. durch Angehörige oder andere Personen)?",
    },
  ],
  K03: [
    {
      id: "M2-01",
      text: "Haben Sie Unterlagen zu Ihren Diagnosen (z. B. Arztbriefe oder Befunde)?",
    },
    {
      id: "M2-02",
      text: "Waren Sie in den letzten 3 Monaten im Krankenhaus oder bei Fachärzten in Behandlung?",
    },
    {
      id: "M2-03",
      text: "Sind Sie regelmäßig in fachärztlicher Behandlung?",
    },
    {
      id: "M2-04",
      text: "Wissen Sie, wo Sie Ihre medizinischen Unterlagen finden oder wie Sie diese bei Bedarf erhalten können?",
    },
  ],
  K04: [
    {
      id: "M2-01",
      text: "Haben Sie einen aktuellen Medikamentenplan oder eine Übersicht?",
    },
    {
      id: "M2-02",
      text: "Nehmen Sie Ihre Medikamente regelmäßig ein?",
    },
    {
      id: "M2-03",
      text: "Fällt es Ihnen leicht, die Medikamente wie vorgesehen einzunehmen?",
    },
    {
      id: "M2-04",
      text: "Nehmen Sie Medikamente ein, die nicht auf Ihrem Plan stehen?",
    },
    {
      id: "M2-05",
      text: "Haben Sie Probleme oder Beschwerden im Zusammenhang mit Ihren Medikamenten?",
    },
  ],
  K05: [
    {
      id: "M2-01",
      text: "Befinden Sie sich derzeit wegen einer Erkrankung in ärztlicher Behandlung?",
    },
    {
      id: "M2-02",
      text: "Gibt es Erkrankungen, die aktuell noch abgeklärt oder beobachtet werden?",
    },
    {
      id: "M2-03",
      text: "Werden Sie wegen einer Erkrankung regelmäßig medizinisch von Fachärzten betreut?",
    },
    {
      id: "M2-04",
      text: "Nehmen Sie aktuell Facharzttermine oder medizinische Behandlungen wahr?",
    },
  ],
  K06: [
    {
      id: "M2-01",
      text: "Benötigen Sie im Alltag Hilfe (z. B. bei Terminen, Haushalt oder Versorgung)?",
    },
    {
      id: "M2-02",
      text: "Erhalten Sie aktuell Hilfe durch andere Personen (z. B. Angehörige oder Freunde)?",
    },
    {
      id: "M2-03",
      text: "Werden Sie durch einen Pflegedienst oder andere Dienste betreut?",
    },
    {
      id: "M2-04",
      text: "Ist Ihre Versorgung im Alltag zuverlässig sichergestellt?",
    },
  ],
  K07: [
    {
      id: "M2-01",
      text: "Hatten Sie in letzter Zeit einen Krankenhausaufenthalt, eine Operation oder einen Unfall?",
    },
    {
      id: "M2-02",
      text: "Benötigen Sie vorübergehend Hilfe im Alltag (z. B. nach einem Eingriff oder einer Erkrankung)?",
    },
    {
      id: "M2-03",
      text: "Haben Sie für diese Zeit Unterstützung organisiert (z. B. durch Angehörige oder andere Personen)?",
    },
    {
      id: "M2-04",
      text: "Ist Ihre Versorgung für die nächste Zeit sichergestellt?",
    },
  ],
  K08: [
    {
      id: "M2-01",
      text: "Können Sie Videosprechstunden nutzen (allein oder mit Unterstützung)?",
    },
    {
      id: "M2-02",
      text: "Können Sie digitale Anfragen stellen (z. B. für Rezepte, Überweisungen oder Bescheinigungen)?",
    },
    {
      id: "M2-03",
      text: "Können Sie Nachrichten oder Dokumente digital empfangen und senden?",
    },
    {
      id: "M2-04",
      text: "Möchten Sie Informationen oder Erklärungen zur Nutzung unserer digitalen Angebote erhalten?",
    },
  ],
};

/**
 * Paralleler Fragenkatalog für die MFA-Vorbereitung.
 *
 * Strukturell identisch zu `M2_QUESTIONS` (`Record<checkpointId, M2Question[]>`),
 * jedoch mit eigenen, praxisorientierten Formulierungen und disjunkten Frage-IDs
 * im Format `MFA-K{nn}-{nn}`, sodass MFA- und Patientenantworten konfliktfrei
 * im selben `ctx_prefill[checkpointId]`-Container koexistieren können.
 *
 * Antwortschema bleibt unverändert (`M2Answer` = "ja" | "nein" | "unklar").
 */
export const M2_QUESTIONS_MFA: Record<string, M2Question[]> = {
  K01: [
    {
      id: "MFA-K01-01",
      text: "Ist der Patient für uns zuverlässig erreichbar?",
    },
    {
      id: "MFA-K01-02",
      text: "Funktioniert die Kommunikation mit dem Patienten in beide Richtungen?",
    },
  ],
  K02: [
    {
      id: "MFA-K02-01",
      text: "Kann der Patient seine Termine selbst organisieren?",
    },
  ],
  K03: [
    {
      id: "MFA-K03-01",
      text: "Liegen aktuelle medizinische Unterlagen (Befunde, Arztbriefe) vor?",
    },
    {
      id: "MFA-K03-02",
      text: "Ist die medizinische Situation im Krankenblatt nachvollziehbar dokumentiert?",
    },
  ],
  K04: [
    {
      id: "MFA-K04-01",
      text: "Ist die Begründung der Medikation durch Diagnosen nachvollziehbar dokumentiert?",
    },
  ],
  K05: [
    {
      id: "MFA-K05-01",
      text: "Ist die fachärztliche Mitbehandlung aktuell bekannt?",
    },
  ],
  K06: [
    {
      id: "MFA-K06-01",
      text: "Ist bekannt, ob der Patient im Alltag dauerhaft Unterstützung benötigt?",
    },
    {
      id: "MFA-K06-02",
      text: "Ist bekannt, ob der Patient im Alltag zuverlässig Unterstützung erhält?",
    },
    {
      id: "MFA-K06-03",
      text: "Sind Kontaktpersonen oder unterstützende Stellen (z. B. Familie, Pflegedienst) bekannt?",
    },
    {
      id: "MFA-K06-04",
      text: "Funktioniert die Kommunikation mit den unterstützenden Personen oder Stellen zuverlässig?",
    },
  ],
  K07: [
    {
      id: "MFA-K07-01",
      text: "Ist bekannt, ob aktuell ein vorübergehender Unterstützungsbedarf besteht?",
    },
    {
      id: "MFA-K07-02",
      text: "Ist bekannt, ob für den aktuellen Bedarf Unterstützung vorhanden ist?",
    },
    {
      id: "MFA-K07-03",
      text: "Ist bekannt, wer die notwendige Unterstützung aktuell organisiert oder übernimmt?",
    },
  ],
  K08: [
    {
      id: "MFA-K08-01",
      text: "Ist eine mitarbeiterunabhängige Verständigung mit dem Patienten möglich?",
    },
  ],
  K09: [
    {
      id: "MFA-K09-01",
      text: "Ist ein reibungsloser Ablauf im Kontakt mit dem Patienten möglich?",
    },
  ],
};
