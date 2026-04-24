import {
  CheckpointCategory,
  CheckpointMode,
  CheckpointPerspective,
  CheckpointType,
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
    // K12 ist ein ASSESSMENT-Checkpoint: Die Einschätzung erfolgt durch MFA-Beobachtung,
    // der Fragenkatalog ist jedoch in Patientenperspektive formuliert (Fragesprache noch
    // nicht bereinigt – TODO: K12-Fragesprache in separatem Schritt klären).
    // perspectives = [PATIENT] bedeutet: erscheint im Patientenfragen-Katalog (M2_QUESTIONS).
    perspectives: [CheckpointPerspective.PATIENT],
    title: "Alltagssituation – Rückmeldung durch Angehörige / Kontaktperson",
    introText:
      "Bitte beantworten Sie die folgenden Fragen, wenn Sie den Patienten im Alltag unterstützen oder gut kennen.",
    description:
      "Beobachten, wie die Alltagsrealität des Patienten von außen wirkt – Mobilität, Selbstversorgung, Kognition, Ernährung, Flüssigkeit, Hilfsmittelumgang und Pflegegrad.",
    m4: {
      // K12 ist ein ASSESSMENT-Checkpoint (m4_behavior = NONE):
      // Er erzeugt bewusst keinen Patientenhinweis. Solange m4_behavior noch kein
      // eigenes Feld ist, wird NONE über einen leeren text-String signalisiert.
      // TODO(refactor): Nach Einführung von m4_behavior als eigenem Feld auf NONE umstellen.
      type: "NOTICE",
      text: "",
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
 * Ensures always-present MULTI_SELECT checkpoints are in the list.
 * If missing, appends them with default values (enabled=false, empty selections).
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
  return missing.length > 0 ? [...checkpoints, ...missing] : checkpoints;
}

/**
 * Entfernt Checkpoints, deren ID weder im `CHECKPOINT_CATALOGUE` noch im
 * `MULTI_SELECT_CATALOGUE` vorkommt.
 *
 * Wird defensiv beim Laden von `active_checkpoints` aus der Datenbank
 * eingesetzt, um sicherzustellen, dass veraltete IDs (z. B. K13–K18 nach
 * dem Einschätzungsblock-Umbau) niemals gerendert werden – unabhängig
 * davon, was in einem gespeicherten Fall steht.
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
