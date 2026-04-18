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
      text: "Ist der Patient direkt erreichbar (Telefon, E-Mail oder persönlich)?",
    },
    {
      id: "M2-02",
      text: "Gibt es eine Person, die stellvertretend erreichbar ist?",
    },
    {
      id: "M2-03",
      text: "Welcher Kommunikationsweg ist aktuell nutzbar?",
    },
    {
      id: "M2-04",
      text: "Bestehen Sprachbarrieren oder Verständigungseinschränkungen?",
    },
  ],
  K02: [
    {
      id: "M2-01",
      text: "Können Sie Termine in der Praxis grundsätzlich wahrnehmen?",
    },
    {
      id: "M2-02",
      text: "Ist es für Sie schwierig, Termine in der Praxis wahrzunehmen?",
    },
  ],
  K03: [
    {
      id: "M2-01",
      text: "Haben Sie medizinische Unterlagen zu Ihren bisherigen Behandlungen?",
    },
    {
      id: "M2-02",
      text: "Waren Sie in letzter Zeit im Krankenhaus oder bei Fachärzten?",
    },
    {
      id: "M2-03",
      text: "Sind Sie aktuell regelmäßig in fachärztlicher Behandlung?",
    },
    {
      id: "M2-04",
      text: "Wissen Sie, wo Sie Ihre medizinischen Unterlagen finden oder bekommen können?",
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
      text: "Nehmen Sie auch Medikamente ein, die nicht auf Ihrem Plan stehen?",
    },
    {
      id: "M2-05",
      text: "Haben Sie Probleme oder Beschwerden im Zusammenhang mit Ihren Medikamenten?",
    },
  ],
  K05: [
    {
      id: "M2-01",
      text: "Sind Sie aktuell wegen einer Erkrankung in ärztlicher Behandlung?",
    },
    {
      id: "M2-02",
      text: "Waren Sie in letzter Zeit wegen einer Erkrankung beim Arzt oder im Krankenhaus?",
    },
    {
      id: "M2-03",
      text: "Gibt es Erkrankungen, wegen denen Sie regelmäßig Medikamente einnehmen?",
    },
    {
      id: "M2-04",
      text: "Gibt es etwas an Ihrer gesundheitlichen Situation, das unklar ist oder sich noch in Abklärung befindet?",
    },
  ],
  K06: [
    {
      id: "M2-01",
      text: "Waren Sie in den letzten 4 Wochen bei einem Facharzt, im Krankenhaus oder bei einem anderen Behandler?",
    },
    {
      id: "M2-02",
      text: "Sind Sie dauerhaft bei Fachärzten oder anderen Behandlern in Betreuung?",
    },
    {
      id: "M2-03",
      text: "Haben Sie aktuell Termine bei anderen Behandlern geplant?",
    },
    {
      id: "M2-04",
      text: "Sind Sie durch einen Pflegedienst oder andere externe Stellen in Betreuung?",
    },
  ],
  K07: [
    {
      id: "M2-01",
      text: "Gibt es aktuell Situationen, in denen Sie Unterstützung benötigen?",
    },
    {
      id: "M2-02",
      text: "Erhalten Sie Unterstützung durch Familie oder Freunde?",
    },
    {
      id: "M2-03",
      text: "Erhalten Sie Unterstützung durch einen Pflegedienst oder ähnliche Hilfe?",
    },
  ],
  K08: [
    {
      id: "M2-01",
      text: "Können Sie Videosprechstunden selbst oder mit Unterstützung nutzen?",
    },
    {
      id: "M2-02",
      text: "Können Sie Nachrichten oder Dokumente digital senden oder empfangen (selbst oder mit Unterstützung)?",
    },
    {
      id: "M2-03",
      text: "Möchten Sie Unterstützung bei der Nutzung digitaler Angebote?",
    },
  ],
};
