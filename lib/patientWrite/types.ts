// ---------------------------------------------------------------------------
// PatientWriteOutputKind – dokumentenspezifische Ausgabeart
// ---------------------------------------------------------------------------

/**
 * Kategorisiert ein Patient-WRITE-Modul nach dem erzeugten Dokumenttyp.
 *
 * Für das MVP sind drei Ausgabearten definiert. Weitere Arten können hier
 * ohne Änderungen an der Trigger- oder Renderer-Logik ergänzt werden.
 */
export enum PatientWriteOutputKind {
  UNTERLAGEN_ANFORDERUNG    = "UNTERLAGEN_ANFORDERUNG",
  GESPRAECHSVORBEREITUNG    = "GESPRAECHSVORBEREITUNG",
  INTERNE_NOTIZ             = "INTERNE_NOTIZ",
}

// ---------------------------------------------------------------------------
// Input-Felder
// ---------------------------------------------------------------------------

/**
 * Erlaubte Feldtypen für Formularfelder eines WRITE-Templates.
 *
 * "select" ist bewusst weggelassen – im MVP nicht benötigt.
 */
export type PatientWriteInputFieldKind = "text" | "multiline" | "date";

/**
 * Ein einzelnes Eingabefeld im Formular eines Patient-WRITE-Templates.
 */
export type PatientWriteInputField = {
  key: string;
  label: string;
  kind: PatientWriteInputFieldKind;
  required: boolean;
  placeholder?: string;
};

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

/**
 * Eine einzelne Checkpoint-Bedingung innerhalb eines Triggers.
 *
 * `checkpointId` entspricht den Checkpoint-IDs aus dem Patientenfälle-Katalog
 * (K01–K15). `state` ist das erwartete Zustandsmapping nach der Konvertierung
 * durch `buildPatientStateMap` (OK→YES, TO_DO→NO, ZURÜCKSTELLEN→OPEN).
 */
export type PatientWriteConditionItem = {
  checkpointId: string;
  state: "YES" | "NO" | "OPEN";
};

/**
 * Trigger-Definition für ein Patient-WRITE-Template.
 *
 * Kein `topicIds`-Feld: Patientenfälle haben kein Topic-System.
 *
 * Auswertungsreihenfolge:
 *   0. selectionsInclude – MULTI_SELECT-Selektion matcht nicht → nicht verfügbar.
 *   1. blockedWhenAnyOpen – mindestens ein Checkpoint OPEN → gesperrt.
 *   2. allOf  – alle Bedingungen müssen erfüllt sein.
 *   3. anyOf  – mindestens eine Bedingung muss erfüllt sein.
 *   4. noneOf – keine Bedingung darf erfüllt sein.
 */
export type PatientWriteTrigger = {
  /**
   * Kontextfilter: Template ist nur relevant wenn für jedes Element
   * der angegebene MULTI_SELECT-Checkpoint mindestens einen der Werte
   * in `values` in seinen `selections` enthält.
   *
   * Fehlt das Feld → kein Filter (rückwärtskompatibel).
   * Typischer Einsatz: K11 "Formularanliegen" als Anliegen-Kontext.
   */
  selectionsInclude?: Array<{ checkpointId: string; values: string[] }>;
  blockedWhenAnyOpen?: string[];
  allOf?: PatientWriteConditionItem[];
  anyOf?: PatientWriteConditionItem[];
  noneOf?: PatientWriteConditionItem[];
};

// ---------------------------------------------------------------------------
// Template und Modul
// ---------------------------------------------------------------------------

/**
 * Definiert ein Patient-WRITE-Template aus dem Katalog.
 *
 * Im Unterschied zu `OfficeWriteTemplate` fehlen:
 *   - `topicIds` (kein Topic-System in Patientenfällen)
 *   - `audience`, `estimatedLength`, `smoothingEnabled`, `writeKind`
 *     (für das MVP nicht benötigt)
 */
export type PatientWriteTemplate = {
  id: string;
  label: string;
  outputKind: PatientWriteOutputKind;
  trigger: PatientWriteTrigger;
  inputSchema: PatientWriteInputField[];
  bodyTemplate: string;
};

/**
 * Ergebnis der Trigger-Auswertung für ein einzelnes Patient-WRITE-Template.
 *
 * `isAvailable` gibt an, ob das Modul im aktuellen Checkpoint-Zustand
 * angeboten werden darf.
 * `unavailableReason` ist gesetzt, wenn `isAvailable === false`.
 */
export type PatientWriteModule = {
  templateId: string;
  label: string;
  outputKind: PatientWriteOutputKind;
  isAvailable: boolean;
  unavailableReason?: string;
};
