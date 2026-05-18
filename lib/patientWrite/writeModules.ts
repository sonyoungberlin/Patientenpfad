import {
  PatientWriteOutputKind,
  type PatientWriteTemplate,
} from "@/lib/patientWrite/types";

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------

/**
 * Alle registrierten Patient-WRITE-Templates.
 *
 * Invarianten:
 * - IDs sind eindeutig und unveränderlich (dürfen in Tests referenziert werden).
 * - `bodyTemplate`-Texte sind rein operativ: keine Diagnosen, keine Therapie-
 *   empfehlungen, keine medizinischen Bewertungen.
 * - `anyOf`-Bedingungen prüfen auf state "NO" (= Checkpoint TO_DO), um das
 *   Template nur dann verfügbar zu machen, wenn ein Klärpunkt offen ist.
 */
export const PATIENT_WRITE_TEMPLATES: readonly PatientWriteTemplate[] = [
  // ── PT-WRITE-001: Unterlagen anfordern ───────────────────────────────────
  {
    id: "PT-WRITE-001",
    label: "Unterlagen anfordern",
    outputKind: PatientWriteOutputKind.UNTERLAGEN_ANFORDERUNG,
    trigger: {
      // Verfügbar wenn mindestens einer der medizinischen Dokumentations-
      // Checkpoints noch nicht geklärt ist.
      anyOf: [
        { checkpointId: "K03", state: "NO" },
        { checkpointId: "K04", state: "NO" },
        { checkpointId: "K05", state: "NO" },
      ],
    },
    inputSchema: [
      {
        key: "unterlagen_liste",
        label: "Welche Unterlagen werden benötigt?",
        kind: "multiline",
        required: true,
        placeholder: "z. B. Krankenhausbriefe, Medikamentenliste, Befundberichte …",
      },
      {
        key: "frist",
        label: "Gewünschtes Einreichdatum",
        kind: "date",
        required: false,
        placeholder: "TT.MM.JJJJ",
      },
    ],
    bodyTemplate: `Arbeitsentwurf zur organisatorischen Vorbereitung. Fachliche/medizinische Prüfung erforderlich.

---
Benötigte Unterlagen

{{unterlagen_liste}}
{{#if frist}}
Einreichfrist: {{frist}}
{{/if}}`,
  },

  // ── PT-WRITE-002: Vorbereitung Arztgespräch ──────────────────────────────
  {
    id: "PT-WRITE-002",
    label: "Vorbereitung Arztgespräch",
    outputKind: PatientWriteOutputKind.GESPRAECHSVORBEREITUNG,
    trigger: {
      // Verfügbar wenn Kommunikations- oder Mitwirkungsklärpunkte offen sind.
      anyOf: [
        { checkpointId: "K01", state: "NO" },
        { checkpointId: "K02", state: "NO" },
        { checkpointId: "K09", state: "NO" },
      ],
    },
    inputSchema: [
      {
        key: "gespraechsziel",
        label: "Gesprächsziel / Hauptthema",
        kind: "text",
        required: true,
        placeholder: "z. B. Terminabsprache, offene Fragen klären …",
      },
      {
        key: "datum",
        label: "Geplantes Gesprächsdatum",
        kind: "date",
        required: false,
        placeholder: "TT.MM.JJJJ",
      },
      {
        key: "offene_punkte",
        label: "Zu besprechende Punkte",
        kind: "multiline",
        required: false,
        placeholder: "Stichpunkte für das Gespräch …",
      },
    ],
    bodyTemplate: `Arbeitsentwurf zur organisatorischen Vorbereitung. Fachliche/medizinische Prüfung erforderlich.

---
Gesprächsvorbereitung

Thema: {{gespraechsziel}}
{{#if datum}}
Datum: {{datum}}
{{/if}}
{{#if offene_punkte}}
Zu besprechende Punkte:
{{offene_punkte}}
{{/if}}`,
  },

  // ── PT-WRITE-003: Offene organisatorische Punkte ─────────────────────────
  {
    id: "PT-WRITE-003",
    label: "Offene organisatorische Punkte",
    outputKind: PatientWriteOutputKind.INTERNE_NOTIZ,
    trigger: {
      // Verfügbar wenn mindestens ein organisatorischer Klärpunkt offen ist.
      anyOf: [
        { checkpointId: "K01", state: "NO" },
        { checkpointId: "K02", state: "NO" },
        { checkpointId: "K06", state: "NO" },
        { checkpointId: "K07", state: "NO" },
        { checkpointId: "K08", state: "NO" },
      ],
    },
    inputSchema: [
      {
        key: "offene_punkte",
        label: "Offene Punkte",
        kind: "multiline",
        required: true,
        placeholder: "Stichpunktartige Auflistung der offenen organisatorischen Klärpunkte …",
      },
      {
        key: "kontext",
        label: "Kontext / Hintergrund",
        kind: "text",
        required: false,
        placeholder: "Optionaler Hinweis zum Fall …",
      },
    ],
    bodyTemplate: `Arbeitsentwurf zur organisatorischen Vorbereitung. Fachliche/medizinische Prüfung erforderlich.

---
Interne Notiz – Offene organisatorische Punkte

{{offene_punkte}}
{{#if kontext}}
Kontext: {{kontext}}
{{/if}}`,
  },
];
