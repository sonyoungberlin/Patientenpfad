"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DecisionStatus,
  ExplanationStatus,
  ExplanationOutputStatus,
  InquiryCheckpointKind,
  type Audience,
  type CheckpointStatusValue,
  type InquirySection,
  type InquiryResponseV2Output,
} from "@/lib/inquiries/types";
import { renderInquiryResponseFromSections } from "@/lib/inquiries/renderInquiryResponse";
import { buildInquiryM5Summary } from "@/lib/inquiries/buildInquiryM5Summary";
import { applyIntroToggle } from "@/lib/inquiries/introToggle";
import { BLOCK_CATALOG, BLOCK_IDS_SORTED } from "@/lib/questionnaire/blockCatalog";

export type M3SpecificCheckpoint = {
  id: string;
  label: string;
  kind: InquiryCheckpointKind;
  questions?: Array<{ id: string; text: string }>;
  textByStatus?: Partial<Record<string, string>>;
};

export type M3BoundActionData = {
  id: string;
  label: string;
  actionCategory?: string;
  questions?: Array<{ id: string; text: string }>;
  /**
   * M3 Anzeige-Filter: Action wird angezeigt, wenn mindestens eine Bedingungsmenge erfüllt ist.
   * Jede Menge ist AND-verknüpft; die Liste ist OR-verknüpft.
   * Fehlt das Feld, greift der Standard (ACTIVE/INACTIVE-Filter aus M2).
   */
  showWhenAny?: Array<Record<string, string>>;
  /**
   * M3 Anzeige-Filter: Action wird ausgeblendet, wenn mindestens eine Bedingungsmenge erfüllt ist.
   * Hat Vorrang vor showWhenAny.
   */
  hideWhenAny?: Array<Record<string, string>>;
};

export type M3SectionData = {
  inquiryId: string;
  label: string;
  decisionCheckpointId: string;
  decisionLabel: string;
  decisionQuestions: Array<{ id: string; text: string }>;
  specificCheckpoints: M3SpecificCheckpoint[];
  /** Profil-spezifische ACTION-Checkpoints (boundActionCheckpointIds) – in Aktionen/Infos. */
  boundActionCheckpoints: M3BoundActionData[];
  /** GLOBAL MODULAR EXPLANATION-Checkpoints – in M3 als SHOW/HIDE-fähige Output-Bausteine. */
  boundGlobalOutputCheckpoints?: M3SpecificCheckpoint[];
};

export type M3ActionData = {
  id: string;
  label: string;
  actionCategory?: string;
};

type Props = {
  sessionId: string;
  sections: M3SectionData[];
  actionCheckpoints: M3ActionData[];
  /** Intro-Bausteine (Nachrichteneinstieg) – profilübergreifend, immer sichtbar. */
  introCheckpoints: M3ActionData[];
  initialCheckpointStatuses: Record<string, string>;
  initialActionStatuses: Record<string, string>;
  /** Gespeicherte outputStatus-Entscheidungen aus M3 (SHOW / HIDE pro EXPLANATION-Checkpoint). */
  initialExplanationOutputStatuses: Record<string, string>;
  /** M3 – Antwortziel-Auswahl pro Profil (menschliche Auswahl). Record<inquiryId, responseGoalId> */
  initialResponseGoalSelection: Record<string, string>;
  actionIds: string[];
  /**
   * Herkunfts-Map: actionId → Liste der selectedProfileIds, die diese Action beitragen.
   * Wird genutzt, um Actions mit genau einer Profil-Herkunft unter dem Profil-Abschnitt
   * statt im globalen ACTION_GROUPS-Block zu rendern.
   */
  actionOrigins: Record<string, string[]>;
  initialGeneratedOutput: InquiryResponseV2Output | null;
  isConfirmed: boolean;
};

const DECISION_OPTIONS = [
  { value: "POSSIBLE", label: "Möglich" },
  { value: "NOT_POSSIBLE", label: "Nicht möglich" },
  { value: "DISABLED", label: "Keine Entscheidung" },
];

const EXPLANATION_OPTIONS = [
  { value: "YES", label: "Ja" },
  { value: "NO", label: "Nein" },
];

/** Ausgabe-Entscheidung in M3 für EXPLANATION-Checkpoints (outputStatus). */
const OUTPUT_OPTIONS = [
  { value: ExplanationOutputStatus.SHOW, label: "Anzeigen" },
  { value: ExplanationOutputStatus.HIDE, label: "Nicht anzeigen" },
];

const ACTION_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
];

const ACTION_GROUPS: Array<{ label: string; ids: string[] }> = [
  {
    label: "Kontakt & Anfrage",
    ids: ["DIGITAL_REQUEST"],
  },
  {
    label: "Termin & Behandlung",
    ids: ["BOOK_APPOINTMENT"],
  },
  {
    label: "Rezept & Einlösung",
    ids: ["E_RECIPE_USE", "PHARMACY_INFORMATION"],
  },
  {
    label: "Organisation & Hinweise",
    ids: ["DOCUMENT_UPLOAD", "PROCESSING_DELAY", "TECHNICAL_ISSUE"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION – M3 Trigger-basierte Aktionsgruppen
// [PROTOTYP – nur für PRESCRIPTION, reversibel]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * InquiryId des PRESCRIPTION-Profils – verwendet, um PRESCRIPTION-spezifische Logik
 * nur für diese Section einzublenden.
 */
const PRESCRIPTION_INQUIRY_ID = "PRESCRIPTION";

/**
 * Trigger-Gruppen: Welche M2-Checkpoint-Statuses schalten welche Actions in M3 frei.
 * Eine Gruppe ist aktiv, wenn mindestens ein Trigger-Checkpoint den geforderten Wert hat.
 * Actions werden dedupliziert; Reihenfolge folgt PRESCRIPTION_ALL_ACTION_IDS.
 */
const PRESCRIPTION_M3_TRIGGER_GROUPS: Array<{
  triggers: Array<{ id: string; values: string[] }>;
  actionIds: string[];
}> = [
  {
    // Gruppe "Rezept wird ausgestellt"
    triggers: [{ id: "PRESCRIPTION_STATUTORY_POSSIBLE", values: ["YES", "NO"] }],
    actionIds: ["E_RECIPE_USE", "PHARMACY_INFORMATION"],
  },
  {
    // Gruppe "Es fehlt noch etwas"
    triggers: [
      { id: "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED", values: ["YES"] },
      { id: "HOSPITAL_DISCHARGE_REPORT_MISSING", values: ["YES"] },
    ],
    actionIds: ["DOCUMENT_UPLOAD", "DIGITAL_REQUEST"],
  },
  {
    // Gruppe "Termin / ärztliche Prüfung erforderlich"
    triggers: [{ id: "PRESCRIPTION_CHRONIC_PATIENT", values: ["YES"] }],
    actionIds: ["BOOK_APPOINTMENT", "DIGITAL_REQUEST", "PROCESSING_DELAY"],
  },
  {
    // Gruppe "Zuständigkeit / Sonderfall"
    triggers: [
      { id: "PRESCRIPTION_BTM_ADHS_RULES", values: ["YES"] },
      { id: "PRESCRIPTION_GYN_EXCLUSIVITY", values: ["YES"] },
    ],
    actionIds: ["BOOK_APPOINTMENT", "DOCUMENT_UPLOAD"],
  },
  {
    // Gruppe "Erklärung / Rückfrage beantworten"
    triggers: [
      { id: "PRESCRIPTION_STATUTORY_POSSIBLE", values: ["YES", "NO"] },
      { id: "PRESCRIPTION_NO_POSTAL_DELIVERY", values: ["YES"] },
      { id: "PRESCRIPTION_PATIENT_NOT_IN_GERMANY", values: ["YES"] },
    ],
    actionIds: ["E_RECIPE_USE", "PHARMACY_INFORMATION"],
  },
  {
    // Gruppe "Problem nach Ausstellung"
    triggers: [
      { id: "PRESCRIPTION_PATIENT_NOT_IN_GERMANY", values: ["YES"] },
      { id: "PRESCRIPTION_NO_POSTAL_DELIVERY", values: ["YES"] },
    ],
    actionIds: ["TECHNICAL_ISSUE", "PHARMACY_INFORMATION", "DIGITAL_REQUEST"],
  },
];

/**
 * Definierte Prioritäts- und Reihenfolge aller PRESCRIPTION-relevanten Actions.
 * Wird für Deduplizierung und Fallback-Anzeige verwendet.
 */
const PRESCRIPTION_ALL_ACTION_IDS = [
  "E_RECIPE_USE",
  "PHARMACY_INFORMATION",
  "DOCUMENT_UPLOAD",
  "DIGITAL_REQUEST",
  "BOOK_APPOINTMENT",
  "PROCESSING_DELAY",
  "TECHNICAL_ISSUE",
] as const;

/**
 * Gegenseitige Ausschlusstabelle für PRESCRIPTION-Actions in M3.
 * Wird eine auf ACTIVE gesetzt, wird die andere automatisch INACTIVE.
 */
const PRESCRIPTION_EXCLUSIVE_ACTIONS: Record<string, string> = {
  E_RECIPE_USE: "DIGITAL_REQUEST_REQUIRED",
};

/**
 * Versorgungsweg-Konfliktgruppe in M3 (AU und weitere Profile).
 * Wird eine Option auf ACTIVE gesetzt, werden alle anderen Mitglieder der Gruppe
 * automatisch auf INACTIVE gesetzt. Keine automatische Vorauswahl beim Laden.
 *
 * Mitglieder:
 *   - ACUTE_OPEN_CONSULTATION_ACTION  → Offene Sprechstunde / direkt kommen
 *   - CARE_CHANNEL_CHOICE             → Wahl persönlich oder digital
 *   - CONTROL_APPOINTMENT_RECOMMENDED → Kontrolltermin / persönliche Vorstellung
 *
 * BOOK_APPOINTMENT ist bewusst nicht Teil dieser Gruppe: Es repräsentiert den
 * Buchungsweg / Terminlink und ist keine fachliche Aussage zum Versorgungsweg.
 */
const VERSORGUNGSWEG_CONFLICT_GROUP: ReadonlySet<string> = new Set([
  "ACUTE_OPEN_CONSULTATION_ACTION",
  "CARE_CHANNEL_CHOICE",
  "CONTROL_APPOINTMENT_RECOMMENDED",
]);

/**
 * Bound-Action-IDs, die in M3 nicht als Toggle erscheinen dürfen.
 * Diese Actions werden aus allen Render-Pfaden (Trigger-basiert und Standard)
 * herausgefiltert. Sie können weiterhin als interne Status-Trigger wirken,
 * sind aber für die MFA unsichtbar.
 */
const M3_HIDDEN_BOUND_ACTION_IDS = new Set(["DIGITAL_REQUEST_REQUIRED"]);

/**
 * Explanation-Checkpoints der Konfliktgruppe „Begründung / Rezeptart", die in M3
 * automatisch sichtbar werden, wenn PRESCRIPTION_STATUTORY_POSSIBLE = NO gesetzt ist.
 *
 * Sichtbarkeitsregel: Diese Checkpoints erscheinen in M3 als auswählbare Zusatzinfos,
 * auch wenn sie in M2 nicht explizit gesetzt wurden.
 * Sie werden NICHT automatisch auf SHOW gesetzt – die MFA wählt aktiv eine Begründung aus.
 * Wählt die MFA eine davon auf SHOW, wird der factStatus für diese auf YES gesetzt,
 * damit der Renderer den zugehörigen Text ausgeben kann.
 */
const PRESCRIPTION_STATUTORY_NO_EXPLANATION_IDS = [
  "PRESCRIPTION_PRIVATE_ONLY",
  "PRESCRIPTION_NO_PRESCRIPTION_REQUIRED",
  "PRESCRIPTION_SPECIALIST_RESPONSIBLE",
] as const;

/**
 * Explanation-Konfliktgruppen für PRESCRIPTION in M3 [PROTOTYP].
 *
 * Innerhalb einer Gruppe darf maximal eine Explanation den outputStatus SHOW tragen.
 * Wird eine Explanation auf SHOW gesetzt, werden alle anderen der Gruppe auf HIDE gesetzt.
 * Toggle (HIDE auf aktiver Explanation) hebt die Einschränkung auf.
 *
 * Nur EXPLANATION-Checkpoints dürfen in diesen Gruppen erscheinen.
 * Decision-Checkpoints (PRESCRIPTION_DECISION, PRESCRIPTION_STATUTORY_POSSIBLE) sind bewusst
 * NICHT in Konfliktgruppen – sie deaktivieren sich nie gegenseitig.
 *
 * TODO (noch kein Checkpoint vorhanden):
 *   - "Lifestyle / keine Kassenleistung"
 *   - "Medikament nicht indiziert / Rezept nicht notwendig"
 */
const PRESCRIPTION_EXPLANATION_CONFLICT_GROUPS: readonly (readonly string[])[] = [
  // Gruppe "Begründung / Rezeptart": erklärt, warum kein Kassenrezept ausgestellt wurde,
  // oder warum kein Rezept ausgestellt wird.
  // Bewusst NICHT in dieser Gruppe: PRESCRIPTION_NO_POSTAL_DELIVERY (Prozesshinweis, kein Rezeptartgrund),
  // PRESCRIPTION_PATIENT_NOT_IN_GERMANY (Einlöseproblem, kein Rezeptartgrund).
  [
    "PRESCRIPTION_PRIVATE_ONLY",
    "PRESCRIPTION_NO_PRESCRIPTION_REQUIRED",
    "PRESCRIPTION_SPECIALIST_RESPONSIBLE",
  ],
];

/** Menschenlesbare Bezeichnung für actionCategory. */
const ACTION_CATEGORY_LABELS: Record<string, string> = {
  PREPARATION: "Vorbereitung",
  PROCESS: "Ablauf",
  NEXT_STEP: "Nächste Schritte",
  INFO: "Information",
};

/** Gemeinsamer Stil für dezente Gruppen-Badges (immer kombiniert mit className="text-muted text-small"). */
const GROUP_BADGE_STYLE = {
  fontWeight: 600 as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

function optionsForKind(kind: InquiryCheckpointKind) {
  switch (kind) {
    case InquiryCheckpointKind.PREPARATION:
      return ACTION_OPTIONS;
    default:
      return EXPLANATION_OPTIONS;
  }
}

function StatusButtons({
  checkpointId,
  options,
  value,
  onChange,
  disabled,
}: {
  checkpointId: string;
  options: Array<{ value: string; label: string }>;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
  disabled: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(checkpointId, opt.value)}
          style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: value === opt.value ? "var(--primary, #2563eb)" : "var(--background)",
            color: value === opt.value ? "#fff" : "var(--foreground)",
            fontWeight: value === opt.value ? 600 : 400,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            fontSize: "0.85rem",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const AUDIENCE_OPTIONS: Array<{ value: Audience; label: string }> = [
  { value: "patient", label: "Patient" },
  { value: "contact_person", label: "Kontaktperson" },
];

function AudienceToggle({
  value,
  onChange,
}: {
  value: Audience;
  onChange: (v: Audience) => void;
}) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}
      data-audience-toggle
    >
      <span
        className="text-muted text-small"
        style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
      >
        Adressat:
      </span>
      {AUDIENCE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-audience={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "0.2rem 0.65rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: value === opt.value ? "var(--primary, #2563eb)" : "var(--background)",
            color: value === opt.value ? "#fff" : "var(--foreground)",
            fontWeight: value === opt.value ? 600 : 400,
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function OutputView({
  output,
  heading,
  m5Lines,
}: {
  output: InquiryResponseV2Output;
  heading: string;
  m5Lines: string[];
}) {
  return (
    <div
      className="card"
      style={{ marginTop: "2rem", display: "grid", gap: "1rem" }}
    >
      <h2 style={{ marginTop: 0 }}>{heading}</h2>

      {output.intro && (
        <p style={{ margin: "0 0 0.5rem", fontStyle: "italic", color: "var(--muted-foreground)" }}>
          {output.intro}
        </p>
      )}

      {output.sections.map((sec) => (
        <section key={sec.inquiryId}>
          {sec.mainDecision && (
            <p style={{ fontWeight: 600, margin: "0 0 0.5rem" }}>{sec.mainDecision}</p>
          )}
          {sec.attachedParagraphs.map((p, i) => (
            <p key={i} style={{ margin: "0.25rem 0" }}>
              {p}
            </p>
          ))}
        </section>
      ))}

      {output.sharedBottom.length > 0 && (
        <section>
          {output.sharedBottom.map((p, i) => (
            <p key={i} style={{ margin: "0.25rem 0" }}>
              {p}
            </p>
          ))}
        </section>
      )}

      {m5Lines.length > 0 && (
        <section>
          <h3 style={{ marginBottom: "0.5rem" }}>Dokumentation</h3>
          <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
            {m5Lines.map((line, i) => (
              <li key={line} className="text-small" style={{ fontFamily: "monospace" }}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: Fragebogen-Link als Nachrichteninhalt in sharedBottom integrieren
// ---------------------------------------------------------------------------

export function appendQuestionnaireLinkToOutput(
  output: InquiryResponseV2Output,
  link: string | null,
): InquiryResponseV2Output {
  if (!link) return output;
  const paragraph =
    `Bitte füllen Sie den folgenden Fragebogen aus.\nKopieren Sie den Link in Ihren Browser:\n${link}`;
  return { ...output, sharedBottom: [...output.sharedBottom, paragraph] };
}

// ---------------------------------------------------------------------------

function QuestionnaireRequestSection({
  inquirySessionId,
  onLinkGenerated,
}: {
  inquirySessionId: string;
  onLinkGenerated: (link: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [patientRef, setPatientRef] = useState("");
  const [selectedBlocks, setSelectedBlocks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  function toggleBlock(blockId: string) {
    setSelectedBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  }

  const anyBlockSelected = BLOCK_IDS_SORTED.some((id) => selectedBlocks[id]);

  async function handleCreate() {
    setLoading(true);
    setReqError(null);
    setCopied(false);
    setLink(null);

    const blockIds = BLOCK_IDS_SORTED.filter((id) => selectedBlocks[id]);
    try {
      const res = await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_reference: patientRef.trim() || undefined,
          selected_block_ids: blockIds,
          inquiry_session_id: inquirySessionId,
        }),
      });
      const data = (await res.json()) as { ok: boolean; link?: string; error?: string };
      if (!res.ok || !data.ok || !data.link) {
        setReqError(data.error ?? "Fragebogen konnte nicht erstellt werden.");
        return;
      }
      setLink(data.link);
      onLinkGenerated(data.link);
    } catch {
      setReqError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setReqError("Link konnte nicht in die Zwischenablage kopiert werden.");
    }
  }

  return (
    <section
      data-questionnaire-request
      style={{
        marginTop: "2rem",
        paddingTop: "1.5rem",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: open ? "1rem" : 0 }}>
        <h2 style={{ margin: 0, fontSize: "1rem" }}>
          <span aria-hidden="true">✉ </span>Fragebogen anfordern
        </h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            padding: "0.15rem 0.6rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--background)",
            color: "var(--foreground)",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          {open ? "Schließen ▲" : "Öffnen ▼"}
        </button>
      </div>

      {open && (
        <div style={{ display: "grid", gap: "1rem" }}>
          {/* Patient reference */}
          <div>
            <label
              htmlFor="q-patient-ref"
              style={{ display: "block", fontWeight: 500, marginBottom: "0.3rem", fontSize: "0.9rem" }}
            >
              Patientennummer / Referenz (optional)
            </label>
            <input
              id="q-patient-ref"
              type="text"
              value={patientRef}
              onChange={(e) => setPatientRef(e.target.value)}
              disabled={loading || !!link}
              placeholder="z.B. PAT-12345"
              style={{
                padding: "0.4rem 0.6rem",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                background: "var(--input-background)",
                fontSize: "0.9rem",
                width: "100%",
                maxWidth: "20rem",
                fontFamily: "inherit",
                color: "var(--foreground)",
              }}
            />
          </div>

          {/* Block selection */}
          <div>
            <div style={{ fontWeight: 500, marginBottom: "0.4rem", fontSize: "0.9rem" }}>
              Fragebogen-Blöcke auswählen
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {BLOCK_IDS_SORTED.map((blockId) => {
                const block = BLOCK_CATALOG[blockId];
                const checked = !!selectedBlocks[blockId];
                return (
                  <label
                    key={blockId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.25rem 0.6rem",
                      border: `1px solid ${checked ? "var(--primary, #2563eb)" : "var(--border)"}`,
                      borderRadius: "var(--radius)",
                      background: checked ? "var(--primary-subtle, #eff6ff)" : "var(--background)",
                      cursor: loading || !!link ? "not-allowed" : "pointer",
                      fontSize: "0.85rem",
                      opacity: loading || !!link ? 0.6 : 1,
                    }}
                    data-q-block-label={blockId}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBlock(blockId)}
                      disabled={loading || !!link}
                      data-q-block={blockId}
                      style={{ accentColor: "var(--primary, #2563eb)" }}
                    />
                    {block.label}
                  </label>
                );
              })}
            </div>
          </div>

          {reqError && (
            <p className="text-error" role="alert" aria-live="polite" style={{ margin: 0 }}>
              {reqError}
            </p>
          )}

          {!link && (
            <div>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={loading || !anyBlockSelected}
                data-q-create-link
              >
                {loading ? "Wird erzeugt…" : "Link erzeugen"}
              </button>
            </div>
          )}

          {link && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <p className="text-muted text-small" style={{ margin: 0 }}>
                Link erzeugt – er ist jetzt in der Nachricht oben integriert.
              </p>
              <button
                type="button"
                data-q-copy-link
                onClick={() => void copyLink()}
                style={{ alignSelf: "flex-start" }}
              >
                {copied ? "Kopiert ✓" : "Link kopieren"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function InquiryM3Client({
  sessionId,
  sections,
  actionCheckpoints,
  introCheckpoints,
  initialCheckpointStatuses,
  initialActionStatuses,
  initialExplanationOutputStatuses,
  initialResponseGoalSelection,
  actionIds,
  actionOrigins,
  initialGeneratedOutput,
  isConfirmed,
}: Props) {
  const actionIdSet = new Set(actionIds);

  // IDs aller EXPLANATION-Checkpoints aus allen Sections (für outputStatus-Initialisierung).
  const explanationCheckpointIds = useMemo(
    () =>
      new Set(
        sections
          .flatMap((s) => [
            ...s.specificCheckpoints,
            ...(s.boundGlobalOutputCheckpoints ?? []),
          ])
          .filter((cp) => cp.kind === InquiryCheckpointKind.EXPLANATION)
          .map((cp) => cp.id),
      ),
    [sections],
  );

  const [statuses, setStatuses] = useState<Record<string, string>>({
    ...initialCheckpointStatuses,
    ...initialActionStatuses,
  });

  // outputStatuses: M3-Ausgabeentscheidung (SHOW / HIDE) pro EXPLANATION-Checkpoint.
  // Initialisierung: gespeicherte Werte haben Vorrang; fehlende Werte werden aus factStatus abgeleitet.
  //   factStatus YES → SHOW vorausgewählt
  //   factStatus NO  → HIDE vorausgewählt
  const [outputStatuses, setOutputStatuses] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = { ...initialExplanationOutputStatuses };
    for (const id of explanationCheckpointIds) {
      if (!result[id]) {
        const factStatus = initialCheckpointStatuses[id];
        if (factStatus === "YES") result[id] = ExplanationOutputStatus.SHOW;
        else if (factStatus === "NO") result[id] = ExplanationOutputStatus.HIDE;
      }
    }
    return result;
  });

  const [responseGoalSelection, setResponseGoalSelection] = useState<Record<string, string>>(
    initialResponseGoalSelection,
  );

  const [actionsOpen, setActionsOpen] = useState(() => {
    // Automatisch aufklappen, wenn bereits ein Action-Status gesetzt ist
    // (globale Actions oder boundActionCheckpointIds).
    const allBoundActionIds = sections.flatMap((s) => s.boundActionCheckpoints.map((cp) => cp.id));
    const hasExplicitActionStatus =
      actionIds.some(
        (id) => initialActionStatuses[id] === "ACTIVE" || initialActionStatuses[id] === "INACTIVE",
      ) ||
      allBoundActionIds.some(
        (id) => initialActionStatuses[id] === "ACTIVE" || initialActionStatuses[id] === "INACTIVE",
      );
    if (hasExplicitActionStatus) return true;
    // Automatisch aufklappen, wenn showWhenAny-Bedingungen bereits erfüllt sind
    // (z.B. M2-Schalter mit YES → condition-gesteuerte Actions sind sofort sichtbar).
    const allStatuses = { ...initialCheckpointStatuses, ...initialActionStatuses };
    const matchesConditionSet = (condSet: Record<string, string>) =>
      Object.entries(condSet).every(([id, expected]) => allStatuses[id] === expected);
    if (sections.some((s) =>
      s.boundActionCheckpoints.some(
        (cp) => cp.showWhenAny && cp.showWhenAny.some(matchesConditionSet),
      ),
    )) return true;
    // Automatisch aufklappen, wenn PRESCRIPTION-Trigger bereits aktiv sind.
    if (sections.some((s) => s.inquiryId === PRESCRIPTION_INQUIRY_ID)) {
      const hasPrescriptionTrigger = PRESCRIPTION_M3_TRIGGER_GROUPS.some((group) =>
        group.triggers.some((t) => t.values.includes(allStatuses[t.id] ?? "")),
      );
      if (hasPrescriptionTrigger) return true;
    }
    // Automatisch aufklappen, wenn PRESCRIPTION-Section gebundene Actions hat (Fallback immer sichtbar).
    return sections.some(
      (s) =>
        s.inquiryId === PRESCRIPTION_INQUIRY_ID &&
        s.boundActionCheckpoints.length > 0,
    );
  });

  const [confirmed, setConfirmed] = useState(isConfirmed);
  const [frozenOutput, setFrozenOutput] = useState<InquiryResponseV2Output | null>(
    initialGeneratedOutput,
  );
  const [frozenM5Lines, setFrozenM5Lines] = useState<string[]>(() => {
    if (!initialGeneratedOutput) return [];
    // Compute M5 summary for the initially-loaded confirmed output using initial statuses.
    const inquirySections: InquirySection[] = sections.map((sec) => ({
      inquiryId: sec.inquiryId,
      decisionStatus:
        ((initialCheckpointStatuses[sec.decisionCheckpointId] as DecisionStatus | undefined) ??
        DecisionStatus.DISABLED),
      checkpointStatuses: initialCheckpointStatuses as Record<string, CheckpointStatusValue>,
      explanationOutputStatuses: initialExplanationOutputStatuses as Record<string, ExplanationOutputStatus>,
    }));
    return buildInquiryM5Summary(inquirySections);
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionnaireLink, setQuestionnaireLink] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>("patient");

  /**
   * Baut die InquirySection-Liste aus den aktuellen statuses und outputStatuses.
   * Wiederverwendet von livePreview, liveM5Lines und frozenOutputByAudience.
   */
  const buildInquirySections = useMemo(
    (): InquirySection[] =>
      sections.map((sec) => ({
        inquiryId: sec.inquiryId,
        decisionStatus:
          (statuses[sec.decisionCheckpointId] as DecisionStatus | undefined) ??
          DecisionStatus.DISABLED,
        checkpointStatuses: statuses as Record<string, CheckpointStatusValue>,
        explanationOutputStatuses: outputStatuses as Record<string, ExplanationOutputStatus>,
      })),
    [sections, statuses, outputStatuses],
  );

  // Live preview: computed from current statuses on every render before confirm.
  // renderInquiryResponseFromSections is a pure function (no network, no side effects).
  const livePreview = useMemo((): InquiryResponseV2Output | null => {
    if (confirmed) return null;
    try {
      return renderInquiryResponseFromSections(buildInquirySections, { audience });
    } catch {
      return null;
    }
  }, [confirmed, buildInquirySections, audience]);

  // M5 compact summary for live preview – computed from same sections as livePreview.
  const liveM5Lines = useMemo((): string[] => {
    if (confirmed) return [];
    try {
      return buildInquiryM5Summary(buildInquirySections);
    } catch {
      return [];
    }
  }, [confirmed, buildInquirySections]);

  // Fragebogen-Link als Nachrichteninhalt: Link wird in sharedBottom der Ausgabe integriert.
  const livePreviewWithLink = useMemo(
    () => (livePreview ? appendQuestionnaireLinkToOutput(livePreview, questionnaireLink) : null),
    [livePreview, questionnaireLink],
  );

  // Audience-bewusster Confirmed-Output: re-rendert die bestätigten Sections mit dem
  // aktuell gewählten audience-Wert. Setzt frozenOutput für die Anzeige außer Kraft.
  const frozenOutputByAudience = useMemo((): InquiryResponseV2Output | null => {
    if (!confirmed) return null;
    try {
      return renderInquiryResponseFromSections(buildInquirySections, { audience });
    } catch {
      return frozenOutput;
    }
  }, [confirmed, buildInquirySections, audience, frozenOutput]);

  const frozenOutputWithLink = useMemo(
    () => {
      const base = frozenOutputByAudience ?? frozenOutput;
      return base ? appendQuestionnaireLinkToOutput(base, questionnaireLink) : null;
    },
    [frozenOutputByAudience, frozenOutput, questionnaireLink],
  );

  function setStatus(checkpointId: string, value: string) {
    if (value === "ACTIVE" && PRESCRIPTION_EXCLUSIVE_ACTIONS[checkpointId]) {
      const conflicting = PRESCRIPTION_EXCLUSIVE_ACTIONS[checkpointId];
      setStatuses((prev) => ({ ...prev, [checkpointId]: value, [conflicting]: "INACTIVE" }));
    } else if (value === "ACTIVE" && VERSORGUNGSWEG_CONFLICT_GROUP.has(checkpointId)) {
      setStatuses((prev) => {
        const next: Record<string, string> = { ...prev, [checkpointId]: value };
        for (const id of VERSORGUNGSWEG_CONFLICT_GROUP) {
          if (id !== checkpointId) next[id] = "INACTIVE";
        }
        return next;
      });
    } else {
      setStatuses((prev) => ({ ...prev, [checkpointId]: value }));
    }
  }

  function setOutputStatus(checkpointId: string, value: string) {
    // Apply conflict group exclusivity for PRESCRIPTION explanations:
    // wenn eine Explanation auf SHOW gesetzt wird, werden alle anderen in derselben Gruppe auf HIDE gesetzt.
    const conflictGroup = PRESCRIPTION_EXPLANATION_CONFLICT_GROUPS.find((g) =>
      (g as readonly string[]).includes(checkpointId),
    );
    if (conflictGroup && value === ExplanationOutputStatus.SHOW) {
      setOutputStatuses((prev) => {
        const next = { ...prev, [checkpointId]: value };
        for (const id of conflictGroup) {
          if (id !== checkpointId) next[id] = ExplanationOutputStatus.HIDE;
        }
        return next;
      });
      // Lazy factStatus-Initialisierung: wenn die Begründung über den STATUTORY_POSSIBLE=NO-Pfad
      // eingeblendet wurde (kein M2-Status gesetzt), factStatus auf YES setzen,
      // damit der Renderer den zugehörigen Text ausgeben kann.
      if (
        (PRESCRIPTION_STATUTORY_NO_EXPLANATION_IDS as readonly string[]).includes(checkpointId) &&
        !statuses[checkpointId]
      ) {
        setStatuses((prev) => ({ ...prev, [checkpointId]: ExplanationStatus.YES }));
      }
    } else {
      setOutputStatuses((prev) => ({ ...prev, [checkpointId]: value }));
    }
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Save current decision + specific + action statuses + explanationOutputStatuses
      const checkpointStatuses: Record<string, string> = {};
      const actionStatuses: Record<string, string> = {};
      for (const [k, v] of Object.entries(statuses)) {
        if (actionIdSet.has(k)) {
          actionStatuses[k] = v;
        } else {
          checkpointStatuses[k] = v;
        }
      }

      // Nur tatsächlich gesetzte outputStatuses senden.
      const explanationOutputStatuses: Record<string, string> = {};
      for (const [k, v] of Object.entries(outputStatuses)) {
        if (v) explanationOutputStatuses[k] = v;
      }

      const patchRes = await fetch(`/api/inquiries/${sessionId}/checkpoints`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointStatuses, actionStatuses, explanationOutputStatuses, responseGoalSelection }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => null);
        setError(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      // 2. Confirm session
      const confirmRes = await fetch(`/api/inquiries/${sessionId}/confirm`, {
        method: "POST",
      });
      const confirmData = await confirmRes.json().catch(() => null);
      if (!confirmRes.ok || !confirmData?.ok) {
        setError(confirmData?.error ?? "Bestätigen fehlgeschlagen.");
        return;
      }

      setFrozenOutput(confirmData.output as InquiryResponseV2Output);
      // Compute M5 compact summary from the confirmed sections.
      setFrozenM5Lines(buildInquiryM5Summary(buildInquirySections));
      setConfirmed(true);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "42rem" }}>
      {confirmed ? (
        <>
          <div
            style={{
              padding: "0.5rem 1rem",
              background: "var(--success-bg, #dcfce7)",
              borderRadius: "var(--radius)",
              marginBottom: "1.5rem",
              color: "var(--success-fg, #166534)",
              fontWeight: 500,
            }}
          >
            ✓ Anfrage bestätigt – Ansicht ist schreibgeschützt.
          </div>
          {frozenOutputWithLink && (
            <>
              <AudienceToggle value={audience} onChange={setAudience} />
              <OutputView output={frozenOutputWithLink} heading="Bestätigter Output" m5Lines={frozenM5Lines} />
            </>
          )}
        </>
      ) : (
        <>
          {/* Nachrichteneinstieg – Intro-Bausteine (profilübergreifend) */}
          {introCheckpoints.length > 0 && (
            <section style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ marginBottom: "0.5rem" }}>
                <span aria-hidden="true">✉ </span>Nachrichteneinstieg
              </h2>
              <div
                className="text-muted text-small"
                style={{ marginBottom: "0.5rem" }}
              >
                Optional: Einstiegssatz vor der Entscheidung. Maximal einen auswählen.
              </div>
              {introCheckpoints.map((cp) => {
                const isActive = statuses[cp.id] === "ACTIVE";
                return (
                  <div
                    key={cp.id}
                    style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                  >
                    <div style={{ fontWeight: 500 }}>{cp.label}</div>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                      <button
                        type="button"
                        onClick={() =>
                          setStatuses((prev) =>
                            applyIntroToggle(prev, cp.id, introCheckpoints.map((c) => c.id)),
                          )
                        }
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "var(--radius)",
                          border: "1px solid var(--border)",
                          background: isActive ? "var(--primary, #2563eb)" : "var(--background)",
                          color: isActive ? "#fff" : "var(--foreground)",
                          fontWeight: isActive ? 600 : 400,
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        {isActive ? "Aktiv" : "Inaktiv"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Decision + SPECIFIC Checkpoints per inquiry */}
          {sections.map((section) => {
            const visibleSpecificCps = section.specificCheckpoints.filter((cp) => {
              if (cp.kind !== InquiryCheckpointKind.EXPLANATION) return true;
              const status = statuses[cp.id];
              // PRESCRIPTION: Begründungs-Checkpoints (Konfliktgruppe „Rezeptart") auch ohne
              // gesetzten M2-Status anzeigen, wenn STATUTORY_POSSIBLE = NO – damit die MFA
              // eine Begründung auswählen kann (Denkpfad: „Kassenrezept nicht möglich").
              // Keine automatische Ausgabe (outputStatus bleibt ungesetzt bis MFA klickt).
              if (
                section.inquiryId === PRESCRIPTION_INQUIRY_ID &&
                (PRESCRIPTION_STATUTORY_NO_EXPLANATION_IDS as readonly string[]).includes(cp.id) &&
                statuses["PRESCRIPTION_STATUTORY_POSSIBLE"] === "NO"
              ) {
                return true;
              }
              if (status !== "YES" && status !== "NO") return false;
              // Nur anzeigen wenn für den gesetzten Status tatsächlich ein nicht-leerer Text vorhanden ist.
              // Reine M2-Schalter (textByStatus.YES = "") dürfen nicht als Zusatzinfo in M3 erscheinen.
              const text = cp.textByStatus?.[status];
              return !!text;
            });
            return (
            <section key={section.inquiryId} style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ marginBottom: "0.5rem" }}>{section.label}</h2>

              {/* Decision – nur bei Profilen mit Decision-Checkpoint */}
              {section.decisionCheckpointId && (
                <>
                  <div
                    className="text-muted text-small"
                    style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
                  >
                    <span aria-hidden="true">? </span>Entscheidung
                  </div>
                  <div style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 500 }}>{section.decisionLabel}</div>
                  {section.decisionQuestions.length > 0 && (
                    <div className="text-muted text-small" style={{ marginTop: "0.2rem" }}>
                      {section.decisionQuestions
                        .filter((q) => statuses[q.id] === "YES" || statuses[q.id] === "NO")
                        .map((q) => {
                          const answer = statuses[q.id] === "YES" ? "Ja" : "Nein";
                          return (
                            <div key={q.id}>
                              {q.text}
                              <span style={{ fontWeight: 500 }}> — {answer}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                  <StatusButtons
                    checkpointId={section.decisionCheckpointId}
                    options={DECISION_OPTIONS}
                    value={statuses[section.decisionCheckpointId]}
                    onChange={setStatus}
                    disabled={false}
                  />
                </div>
                </>
              )}

              {/* SPECIFIC Checkpoints */}
              {visibleSpecificCps.length > 0 && (
                <div
                  className="text-muted text-small"
                  style={{ ...GROUP_BADGE_STYLE, margin: "0.5rem 0 0.25rem" }}
                >
                  <span aria-hidden="true">+ </span>Zusatzinfos
                </div>
              )}
              {visibleSpecificCps
                .map((cp) => {
                const m2Status = statuses[cp.id];
                const m2Label =
                  m2Status === "YES" ? "Ja" : m2Status === "NO" ? "Nein" : undefined;
                return (
                  <div
                    key={cp.id}
                    style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                  >
                    <div style={{ fontWeight: 500 }}>{cp.label}</div>
                    {/* M2 Prefill – zeigt Fragen + M2-Antwort als Kontext (schreibgeschützt) */}
                    {cp.kind === InquiryCheckpointKind.EXPLANATION &&
                      cp.questions &&
                      cp.questions.length > 0 && (
                        <div
                          className="text-muted text-small"
                          style={{ marginTop: "0.2rem" }}
                        >
                          {cp.questions.map((q) => (
                            <div key={q.id}>
                              {q.text}
                              {m2Label !== undefined && (
                                <span style={{ fontWeight: 500 }}> — {m2Label}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    {/* Legacy: non-EXPLANATION questions (informational only) */}
                    {cp.kind !== InquiryCheckpointKind.EXPLANATION &&
                      cp.questions &&
                      cp.questions.length > 0 && (
                        <ul
                          className="text-muted text-small"
                          style={{ margin: "0.2rem 0 0.2rem 1.25rem", padding: 0 }}
                        >
                          {cp.questions.map((q) => (
                            <li key={q.id}>{q.text}</li>
                          ))}
                        </ul>
                      )}
                    {/* EXPLANATION: outputStatus-Buttons (SHOW / HIDE) statt factStatus-Buttons */}
                    {cp.kind === InquiryCheckpointKind.EXPLANATION ? (
                      <StatusButtons
                        checkpointId={cp.id}
                        options={OUTPUT_OPTIONS}
                        value={outputStatuses[cp.id]}
                        onChange={setOutputStatus}
                        disabled={false}
                      />
                    ) : (
                      <StatusButtons
                        checkpointId={cp.id}
                        options={optionsForKind(cp.kind)}
                        value={statuses[cp.id]}
                        onChange={setStatus}
                        disabled={false}
                      />
                    )}
                    {/* Hinweis bei outputStatus HIDE */}
                    {cp.kind === InquiryCheckpointKind.EXPLANATION &&
                      outputStatuses[cp.id] === ExplanationOutputStatus.HIDE && (
                        <div
                          className="text-muted text-small"
                          style={{ marginTop: "0.25rem", fontStyle: "italic" }}
                        >
                          keine Erklärung erforderlich
                        </div>
                      )}
                  </div>
                );
              })}

              {/* Globale Output-Bausteine (GLOBAL MODULAR EXPLANATION) */}
              {(section.boundGlobalOutputCheckpoints ?? []).filter((cp) => statuses[cp.id] === "YES").length > 0 && (
                <div style={{ marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border)" }}>
                  <div className="text-muted text-small" style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.35rem" }}>
                    <span aria-hidden="true">ⓘ </span>Globale Bausteine
                  </div>
                  {(section.boundGlobalOutputCheckpoints ?? []).filter((cp) => statuses[cp.id] === "YES").map((cp) => (
                    <div
                      key={cp.id}
                      style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                    >
                      <div style={{ fontWeight: 500 }}>{cp.label}</div>
                      <StatusButtons
                        checkpointId={cp.id}
                        options={OUTPUT_OPTIONS}
                        value={outputStatuses[cp.id]}
                        onChange={setOutputStatus}
                        disabled={false}
                      />
                      {outputStatuses[cp.id] === ExplanationOutputStatus.HIDE && (
                        <div
                          className="text-muted text-small"
                          style={{ marginTop: "0.25rem", fontStyle: "italic" }}
                        >
                          keine Erklärung erforderlich
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
            );
          })}

          {/* Action checkpoints (globale availableActionIds + profilgebundene boundActionCheckpointIds) */}
          {(actionCheckpoints.filter((cp) => statuses[cp.id] === "ACTIVE").length > 0 || sections.some((s) => s.boundActionCheckpoints.length > 0)) && (
            <section style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: actionsOpen ? "0.5rem" : 0 }}>
                <h2 style={{ margin: 0 }}><span aria-hidden="true">→ </span>Aktionen / Infos</h2>
                <button
                  type="button"
                  onClick={() => setActionsOpen((o) => !o)}
                  style={{
                    padding: "0.15rem 0.6rem",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  {actionsOpen ? "Weniger ▲" : "Mehr ▼"}
                </button>
              </div>
              {actionsOpen && (() => {
                const groupElements: ReactNode[] = [];

                // Pre-compute which PRESCRIPTION action IDs are currently visible (trigger-based).
                // This is used as a visibility gate for PRESCRIPTION actions in the unified
                // placement pipeline (single-origin → under PRESCRIPTION, multi-origin → global).
                // It does NOT directly drive rendering anymore.
                const prescriptionRenderedActionIds = new Set<string>();
                if (sections.some((s) => s.inquiryId === PRESCRIPTION_INQUIRY_ID)) {
                  for (const group of PRESCRIPTION_M3_TRIGGER_GROUPS) {
                    if (group.triggers.some((t) => t.values.includes(statuses[t.id] ?? ""))) {
                      for (const id of group.actionIds) {
                        prescriptionRenderedActionIds.add(id);
                      }
                    }
                  }
                  // If no trigger active, fallback shows all PRESCRIPTION_ALL_ACTION_IDS — exclude those too.
                  if (prescriptionRenderedActionIds.size === 0) {
                    for (const id of PRESCRIPTION_ALL_ACTION_IDS) {
                      prescriptionRenderedActionIds.add(id);
                    }
                  }
                }

                // Actions with exactly one selected-profile origin are rendered under their profile
                // section instead of the global ACTION_GROUPS block, giving the MFA contextual placement.
                // This now includes PRESCRIPTION-only actions (visibility still controlled by
                // prescriptionRenderedActionIds computed above).
                const singleOriginActionIds = new Set(
                  Object.entries(actionOrigins)
                    .filter(([, origins]) => origins.length === 1)
                    .map(([id]) => id),
                );

                // --- Globale availableActionIds (gruppiert nach ACTION_GROUPS) ---
                if (actionCheckpoints.length > 0) {
                  const activeActionCheckpoints = actionCheckpoints.filter((cp) => {
                    if (singleOriginActionIds.has(cp.id)) return false;
                    // Multi-origin: visible if PRESCRIPTION trigger includes it OR status is ACTIVE.
                    const origins = actionOrigins[cp.id] ?? [];
                    if (origins.includes(PRESCRIPTION_INQUIRY_ID) && prescriptionRenderedActionIds.has(cp.id)) return true;
                    return statuses[cp.id] === "ACTIVE";
                  });
                  const cpById = Object.fromEntries(activeActionCheckpoints.map((cp) => [cp.id, cp]));
                  const renderedIds = new Set<string>();

                  for (const group of ACTION_GROUPS) {
                    const groupCps = group.ids
                      .map((id) => cpById[id])
                      .filter((cp): cp is M3ActionData => !!cp);
                    if (groupCps.length === 0) continue;
                    groupCps.forEach((cp) => renderedIds.add(cp.id));
                    groupElements.push(
                      <div key={group.label} style={{ marginTop: "0.75rem" }}>
                        <div
                          className="text-muted text-small"
                          style={{ fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.04em" }}
                        >
                          {group.label}
                        </div>
                        {groupCps.map((cp) => (
                          <div
                            key={cp.id}
                            style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                          >
                            <div style={{ fontWeight: 500 }}>{cp.label}</div>
                            <StatusButtons
                              checkpointId={cp.id}
                              options={ACTION_OPTIONS}
                              value={statuses[cp.id]}
                              onChange={setStatus}
                              disabled={false}
                            />
                          </div>
                        ))}
                      </div>,
                    );
                  }

                  // Ungrouped fallback
                  const ungrouped = activeActionCheckpoints.filter(
                    (cp) => !renderedIds.has(cp.id),
                  );
                  if (ungrouped.length > 0) {
                    groupElements.push(
                      <div key="__ungrouped__" style={{ marginTop: "0.75rem" }}>
                        {ungrouped.map((cp) => (
                          <div
                            key={cp.id}
                            style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                          >
                            <div style={{ fontWeight: 500 }}>{cp.label}</div>
                            <StatusButtons
                              checkpointId={cp.id}
                              options={ACTION_OPTIONS}
                              value={statuses[cp.id]}
                              onChange={setStatus}
                              disabled={false}
                            />
                          </div>
                        ))}
                      </div>,
                    );
                  }
                }

                // --- Profil-spezifische boundActionCheckpoints + single-origin globale Actions ---
                for (const sec of sections) {
                  // ── Alle Profile: gemeinsames Rendering ──────────────────────────────────────
                  // Filtere Checkpoints nach Sichtbarkeitsregeln:
                  // – Hat der Checkpoint showWhenAny oder hideWhenAny, gelten die Bedingungen.
                  // – Andernfalls wird er nur angezeigt, wenn er in M2 auf ACTIVE/INACTIVE gesetzt wurde.
                  // – Checkpoints in M3_HIDDEN_BOUND_ACTION_IDS werden nie angezeigt.
                  const SET_STATUSES = ["ACTIVE", "INACTIVE"] as const;
                  const setCps = sec.boundActionCheckpoints.filter((cp) => {
                    if (M3_HIDDEN_BOUND_ACTION_IDS.has(cp.id)) return false;
                    const hasConditions = cp.showWhenAny !== undefined || cp.hideWhenAny !== undefined;
                    if (!hasConditions) {
                      return (SET_STATUSES as readonly string[]).includes(statuses[cp.id]);
                    }
                    const matchesConditionSet = (condSet: Record<string, string>) =>
                      Object.entries(condSet).every(
                        ([checkpointId, expectedStatus]) => statuses[checkpointId] === expectedStatus,
                      );
                    if (cp.hideWhenAny?.some(matchesConditionSet)) return false;
                    if (cp.showWhenAny && cp.showWhenAny.length > 0) {
                      return cp.showWhenAny.some(matchesConditionSet);
                    }
                    return true;
                  });

                  // Globale Actions mit genau dieser Profil-Herkunft.
                  // Für PRESCRIPTION gilt die Trigger-Sichtbarkeit (prescriptionRenderedActionIds),
                  // für alle anderen Profile der Status ACTIVE.
                  const singleOriginCpsHere = actionCheckpoints.filter((cp) => {
                    if (!singleOriginActionIds.has(cp.id)) return false;
                    if (actionOrigins[cp.id]?.[0] !== sec.inquiryId) return false;
                    if (M3_HIDDEN_BOUND_ACTION_IDS.has(cp.id)) return false;
                    if (sec.inquiryId === PRESCRIPTION_INQUIRY_ID) return prescriptionRenderedActionIds.has(cp.id);
                    return statuses[cp.id] === "ACTIVE";
                  });

                  if (setCps.length === 0 && singleOriginCpsHere.length === 0) continue;

                  // Gruppiere nach actionCategory.
                  const order = ["PREPARATION", "PROCESS", "NEXT_STEP", "INFO"] as const;
                  const byCategory = new Map<string, M3BoundActionData[]>();
                  for (const cp of setCps) {
                    const cat = cp.actionCategory ?? "INFO";
                    if (!byCategory.has(cat)) byCategory.set(cat, []);
                    byCategory.get(cat)!.push(cp);
                  }
                  const catGroups = order
                    .map((cat) => ({ cat, cps: byCategory.get(cat) ?? [] }))
                    .filter(({ cps }) => cps.length > 0);

                  groupElements.push(
                    <div key={`bound-${sec.inquiryId}`} style={{ marginTop: "0.75rem" }}>
                      <div
                        className="text-muted text-small"
                        style={{ fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.04em" }}
                      >
                        {sec.label}
                      </div>
                      {catGroups.map(({ cat, cps }) => (
                        <div key={cat}>
                          <div
                            className="text-muted text-small"
                            style={{ marginTop: "0.5rem", marginBottom: "0.15rem", fontStyle: "italic" }}
                          >
                            {ACTION_CATEGORY_LABELS[cat] ?? cat}
                          </div>
                          {cps.map((cp) => (
                            <div
                              key={cp.id}
                              style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                            >
                              <div style={{ fontWeight: 500 }}>{cp.label}</div>
                              {cp.questions && cp.questions.length > 0 && (
                                <div className="text-muted text-small" style={{ marginTop: "0.2rem" }}>
                                  {cp.questions.map((q) => (
                                    <div key={q.id}>{q.text}</div>
                                  ))}
                                </div>
                              )}
                              <StatusButtons
                                checkpointId={cp.id}
                                options={ACTION_OPTIONS}
                                value={statuses[cp.id]}
                                onChange={setStatus}
                                disabled={false}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                      {singleOriginCpsHere.length > 0 && (() => {
                        // Gruppiere single-origin globale Actions nach actionCategory.
                        const byCat = new Map<string, M3ActionData[]>();
                        for (const cp of singleOriginCpsHere) {
                          const cat = cp.actionCategory ?? "INFO";
                          if (!byCat.has(cat)) byCat.set(cat, []);
                          byCat.get(cat)!.push(cp);
                        }
                        const singleOriginCatGroups = (["PREPARATION", "PROCESS", "NEXT_STEP", "INFO"] as const)
                          .map((cat) => ({ cat, cps: byCat.get(cat) ?? [] }))
                          .filter(({ cps }) => cps.length > 0);
                        return singleOriginCatGroups.map(({ cat, cps }) => (
                          <div key={`singleorigin-${cat}`}>
                            <div
                              className="text-muted text-small"
                              style={{ marginTop: "0.5rem", marginBottom: "0.15rem", fontStyle: "italic" }}
                            >
                              {ACTION_CATEGORY_LABELS[cat] ?? cat}
                            </div>
                            {cps.map((cp) => (
                              <div
                                key={cp.id}
                                style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}
                              >
                                <div style={{ fontWeight: 500 }}>{cp.label}</div>
                                <StatusButtons
                                  checkpointId={cp.id}
                                  options={ACTION_OPTIONS}
                                  value={statuses[cp.id]}
                                  onChange={setStatus}
                                  disabled={false}
                                />
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>,
                  );
                }

                return groupElements;
              })()}
            </section>
          )}

          {/* Live preview */}
          {livePreviewWithLink && (
            <>
              <AudienceToggle value={audience} onChange={setAudience} />
              <OutputView output={livePreviewWithLink} heading="Vorschau" m5Lines={liveM5Lines} />
            </>
          )}

          {error && (
            <p style={{ color: "var(--destructive)", margin: "1rem 0 0.5rem" }}>{error}</p>
          )}

          {/* Fragebogen anfordern – isolierter Bereich, keine Änderung an InquirySession */}
          <QuestionnaireRequestSection inquirySessionId={sessionId} onLinkGenerated={setQuestionnaireLink} />

          <div style={{ marginTop: "1.5rem" }}>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={submitting}
              style={{ fontWeight: 500 }}
            >
              {submitting ? "Wird bestätigt…" : "Anfrage bestätigen"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
