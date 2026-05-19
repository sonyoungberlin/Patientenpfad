import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointType,
  isMultiSelectCheckpoint,
  type ActiveCheckpoint,
  type ActiveCheckpointMultiSelect,
  type StandardCheckpoint,
  type M1SnapshotInitial,
} from "@/lib/types";

/**
 * Statischer Checkpoint-Katalog für alle M1-Checkpoints K01–K15.
 *
 * Jeder Eintrag ist ein vollständiges `ActiveCheckpoint`-Template ohne Status.
 * Der Status wird bei der Hydration auf `TO_DO` gesetzt.
 *
 * block_id entspricht dem M1-Aktivierungsblock-Schlüssel.
 */
type CheckpointTemplate = Omit<StandardCheckpoint, "status">;

export const CHECKPOINT_CATALOGUE: Record<string, CheckpointTemplate> = {
  K01: {
    id: "K01",
    block_id: "kommunikation",
    type: CheckpointType.PRESENCE_CHECK,
    category: CheckpointCategory.O,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Erreichbarkeit des Patienten",
    description: "Prüfen, ob der Patient zuverlässig erreichbar ist.",
    m4: {
      type: "ACTION",
      text: "Bitte stellen Sie sicher, dass Ihre Kontaktdaten aktuell in unserem System hinterlegt sind. Geben Sie, falls erforderlich, auch die Kontaktdaten einer Vertrauensperson an.",
    },
  },
  K02: {
    id: "K02",
    block_id: "versorgung_im_alltag",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.M,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Praktische Möglichkeit der Terminwahrnehmung",
    description: "Prüfen, ob eine ausreichende Versorgung im Alltag besteht.",
    m4: {
      type: "NOTICE",
      text: "Bitte beachten Sie, dass persönliche Termine für Untersuchungen erforderlich sind, da andernfalls keine angemessene medizinische Betreuung gewährleistet werden kann.",
    },
  },
  K03: {
    id: "K03",
    block_id: "medizinische_lage",
    type: CheckpointType.NACHWEIS,
    category: CheckpointCategory.M,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Diagnosenlage",
    description: "Prüfen, ob alle relevanten Diagnosen dokumentiert sind.",
    m4: {
      type: "ACTION",
      text: "Bitte bringen Sie relevante Befunde zu Ihren Diagnosen zum nächsten Termin mit.",
    },
  },
  K04: {
    id: "K04",
    block_id: "medizinische_lage",
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.M,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Medikation",
    description: "Aktuelle Medikation ist bekannt und geprüft.",
    m4: {
      type: "ACTION",
      text: "Bitte bringen Sie Ihren Medikamentenplan oder eine Übersicht zum nächsten Termin mit.",
    },
  },
  K05: {
    id: "K05",
    block_id: "medizinische_lage",
    type: CheckpointType.PROZESS_VORLAUF,
    category: CheckpointCategory.M,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Medizinische Mitbehandlung",
    description: "Relevante externe Fachärzte sind bekannt und einbezogen.",
    m4: {
      type: "NOTICE",
      text: "Bitte informieren Sie uns über Ihre aktuellen Fachärzte und halten Sie diese Angaben aktuell.",
    },
  },
  K06: {
    id: "K06",
    block_id: "versorgung_im_alltag",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Unterstützung im Alltag",
    description: "Pflegebedarf ist dokumentiert und bewertet.",
    m4: {
      type: "NOTICE",
      text: "Bitte teilen Sie uns mit, welche Hilfe Sie im Alltag benötigen und wer Sie dabei unterstützt.",
    },
  },
  K07: {
    id: "K07",
    block_id: "versorgung_im_alltag",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.M,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Vorübergehender Unterstützungsbedarf",
    description:
      "Es besteht ein vorübergehender Unterstützungsbedarf (z. B. nach Operation oder akuter Erkrankung), und die notwendige Unterstützung ist organisiert.",
    m4: {
      type: "NOTICE",
      text: "Bitte teilen Sie uns mit, ob Ihre Versorgung für die nächste Zeit sichergestellt ist.",
    },
  },
  K08: {
    id: "K08",
    block_id: "kommunikation",
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.O,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Nutzung digitaler Praxisleistungen",
    description:
      "Der Patient nutzt digitale Praxisangebote aktiv (z. B. Videosprechstunde, digitale Anfragen oder digitale Übermittlung von Dokumenten).",
    m4: {
      type: "ACTION",
      text: "Bitte beachten Sie, dass einige Leistungen nur über digitale Praxisangebote angeboten werden können.",
    },
  },
  K09: {
    id: "K09",
    block_id: "kommunikation",
    type: CheckpointType.VERIFIKATION,
    category: CheckpointCategory.O,
    perspectives: [CheckpointPerspective.MFA],
    title: "Mitwirkung",
    description: "Prüfen, ob die Mitwirkung des Patienten ausreichend gegeben ist.",
    m4: {
      type: "ACTION",
      text: "Bitte vereinbaren Sie Termine, damit wir uns ausreichend Zeit für Sie nehmen können. Falls Sie verhindert sind, sagen Sie Termine bitte rechtzeitig ab und beachten Sie getroffene Absprachen. Nur so können wir eine gute Versorgung gewährleisten.",
    },
  },
  K12: {
    id: "K12",
    block_id: "pflegebeobachtung",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.M,
    // K12 ist ein ASSESSMENT-Checkpoint: wird per Checkbox in M1 bewusst zugeschaltet.
    // Default: nicht aktiviert (enabled: false). Erscheint in M2/M3/M5 nur wenn enabled.
    // Kein M4-Output (m4.text: "").
    mode: CheckpointMode.ASSESSMENT,
    // perspectives = [PATIENT] bedeutet: erscheint im Patientenfragen-Katalog (M2_QUESTIONS).
    perspectives: [CheckpointPerspective.PATIENT],
    title: "Alltagssituation – Rückmeldung Kontaktperson",
    introText:
      "Bitte beantworten Sie die folgenden Fragen, wenn Sie den Patienten im Alltag unterstützen oder gut kennen.",
    description:
      "Beobachten, wie die Alltagsrealität des Patienten von außen wirkt – Mobilität, Selbstversorgung, Kognition, Ernährung, Flüssigkeit, Hilfsmittelumgang und Pflegegrad.",
    m4: {
      // K12 erzeugt bewusst keinen Patientenhinweis (m4_behavior = NONE).
      // TODO(refactor): Nach Einführung von m4_behavior als eigenem Feld auf NONE umstellen.
      type: "NOTICE",
      text: "",
    },
  },
  K13: {
    id: "K13",
    block_id: "pflegebeobachtung",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.M,
    // K13 ist ein optionaler ASSESSMENT-Checkpoint analog K12.
    // Default: nicht aktiviert (enabled: false). Erscheint in M2/M3/M5 nur wenn enabled.
    // Kein M4-Output (m4.text: "").
    // Zweck: ergänzt nur echte geriatrische Lücken; doppelt keine Fragen aus K01–K12.
    mode: CheckpointMode.ASSESSMENT,
    // perspectives = [PATIENT] – erscheint im Patientenfragen-Katalog (M2_QUESTIONS).
    perspectives: [CheckpointPerspective.PATIENT],
    title: "Geriatrische Zusatzfragen",
    introText:
      "Die folgenden Fragen erfassen ergänzende geriatrische Themen als reine Fakt- oder Selbst-/Fremdauskunft. Es findet keine Bewertung statt; Tests werden nur als Status erfasst.",
    description:
      "Optionale geriatrische Zusatzerhebung (Stürze, Sturzangst, Stimmung/Belastung, Wohnsituation, Hören/Sehen, Inkontinenz, Schmerzen, Gewicht/Appetit, Vorsorgevollmacht/Patientenverfügung, Status geriatrischer Assessments). Ergänzt K01–K12 ohne Doppelung.",
    m4: {
      // K13 erzeugt bewusst keinen Patientenhinweis (m4_behavior = NONE), analog K12.
      type: "NOTICE",
      text: "",
    },
  },
  K14: {
    id: "K14",
    block_id: "medizinische_lage",
    type: CheckpointType.PROZESS_VORLAUF,
    category: CheckpointCategory.O,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Reha-Vorbereitung & Vorleistungen",
    description: "Frühere Reha-/Kurmaßnahmen, ambulante Vorleistungen und organisatorischer Vorbereitungsgrad sind bekannt.",
    m4: {
      type: "ACTION",
      text: "Bitte bringen Sie vorhandene Reha-Unterlagen, Schreiben von Krankenkasse/Rentenversicherung sowie Informationen zu früheren Reha- oder Kurmaßnahmen zum nächsten Termin mit.",
    },
  },
  K15: {
    id: "K15",
    block_id: "medizinische_lage",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Beruflicher Kontext & AU-Situation",
    description: "Beruflicher Status, aktuelle AU-Situation und patientenseitig berichtete Belastungen im Arbeitskontext.",
    m4: {
      type: "NOTICE",
      text: "Bitte teilen Sie uns mit, ob Sie aktuell berufstätig oder krankgeschrieben sind und ob Ihre Beschwerden Ihre Arbeit betreffen.",
    },
  },
  K16: {
    id: "K16",
    block_id: "medizinische_lage",
    type: CheckpointType.PROZESS_VORLAUF,
    category: CheckpointCategory.O,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "MD-Vorbereitung & Antragshistorie",
    description: "Erstantrag oder Höherstufung ist bekannt; Pflegetagebuch, relevante Unterlagen und MD-Begutachtungstermin sind organisatorisch geklärt.",
    m4: {
      type: "ACTION",
      text: "Bitte bereiten Sie folgende Unterlagen für den Begutachtungstermin vor: Arztbriefe und Befunde, ggf. frühere Pflegegradentscheidungen oder Gutachten sowie ein Pflegetagebuch, falls eines geführt wurde.",
    },
  },
  K17: {
    id: "K17",
    block_id: "versorgung_im_alltag",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Kurzzeitpflege & Entlastung",
    description: "Kurzzeitpflege, Verhinderungspflege und Entlastungsleistungen (§45b SGB XI) als formale Leistungsformen sind bekannt und ggf. in Planung.",
    m4: {
      type: "NOTICE",
      text: "Falls Ihre pflegende Person vorübergehend ausfällt oder selbst Entlastung benötigt, informieren Sie uns. Die Pflegekasse bietet Leistungen wie Kurzzeit- oder Verhinderungspflege an.",
    },
  },
  K18: {
    id: "K18",
    block_id: "medizinische_lage",
    type: CheckpointType.PROZESS_VORLAUF,
    category: CheckpointCategory.O,
    perspectives: [CheckpointPerspective.MFA, CheckpointPerspective.PATIENT],
    title: "Anfragestelle & Unterlagen",
    description: "Die anfragende Stelle ist bekannt, ein Schreiben oder Formular liegt vor, und eine ggf. genannte Frist ist dokumentiert.",
    m4: {
      type: "ACTION",
      text: "Bitte bringen Sie das Schreiben oder Formular der anfragenden Stelle zum Termin mit.",
    },
  },
};

/**
 * Katalog für MULTI_SELECT-Checkpoints.
 * Jeder Eintrag ist ein Template ohne `selections` und `enabled` (werden bei Hydration gesetzt).
 */
type MultiSelectTemplate = Omit<ActiveCheckpointMultiSelect, "selections" | "enabled">;

export const MULTI_SELECT_CATALOGUE: Record<string, MultiSelectTemplate> = {
  K10: {
    id: "K10",
    block_id: "medizinische_lage",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    perspectives: [],
    mode: CheckpointMode.MULTI_SELECT,
    title: "Besonderer Versorgungsaufwand",
    description:
      "Warum benötigt dieser Fall organisatorisch besondere Aufmerksamkeit?",
    options: [
      "Neupatient / unbekannt",
      "Multimedikation",
      "postoperative / akute Nachsorge",
      "erhöhter Betreuungsbedarf",
      "eingeschränkte Kommunikation",
      "Betäubungsmittel",
      "psychischer oder psychosozialer Betreuungsbedarf",
    ],
  },
  K11: {
    id: "K11",
    block_id: "medizinische_lage",
    type: CheckpointType.BEDARF,
    category: CheckpointCategory.O,
    perspectives: [],
    mode: CheckpointMode.MULTI_SELECT,
    title: "Formularanliegen",
    description:
      "Aus welchem administrativen Anlass erfolgt die strukturierte Prüfung? (nur ärztliche Dokumentation, keine Patientenfragen)",
    options: [
      "Pflegegrad / Höherstufung",
      "Reha-Antrag",
      "Jobcenter / Sozialleistungen",
      "Attest / Bescheinigung",
      "Versicherung / Gutachten",
      "Sonstiger Antrag / Formular",
    ],
  },
};

/**
 * IDs of MULTI_SELECT checkpoints that are always present in M3,
 * regardless of M1 block activation. These represent documentation
 * checkpoints rather than gap-closing checkpoints.
 */
const ALWAYS_PRESENT_MULTI_SELECT_IDS: readonly string[] = ["K10", "K11"];

/**
 * IDs of ASSESSMENT checkpoints that are always present in active_checkpoints,
 * regardless of M1 block activation. Default: enabled = false (opt-in via M1 checkbox).
 */
export const ALWAYS_PRESENT_ASSESSMENT_IDS: readonly string[] = ["K12", "K13"];

/**
 * Ensures always-present MULTI_SELECT checkpoints are in the list.
 * If missing, appends them with default values (enabled=false, empty selections).
 *
 * Also ensures always-present ASSESSMENT checkpoints are in the list.
 * If missing, appends them with status=TO_DO and enabled=false.
 */
export function ensureAlwaysPresentCheckpoints(
  checkpoints: ActiveCheckpoint[],
): ActiveCheckpoint[] {
  const ids = new Set(checkpoints.map((cp) => cp.id));
  const missing: ActiveCheckpoint[] = [];
  for (const id of ALWAYS_PRESENT_MULTI_SELECT_IDS) {
    if (!ids.has(id)) {
      const template = MULTI_SELECT_CATALOGUE[id];
      if (template) {
        missing.push({ ...template, selections: [], enabled: false } as ActiveCheckpoint);
      }
    }
  }
  for (const id of ALWAYS_PRESENT_ASSESSMENT_IDS) {
    if (!ids.has(id)) {
      const template = CHECKPOINT_CATALOGUE[id];
      if (template) {
        missing.push({ ...template, status: "TO_DO", enabled: false } as ActiveCheckpoint);
      }
    }
  }
  return missing.length > 0 ? [...checkpoints, ...missing] : checkpoints;
}

/**
 * IDs der Checkpoints, die automatisch ergänzt werden, wenn K11 den Wert
 * REHA_TRIGGER_SELECTION in seinen `selections` enthält.
 *
 * K03/K04/K05 — Dokumentations-Checkpoints (Diagnosenlage, Medikation,
 * Medizinische Mitbehandlung).
 * K06/K07 — Versorgungskontext (dauerhafter und vorübergehender
 * Unterstützungsbedarf im Alltag).
 * K01, K02, K09 werden nicht automatisch ergänzt: Sie sind zu allgemein
 * und ihre Aktivierung wäre semantisch nicht eindeutig dem jeweiligen
 * Kontext zuzuordnen.
 */
const SELECTION_TRIGGER_CHECKPOINT_ID = "K11";
const REHA_TRIGGER_SELECTION = "Reha-Antrag";
const REHA_CONDITIONAL_IDS: readonly string[] = ["K03", "K04", "K05", "K06", "K07", "K14", "K15"];

const PFLEGE_TRIGGER_SELECTION = "Pflegegrad / Höherstufung";
const PFLEGE_CONDITIONAL_IDS: readonly string[] = ["K03", "K04", "K05", "K06", "K07", "K16", "K17"];

const JOBCENTER_TRIGGER_SELECTION = "Jobcenter / Sozialleistungen";
const JOBCENTER_CONDITIONAL_IDS: readonly string[] = ["K03", "K04", "K05", "K06", "K15", "K18"];

const ATTEST_TRIGGER_SELECTION = "Attest / Bescheinigung";
const ATTEST_CONDITIONAL_IDS: readonly string[] = ["K03", "K18"];

const VERSICHERUNG_TRIGGER_SELECTION = "Versicherung / Gutachten";
const VERSICHERUNG_CONDITIONAL_IDS: readonly string[] = ["K03", "K04", "K05", "K18"];

const SONSTIGER_TRIGGER_SELECTION = "Sonstiger Antrag / Formular";
const SONSTIGER_CONDITIONAL_IDS: readonly string[] = ["K03", "K18"];

/**
 * Ergänzt Checkpoints, die aufgrund einer K11-Selektion relevant werden,
 * auch wenn sie über M1 nicht aktiviert wurden.
 *
 * Auslöser "Reha-Antrag":               ergänzt K03–K07, K14, K15.
 * Auslöser "Pflegegrad / Höherstufung":  ergänzt K03–K07, K16, K17.
 * Auslöser "Jobcenter / Sozialleistungen": ergänzt K03–K06, K15, K18.
 * Auslöser "Attest / Bescheinigung":     ergänzt K03, K18.
 * Auslöser "Versicherung / Gutachten":   ergänzt K03–K05, K18.
 * Auslöser "Sonstiger Antrag / Formular": ergänzt K03, K18.
 *
 * Mehrere Trigger können gleichzeitig aktiv sein; gemeinsame IDs
 * werden dabei nur einmal ergänzt.
 *
 * Bestehende Checkpoints — inklusive ihres Status — werden niemals
 * verändert. Neu ergänzte Checkpoints starten mit status: "TO_DO".
 *
 * Ist K11 nicht vorhanden, nicht vom Typ MULTI_SELECT oder enthält keinen
 * der bekannten Trigger, gibt die Funktion die Eingabeliste unverändert
 * zurück.
 */
export function ensureSelectionConditionalCheckpoints(
  checkpoints: ActiveCheckpoint[],
): ActiveCheckpoint[] {
  const k11 = checkpoints.find((cp) => cp.id === SELECTION_TRIGGER_CHECKPOINT_ID);
  if (!k11 || !isMultiSelectCheckpoint(k11)) {
    return checkpoints;
  }

  const hasReha = k11.selections.includes(REHA_TRIGGER_SELECTION);
  const hasPflege = k11.selections.includes(PFLEGE_TRIGGER_SELECTION);
  const hasJobcenter = k11.selections.includes(JOBCENTER_TRIGGER_SELECTION);
  const hasAttest = k11.selections.includes(ATTEST_TRIGGER_SELECTION);
  const hasVersicherung = k11.selections.includes(VERSICHERUNG_TRIGGER_SELECTION);
  const hasSonstiger = k11.selections.includes(SONSTIGER_TRIGGER_SELECTION);

  if (!hasReha && !hasPflege && !hasJobcenter && !hasAttest && !hasVersicherung && !hasSonstiger) {
    return checkpoints;
  }

  const ids = new Set(checkpoints.map((cp) => cp.id));
  const missing: ActiveCheckpoint[] = [];

  const conditionalIds = [
    ...(hasReha ? REHA_CONDITIONAL_IDS : []),
    ...(hasPflege ? PFLEGE_CONDITIONAL_IDS : []),
    ...(hasJobcenter ? JOBCENTER_CONDITIONAL_IDS : []),
    ...(hasAttest ? ATTEST_CONDITIONAL_IDS : []),
    ...(hasVersicherung ? VERSICHERUNG_CONDITIONAL_IDS : []),
    ...(hasSonstiger ? SONSTIGER_CONDITIONAL_IDS : []),
  ];

  for (const id of conditionalIds) {
    if (!ids.has(id)) {
      const template = CHECKPOINT_CATALOGUE[id];
      if (template) {
        missing.push({ ...template, status: "TO_DO" } as ActiveCheckpoint);
        ids.add(id);
      }
    }
  }
  return missing.length > 0 ? [...checkpoints, ...missing] : checkpoints;
}

/**
 * Entfernt Checkpoints, deren ID weder im `CHECKPOINT_CATALOGUE` noch im
 * `MULTI_SELECT_CATALOGUE` vorkommt.
 *
 * Wird defensiv beim Laden von `active_checkpoints` aus der Datenbank
 * eingesetzt, um sicherzustellen, dass veraltete IDs (z. B. ehemalige
 * Einschätzungsblock-Checkpoints vor dem Katalog-Umbau) niemals gerendert
 * werden – unabhängig davon, was in einem gespeicherten Fall steht.
 */
export function filterObsoleteCheckpoints(
  checkpoints: ActiveCheckpoint[],
): ActiveCheckpoint[] {
  return checkpoints.filter(
    (cp) =>
      cp.id in CHECKPOINT_CATALOGUE || cp.id in MULTI_SELECT_CATALOGUE,
  );
}

/**
 * Selektionen in K11, die K18 ("Anfragestelle & Unterlagen") rechtfertigen.
 */
const K18_JUSTIFYING_SELECTIONS: readonly string[] = [
  JOBCENTER_TRIGGER_SELECTION,
  ATTEST_TRIGGER_SELECTION,
  VERSICHERUNG_TRIGGER_SELECTION,
  SONSTIGER_TRIGGER_SELECTION,
];

/**
 * Entfernt Checkpoints, die ausschließlich über einen K11-Selektion-Trigger
 * entstehen dürfen, aber ohne passende K11-Selektion in `active_checkpoints`
 * vorhanden sind.
 *
 * Betrifft derzeit: K18 ("Anfragestelle & Unterlagen").
 * K18 ist nur legitim, wenn K11 mindestens eine der folgenden Selektionen enthält:
 *   - "Jobcenter / Sozialleistungen"
 *   - "Attest / Bescheinigung"
 *   - "Versicherung / Gutachten"
 *   - "Sonstiger Antrag / Formular"
 *
 * Schützt vor Alt-DB-Daten: K18-Einträge aus früheren Systemversionen
 * (z. B. block_id "pflegebeobachtung") werden entfernt, sofern kein passender
 * K11-Trigger vorliegt.
 *
 * Ist ein passender Trigger vorhanden, bleibt K18 unverändert erhalten
 * (Status wird nicht zurückgesetzt).
 *
 * Muss direkt vor `ensureSelectionConditionalCheckpoints` aufgerufen werden.
 */
export function filterUnjustifiedConditionalCheckpoints(
  checkpoints: ActiveCheckpoint[],
): ActiveCheckpoint[] {
  if (!checkpoints.some((cp) => cp.id === "K18")) {
    return checkpoints;
  }

  const k11 = checkpoints.find((cp) => cp.id === SELECTION_TRIGGER_CHECKPOINT_ID);
  const k18Justified =
    k11 !== undefined &&
    isMultiSelectCheckpoint(k11) &&
    K18_JUSTIFYING_SELECTIONS.some((sel) => k11.selections.includes(sel));

  if (k18Justified) return checkpoints;
  return checkpoints.filter((cp) => cp.id !== "K18");
}

/**
 * Ergänzt `perspectives` für Altfälle, deren `active_checkpoints` noch vor der
 * perspectives-Migration in der Datenbank gespeichert wurden.
 *
 * Regeln:
 * - Ist `perspectives` bereits ein gültiges Array, bleibt der Checkpoint unverändert.
 * - Fehlt `perspectives` oder ist es kein Array:
 *   – Lookup nach `cp.id` in `CHECKPOINT_CATALOGUE` oder `MULTI_SELECT_CATALOGUE`
 *   – Bei Treffer: `perspectives` aus dem Katalogeintrag übernehmen
 *   – Bei keinem Treffer (z. B. Legacy-Fallback-Checkpoints ohne Katalogeintrag):
 *     `perspectives = []` setzen (kein Vorbereitungsanteil)
 *
 * Kein anderes Feld wird verändert.
 */
export function backfillPerspectives(
  checkpoints: ActiveCheckpoint[],
): ActiveCheckpoint[] {
  return checkpoints.map((cp) => {
    if (Array.isArray(cp.perspectives)) {
      return cp;
    }
    const catalogEntry =
      CHECKPOINT_CATALOGUE[cp.id] ?? MULTI_SELECT_CATALOGUE[cp.id];
    const perspectives = catalogEntry ? catalogEntry.perspectives : [];
    return { ...cp, perspectives };
  });
}

/**
 * Hydratisiert vollständige `ActiveCheckpoint`-Objekte aus einem M1-Snapshot.
 *
 * Einzige erlaubte Quelle für `active_checkpoints` eines Falls.
 * Der initiale Status aller aktivierten Standard-Checkpoints ist `TO_DO`.
 * MULTI_SELECT-Checkpoints werden mit `enabled: false` und leeren `selections` hydratisiert.
 *
 * Checkpoints, deren ID nicht im Katalog vorhanden ist, werden übersprungen
 * (defensiv gegen zukünftige Katalogerweiterungen).
 *
 * Always-present MULTI_SELECT checkpoints (e.g. K10) are appended regardless
 * of M1 block activation.
 */
export function hydrateActiveCheckpointsFromSnapshot(
  snapshot: M1SnapshotInitial,
): ActiveCheckpoint[] {
  const checkpoints = snapshot.activated_checkpoint_ids.flatMap((id) => {
    const template = CHECKPOINT_CATALOGUE[id];
    if (template) {
      return [{ ...template, status: "TO_DO" } as ActiveCheckpoint];
    }
    const msTemplate = MULTI_SELECT_CATALOGUE[id];
    if (msTemplate) {
      return [{ ...msTemplate, selections: [], enabled: false } as ActiveCheckpoint];
    }
    return [];
  });
  return ensureAlwaysPresentCheckpoints(checkpoints);
}
