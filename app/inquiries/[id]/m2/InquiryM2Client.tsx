"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InquiryCheckpointKind, InquiryCheckpointScope } from "@/lib/inquiries/types";

export type PlainCheckpoint = {
  id: string;
  label: string;
  kind: InquiryCheckpointKind;
  scope: InquiryCheckpointScope;
  question?: string;
  questions?: Array<{ id: string; text: string }>;
  actionCategory?: string;
};

export type M2SectionData = {
  inquiryId: string;
  label: string;
  /** Klärungsfragen des Decision-Checkpoints – werden als reiner Fragenblock angezeigt. */
  decisionQuestions: Array<{ id: string; text: string }>;
  specificCheckpoints: PlainCheckpoint[];
  /** Profil-spezifische ACTION-Checkpoints (boundActionCheckpointIds ohne Conditions) – im Mehr-Bereich. */
  actionCheckpoints: PlainCheckpoint[];
  /**
   * Alle boundActionCheckpointIds des Profils – ohne Conditions-Filter.
   * Wird ausschließlich vom PRESCRIPTION-M2-Prototyp genutzt, um gebundene Actions
   * (wie E_RECIPE_USE, DIGITAL_REQUEST_REQUIRED) in der Accordion-Ansicht rendern zu können.
   * Andere Profile (SpecificSection) ignorieren dieses Feld.
   */
  allBoundActionCheckpoints?: PlainCheckpoint[];
};

type Props = {
  sessionId: string;
  sections: M2SectionData[];
  globalCheckpoints: PlainCheckpoint[];
  /** Verfügbare Actions aus den gewählten Profilen (dedupliziert, ohne boundActionCheckpointIds). */
  profileActionCheckpoints: PlainCheckpoint[];
  initialCheckpointStatuses: Record<string, string>;
  initialActionStatuses: Record<string, string>;
  /** M1B – Kommunikationsanlass-Auswahl pro Profil (menschliche Auswahl). Record<inquiryId, communicationReasonId> */
  initialCommunicationReasonSelection: Record<string, string>;
  actionIds: string[];
};

/** Einfache Ja/Nein-Schalter für GLOBAL und SPECIFIC EXPLANATION Checkpoints. */
const YES_NO_OPTIONS = [
  { value: "YES", label: "Ja" },
  { value: "NO", label: "Nein" },
];

/** ACTIVE/INACTIVE-Schalter für ACTION-Checkpoints (boundActionCheckpointIds). */
const ACTIVE_INACTIVE_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Inaktiv" },
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

function YesNoButtons({
  checkpointId,
  value,
  onChange,
}: {
  checkpointId: string;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
      {YES_NO_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(checkpointId, opt.value)}
          style={{
            padding: "0.25rem 0.75rem",
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

function SwitchRow({
  checkpoint,
  value,
  onChange,
}: {
  checkpoint: PlainCheckpoint;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
}) {
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontWeight: 500 }}>{checkpoint.label}</div>
      {checkpoint.question && (
        <div className="text-muted text-small" style={{ marginTop: "0.25rem" }}>
          {checkpoint.question}
        </div>
      )}
      <YesNoButtons checkpointId={checkpoint.id} value={value} onChange={onChange} />
    </div>
  );
}

/** Zeigt einen Checkpoint nur als Fragenblock – keine Status-Buttons. */
function QuestionBlock({ checkpoint }: { checkpoint: PlainCheckpoint }) {
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ fontWeight: 500 }}>{checkpoint.label}</div>
      {checkpoint.questions && checkpoint.questions.length > 0 && (
        <ul
          className="text-muted text-small"
          style={{ margin: "0.25rem 0 0 1.25rem", padding: 0 }}
        >
          {checkpoint.questions.map((q) => (
            <li key={q.id}>{q.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Zeigt einen SPECIFIC EXPLANATION Checkpoint mit dessen Klärungsfragen als primären Inhalt.
 * Das Label erscheint nur dezent als Kontext. Ja/Nein-Buttons speichern den M2-Status.
 */
function ExplanationQuestionRow({
  checkpoint,
  value,
  onChange,
}: {
  checkpoint: PlainCheckpoint;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
}) {
  const questions = checkpoint.questions ?? [];
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
      {questions.length === 1 ? (
        <div>{questions[0].text}</div>
      ) : questions.length > 1 ? (
        <ul style={{ margin: "0 0 0 1.25rem", padding: 0 }}>
          {questions.map((q) => (
            <li key={q.id}>{q.text}</li>
          ))}
        </ul>
      ) : (
        <div>{checkpoint.label}</div>
      )}
      {questions.length > 0 && (
        <div
          className="text-muted text-small"
          style={{ marginTop: "0.2rem" }}
        >
          {checkpoint.label}
        </div>
      )}
      <YesNoButtons checkpointId={checkpoint.id} value={value} onChange={onChange} />
    </div>
  );
}

/** Zeigt die Klärungsfragen des Decision-Checkpoints – je Frage Ja/Nein-Buttons. */
function DecisionQuestionBlock({
  questions,
  statuses,
  onChange,
}: {
  questions: Array<{ id: string; text: string }>;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
}) {
  if (questions.length === 0) return null;
  return (
    <>
      {questions.map((q) => (
        <div key={q.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
          <div className="text-small">{q.text}</div>
          <YesNoButtons checkpointId={q.id} value={statuses[q.id]} onChange={onChange} />
        </div>
      ))}
    </>
  );
}

/**
 * Zeigt einen ACTION-Checkpoint (boundActionCheckpointId) mit ACTIVE/INACTIVE-Schaltern.
 * Klärungsfragen werden als Kontext angezeigt.
 */
function BoundActionRow({
  checkpoint,
  value,
  onChange,
  conflictHint,
}: {
  checkpoint: PlainCheckpoint;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
  /** Optionaler Hinweis auf Konflikt-/Alternativgruppe – erscheint dezent unter dem Label. */
  conflictHint?: string;
}) {
  const questions = checkpoint.questions ?? [];
  return (
    <div style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
      {questions.length === 1 ? (
        <div>{questions[0].text}</div>
      ) : questions.length > 1 ? (
        <ul style={{ margin: "0 0 0 1.25rem", padding: 0 }}>
          {questions.map((q) => (
            <li key={q.id}>{q.text}</li>
          ))}
        </ul>
      ) : (
        <div>{checkpoint.label}</div>
      )}
      {questions.length > 0 && (
        <div className="text-muted text-small" style={{ marginTop: "0.2rem" }}>
          {checkpoint.label}
        </div>
      )}
      {conflictHint && (
        <div
          className="text-muted text-small"
          style={{ marginTop: "0.15rem", fontStyle: "italic" }}
        >
          {conflictHint}
        </div>
      )}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
        {ACTIVE_INACTIVE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(checkpoint.id, opt.value)}
            style={{
              padding: "0.25rem 0.75rem",
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
    </div>
  );
}


/** Sektion mit Decision-Fragen; SPECIFIC EXPLANATION Checkpoints hinter "Mehr"/"Weniger" Toggle. */
function SpecificSection({
  section,
  statuses,
  onChange,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
}) {
  // Auto-expand wenn mindestens ein SPECIFIC EXPLANATION Checkpoint bereits YES/NO hat.
  const hasAnsweredSpecific = section.specificCheckpoints.some(
    (cp) => statuses[cp.id] === "YES" || statuses[cp.id] === "NO",
  );
  // Auto-expand auch wenn ein ACTION Checkpoint gesetzt wurde.
  const hasAnsweredAction = section.actionCheckpoints.some(
    (cp) => statuses[cp.id] === "ACTIVE" || statuses[cp.id] === "INACTIVE",
  );
  const hasMore = section.specificCheckpoints.length > 0 || section.actionCheckpoints.length > 0;
  const [isExpanded, setIsExpanded] = useState(hasAnsweredSpecific || hasAnsweredAction);

  // Bound action checkpoints nach actionCategory gruppieren.
  const actionGroups = (() => {
    const order = ["PREPARATION", "PROCESS", "NEXT_STEP", "INFO"] as const;
    const byCategory = new Map<string, PlainCheckpoint[]>();
    for (const cp of section.actionCheckpoints) {
      const cat = cp.actionCategory ?? "INFO";
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(cp);
    }
    return order
      .map((cat) => ({ cat, cps: byCategory.get(cat) ?? [] }))
      .filter(({ cps }) => cps.length > 0);
  })();

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "0.5rem" }}>{section.label}</h2>
      {section.decisionQuestions.length === 0 && !hasMore ? (
        <p className="text-muted text-small">Keine Klärfragen für dieses Anliegen.</p>
      ) : (
        <>
          {/* Decision-Questions – immer sichtbar */}
          {section.decisionQuestions.length > 0 && (
            <div
              className="text-muted text-small"
              style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
            >
              <span aria-hidden="true">? </span>Klärungsfragen
            </div>
          )}
          <DecisionQuestionBlock questions={section.decisionQuestions} statuses={statuses} onChange={onChange} />

          {/* SPECIFIC EXPLANATION + ACTION Checkpoints – hinter Toggle */}
          {hasMore && (
            <>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                style={{
                  marginTop: "0.75rem",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                {isExpanded ? "Weniger" : "Mehr"}
              </button>
              {isExpanded && (
                <div style={{ marginTop: "0.5rem" }}>
                  {section.specificCheckpoints.length > 0 && (
                    <div
                      className="text-muted text-small"
                      style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
                    >
                      <span aria-hidden="true">+ </span>Zusatzfragen
                    </div>
                  )}
                  {/* SPECIFIC EXPLANATION Checkpoints */}
                  {section.specificCheckpoints.map((cp) =>
                    cp.kind === InquiryCheckpointKind.EXPLANATION ? (
                      <ExplanationQuestionRow key={cp.id} checkpoint={cp} value={statuses[cp.id]} onChange={onChange} />
                    ) : (
                      <QuestionBlock key={cp.id} checkpoint={cp} />
                    ),
                  )}

                  {actionGroups.length > 0 && (
                    <div
                      className="text-muted text-small"
                      style={{ ...GROUP_BADGE_STYLE, margin: "0.75rem 0 0.25rem" }}
                    >
                      <span aria-hidden="true">→ </span>Aktionen
                    </div>
                  )}
                  {/* Bound ACTION Checkpoints – nach Kategorie gruppiert */}
                  {actionGroups.map(({ cat, cps }) => (
                    <div key={cat} style={{ marginTop: "0.75rem" }}>
                      <div
                        className="text-muted text-small"
                        style={{
                          fontWeight: 600,
                          marginBottom: "0.25rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {ACTION_CATEGORY_LABELS[cat] ?? cat}
                      </div>
                      {cps.map((cp) => (
                        <BoundActionRow
                          key={cp.id}
                          checkpoint={cp}
                          value={statuses[cp.id]}
                          onChange={onChange}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION M2 Gruppen-Prototyp
// [PROTOTYP – hartcodiert, nur für PRESCRIPTION, reversibel]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kurze UI-Labels für PRESCRIPTION Checkpoints.
 * Lokale Überschreibung nur für den M2-Gruppenprototyp – Katalog bleibt unverändert.
 */
const PRESCRIPTION_SHORT_LABELS: Record<string, string> = {
  PRESCRIPTION_STATUTORY_POSSIBLE: "Kassenrezept / Privatrezept",
  PRESCRIPTION_PRIVATE_ONLY: "Privatrezept",
  PRESCRIPTION_NO_PRESCRIPTION_REQUIRED: "Kein Rezept erforderlich",
  PRESCRIPTION_SPECIALIST_RESPONSIBLE: "Facharzt zuständig",
  PRESCRIPTION_SPECIALIST_REPORT_REQUIRED: "Facharztbericht fehlt",
  HOSPITAL_DISCHARGE_REPORT_MISSING: "Krankenhaus-/Entlassbericht fehlt",
  PRESCRIPTION_BTM_ADHS_RULES: "BtM / ADHS",
  PRESCRIPTION_GYN_EXCLUSIVITY: "Pille / Gynäkologie",
  PRESCRIPTION_NO_POSTAL_DELIVERY: "Postversand angefragt",
  PRESCRIPTION_PATIENT_NOT_IN_GERMANY: "Patient im Ausland",
  PRESCRIPTION_CHRONIC_PATIENT: "Kontrolltermin / Dauermedikation?",
};

/**
 * Decision-Klärungsfragen, die in PRESCRIPTION-M2 nicht angezeigt werden sollen.
 * Diese Fragen erzeugen keinen eigenen Patientenoutput und verwirren in M2.
 * Die Decision selbst in M3 bleibt unverändert.
 */
const PRESCRIPTION_HIDDEN_DECISION_QUESTION_IDS = new Set([
  "PRESCRIPTION_DECISION-Q2", // "Handelt es sich um eine Wiederverordnung von Dauermedikation?"
  "PRESCRIPTION_DECISION-Q4", // "Handelt es sich um einen Neupatienten?"
]);

type PrescriptionGroup = {
  id: string;
  label: string;
  description: string;
  /** Geordnete Liste der Checkpoint-IDs in dieser Gruppe. */
  checkpointIds: string[];
  defaultOpen: boolean;
};

/**
 * Kommunikationsfunktions-basierte Gruppen für den PRESCRIPTION M2 Prototyp.
 *
 * Ein Checkpoint oder eine Action kann in mehreren Gruppen erscheinen – der Status
 * bleibt global synchron (ein einziger Record-Eintrag).
 * IDs, die im Profil nicht vorhanden sind, werden robust übersprungen.
 *
 * Keine Exklusiv-Logik: Kein Baustein erfüllt exakt dieselbe Funktion wie ein anderer.
 * PRESCRIPTION_STATUTORY_POSSIBLE ist durch Ja/Nein selbst-exklusiv.
 *
 * [PROTOTYP – hartcodiert, reversibel. Zum Rückgängigmachen: Render-Loop in
 *  InquiryM2Client wiederherstellen, diese Konstante und die zugehörigen Komponenten entfernen.]
 */
const PRESCRIPTION_GROUPS: PrescriptionGroup[] = [
  // ── 1. Rezept wird ausgestellt ──────────────────────────────────────────────
  {
    id: "ausstellen",
    label: "Rezept wird ausgestellt",
    description: "Wenn bereits klar ist, dass ein Rezept ausgestellt wird.",
    checkpointIds: [
      // Kasse/Privat-Unterscheidung: YES = Kassenrezept, NO = kein Kassenrezept
      "PRESCRIPTION_STATUTORY_POSSIBLE",
      // Begründung, wenn kein Kassenrezept (nur relevant bei STATUTORY_POSSIBLE = NO)
      // Denkpfad: „Rezept wird ausgestellt, aber nicht als Kassenrezept"
      "PRESCRIPTION_PRIVATE_ONLY",
      "PRESCRIPTION_NO_PRESCRIPTION_REQUIRED",
      "PRESCRIPTION_SPECIALIST_RESPONSIBLE",
    ],
    defaultOpen: true,
  },

  // ── 2. Es fehlt noch etwas ──────────────────────────────────────────────────
  {
    id: "unterlagen_fehlen",
    label: "Es fehlt noch etwas",
    description: "Wenn die Praxis vor Entscheidung oder Weitergabe noch Unterlagen oder Angaben braucht.",
    checkpointIds: [
      // Facharztbericht fehlt
      "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED",
      // Krankenhaus-/Entlassbericht fehlt
      "HOSPITAL_DISCHARGE_REPORT_MISSING",
    ],
    defaultOpen: false,
  },

  // ── 3. Termin / ärztliche Prüfung erforderlich ─────────────────────────────
  {
    id: "termin_prüfung",
    label: "Termin / ärztliche Prüfung erforderlich",
    description: "Wenn ärztliche Prüfung oder Termin notwendig ist, bevor ein Rezept ausgestellt werden kann.",
    checkpointIds: [
      // Dauermedikation → regelmäßige Kontrolltermine
      "PRESCRIPTION_CHRONIC_PATIENT",
    ],
    defaultOpen: false,
  },

  // ── 4. Zuständigkeit / Sonderfall ──────────────────────────────────────────
  {
    id: "zustaendigkeit",
    label: "Zuständigkeit / Sonderfall",
    description: "Wenn ein Facharzt, Gynäkologie oder Sonderzuständigkeit relevant ist.",
    checkpointIds: [
      // BtM/ADHS: Fachärztliche Zuständigkeit
      "PRESCRIPTION_BTM_ADHS_RULES",
      // Gynäkologische Verordnungen: Zuständigkeit der Gynäkologie
      "PRESCRIPTION_GYN_EXCLUSIVITY",
    ],
    defaultOpen: false,
  },

  // ── 5. Erklärung / Rückfrage beantworten ───────────────────────────────────
  {
    id: "erklaeren",
    label: "Erklärung / Rückfrage beantworten",
    description: "Wenn der Patient eine Rückfrage stellt, z. B. warum Privatrezept, warum kein Postversand.",
    checkpointIds: [
      // Kasse/Privat-Unterscheidung: YES = Kassenrezept, NO = nicht als Kassenrezept
      "PRESCRIPTION_STATUTORY_POSSIBLE",
      // Privatrezept-Begründung: YES = Präparat nur privat verordnungsfähig
      "PRESCRIPTION_PRIVATE_ONLY",
      // Kein Rezept erforderlich / frei verkäuflich
      "PRESCRIPTION_NO_PRESCRIPTION_REQUIRED",
      // Facharzt zuständig für diese Verordnung
      "PRESCRIPTION_SPECIALIST_RESPONSIBLE",
      // Kein Postversand – spezifischer Ablehnungshinweis
      "PRESCRIPTION_NO_POSTAL_DELIVERY",
      // Auslandsaufenthalt: Einlösung nur in deutschen Apotheken möglich
      "PRESCRIPTION_PATIENT_NOT_IN_GERMANY",
    ],
    defaultOpen: false,
  },

  // ── 6. Problem nach Ausstellung ────────────────────────────────────────────
  {
    id: "problem_nach_ausstellung",
    label: "Problem nach Ausstellung",
    description: "Wenn ein Rezept bereits ausgestellt wurde, aber danach ein Problem entsteht.",
    checkpointIds: [
      // Patient im Ausland: Einlösung eingeschränkt
      "PRESCRIPTION_PATIENT_NOT_IN_GERMANY",
      // Postversand angefragt (als Kontext bei Einlösungsproblemen)
      "PRESCRIPTION_NO_POSTAL_DELIVERY",
    ],
    defaultOpen: false,
  },
];

/** Eine einzelne aufklappbare Accordion-Gruppe im M2 Prototyp (PRESCRIPTION / AU). */
function PrescriptionGroupAccordion({
  group,
  checkpoints,
  statuses,
  onChange,
  shortLabels = PRESCRIPTION_SHORT_LABELS,
}: {
  group: PrescriptionGroup;
  checkpoints: PlainCheckpoint[];
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  /** Optionale kurze UI-Labels pro Checkpoint-ID. Defaults auf PRESCRIPTION_SHORT_LABELS. */
  shortLabels?: Record<string, string>;
}) {
  const hasAnsweredCheckpoint = checkpoints.some(
    (cp) => statuses[cp.id] === "YES" || statuses[cp.id] === "NO",
  );
  const [isOpen, setIsOpen] = useState(group.defaultOpen || hasAnsweredCheckpoint);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        marginBottom: "0.5rem",
        overflow: "hidden",
      }}
    >
      {/* Accordion-Kopfzeile */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.65rem 0.9rem",
          background: isOpen ? "var(--muted, #f5f5f5)" : "var(--background)",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: "0.5rem",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{group.label}</div>
          {!isOpen && (
            <div className="text-muted text-small" style={{ marginTop: "0.1rem" }}>
              {group.description}
            </div>
          )}
        </div>
        <span aria-hidden="true" style={{ flexShrink: 0 }}>
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {/* Accordion-Inhalt */}
      {isOpen && (
        <div style={{ padding: "0.5rem 0.9rem 0.75rem" }}>
          <div className="text-muted text-small" style={{ marginBottom: "0.5rem" }}>
            {group.description}
          </div>

          {checkpoints.length > 0 ? (
            checkpoints.map((cp) => (
              <ExplanationQuestionRow
                key={cp.id}
                checkpoint={{ ...cp, label: shortLabels[cp.id] ?? cp.label }}
                value={statuses[cp.id]}
                onChange={onChange}
              />
            ))
          ) : (
            <div
              className="text-muted text-small"
              style={{ fontStyle: "italic", marginTop: "0.25rem" }}
            >
              Noch keine passenden Situations-Checkpoints vorhanden
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION – M2-Gruppen-Prototyp (Accordion)
// [PROTOTYP – hartcodiert, nur für PRESCRIPTION, reversibel]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ersetzt SpecificSection für das PRESCRIPTION-Profil mit situationsbasierten
 * Accordion-Gruppen. Alle anderen Profile nutzen weiterhin SpecificSection.
 *
 * M2 bleibt reine Klär-/Orientierungsebene: nur Checkpoints / Situationsmerkmale,
 * keine Action-Toggles. Actions werden in M3 durch Trigger-Logik freigeschaltet.
 *
 * [PROTOTYP – hartcodiert, reversibel.]
 */
function PrescriptionSpecificSection({
  section,
  statuses,
  onChange,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
}) {
  // Schneller Lookup: Checkpoint-ID → PlainCheckpoint
  const cpById = new Map<string, PlainCheckpoint>(
    section.specificCheckpoints.map((cp) => [cp.id, cp]),
  );

  // Klärungsfragen des Decision-Checkpoints filtern:
  // Q2/Q4 erscheinen nicht in M2 – kein eigener Patientenoutput, verwirren in M2.
  const filteredDecisionQuestions = section.decisionQuestions.filter(
    (q) => !PRESCRIPTION_HIDDEN_DECISION_QUESTION_IDS.has(q.id),
  );

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>{section.label}</h2>
      <p className="text-muted text-small" style={{ marginBottom: "0.75rem" }}>
        Wähle aus, welche Situation am besten passt:
      </p>

      {/* Decision-Klärungsfragen (gefiltert) – immer sichtbar */}
      {filteredDecisionQuestions.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div
            className="text-muted text-small"
            style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
          >
            <span aria-hidden="true">? </span>Klärungsfragen
          </div>
          <DecisionQuestionBlock
            questions={filteredDecisionQuestions}
            statuses={statuses}
            onChange={onChange}
          />
        </div>
      )}

      {/* Accordion-Gruppen – je nur Situationsmerkmale/Checkpoints, keine Actions */}
      <div style={{ marginBottom: "0.75rem" }}>
        {PRESCRIPTION_GROUPS.map((group) => {
          const groupCheckpoints = group.checkpointIds
            .map((id) => cpById.get(id))
            .filter((cp): cp is PlainCheckpoint => cp !== undefined);

          return (
            <PrescriptionGroupAccordion
              key={group.id}
              group={group}
              checkpoints={groupCheckpoints}
              statuses={statuses}
              onChange={onChange}
            />
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ende PRESCRIPTION M2 Gruppen-Prototyp
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// AU M2 Gruppen-Prototyp
// [PROTOTYP – hartcodiert, nur für AU, reversibel]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kurze UI-Labels für AU Checkpoints.
 * Lokale Überschreibung nur für den M2-Gruppenprototyp – Katalog bleibt unverändert.
 */
const AU_SHORT_LABELS: Record<string, string> = {
  AU_BACKDATE_LIMIT: "Rückdatierungsgrenze",
  AU_NEW_PATIENT_LIMIT: "Neupatient",
  AU_MISSING_EGK: "Versichertendaten (eGK)",
  AU_MISSING_QUESTIONNAIRE: "Angaben Erkrankung",
  AU_WORK_ACCIDENT: "Arbeitsunfall / D-Arzt",
  AU_CHILD_SICK: "Kind krank / Kinderarzt",
  AU_DIGITAL_AU_PROCESS: "Digitaler AU-Prozess",
  AU_NO_APPOINTMENT_ACUTE: "Akute Beschwerden",
  AU_MEDICAL_CONSULTATION_REQUIRED: "Ärztliche Konsultation",
  AU_FOLLOWUP: "Folge-AU / Verlängerung",
};

/**
 * Decision-Klärungsfragen, die in AU-M2 nicht angezeigt werden sollen.
 *
 * Analog zu PRESCRIPTION_HIDDEN_DECISION_QUESTION_IDS:
 * M2 = Situation / Kontext; M3 = Entscheidung.
 * Die Decision selbst in M3 bleibt unverändert.
 */
const AU_HIDDEN_DECISION_QUESTION_IDS = new Set([
  "AU_DECISION-Q1", // "Sind Beschwerden oder eine Diagnose nachvollziehbar angegeben?"
  "AU_DECISION-Q3", // "Bei Langzeit-AU: Liegt eine ärztliche Freigabe vor?"
]);

/**
 * Situationsbasierte Akkordeon-Gruppen für den AU M2 Prototyp.
 *
 * Ein Checkpoint kann in mehreren Gruppen erscheinen – der Status bleibt global
 * synchron (ein einziger Record-Eintrag). IDs ohne Profil-Eintrag werden robust
 * übersprungen.
 *
 * [PROTOTYP – hartcodiert, reversibel. Zum Rückgängigmachen: Render-Loop in
 *  InquiryM2Client wiederherstellen, diese Konstante und die zugehörigen
 *  Komponenten entfernen.]
 */
const AU_GROUPS: PrescriptionGroup[] = [
  // ── 1. AU kann ausgestellt werden ────────────────────────────────────────
  {
    id: "au_moeglich",
    label: "AU kann ausgestellt werden",
    description: "Wenn die AU grundsätzlich digital oder organisatorisch bearbeitet werden kann.",
    checkpointIds: [
      "AU_DIGITAL_AU_PROCESS", // Digitaler AU-Anfrageprozess
      "AU_FOLLOWUP",           // Folge-AU / Verlängerung
    ],
    defaultOpen: false,
  },

  // ── 2. Es fehlen noch Angaben ─────────────────────────────────────────────
  {
    id: "fehlende_angaben",
    label: "Es fehlen noch Angaben",
    description: "Prozess ist blockiert, weil notwendige Daten oder Unterlagen fehlen.",
    checkpointIds: [
      "AU_MISSING_EGK",           // Versichertendaten (eGK) fehlen
      "AU_MISSING_QUESTIONNAIRE", // Angaben zur Erkrankung fehlen
    ],
    defaultOpen: false,
  },

  // ── 3. Untersuchung erforderlich ──────────────────────────────────────────
  {
    id: "untersuchung",
    label: "Untersuchung erforderlich",
    description: "Persönliche ärztliche Abklärung ist notwendig, bevor eine Entscheidung getroffen werden kann.",
    checkpointIds: [
      "AU_NO_APPOINTMENT_ACUTE",          // Akute Beschwerden – kein kurzfristiger Termin
      "AU_MEDICAL_CONSULTATION_REQUIRED", // Ärztliche Konsultation erforderlich
      "AU_FOLLOWUP",                      // Folge-AU / Verlängerung
    ],
    defaultOpen: false,
  },

  // ── 4. Regel / Grenze ─────────────────────────────────────────────────────
  {
    id: "regel_grenze",
    label: "Regel / Grenze",
    description: "Gesetzliche oder praxisinterne Einschränkung ist relevant.",
    checkpointIds: [
      "AU_BACKDATE_LIMIT",    // Rückdatierungsgrenze (≤ 2 Tage)
      "AU_NEW_PATIENT_LIMIT", // Neupatient – AU-Höchstdauer
    ],
    defaultOpen: false,
  },

  // ── 5. Zuständigkeit ──────────────────────────────────────────────────────
  {
    id: "zustaendigkeit",
    label: "Zuständigkeit",
    description: "Eine andere Praxis oder ein anderer Arzt ist für diesen Fall zuständig.",
    checkpointIds: [
      "AU_WORK_ACCIDENT", // Arbeitsunfall / Wegeunfall → D-Arzt zuständig
      "AU_CHILD_SICK",    // Kind krank → Kinderarzt zuständig
    ],
    defaultOpen: false,
  },

  // ── 6. Verlauf / Sonderfall ───────────────────────────────────────────────
  {
    id: "verlauf_sonderfall",
    label: "Verlauf / Sonderfall",
    description: "Besonderer Kontext zur bestehenden AU – z. B. Folge-AU.",
    checkpointIds: [
      "AU_FOLLOWUP", // Folge-AU / Verlängerung
    ],
    defaultOpen: false,
  },

  // ── 7. Erklärung / Rückfrage ──────────────────────────────────────────────
  {
    id: "erklaeren",
    label: "Erklärung / Rückfrage",
    description: "Kommunikative Ergänzungen – z. B. digitaler Prozess oder Terminhinweis.",
    checkpointIds: [
      "AU_DIGITAL_AU_PROCESS",   // Digitaler AU-Anfrageprozess erklären (Duplikat erlaubt)
      "AU_NO_APPOINTMENT_ACUTE", // Akute Beschwerden – kann in mehreren Gruppen erscheinen
      "AU_BACKDATE_LIMIT",       // Rückdatierungsgrenze – Duplikat für Erklärungskontext
    ],
    defaultOpen: false,
  },
];

/**
 * Ersetzt SpecificSection für das AU-Profil mit situationsbasierten
 * Accordion-Gruppen. Alle anderen Profile nutzen weiterhin SpecificSection.
 *
 * M2 bleibt reine Klär-/Orientierungsebene: nur EXPLANATION-Checkpoints /
 * Situationsmerkmale, keine ACTION-Toggles. Actions werden in M3 durch
 * Trigger-Logik freigeschaltet.
 *
 * [PROTOTYP – hartcodiert, reversibel.]
 */
function AUSpecificSection({
  section,
  statuses,
  onChange,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
}) {
  // Schneller Lookup: Checkpoint-ID → PlainCheckpoint
  // Nur EXPLANATION-Checkpoints – ACTION-Checkpoints werden in M2 nicht angezeigt.
  const cpById = new Map<string, PlainCheckpoint>(
    section.specificCheckpoints
      .filter((cp) => cp.kind === InquiryCheckpointKind.EXPLANATION)
      .map((cp) => [cp.id, cp]),
  );

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>{section.label}</h2>
      <p className="text-muted text-small" style={{ marginBottom: "0.75rem" }}>
        Wähle aus, welche Situation am besten passt:
      </p>

      {/* Decision-Klärungsfragen (gefiltert) – immer sichtbar */}
      {(() => {
        const filteredDecisionQuestions = section.decisionQuestions.filter(
          (q) => !AU_HIDDEN_DECISION_QUESTION_IDS.has(q.id),
        );
        return filteredDecisionQuestions.length > 0 ? (
          <div style={{ marginBottom: "1rem" }}>
            <div
              className="text-muted text-small"
              style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
            >
              <span aria-hidden="true">? </span>Klärungsfragen
            </div>
            <DecisionQuestionBlock
              questions={filteredDecisionQuestions}
              statuses={statuses}
              onChange={onChange}
            />
          </div>
        ) : null;
      })()}

      {/* Accordion-Gruppen – je nur EXPLANATION-Checkpoints / Situationsmerkmale */}
      <div style={{ marginBottom: "0.75rem" }}>
        {AU_GROUPS.map((group) => {
          const groupCheckpoints = group.checkpointIds
            .map((id) => cpById.get(id))
            .filter((cp): cp is PlainCheckpoint => cp !== undefined);

          return (
            <PrescriptionGroupAccordion
              key={group.id}
              group={group}
              checkpoints={groupCheckpoints}
              statuses={statuses}
              onChange={onChange}
              shortLabels={AU_SHORT_LABELS}
            />
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ende AU M2 Gruppen-Prototyp
// ─────────────────────────────────────────────────────────────────────────────

/** Section „Weitere passende Hinweise" – standardmäßig eingeklappt. */
function WeitereHinweiseSection({
  profileActionCheckpoints,
  statuses,
  onChange,
}: {
  profileActionCheckpoints: PlainCheckpoint[];
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
}) {
  const hasAnswered = profileActionCheckpoints.some(
    (cp) => statuses[cp.id] === "ACTIVE" || statuses[cp.id] === "INACTIVE",
  );
  const [isExpanded, setIsExpanded] = useState(hasAnswered);
  return (
    <section
      style={{
        marginBottom: "2rem",
        background: "#f9f9f9",
        border: "1px solid #e0e0e0",
        borderRadius: "var(--radius)",
        padding: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          className="text-muted text-small"
          style={{ ...GROUP_BADGE_STYLE }}
        >
          <span aria-hidden="true">→ </span>Weitere passende Hinweise
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--background)",
            color: "var(--foreground)",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          {isExpanded ? "Weniger" : "Mehr"}
        </button>
      </div>
      {isExpanded && (
        <div style={{ marginTop: "0.5rem" }}>
          {profileActionCheckpoints.map((cp) => (
            <BoundActionRow
              key={cp.id}
              checkpoint={cp}
              value={statuses[cp.id]}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function InquiryM2Client({
  sessionId,
  sections,
  globalCheckpoints,
  profileActionCheckpoints,
  initialCheckpointStatuses,
  initialActionStatuses,
  initialCommunicationReasonSelection,
  actionIds,
}: Props) {
  const router = useRouter();
  const actionIdSet = new Set(actionIds);

  const [statuses, setStatuses] = useState<Record<string, string>>({
    ...initialCheckpointStatuses,
    ...initialActionStatuses,
  });
  const [communicationReasonSelection, setCommunicationReasonSelection] = useState<Record<string, string>>(
    initialCommunicationReasonSelection,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setStatus(checkpointId: string, value: string) {
    setStatuses((prev) => ({ ...prev, [checkpointId]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const checkpointStatuses: Record<string, string> = {};
      const actionStatuses: Record<string, string> = {};
      for (const [k, v] of Object.entries(statuses)) {
        if (actionIdSet.has(k)) {
          actionStatuses[k] = v;
        } else {
          checkpointStatuses[k] = v;
        }
      }
      const res = await fetch(`/api/inquiries/${sessionId}/checkpoints`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpointStatuses, actionStatuses, communicationReasonSelection }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      router.push(`/inquiries/${sessionId}/m3`);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "42rem" }}>
      {/* 1. GLOBAL Checkpoints – oben, visuell abgesetzt, Ja/Nein-Schalter */}
      {globalCheckpoints.length > 0 && (
        <section
          style={{
            marginBottom: "2rem",
            background: "#f5f5f5",
            border: "1px solid #e0e0e0",
            borderRadius: "var(--radius)",
            padding: "1rem",
          }}
        >
          <div
            className="text-muted text-small"
            style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.35rem" }}
          >
            <span aria-hidden="true">ⓘ </span>Globale Hinweise
          </div>
          <h2 style={{ marginBottom: "0.5rem" }}>Basisinformationen</h2>
          {globalCheckpoints.map((cp) => (
            <SwitchRow
              key={cp.id}
              checkpoint={cp}
              value={statuses[cp.id]}
              onChange={setStatus}
            />
          ))}
        </section>
      )}

      {/* 2. + 3. SPECIFIC Checkpoints pro Anliegen.
           PRESCRIPTION nutzt den Gruppen-Prototyp, AU ebenso, alle anderen Profile SpecificSection. */}
      {sections.map((section) =>
        section.inquiryId === "PRESCRIPTION" ? (
          <PrescriptionSpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
          />
        ) : section.inquiryId === "AU" ? (
          <AUSpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
          />
        ) : (
          <SpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
          />
        ),
      )}

      {/* 4. Weitere passende Hinweise – nur für Profile ohne PRESCRIPTION / AU.
           Für PRESCRIPTION und AU werden Actions in M3 durch Trigger-Logik freigeschaltet. */}
      {profileActionCheckpoints.length > 0 &&
        !sections.some((s) => s.inquiryId === "PRESCRIPTION" || s.inquiryId === "AU") && (
          <WeitereHinweiseSection
            profileActionCheckpoints={profileActionCheckpoints}
            statuses={statuses}
            onChange={setStatus}
          />
        )}

      {error && (
        <p style={{ color: "var(--destructive)", margin: "0 0 1rem" }}>{error}</p>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        style={{ fontWeight: 500 }}
      >
        {submitting ? "Wird gespeichert…" : "Weiter zu Entscheidung →"}
      </button>
    </div>
  );
}
