/**
 * Typen und Guards für offizielle fachliche Inhalte praxisinterner Arbeitsprozesse.
 *
 * Kein Import aus bestehenden klinischen Workflow-Modulen.
 * Keine Snapshot-Erweiterung, keine Laufzeit-Einbindung.
 */

// ---------------------------------------------------------------------------
// Verbindlichkeitsstufen
// ---------------------------------------------------------------------------

/**
 * Verbindlichkeitsstufe einer offiziellen Quelle oder Regel.
 *
 * - MANDATORY:    gesetzliche, vertragliche oder anderweitig verbindliche Vorgabe
 * - RECOMMENDED:  fachliche Empfehlung
 * - ORIENTATION:  allgemeine organisatorische oder fachliche Orientierung
 */
export type OfficialBindingLevel =
  | "MANDATORY"
  | "RECOMMENDED"
  | "ORIENTATION";

/** Prüft ob ein Wert eine gültige OfficialBindingLevel ist. */
export function isOfficialBindingLevel(
  value: unknown,
): value is OfficialBindingLevel {
  return (
    value === "MANDATORY" ||
    value === "RECOMMENDED" ||
    value === "ORIENTATION"
  );
}

// ---------------------------------------------------------------------------
// Offizielle Quelle
// ---------------------------------------------------------------------------

/**
 * Eine konkrete Quellenangabe zu einer offiziellen Regelung.
 *
 * id, author, title und reviewedAt sind Pflichtfelder.
 * reviewedAt und publicationDate werden als ISO-8601-Datumsstrings gespeichert.
 * reference kann z. B. eine Paragraphenangabe oder Abschnittsnummer enthalten.
 */
export interface OfficialSource {
  id: string;
  author: string;
  title: string;
  /** ISO-8601-Datum der letzten inhaltlichen Prüfung durch den Redakteur. */
  reviewedAt: string;
  /** ISO-8601-Datum der Veröffentlichung oder des Inkrafttretens (optional). */
  publicationDate?: string;
  /** Link zur Primärquelle (optional). */
  url?: string;
  /** Paragraphen-, Abschnitts- oder sonstige Stellenangabe (optional). */
  reference?: string;
}

/**
 * Prüft ob ein Wert eine gültige OfficialSource ist.
 *
 * Pflichtfelder: id, author, title, reviewedAt (alle nichtleere Strings).
 * Optionale Felder werden bei Vorhandensein als Strings geprüft.
 * Wirft keine Ausnahmen.
 */
export function isOfficialSource(value: unknown): value is OfficialSource {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const v = value as Record<string, unknown>;

  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (typeof v.author !== "string" || v.author.length === 0) return false;
  if (typeof v.title !== "string" || v.title.length === 0) return false;
  if (typeof v.reviewedAt !== "string" || v.reviewedAt.length === 0)
    return false;

  if (v.publicationDate !== undefined && typeof v.publicationDate !== "string")
    return false;
  if (v.url !== undefined && typeof v.url !== "string") return false;
  if (v.reference !== undefined && typeof v.reference !== "string") return false;

  return true;
}

// ---------------------------------------------------------------------------
// Offizielle Regelaussage
// ---------------------------------------------------------------------------

/**
 * Eine einzelne verbindliche oder empfohlene Aussage aus einer offiziellen Quelle.
 *
 * Jede Regel enthält ihre vollständige Quelle direkt – kein zentraler Quellenkatalog
 * und keine bloße sourceId-Referenz in diesem Schritt.
 */
export interface OfficialRule {
  id: string;
  /** Optionaler Kurztitel der Regel (z. B. für Überschriften). */
  title?: string;
  /** Vollständiger Regeltext (Zitat oder sinngemäße Paraphrase). */
  text: string;
  bindingLevel: OfficialBindingLevel;
  source: OfficialSource;
  /** Optionaler redaktioneller Hinweis (Einschränkungen, Kontextbedingungen). */
  note?: string;
}

/**
 * Prüft ob ein Wert eine gültige OfficialRule ist.
 *
 * Pflichtfelder: id (nichtleerer String), text (nichtleerer String),
 * bindingLevel (gültiger Wert), source (gültige OfficialSource).
 * Optionale Felder werden bei Vorhandensein als Strings geprüft.
 * Wirft keine Ausnahmen.
 */
export function isOfficialRule(value: unknown): value is OfficialRule {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const v = value as Record<string, unknown>;

  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (typeof v.text !== "string" || v.text.length === 0) return false;
  if (!isOfficialBindingLevel(v.bindingLevel)) return false;
  if (!isOfficialSource(v.source)) return false;

  if (v.title !== undefined && typeof v.title !== "string") return false;
  if (v.note !== undefined && typeof v.note !== "string") return false;

  return true;
}
