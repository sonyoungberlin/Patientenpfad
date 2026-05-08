"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InquiryCheckpointKind, InquiryCheckpointScope } from "@/lib/inquiries/types";
import { applySectionIntroToggle } from "@/lib/inquiries/sectionIntroToggle";
import { applyLabCheckpointCoupling } from "@/lib/inquiries/labCheckpointCoupling";

export type PlainCheckpoint = {
  id: string;
  label: string;
  kind: InquiryCheckpointKind;
  scope: InquiryCheckpointScope;
  question?: string;
  questions?: Array<{ id: string; text: string }>;
  actionCategory?: string;
  /**
   * Vorschau-Text (z. B. ACTIVE-Text für ACTION-Checkpoints), den die UI
   * unterhalb des Labels anzeigen kann. Wird in M2 für die Section-Intro-
   * Schubladen verwendet, damit Praxen den späteren Output direkt sehen.
   * Optional – Renderer/Server-Logik nutzen dieses Feld nicht.
   */
  previewText?: string;
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
  /**
   * Pilot: Section-Intro-Whitelist für die M2-„Schubladen"-Auswahl
   * (AU/LAB/APPOINTMENT). Leeres Array → keine Schubladen-Auswahl rendern.
   * Statuses werden global geführt; Toggle via `applySectionIntroToggle`.
   */
  sectionIntroCheckpoints?: PlainCheckpoint[];
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

/**
 * Pilot „Schubladen"-Auswahl für M2 (AU / LAB / APPOINTMENT).
 *
 * Rendert eine Single-Select-Radio-Liste über den bestehenden Akkordeons.
 * Ein erneuter Klick auf das aktive Section-Intro hebt die Auswahl auf
 * (Toggle-Off, analog M3 `applyIntroToggle`). Schreibt die Statuses über
 * `applySectionIntroToggle` in die globale `statuses`-Map; der Renderer
 * hängt den ACTIVE-Text hinter Message-Intros E1/E2/E3 an.
 *
 * Die `previewText`-Spalte zeigt den späteren Output-Satz, damit Praxen die
 * Anschlussform direkt sehen.
 */
function SectionIntroPicker({
  sectionIntroCheckpoints,
  statuses,
  onToggle,
}: {
  sectionIntroCheckpoints: PlainCheckpoint[];
  statuses: Record<string, string>;
  onToggle: (clickedId: string) => void;
}) {
  if (sectionIntroCheckpoints.length === 0) return null;
  const groupName = `section-intro-${sectionIntroCheckpoints[0]?.id ?? "default"}`;

  return (
    <div
      style={{
        marginBottom: "1rem",
        padding: "0.6rem 0.75rem",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      <div
        className="text-muted text-small"
        style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.35rem" }}
      >
        <span aria-hidden="true">↳ </span>Antwortkontext (Einstieg in die Antwort)
      </div>
      <p className="text-muted text-small" style={{ margin: "0 0 0.5rem" }}>
        Optional: maximal ein Antwortkontext. Wird im Antworttext direkt hinter dem
        Nachrichteneinstieg angehängt (nicht hinter „Vielen Dank…“).
      </p>
      <div role="radiogroup" aria-label="Antwortkontext auswählen">
        {sectionIntroCheckpoints.map((cp) => {
          const isActive = statuses[cp.id] === "ACTIVE";
          return (
            <label
              key={cp.id}
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
                padding: "0.35rem 0",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name={groupName}
                checked={isActive}
                onClick={() => onToggle(cp.id)}
                onChange={() => {
                  /* handled in onClick to support toggle-off */
                }}
                style={{ marginTop: "0.25rem" }}
              />
              <span>
                <span style={{ fontWeight: 500 }}>{cp.label.replace(/^Schublade:\s*/, "")}</span>
                {cp.previewText && (
                  <span
                    className="text-muted text-small"
                    style={{ display: "block" }}
                  >
                    „… {cp.previewText}"
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Pilot „Schubladen-Akkordeon" für M2 (AU / LAB / APPOINTMENT).
 *
 * Ein Akkordeon-Drawer pro Section-Intro:
 *   - Drawer-Header zeigt das Section-Intro-Label (z. B. „Angaben fehlen").
 *   - Im aufgeklappten Zustand: Toggle „Diese Schublade für die Antwort wählen"
 *     (single-select über alle Section-Intros via `applySectionIntroToggle`)
 *     und die zugeordneten EXPLANATION-Checkpoints mit ihrem normalen
 *     Ja/Nein-Verhalten.
 *
 * Exklusivität: Klick auf Toggle in einer Schublade deaktiviert die anderen
 * Section-Intros (Garantie der Toggle-Funktion). Untergeordnete Checkpoint-
 * Statuses bleiben bewusst erhalten und werden nicht zurückgesetzt.
 */
function SectionIntroAccordion({
  sectionIntro,
  checkpoints,
  statuses,
  onChange,
  onSectionIntroToggle,
  shortLabels,
  defaultOpen,
  compactRows = false,
}: {
  sectionIntro: PlainCheckpoint;
  checkpoints: PlainCheckpoint[];
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSectionIntroToggle: (clickedId: string) => void;
  shortLabels: Record<string, string>;
  defaultOpen: boolean;
  /**
   * Wenn true, werden die untergeordneten EXPLANATION-Checkpoints als kompakte
   * Listenzeilen (Kurzlabel + (?)-Tooltip + Inline-Buttons) gerendert anstatt
   * als ausführliche Frage-Blöcke. In der internen M2-Kläransicht ist dieser
   * Modus profilübergreifend aktiv (alle `*SpecificSection`-Komponenten und
   * der generische `SpecificSection`-Fallback setzen ihn).
   */
  compactRows?: boolean;
}) {
  const isIntroActive = statuses[sectionIntro.id] === "ACTIVE";
  // Eine Schublade gilt als „leer", wenn sie keinen einzigen sichtbaren
  // Hinweis (EXPLANATION-Checkpoint) enthält. Solche Schubladen werden
  // optisch deutlich zurückgenommen (heller Hintergrund, schwächere Border,
  // geringere Text-Opacity, kein Hover-Highlight) – bleiben aber sichtbar
  // und anklickbar. Sobald mindestens ein sichtbarer Hinweis existiert,
  // wird die Schublade ganz normal dargestellt – unabhängig davon, ob sie
  // bereits beantwortet wurde.
  const isEmptyDrawer = checkpoints.length === 0;
  // Initial geschlossen für alle Antwortkontext-Akkordeons (M2-UI-Vorgabe).
  // Nutzer:innen öffnen die Schublade manuell. `isIntroActive` /
  // beantwortete Checkpoints werden bewusst NICHT in den Init-State gemischt,
  // damit beim Laden von M2 keine Schublade aufklappt; `defaultOpen` bleibt als
  // Eskalations-Hook erhalten, wird aktuell aber von keinem Profil gesetzt.
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Drawer-Label = Section-Intro-Label ohne den Präfix „Schublade: "
  const drawerLabel = sectionIntro.label.replace(/^Schublade:\s*/, "");

  // Header-Hintergrund: gefüllte Schubladen behalten das bisherige Verhalten
  // (Hover-/Open-Highlight via `--muted`); leere Schubladen bekommen einen
  // ruhigen, sehr hellen Hintergrund ohne sichtbaren Open-Highlight.
  const headerBackground = isEmptyDrawer
    ? "var(--background)"
    : isOpen
    ? "var(--muted, #f5f5f5)"
    : "var(--background)";

  return (
    <div
      style={{
        // Aktive Schublade: dezenter linker Akzentbalken statt aggressiver
        // 2px-Primär-Border. Leere Schublade: schwächere Border, ruhiger Look.
        border: isEmptyDrawer
          ? "1px dashed var(--border)"
          : "1px solid var(--border)",
        borderLeft: isIntroActive
          ? "3px solid var(--primary, #2563eb)"
          : isEmptyDrawer
          ? "1px dashed var(--border)"
          : "1px solid var(--border)",
        borderRadius: "var(--radius)",
        marginBottom: "0.5rem",
        overflow: "hidden",
        // Geringere Text-Opacity für leere Schubladen (laut Spec) – aber
        // hoch genug, damit das Label noch sicher lesbar bleibt.
        opacity: isEmptyDrawer ? 0.65 : 1,
        background: isEmptyDrawer ? "var(--background)" : undefined,
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.65rem 0.9rem",
          background: headerBackground,
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: "0.5rem",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            <span aria-hidden="true">↳ </span>{drawerLabel}
            {isIntroActive && (
              <span
                aria-label="aktiver Antwortkontext"
                style={{
                  marginLeft: "0.5rem",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  background: "var(--primary, #2563eb)",
                  color: "#fff",
                  borderRadius: "var(--radius)",
                  padding: "0.05rem 0.4rem",
                }}
              >
                AKTIV
              </span>
            )}
          </div>
          {!isOpen && sectionIntro.previewText && (
            <div className="text-muted text-small" style={{ marginTop: "0.1rem" }}>
              „… {sectionIntro.previewText}"
            </div>
          )}
        </div>
        <span aria-hidden="true" style={{ flexShrink: 0 }}>
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <div style={{ padding: "0.5rem 0.9rem 0.75rem" }}>
          {/* Section-Intro-Toggle: der Anschluss-Satz selbst ist der Button.
              Klick aktiviert/deaktiviert den Antwortkontext (Toggle-Logik
              unverändert via `applySectionIntroToggle`). */}
          <div
            style={{
              padding: "0.4rem 0",
              marginBottom: "0.25rem",
            }}
          >
            <button
              type="button"
              onClick={() => onSectionIntroToggle(sectionIntro.id)}
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: isIntroActive
                  ? "var(--primary, #2563eb)"
                  : "var(--background)",
                color: isIntroActive ? "#fff" : "var(--foreground)",
                fontWeight: isIntroActive ? 600 : 400,
                cursor: "pointer",
                fontSize: "0.85rem",
                textAlign: "left",
                lineHeight: 1.35,
                whiteSpace: "normal",
                width: "100%",
              }}
              aria-pressed={isIntroActive}
            >
              {sectionIntro.previewText
                ? `„… ${sectionIntro.previewText}"`
                : drawerLabel}
            </button>
          </div>

          {/* Untergeordnete Checkpoints (Ja/Nein, unverändertes Verhalten).
              Bei leerem Antwortkontext bewusst nichts rendern (keine internen
              Hinweistexte mehr). */}
          {checkpoints.length > 0 &&
            (compactRows
              ? checkpoints.map((cp) => (
                  <CompactExplanationRow
                    key={cp.id}
                    checkpoint={cp}
                    shortLabel={shortLabels[cp.id] ?? cp.label}
                    value={statuses[cp.id]}
                    onChange={onChange}
                  />
                ))
              : checkpoints.map((cp) => (
                  <ExplanationQuestionRow
                    key={cp.id}
                    checkpoint={{ ...cp, label: shortLabels[cp.id] ?? cp.label }}
                    value={statuses[cp.id]}
                    onChange={onChange}
                  />
                )))}
        </div>
      )}
    </div>
  );
}

/**
 * Pilot-Mapping: Section-Intro → fachlich passende Checkpoint-IDs pro Profil.
 *
 * Reine UI-Gruppierung. Bestehende Checkpoints werden nur einsortiert; keine
 * neuen fachlichen Checkpoints, keine Texte verändert. Kein Einfluss auf
 * Decision/Output-Logik. Ein Checkpoint kann in mehreren Schubladen
 * erscheinen; sein Ja/Nein-Status bleibt global synchron.
 *
 * `defaultOpen` markiert die Standard-Schublade pro Profil – sie ist im
 * Sinne der Praxis-Heuristik der wahrscheinlichste Einstieg.
 */
type SectionIntroGroupMapping = {
  sectionIntroId: string;
  checkpointIds: readonly string[];
  defaultOpen?: boolean;
};

const SECTION_INTRO_GROUPS_BY_PROFILE: Record<string, readonly SectionIntroGroupMapping[]> = {
  AU: [
    {
      sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE",
      checkpointIds: [],
    },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: [
        "AU_DIGITAL_AU_PROCESS",
        "AU_FOLLOWUP",
        "AU_NO_APPOINTMENT_ACUTE",
        "AU_MEDICAL_CONSULTATION_REQUIRED",
        "AU_BACKDATE_LIMIT",
        "AU_NEW_PATIENT_LIMIT",
        "MEDICAL_DOCUMENT_AU_DIFFERENCE",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_INFO_MISSING",
      checkpointIds: ["AU_MISSING_QUESTIONNAIRE"],
    },
    {
      sectionIntroId: "SECTION_INTRO_DOCS_MISSING",
      checkpointIds: ["AU_MISSING_EGK"],
    },
    {
      sectionIntroId: "SECTION_INTRO_IN_PROGRESS",
      checkpointIds: [],
    },
    {
      sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE",
      checkpointIds: ["AU_WORK_ACCIDENT", "AU_CHILD_SICK"],
    },
  ],
  PRESCRIPTION: [
    {
      sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE",
      checkpointIds: ["REQUIRED_INFORMATION_COMPLETE"],
    },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: [
        // Ergebnis nach Prüfung: Kasse/Privat-Unterscheidung
        "PRESCRIPTION_STATUTORY_POSSIBLE",
        // Begründung Privatrezept (nur Selbstzahler)
        "PRESCRIPTION_PRIVATE_ONLY",
        // Kein Rezept nötig (frei verkäuflich o. Ä.)
        "PRESCRIPTION_NO_PRESCRIPTION_REQUIRED",
        // Hinweis zum Postversand (Prozessergebnis)
        "PRESCRIPTION_NO_POSTAL_DELIVERY",
        // Nachträgliche Änderung nach Apothekenrückmeldung – Ergebnis
        "PRESCRIPTION_RECIPE_CHANGED_AFTER_PHARMACY_FEEDBACK",
        // Dauermedikation: Hinweis "Kontrolltermine vorgesehen" ist
        // ein Ergebnis nach Prüfung, kein Blocker → bleibt hier.
        "PRESCRIPTION_CHRONIC_PATIENT",
        // Medizinische Begründung für angefragtes Medikament fehlt
        "PRESCRIPTION_INDICATION_NOT_DOCUMENTED",
        // Verordnung erfordert ärztliche Einschätzung
        "PRESCRIPTION_DOCTOR_REVIEW_REQUIRED",
        // Dauermedikation: persönlicher Arzttermin vor weiterer Verordnung erforderlich
        "PRESCRIPTION_FOLLOWUP_REQUIRED_IN_PERSON",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_INFO_MISSING",
      checkpointIds: [
        "PRESCRIPTION_MEDICATION_UNCLEAR",
        "PRESCRIPTION_DOSAGE_UNCLEAR",
        "PRESCRIPTION_MEDICATION_NOT_DOCUMENTED",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_DOCS_MISSING",
      checkpointIds: [
        "PRESCRIPTION_SPECIALIST_REPORT_REQUIRED",
        "HOSPITAL_DISCHARGE_REPORT_MISSING",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_IN_PROGRESS",
      checkpointIds: [],
    },
    {
      sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE",
      checkpointIds: [
        // Anliegen gehört zur fachärztlichen Versorgung
        "PRESCRIPTION_SPECIALIST_RESPONSIBLE",
        // BtM/ADHS: nicht im normalen hausärztlichen Rezeptweg
        "PRESCRIPTION_BTM_ADHS_RULES",
        // Pille/Gynäkologie: nicht im hausärztlichen Rezeptweg
        "PRESCRIPTION_GYN_EXCLUSIVITY",
        // Patient im Ausland: regulär nicht von uns einlösbar
        "PRESCRIPTION_PATIENT_NOT_IN_GERMANY",
      ],
    },
  ],
  LAB: [
    {
      sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE",
      checkpointIds: [
        "REQUIRED_INFORMATION_COMPLETE",
        "LAB_INTERNAL_ORDER_AVAILABLE",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: [
        "LAB_INTERNAL_ORDER",
        "LAB_EXTERNAL_REFERRAL",
        "LAB_CHECKUP_RULES",
        "LAB_CHECKUP_BASIC_LAB_INCLUDED",
        "LAB_MEDICAL_CONSULTATION_REQUIRED",
        "BILLING_COST_NOT_COVERED",
        "LAB_SELF_PAYER_POSSIBLE",
        "LAB_CONTROL_TIMING_NOT_DUE",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_INFO_MISSING",
      checkpointIds: ["APPOINTMENT_DATA_INCOMPLETE"],
    },
    {
      sectionIntroId: "SECTION_INTRO_DOCS_MISSING",
      checkpointIds: [
        "LAB_INTERNAL_ORDER_MISSING",
        "LAB_SPECIALIST_REFERRAL_ORIGINAL_REQUIRED",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_IN_PROGRESS",
      checkpointIds: ["LAB_RESULTS_PENDING"],
    },
    {
      sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE",
      checkpointIds: ["LAB_MPU_EXCLUSION"],
    },
  ],
  SAMPLE_COLLECTION: [
    { sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE", checkpointIds: [] },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: ["SAMPLE_COLLECTION_ORDER_AVAILABLE"],
    },
    { sectionIntroId: "SECTION_INTRO_INFO_MISSING", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_DOCS_MISSING", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_IN_PROGRESS", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE", checkpointIds: [] },
  ],
  ACUTE_CARE: [
    { sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE", checkpointIds: [] },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: ["ACUTE_PURPOSE", "ACUTE_APPOINTMENT_INFO"],
    },
    { sectionIntroId: "SECTION_INTRO_INFO_MISSING", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_DOCS_MISSING", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_IN_PROGRESS", checkpointIds: [] },
    {
      sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE",
      checkpointIds: ["ACUTE_EXCLUSION", "CHRONIC_EXCLUSION"],
    },
  ],
  REFERRAL: [
    {
      sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE",
      checkpointIds: ["REQUIRED_INFORMATION_COMPLETE"],
    },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: [
        "REFERRAL_CAN_BE_ISSUED",
        "REF_SPECIALTY_REQUIRED",
        "REF_PSYCHOTHERAPY_FIRST_STEP",
        "REF_HAV_CASE",
        "REF_MEDICAL_CONSULTATION_REQUIRED",
      ],
    },
    { sectionIntroId: "SECTION_INTRO_INFO_MISSING", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_DOCS_MISSING", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_IN_PROGRESS", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE", checkpointIds: [] },
  ],
  HOSPITAL_ADMISSION: [
    {
      sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE",
      checkpointIds: ["REQUIRED_INFORMATION_COMPLETE"],
    },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: [
        "HOSPITAL_ADMISSION_CAN_BE_ISSUED",
        "HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED",
        "HOSPITAL_TRANSPORT_REQUIRED",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_INFO_MISSING",
      checkpointIds: ["HOSPITAL_ADMISSION_MISSING_INFO"],
    },
    { sectionIntroId: "SECTION_INTRO_DOCS_MISSING", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_IN_PROGRESS", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE", checkpointIds: [] },
  ],
  IMMUNIZATION: [
    {
      sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE",
      checkpointIds: ["REQUIRED_INFORMATION_COMPLETE"],
    },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: [
        "IMMUNIZATION_STANDARD_AVAILABLE",
        "IMMUNIZATION_RISK_REVIEW_REQUIRED",
        "IMMUNIZATION_TRAVEL_MEDICINE",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_INFO_MISSING",
      checkpointIds: ["IMMUNIZATION_STATUS_UNCLEAR"],
    },
    {
      sectionIntroId: "SECTION_INTRO_DOCS_MISSING",
      checkpointIds: ["IMMUNIZATION_VACCINATION_RECORD_MISSING"],
    },
    { sectionIntroId: "SECTION_INTRO_IN_PROGRESS", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE", checkpointIds: [] },
  ],
  APPOINTMENT: [
    {
      sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE",
      checkpointIds: ["REQUIRED_INFORMATION_COMPLETE"],
    },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: [
        "APPOINTMENT_CAN_BE_BOOKED",
        "APPOINTMENT_CANCEL_OR_RESCHEDULE",
        "APPOINTMENT_WRONG_TYPE",
        "APPOINTMENT_EXTERNAL_FINDING_PRESENT",
        "APPOINTMENT_TYPE_QUESTION",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_INFO_MISSING",
      checkpointIds: ["APPOINTMENT_DATA_INCOMPLETE", "APPOINTMENT_BOOKING_CODE_REQUIRED"],
    },
    {
      sectionIntroId: "SECTION_INTRO_DOCS_MISSING",
      checkpointIds: [],
    },
    {
      sectionIntroId: "SECTION_INTRO_IN_PROGRESS",
      checkpointIds: [],
    },
    {
      sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE",
      checkpointIds: [],
    },
  ],
  TECH_SUPPORT: [
    { sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE", checkpointIds: [] },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: ["TECH_VIDEO_NOT_WORKING"],
    },
    { sectionIntroId: "SECTION_INTRO_INFO_MISSING", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_DOCS_MISSING", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_IN_PROGRESS", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE", checkpointIds: [] },
  ],
  ONBOARDING: [
    {
      sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE",
      checkpointIds: ["REQUIRED_INFORMATION_COMPLETE"],
    },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: ["ONBOARDING_DOCTOLIB_INFO"],
    },
    {
      sectionIntroId: "SECTION_INTRO_INFO_MISSING",
      checkpointIds: [
        "ONBOARDING_DATA_INCOMPLETE",
        "ONBOARDING_DATA_UPDATE_REQUIRED",
        "ONBOARDING_IDENTITY_MISMATCH",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_DOCS_MISSING",
      checkpointIds: [
        "ONBOARDING_GKV_DOCUMENT_MISSING",
        "ONBOARDING_PKV_PAS_MISSING",
      ],
    },
    { sectionIntroId: "SECTION_INTRO_IN_PROGRESS", checkpointIds: [] },
    {
      sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE",
      checkpointIds: ["ONBOARDING_WRONG_PRACTICE"],
    },
  ],
  BILLING: [
    {
      sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE",
      checkpointIds: ["REQUIRED_INFORMATION_COMPLETE"],
    },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: ["BILLING_COST_NOT_COVERED", "BILLING_INVOICE_TIMING"],
    },
    {
      sectionIntroId: "SECTION_INTRO_INFO_MISSING",
      checkpointIds: ["BILLING_ADDRESS_MISSING"],
    },
    {
      sectionIntroId: "SECTION_INTRO_DOCS_MISSING",
      checkpointIds: ["BILLING_DOCUMENT_MISSING"],
    },
    { sectionIntroId: "SECTION_INTRO_IN_PROGRESS", checkpointIds: [] },
    {
      sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE",
      checkpointIds: [
        "BILLING_EXTERNAL_RESPONSIBILITY",
        "BILLING_EXTERNAL_PROVIDER",
      ],
    },
  ],
  MEDICAL_DOCUMENTS: [
    {
      sectionIntroId: "SECTION_INTRO_DOCS_COMPLETE",
      checkpointIds: ["REQUIRED_INFORMATION_COMPLETE"],
    },
    {
      sectionIntroId: "SECTION_INTRO_REVIEWED",
      checkpointIds: [
        "MEDICAL_DOCUMENT_POSSIBLE",
        "MEDICAL_DOCUMENT_PRIVATE_SERVICE",
        "MEDICAL_DOCUMENT_CONSULTATION_REQUIRED",
        "MEDICAL_DOCUMENT_AU_DIFFERENCE",
      ],
    },
    {
      sectionIntroId: "SECTION_INTRO_INFO_MISSING",
      checkpointIds: ["MEDICAL_DOCUMENT_INFO_MISSING"],
    },
    {
      sectionIntroId: "SECTION_INTRO_DOCS_MISSING",
      checkpointIds: ["MEDICAL_DOCUMENTS_TRANSLATION_REQUIRED"],
    },
    { sectionIntroId: "SECTION_INTRO_IN_PROGRESS", checkpointIds: [] },
    { sectionIntroId: "SECTION_INTRO_NOT_RESPONSIBLE", checkpointIds: [] },
  ],
};

/**
 * Gibt `true` zurück, wenn für das übergebene Profil eine
 * `SECTION_INTRO_GROUPS_BY_PROFILE`-Antwortkontext-Struktur existiert.
 *
 * Dient als Schalter, um die alten profilspezifischen Akkordeon-Gruppen
 * (`PRESCRIPTION_GROUPS`, `REFERRAL_GROUPS`, …) nur dann als Fallback zu
 * rendern, wenn kein neues Antwortkontext-Mapping vorhanden ist – damit
 * die UI pro Profil immer nur eine Akkordeon-Struktur zeigt.
 */
function hasSectionIntroMapping(inquiryId: string): boolean {
  return (SECTION_INTRO_GROUPS_BY_PROFILE[inquiryId]?.length ?? 0) > 0;
}

/**
 * Rendert pro Profil die Section-Intros als M2-Schubladen-Akkordeon.
 *
 * Reihenfolge: identisch zur Profil-Whitelist `availableSectionIntroIds`.
 * Checkpoints, die in keiner Schublade vorkommen, landen in einem optionalen
 * Fallback-Drawer „Weitere passende Hinweise", damit kein bestehender
 * EXPLANATION-Checkpoint stillschweigend verschwindet.
 */
function ProfileSectionIntroDrawers({
  inquiryId,
  sectionIntroCheckpoints,
  explanationCheckpoints,
  shortLabels,
  statuses,
  onChange,
  onSectionIntroToggle,
  compactRows = false,
}: {
  inquiryId: string;
  sectionIntroCheckpoints: PlainCheckpoint[];
  explanationCheckpoints: PlainCheckpoint[];
  shortLabels: Record<string, string>;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSectionIntroToggle: (clickedId: string) => void;
  /** Reicht den Compact-Mode an `SectionIntroAccordion` und den Fallback-Drawer weiter. */
  compactRows?: boolean;
}) {
  const cpById = new Map<string, PlainCheckpoint>(
    explanationCheckpoints.map((cp) => [cp.id, cp]),
  );
  const introById = new Map<string, PlainCheckpoint>(
    sectionIntroCheckpoints.map((cp) => [cp.id, cp]),
  );
  const mapping = SECTION_INTRO_GROUPS_BY_PROFILE[inquiryId] ?? [];

  // Welche Checkpoints sind irgendeiner Schublade zugeordnet?
  const groupedCheckpointIds = new Set<string>(
    mapping.flatMap((g) => g.checkpointIds),
  );
  const ungroupedCheckpoints = explanationCheckpoints.filter(
    (cp) => !groupedCheckpointIds.has(cp.id),
  );

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      {mapping.map((group) => {
        const sectionIntro = introById.get(group.sectionIntroId);
        if (!sectionIntro) return null;
        const groupCheckpoints = group.checkpointIds
          .map((id) => cpById.get(id))
          .filter((cp): cp is PlainCheckpoint => cp !== undefined);
        return (
          <SectionIntroAccordion
            key={group.sectionIntroId}
            sectionIntro={sectionIntro}
            checkpoints={groupCheckpoints}
            statuses={statuses}
            onChange={onChange}
            onSectionIntroToggle={onSectionIntroToggle}
            shortLabels={shortLabels}
            defaultOpen={group.defaultOpen ?? false}
            compactRows={compactRows}
          />
        );
      })}

      {/* Fallback-Drawer für nicht zugeordnete EXPLANATION-Checkpoints. */}
      {ungroupedCheckpoints.length > 0 && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            marginBottom: "0.5rem",
            overflow: "hidden",
          }}
        >
          <details>
            <summary
              style={{
                padding: "0.65rem 0.9rem",
                background: "var(--background)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              <span aria-hidden="true">→ </span>Weitere passende Hinweise
            </summary>
            <div style={{ padding: "0.5rem 0.9rem 0.75rem" }}>
              {compactRows
                ? ungroupedCheckpoints.map((cp) => (
                    <CompactExplanationRow
                      key={cp.id}
                      checkpoint={cp}
                      shortLabel={shortLabels[cp.id] ?? cp.label}
                      value={statuses[cp.id]}
                      onChange={onChange}
                    />
                  ))
                : ungroupedCheckpoints.map((cp) => (
                    <ExplanationQuestionRow
                      key={cp.id}
                      checkpoint={{ ...cp, label: shortLabels[cp.id] ?? cp.label }}
                      value={statuses[cp.id]}
                      onChange={onChange}
                    />
                  ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

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
 * Kleiner Inline-Tooltip / Popover für die kompakte M2-Listenansicht.
 *
 * Verhalten:
 * – Hover (Desktop): öffnet beim `mouseenter`, schließt beim `mouseleave`.
 * – Klick / Tap (Touch): öffnet bzw. schließt persistent.
 * – Klick außerhalb oder `Escape`: schließt den Tooltip wieder.
 * – Kein neues Modal, kein Backdrop – nur ein kleiner positionierter Block
 *   neben dem Trigger.
 *
 * Bewusst eigenständig (kein neues Lib-Dependency), weil das Repo aktuell
 * keine Tooltip-Komponente besitzt und der Use-Case begrenzt ist
 * (interne MFA-Klär-Ansicht, profilübergreifend in M2 verwendet).
 */
function CompactTooltip({
  text,
  ariaLabel,
}: {
  /** Vollständiger Tooltip-Text (z. B. die Originalfrage des Checkpoints). */
  text: string;
  /** Screenreader-Label für den Trigger-Button. */
  ariaLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Schließe persistenten (Klick-)Open beim Klick außerhalb oder Escape.
  useEffect(() => {
    if (!isOpen) return;
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const visible = isOpen || isHovered;

  return (
    <span
      ref={containerRef}
      style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={visible}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "1.1rem",
          height: "1.1rem",
          borderRadius: "50%",
          border: "1px solid var(--border)",
          background: "var(--background)",
          color: "var(--muted-foreground, #6b7280)",
          fontSize: "0.7rem",
          cursor: "help",
          padding: 0,
          lineHeight: 1,
        }}
      >
        ?
      </button>
      {visible && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 0.35rem)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            minWidth: "12rem",
            maxWidth: "22rem",
            background: "var(--foreground, #111827)",
            color: "var(--background, #ffffff)",
            padding: "0.4rem 0.6rem",
            borderRadius: "var(--radius)",
            fontSize: "0.8rem",
            lineHeight: 1.35,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            whiteSpace: "normal",
            textAlign: "left",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

/**
 * Kompakte Listen-Darstellung eines EXPLANATION-Checkpoints für die interne
 * M2-MFA-Klär-Ansicht. Profilübergreifend in allen Antwortkontext-Schubladen
 * verwendet (PRESCRIPTION, AU, REFERRAL, HOSPITAL_ADMISSION, LAB,
 * IMMUNIZATION, APPOINTMENT, ONBOARDING sowie der generische
 * `SpecificSection`-Fallback für BILLING, ACUTE_CARE, SAMPLE_COLLECTION,
 * TECH_SUPPORT, MEDICAL_DOCUMENTS).
 *
 * Anzeige:
 *   `Kurzlabel (?)                                  [Ja] [Nein]`
 *
 * – Kurzlabel: vom aufrufenden Profil (z. B. „Termin möglich").
 * – (?): `CompactTooltip` – zeigt die Originalfrage per Hover oder Klick.
 *   Die Langfrage wird NICHT zusätzlich sichtbar gerendert.
 * – Ja/Nein: dieselben `YesNoButtons`, jetzt rechtsbündig in derselben Zeile.
 *
 * Diese Komponente ändert ausschließlich die Darstellung. Die gespeicherten
 * Werte (Status pro Checkpoint), die Frage-Texte selbst und die Logik der
 * `onChange`-Callback bleiben unverändert.
 */
function CompactExplanationRow({
  checkpoint,
  shortLabel,
  value,
  onChange,
}: {
  checkpoint: PlainCheckpoint;
  /** Kurzlabel aus dem Profil-`shortLabels`-Mapping (z. B. „Termin möglich"). */
  shortLabel: string;
  value: string | undefined;
  onChange: (id: string, val: string) => void;
}) {
  const questions = checkpoint.questions ?? [];
  const tooltipText =
    questions.length > 0
      ? questions.map((q) => q.text).join("\n")
      : checkpoint.question ?? checkpoint.label;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.5rem",
        padding: "0.4rem 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          minWidth: 0,
          flex: "1 1 auto",
        }}
      >
        <span style={{ fontSize: "0.9rem" }}>{shortLabel}</span>
        <CompactTooltip
          text={tooltipText}
          ariaLabel={`Erklärung anzeigen: ${tooltipText}`}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        {YES_NO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(checkpoint.id, opt.value)}
            style={{
              padding: "0.2rem 0.65rem",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background:
                value === opt.value ? "var(--primary, #2563eb)" : "var(--background)",
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
  onSectionIntroToggle,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSectionIntroToggle: (clickedId: string) => void;
}) {
  // Wenn das Profil bereits Antwortkontexte (SECTION_INTRO_GROUPS_BY_PROFILE)
  // hat, übernimmt `ProfileSectionIntroDrawers` (oben) das Rendering aller
  // EXPLANATION-Checkpoints (in den Schubladen plus Fallback-Drawer
  // „Weitere passende Hinweise"). In dem Fall dürfen die EXPLANATION-Einträge
  // hier nicht zusätzlich unter "+ Zusatzfragen" erscheinen, sonst werden
  // dieselben Checkpoints doppelt angezeigt (Regression bei ACUTE_CARE,
  // SAMPLE_COLLECTION, TECH_SUPPORT, BILLING, MEDICAL_DOCUMENTS).
  const hasIntroMapping = hasSectionIntroMapping(section.inquiryId);
  const visibleSpecificCheckpoints = hasIntroMapping
    ? section.specificCheckpoints.filter(
        (cp) => cp.kind !== InquiryCheckpointKind.EXPLANATION,
      )
    : section.specificCheckpoints;

  // Auto-expand wenn mindestens ein SPECIFIC EXPLANATION Checkpoint bereits YES/NO hat.
  const hasAnsweredSpecific = visibleSpecificCheckpoints.some(
    (cp) => statuses[cp.id] === "YES" || statuses[cp.id] === "NO",
  );
  // Auto-expand auch wenn ein ACTION Checkpoint gesetzt wurde.
  const hasAnsweredAction = section.actionCheckpoints.some(
    (cp) => statuses[cp.id] === "ACTIVE" || statuses[cp.id] === "INACTIVE",
  );
  const hasMore = visibleSpecificCheckpoints.length > 0 || section.actionCheckpoints.length > 0;
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

      {/* Antwortkontexte als M2-Schubladen-Akkordeon (für alle Profile). */}
      {(section.sectionIntroCheckpoints?.length ?? 0) > 0 && (
        <ProfileSectionIntroDrawers
          inquiryId={section.inquiryId}
          sectionIntroCheckpoints={section.sectionIntroCheckpoints ?? []}
          explanationCheckpoints={section.specificCheckpoints.filter(
            (cp) => cp.kind === InquiryCheckpointKind.EXPLANATION,
          )}
          shortLabels={{}}
          statuses={statuses}
          onChange={onChange}
          onSectionIntroToggle={onSectionIntroToggle}
          compactRows
        />
      )}

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
                  {visibleSpecificCheckpoints.length > 0 && (
                    <div
                      className="text-muted text-small"
                      style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
                    >
                      <span aria-hidden="true">+ </span>Zusatzfragen
                    </div>
                  )}
                  {/* SPECIFIC EXPLANATION Checkpoints */}
                  {visibleSpecificCheckpoints.map((cp) =>
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
  PRESCRIPTION_RECIPE_CHANGED_AFTER_PHARMACY_FEEDBACK: "Rezept nach Apothekenrückmeldung geändert",
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
      // Rezept nachträglich auf Basis der Apothekenrückmeldung angepasst
      "PRESCRIPTION_RECIPE_CHANGED_AFTER_PHARMACY_FEEDBACK",
    ],
    defaultOpen: false,
  },

  // ── 6. Problem nach Ausstellung ────────────────────────────────────────────
  {
    id: "problem_nach_ausstellung",
    label: "Problem nach Ausstellung",
    description: "Wenn ein Rezept bereits ausgestellt wurde, aber danach ein Problem entsteht.",
    checkpointIds: [
      // Auslandsaufenthalt: Einlösung nur in deutschen Apotheken möglich
      "PRESCRIPTION_PATIENT_NOT_IN_GERMANY",
      // Postversand angefragt (als Kontext bei Einlösungsproblemen)
      "PRESCRIPTION_NO_POSTAL_DELIVERY",
      // Rezept nach Ausstellung auf Basis der Apothekenrückmeldung angepasst
      "PRESCRIPTION_RECIPE_CHANGED_AFTER_PHARMACY_FEEDBACK",
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
          {!isOpen && group.description && (
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
          {group.description && (
            <div className="text-muted text-small" style={{ marginBottom: "0.5rem" }}>
              {group.description}
            </div>
          )}

          {checkpoints.length > 0 &&
            checkpoints.map((cp) => (
              <ExplanationQuestionRow
                key={cp.id}
                checkpoint={{ ...cp, label: shortLabels[cp.id] ?? cp.label }}
                value={statuses[cp.id]}
                onChange={onChange}
              />
            ))}
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
  onSectionIntroToggle,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSectionIntroToggle: (clickedId: string) => void;
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
      {/* Antwortkontexte als M2-Schubladen-Akkordeon. */}
      <ProfileSectionIntroDrawers
        inquiryId={section.inquiryId}
        sectionIntroCheckpoints={section.sectionIntroCheckpoints ?? []}
        explanationCheckpoints={section.specificCheckpoints.filter(
          (cp) => cp.kind === InquiryCheckpointKind.EXPLANATION,
        )}
        shortLabels={PRESCRIPTION_SHORT_LABELS}
        statuses={statuses}
        onChange={onChange}
        onSectionIntroToggle={onSectionIntroToggle}
        compactRows
      />

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

      {/*
        Accordion-Gruppen – je nur Situationsmerkmale/Checkpoints, keine Actions.
        Nur als Fallback rendern, wenn das Profil noch kein neues
        SECTION_INTRO_GROUPS_BY_PROFILE-Mapping besitzt (sonst würde die UI
        die Antwortkontexte und die alten Profil-Gruppen doppelt zeigen).
      */}
      {!hasSectionIntroMapping(section.inquiryId) && (
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
      )}
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
  onSectionIntroToggle,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSectionIntroToggle: (clickedId: string) => void;
}) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>{section.label}</h2>
      {/* Pilot: Section-Intros sind jetzt die Schubladen (Akkordeons). */}
      <ProfileSectionIntroDrawers
        inquiryId={section.inquiryId}
        sectionIntroCheckpoints={section.sectionIntroCheckpoints ?? []}
        explanationCheckpoints={section.specificCheckpoints.filter(
          (cp) => cp.kind === InquiryCheckpointKind.EXPLANATION,
        )}
        shortLabels={AU_SHORT_LABELS}
        statuses={statuses}
        onChange={onChange}
        onSectionIntroToggle={onSectionIntroToggle}
        compactRows
      />

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
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ende AU M2 Gruppen-Prototyp
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// REFERRAL M2 Gruppen-Prototyp
// ─────────────────────────────────────────────────────────────────────────────

const REFERRAL_SHORT_LABELS: Record<string, string> = {
  REF_SPECIALTY_REQUIRED: "Fachrichtung fehlt",
  REF_MEDICAL_CONSULTATION_REQUIRED: "Ärztliche Einschätzung",
  REF_PSYCHOTHERAPY_FIRST_STEP: "Psychotherapie Erstvorstellung",
  REF_HAV_CASE: "Hausarztvermittlungsfall",
};

/**
 * Decision-Klärungsfragen, die in REFERRAL-M2 nicht angezeigt werden sollen.
 *
 * M2 = Situation / Kontext; M3 = Entscheidung.
 */
const REFERRAL_HIDDEN_DECISION_QUESTION_IDS = new Set([
  "REFERRAL_DECISION-Q1", // "Liegt eine ärztliche Anordnung aus unserer Praxis vor?"
]);

/**
 * Kommunikationsfunktions-basierte Gruppen für den REFERRAL M2 Prototyp.
 *
 * Ein Checkpoint kann in mehreren Gruppen erscheinen – der Status bleibt global
 * synchron (ein einziger Record-Eintrag). IDs ohne Profil-Eintrag werden robust
 * übersprungen.
 *
 * [PROTOTYP – hartcodiert, reversibel. Zum Rückgängigmachen: Render-Loop in
 *  InquiryM2Client wiederherstellen, diese Konstante und die zugehörigen
 *  Komponenten entfernen.]
 */
const REFERRAL_GROUPS: PrescriptionGroup[] = [
  // ── 1. Überweisung kann ausgestellt werden ────────────────────────────────
  {
    id: "ref_ausstellen",
    label: "Überweisung kann ausgestellt werden",
    description: "Wenn die Überweisung grundsätzlich ausgestellt werden kann.",
    checkpointIds: [
      "REFERRAL_CAN_BE_ISSUED",
    ],
    defaultOpen: true,
  },

  // ── 2. Es fehlen Angaben ──────────────────────────────────────────────────
  {
    id: "ref_fehlende_angaben",
    label: "Es fehlen Angaben",
    description: "Prozess ist blockiert, weil notwendige Angaben fehlen.",
    checkpointIds: [
      "REF_SPECIALTY_REQUIRED", // Fachrichtung nicht angegeben
    ],
    defaultOpen: false,
  },

  // ── 3. Ärztliche Einschätzung erforderlich ────────────────────────────────
  {
    id: "ref_aerztlich",
    label: "Ärztliche Einschätzung erforderlich",
    description: "Persönliche ärztliche Abklärung ist notwendig, bevor eine Überweisung ausgestellt werden kann.",
    checkpointIds: [
      "REF_MEDICAL_CONSULTATION_REQUIRED", // Ärztliche Konsultation erforderlich
    ],
    defaultOpen: false,
  },

  // ── 4. Sonderfall / Zuständigkeit ────────────────────────────────────────
  {
    id: "ref_sonderfall",
    label: "Sonderfall / Zuständigkeit",
    description: "Besonderer Prozess oder spezifische Zuständigkeit ist relevant.",
    checkpointIds: [
      "REF_PSYCHOTHERAPY_FIRST_STEP", // Erstvorstellung Psychotherapie
    ],
    defaultOpen: false,
  },

  // ── 5. Termin / Vermittlungscode ──────────────────────────────────────────
  {
    id: "ref_termin",
    label: "Termin / Vermittlungscode",
    description: "Hausarztvermittlungsfall oder Buchungscode ist relevant.",
    checkpointIds: [
      "REF_HAV_CASE", // Hausarztvermittlungsfall (mit Buchungscode)
    ],
    defaultOpen: false,
  },

  // ── 6. Erklärung / Rückfrage ──────────────────────────────────────────────
  {
    id: "ref_erklaeren",
    label: "Erklärung / Rückfrage",
    description: "Kommunikative Ergänzungen – z. B. Prozesshinweis oder fehlende Angabe erklären.",
    checkpointIds: [
      "REF_SPECIALTY_REQUIRED",        // Fachrichtung fehlt – Duplikat erlaubt
      "REF_PSYCHOTHERAPY_FIRST_STEP",  // Erstvorstellungsregel erklären
    ],
    defaultOpen: false,
  },
];

/**
 * Situationsbasierte Akkordeon-Gruppen für den REFERRAL M2 Prototyp.
 * Analog zu AUSpecificSection – keine Actions in M2.
 *
 * [PROTOTYP – hartcodiert, reversibel.]
 */
function ReferralSpecificSection({
  section,
  statuses,
  onChange,
  onSectionIntroToggle,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSectionIntroToggle: (clickedId: string) => void;
}) {
  // Nur EXPLANATION-Checkpoints – ACTION-Checkpoints werden in M2 nicht angezeigt.
  const cpById = new Map<string, PlainCheckpoint>(
    section.specificCheckpoints
      .filter((cp) => cp.kind === InquiryCheckpointKind.EXPLANATION)
      .map((cp) => [cp.id, cp]),
  );

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>{section.label}</h2>
      {/* Antwortkontexte als M2-Schubladen-Akkordeon. */}
      <ProfileSectionIntroDrawers
        inquiryId={section.inquiryId}
        sectionIntroCheckpoints={section.sectionIntroCheckpoints ?? []}
        explanationCheckpoints={section.specificCheckpoints.filter(
          (cp) => cp.kind === InquiryCheckpointKind.EXPLANATION,
        )}
        shortLabels={REFERRAL_SHORT_LABELS}
        statuses={statuses}
        onChange={onChange}
        onSectionIntroToggle={onSectionIntroToggle}
        compactRows
      />

      {/* Decision-Klärungsfragen (gefiltert) – immer sichtbar */}
      {(() => {
        const filteredDecisionQuestions = section.decisionQuestions.filter(
          (q) => !REFERRAL_HIDDEN_DECISION_QUESTION_IDS.has(q.id),
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

      {/*
        Accordion-Gruppen – je nur EXPLANATION-Checkpoints / Situationsmerkmale.
        Nur als Fallback rendern, wenn kein neues SECTION_INTRO_GROUPS_BY_PROFILE-Mapping
        existiert (sonst Doppeldarstellung mit den Antwortkontexten oben).
      */}
      {!hasSectionIntroMapping(section.inquiryId) && (
        <div style={{ marginBottom: "0.75rem" }}>
          {REFERRAL_GROUPS.map((group) => {
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
                shortLabels={REFERRAL_SHORT_LABELS}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ende REFERRAL M2 Gruppen-Prototyp
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// HOSPITAL_ADMISSION M2 Gruppen-Prototyp
// ─────────────────────────────────────────────────────────────────────────────

const HOSPITAL_ADMISSION_SHORT_LABELS: Record<string, string> = {
  HOSPITAL_ADMISSION_MISSING_INFO: "Angaben fehlen",
  HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED: "Ärztliche Konsultation",
  HOSPITAL_TRANSPORT_REQUIRED: "Krankentransport",
};

/**
 * Decision-Klärungsfragen, die in HOSPITAL_ADMISSION-M2 nicht angezeigt werden sollen.
 */
const HOSPITAL_ADMISSION_HIDDEN_DECISION_QUESTION_IDS = new Set([
  "HOSPITAL_ADMISSION_DECISION-Q1",
]);

const HOSPITAL_ADMISSION_GROUPS: PrescriptionGroup[] = [
  // ── 1. Einweisung kann ausgestellt werden ─────────────────────────────────
  {
    id: "hosp_ausstellen",
    label: "Einweisung kann ausgestellt werden",
    description: "Wenn die Krankenhauseinweisung grundsätzlich ausgestellt werden kann.",
    checkpointIds: [
      "HOSPITAL_ADMISSION_CAN_BE_ISSUED",
    ],
    defaultOpen: true,
  },

  // ── 2. Es fehlen Angaben ──────────────────────────────────────────────────
  {
    id: "hosp_fehlende_angaben",
    label: "Es fehlen Angaben",
    description: "Prozess ist blockiert, weil notwendige Angaben fehlen.",
    checkpointIds: [
      "HOSPITAL_ADMISSION_MISSING_INFO",
    ],
    defaultOpen: false,
  },

  // ── 3. Ärztliche Konsultation erforderlich ────────────────────────────────
  {
    id: "hosp_aerztlich",
    label: "Ärztliche Konsultation erforderlich",
    description: "Persönliche ärztliche Abklärung ist notwendig, bevor die Einweisung ausgestellt werden kann.",
    checkpointIds: [
      "HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED",
    ],
    defaultOpen: false,
  },

  // ── 4. Krankentransport ───────────────────────────────────────────────────
  {
    id: "hosp_transport",
    label: "Krankentransport",
    description: "Ein Krankentransport zur stationären Aufnahme ist relevant.",
    checkpointIds: [
      "HOSPITAL_TRANSPORT_REQUIRED",
    ],
    defaultOpen: false,
  },

  // ── 5. Erklärung / Rückfrage ──────────────────────────────────────────────
  {
    id: "hosp_erklaeren",
    label: "Erklärung / Rückfrage",
    description: "Kommunikative Ergänzungen – z. B. fehlende Angaben erklären oder ärztliche Einschätzung.",
    checkpointIds: [
      "HOSPITAL_ADMISSION_MISSING_INFO",
      "HOSPITAL_ADMISSION_MEDICAL_CONSULTATION_REQUIRED",
    ],
    defaultOpen: false,
  },
];

function HospitalAdmissionSpecificSection({
  section,
  statuses,
  onChange,
  onSectionIntroToggle,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSectionIntroToggle: (clickedId: string) => void;
}) {
  const cpById = new Map<string, PlainCheckpoint>(
    section.specificCheckpoints
      .filter((cp) => cp.kind === InquiryCheckpointKind.EXPLANATION)
      .map((cp) => [cp.id, cp]),
  );

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>{section.label}</h2>
      {/* Antwortkontexte als M2-Schubladen-Akkordeon. */}
      <ProfileSectionIntroDrawers
        inquiryId={section.inquiryId}
        sectionIntroCheckpoints={section.sectionIntroCheckpoints ?? []}
        explanationCheckpoints={section.specificCheckpoints.filter(
          (cp) => cp.kind === InquiryCheckpointKind.EXPLANATION,
        )}
        shortLabels={HOSPITAL_ADMISSION_SHORT_LABELS}
        statuses={statuses}
        onChange={onChange}
        onSectionIntroToggle={onSectionIntroToggle}
        compactRows
      />

      {/* Decision-Klärungsfragen (gefiltert) – immer sichtbar */}
      {(() => {
        const filteredDecisionQuestions = section.decisionQuestions.filter(
          (q) => !HOSPITAL_ADMISSION_HIDDEN_DECISION_QUESTION_IDS.has(q.id),
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

      {/*
        Accordion-Gruppen – Fallback nur, wenn kein neues
        SECTION_INTRO_GROUPS_BY_PROFILE-Mapping vorhanden ist.
      */}
      {!hasSectionIntroMapping(section.inquiryId) && (
        <div style={{ marginBottom: "0.75rem" }}>
          {HOSPITAL_ADMISSION_GROUPS.map((group) => {
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
                shortLabels={HOSPITAL_ADMISSION_SHORT_LABELS}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ende HOSPITAL_ADMISSION M2 Gruppen-Prototyp
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// LAB M2 Gruppen-Prototyp
// [PROTOTYP – hartcodiert, nur für LAB, reversibel]
// ─────────────────────────────────────────────────────────────────────────────

const LAB_SHORT_LABELS: Record<string, string> = {
  LAB_INTERNAL_ORDER: "Interne Laboranforderung",
  LAB_EXTERNAL_REFERRAL: "Externe Überweisung",
  LAB_CHECKUP_RULES: "Vorsorge-Regelwerk",
  LAB_MEDICAL_CONSULTATION_REQUIRED: "Ärztliche Klärung",
  APPOINTMENT_DATA_INCOMPLETE: "Angaben fehlen",
  BILLING_COST_NOT_COVERED: "Selbstzahler / IGeL",
  LAB_MPU_EXCLUSION: "MPU-Ausschluss",
};

/**
 * Situationsbasierte Akkordeon-Gruppen für den LAB M2 Prototyp.
 *
 * [PROTOTYP – hartcodiert, reversibel. Zum Rückgängigmachen: Render-Loop in
 *  InquiryM2Client wiederherstellen, diese Konstante und die zugehörigen
 *  Komponenten entfernen.]
 */
const LAB_GROUPS: PrescriptionGroup[] = [
  // ── 1. Termin kann stattfinden ────────────────────────────────────────────
  {
    id: "lab_termin_ok",
    label: "Termin kann stattfinden",
    description: "Wenn der Labortermin grundsätzlich stattfinden kann.",
    checkpointIds: [
      "LAB_INTERNAL_ORDER",
      "LAB_EXTERNAL_REFERRAL",
      "LAB_CHECKUP_RULES",
    ],
    defaultOpen: true,
  },

  // ── 2. Ärztliche Klärung erforderlich ─────────────────────────────────────
  {
    id: "lab_aerztlich",
    label: "Ärztliche Klärung erforderlich",
    description: "Persönliche ärztliche Abklärung ist notwendig, bevor der Termin stattfinden kann.",
    checkpointIds: [
      "LAB_MEDICAL_CONSULTATION_REQUIRED",
    ],
    defaultOpen: false,
  },

  // ── 3. Voraussetzungen / Angaben fehlen ───────────────────────────────────
  {
    id: "lab_angaben_fehlen",
    label: "Voraussetzungen / Angaben fehlen",
    description: "Prozess ist blockiert, weil notwendige Angaben fehlen.",
    checkpointIds: [
      "APPOINTMENT_DATA_INCOMPLETE",
    ],
    defaultOpen: false,
  },

  // ── 4. Kosten / Abrechnung ────────────────────────────────────────────────
  {
    id: "lab_kosten",
    label: "Kosten / Abrechnung",
    description: "Die Leistung ist keine Kassenleistung oder es sind Abrechnungsfragen relevant.",
    checkpointIds: [
      "BILLING_COST_NOT_COVERED",
    ],
    defaultOpen: false,
  },

  // ── 5. Nicht angebotene Leistungen ───────────────────────────────────────
  {
    id: "lab_sonderfall",
    label: "Nicht angebotene Leistungen",
    description: "Besonderer Prozess oder spezifische Ausschlussregel ist relevant.",
    checkpointIds: [
      "LAB_MPU_EXCLUSION",
    ],
    defaultOpen: false,
  },
];

/**
 * Situationsbasierte Akkordeon-Gruppen für den LAB M2 Prototyp.
 * Analog zu ReferralSpecificSection – keine Actions in M2.
 *
 * [PROTOTYP – hartcodiert, reversibel.]
 */
function LabSpecificSection({
  section,
  statuses,
  onChange,
  onSectionIntroToggle,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSectionIntroToggle: (clickedId: string) => void;
}) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>{section.label}</h2>
      <ProfileSectionIntroDrawers
        inquiryId={section.inquiryId}
        sectionIntroCheckpoints={section.sectionIntroCheckpoints ?? []}
        explanationCheckpoints={section.specificCheckpoints.filter(
          (cp) => cp.kind === InquiryCheckpointKind.EXPLANATION,
        )}
        shortLabels={LAB_SHORT_LABELS}
        statuses={statuses}
        onChange={onChange}
        onSectionIntroToggle={onSectionIntroToggle}
        compactRows
      />

      {/* Decision-Klärungsfragen – immer sichtbar */}
      {section.decisionQuestions.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div
            className="text-muted text-small"
            style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
          >
            <span aria-hidden="true">? </span>Klärungsfragen
          </div>
          <DecisionQuestionBlock
            questions={section.decisionQuestions}
            statuses={statuses}
            onChange={onChange}
          />
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ende LAB M2 Gruppen-Prototyp
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// IMMUNIZATION M2 Gruppen-Prototyp
// [PROTOTYP – hartcodiert, nur für IMMUNIZATION, reversibel]
// ─────────────────────────────────────────────────────────────────────────────

const IMMUNIZATION_SHORT_LABELS: Record<string, string> = {
  IMMUNIZATION_STANDARD_AVAILABLE: "Grippe / COVID",
  IMMUNIZATION_RISK_REVIEW_REQUIRED: "Beratung nötig",
  IMMUNIZATION_STATUS_UNCLEAR: "Impfstatus unklar",
  IMMUNIZATION_VACCINATION_RECORD_MISSING: "Impfpass fehlt",
  IMMUNIZATION_TRAVEL_MEDICINE: "Reiseimpfung",
};

/**
 * Situationsbasierte Akkordeon-Gruppen für den IMMUNIZATION M2 Prototyp.
 *
 * [PROTOTYP – hartcodiert, reversibel. Analog zu LAB_GROUPS.]
 */
const IMMUNIZATION_GROUPS: PrescriptionGroup[] = [
  {
    id: "immunization_moeglich",
    label: "Impfung möglich",
    description: "Grippeimpfung oder COVID-Booster ohne vorherige Impfberatung.",
    checkpointIds: [
      "IMMUNIZATION_STANDARD_AVAILABLE",
    ],
    defaultOpen: true,
  },
  {
    id: "immunization_aerztliche_klaerung",
    label: "Ärztliche Klärung / Impfberatung",
    description: "Wenn vor der Impfung eine ärztliche Einschätzung oder Impfberatung erforderlich ist.",
    checkpointIds: [
      "IMMUNIZATION_RISK_REVIEW_REQUIRED",
    ],
    defaultOpen: false,
  },
  {
    id: "immunization_angaben_fehlen",
    label: "Angaben / Nachweise fehlen",
    description: "Wenn Impfstatus oder Impfnachweise unklar sind.",
    checkpointIds: [
      "IMMUNIZATION_STATUS_UNCLEAR",
      "IMMUNIZATION_VACCINATION_RECORD_MISSING",
    ],
    defaultOpen: false,
  },
  {
    id: "immunization_nicht_angeboten",
    label: "Nicht angebotene Leistungen",
    description: "Leistungen, die in der Praxis nicht angeboten werden.",
    checkpointIds: [
      "IMMUNIZATION_TRAVEL_MEDICINE",
    ],
    defaultOpen: false,
  },
];

/**
 * Render-Section für den IMMUNIZATION M2 Prototyp.
 * Analog zu LabSpecificSection – keine Actions in M2.
 *
 * [PROTOTYP – hartcodiert, reversibel.]
 */
function ImmunizationSpecificSection({
  section,
  statuses,
  onChange,
  onSectionIntroToggle,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSectionIntroToggle: (clickedId: string) => void;
}) {
  const cpById = new Map<string, PlainCheckpoint>(
    section.specificCheckpoints
      .filter((cp) => cp.kind === InquiryCheckpointKind.EXPLANATION)
      .map((cp) => [cp.id, cp]),
  );

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>{section.label}</h2>
      {/* Antwortkontexte als M2-Schubladen-Akkordeon. */}
      <ProfileSectionIntroDrawers
        inquiryId={section.inquiryId}
        sectionIntroCheckpoints={section.sectionIntroCheckpoints ?? []}
        explanationCheckpoints={section.specificCheckpoints.filter(
          (cp) => cp.kind === InquiryCheckpointKind.EXPLANATION,
        )}
        shortLabels={IMMUNIZATION_SHORT_LABELS}
        statuses={statuses}
        onChange={onChange}
        onSectionIntroToggle={onSectionIntroToggle}
        compactRows
      />

      {/* Decision-Klärungsfragen – immer sichtbar */}
      {section.decisionQuestions.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div
            className="text-muted text-small"
            style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
          >
            <span aria-hidden="true">? </span>Klärungsfragen
          </div>
          <DecisionQuestionBlock
            questions={section.decisionQuestions}
            statuses={statuses}
            onChange={onChange}
          />
        </div>
      )}

      {/*
        Accordion-Gruppen – Fallback nur, wenn kein neues
        SECTION_INTRO_GROUPS_BY_PROFILE-Mapping vorhanden ist.
      */}
      {!hasSectionIntroMapping(section.inquiryId) && (
        <div style={{ marginBottom: "0.75rem" }}>
          {IMMUNIZATION_GROUPS.map((group) => {
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
                shortLabels={IMMUNIZATION_SHORT_LABELS}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ende IMMUNIZATION M2 Gruppen-Prototyp
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENT M2 Gruppen-Prototyp
// [PROTOTYP – hartcodiert, nur für APPOINTMENT, reversibel]
// ─────────────────────────────────────────────────────────────────────────────

const APPOINTMENT_SHORT_LABELS: Record<string, string> = {
  APPOINTMENT_CAN_BE_BOOKED: "Termin möglich",
  APPOINTMENT_CANCEL_OR_RESCHEDULE: "Termin ändern",
  APPOINTMENT_WRONG_TYPE: "Falscher Termintyp",
  APPOINTMENT_BOOKING_CODE_REQUIRED: "Buchungscode fehlt",
  APPOINTMENT_DATA_INCOMPLETE: "Angaben fehlen",
};

/**
 * Situationsbasierte Akkordeon-Gruppen für den APPOINTMENT M2 Prototyp.
 *
 * [PROTOTYP – hartcodiert, reversibel. Zum Rückgängigmachen: Render-Loop in
 *  InquiryM2Client wiederherstellen, diese Konstante und die zugehörigen
 *  Komponenten entfernen.]
 */
const APPOINTMENT_GROUPS: PrescriptionGroup[] = [
  {
    id: "appt_type",
    label: "Termin buchen / klären",
    description:
      "Termin grundsätzlich möglich, Buchungscode fehlt oder Termintyp passt nicht.",
    checkpointIds: [
      "APPOINTMENT_CAN_BE_BOOKED",
      "APPOINTMENT_BOOKING_CODE_REQUIRED",
      "APPOINTMENT_WRONG_TYPE",
    ],
    defaultOpen: true,
  },
  {
    id: "appt_manage",
    label: "Termin ändern",
    description: "Termin absagen oder verschieben.",
    checkpointIds: ["APPOINTMENT_CANCEL_OR_RESCHEDULE"],
    defaultOpen: false,
  },
  {
    id: "appt_missing",
    label: "Angaben fehlen",
    description:
      "Wenn Angaben zum Anliegen oder zur Terminvereinbarung fehlen.",
    checkpointIds: [
      "APPOINTMENT_DATA_INCOMPLETE",
    ],
    defaultOpen: false,
  },
];

/**
 * Situationsbasierte Akkordeon-Gruppen für den APPOINTMENT M2 Prototyp.
 * Analog zu LabSpecificSection – keine Actions in M2.
 *
 * [PROTOTYP – hartcodiert, reversibel.]
 */
function AppointmentSpecificSection({
  section,
  statuses,
  onChange,
  onSectionIntroToggle,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSectionIntroToggle: (clickedId: string) => void;
}) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>{section.label}</h2>
      <ProfileSectionIntroDrawers
        inquiryId={section.inquiryId}
        sectionIntroCheckpoints={section.sectionIntroCheckpoints ?? []}
        explanationCheckpoints={section.specificCheckpoints.filter(
          (cp) => cp.kind === InquiryCheckpointKind.EXPLANATION,
        )}
        shortLabels={APPOINTMENT_SHORT_LABELS}
        statuses={statuses}
        onChange={onChange}
        onSectionIntroToggle={onSectionIntroToggle}
        compactRows
      />

      {/* Decision-Klärungsfragen – immer sichtbar */}
      {section.decisionQuestions.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div
            className="text-muted text-small"
            style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
          >
            <span aria-hidden="true">? </span>Klärungsfragen
          </div>
          <DecisionQuestionBlock
            questions={section.decisionQuestions}
            statuses={statuses}
            onChange={onChange}
          />
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ende APPOINTMENT M2 Gruppen-Prototyp
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING M2 Gruppen-Prototyp
// [PROTOTYP – hartcodiert, nur für ONBOARDING, reversibel]
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kurze UI-Labels für ONBOARDING Checkpoints.
 * Lokale Überschreibung nur für den M2-Gruppenprototyp – Katalog bleibt unverändert.
 */
const ONBOARDING_SHORT_LABELS: Record<string, string> = {
  ONBOARDING_IDENTITY_MISMATCH: "Patient nicht zuordenbar",
  ONBOARDING_DATA_INCOMPLETE: "Patientendaten unvollständig",
  ONBOARDING_DATA_UPDATE_REQUIRED: "Patientendaten aktualisieren",
  ONBOARDING_DOCTOLIB_INFO: "Doctolib erklären",
  ONBOARDING_WRONG_PRACTICE: "Falsche Praxis",
  ONBOARDING_GKV_DOCUMENT_MISSING: "Versicherungsnachweis (GKV)",
  ONBOARDING_PKV_PAS_MISSING: "Unterlagen Privatpatient",
};

/**
 * Situationsbasierte Akkordeon-Gruppen für den ONBOARDING M2 Prototyp.
 *
 * Ein Checkpoint kann grundsätzlich in mehreren Gruppen erscheinen – der Status
 * bleibt global synchron (ein einziger Record-Eintrag). IDs ohne Profil-Eintrag
 * werden robust übersprungen.
 *
 * Hinweis: In dieser Erstfassung erscheint jeder Checkpoint genau in einer
 * Gruppe (keine Dopplungen).
 *
 * [PROTOTYP – hartcodiert, reversibel. Zum Rückgängigmachen: Render-Loop in
 *  InquiryM2Client wiederherstellen, diese Konstante und die zugehörigen
 *  Komponenten entfernen.]
 */
const ONBOARDING_GROUPS: PrescriptionGroup[] = [
  // ── 1. Patient eindeutig identifizieren / Daten klären ───────────────────
  {
    id: "onb_identifizieren",
    label: "Patient eindeutig identifizieren / Daten klären",
    description:
      "Wer ist die Person und sind die Stammdaten vollständig und aktuell?",
    checkpointIds: [
      "ONBOARDING_IDENTITY_MISMATCH",
      "ONBOARDING_DATA_INCOMPLETE",
      "ONBOARDING_DATA_UPDATE_REQUIRED",
      "ONBOARDING_DOCTOLIB_INFO",
    ],
    defaultOpen: true,
  },

  // ── 2. Praxiszuständigkeit ────────────────────────────────────────────────
  {
    id: "onb_zustaendigkeit",
    label: "Praxiszuständigkeit",
    description:
      "Ist die Anfrage überhaupt für unsere Praxis bestimmt?",
    checkpointIds: [
      "ONBOARDING_WRONG_PRACTICE",
    ],
    defaultOpen: false,
  },

  // ── 3. Versicherung / Unterlagen ─────────────────────────────────────────
  {
    id: "onb_versicherung",
    label: "Versicherung / Unterlagen",
    description:
      "Liegen die nötigen Versicherungs- und Identitätsnachweise vor?",
    checkpointIds: [
      "ONBOARDING_GKV_DOCUMENT_MISSING",
      "ONBOARDING_PKV_PAS_MISSING",
    ],
    defaultOpen: false,
  },
];

/**
 * Situationsbasierte Akkordeon-Gruppen für den ONBOARDING M2 Prototyp.
 * Analog zu AUSpecificSection – keine Actions in M2.
 *
 * ONBOARDING-Checkpoints, die (noch) keiner Gruppe zugeordnet sind, werden
 * als Fallback unter „Weitere passende Hinweise" angezeigt, damit kein
 * Profil-Checkpoint stillschweigend verloren geht.
 *
 * [PROTOTYP – hartcodiert, reversibel.]
 */
function OnboardingSpecificSection({
  section,
  statuses,
  onChange,
  onSectionIntroToggle,
}: {
  section: M2SectionData;
  statuses: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSectionIntroToggle: (clickedId: string) => void;
}) {
  // Nur EXPLANATION-Checkpoints – ACTION-Checkpoints werden in M2 nicht
  // angezeigt (Actions kommen in M3 über boundActionConditions).
  const explanationCheckpoints = section.specificCheckpoints.filter(
    (cp) => cp.kind === InquiryCheckpointKind.EXPLANATION,
  );
  const cpById = new Map<string, PlainCheckpoint>(
    explanationCheckpoints.map((cp) => [cp.id, cp]),
  );

  // Fallback: alle EXPLANATION-Checkpoints, die in keiner Gruppe vorkommen.
  const groupedIds = new Set<string>(
    ONBOARDING_GROUPS.flatMap((g) => g.checkpointIds),
  );
  const ungroupedCheckpoints = explanationCheckpoints.filter(
    (cp) => !groupedIds.has(cp.id),
  );

  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginBottom: "0.25rem" }}>{section.label}</h2>
      {/* Antwortkontexte als M2-Schubladen-Akkordeon. */}
      <ProfileSectionIntroDrawers
        inquiryId={section.inquiryId}
        sectionIntroCheckpoints={section.sectionIntroCheckpoints ?? []}
        explanationCheckpoints={explanationCheckpoints}
        shortLabels={ONBOARDING_SHORT_LABELS}
        statuses={statuses}
        onChange={onChange}
        onSectionIntroToggle={onSectionIntroToggle}
        compactRows
      />

      {/* Decision-Klärungsfragen – immer sichtbar (ONBOARDING hat aktuell keine). */}
      {section.decisionQuestions.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div
            className="text-muted text-small"
            style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
          >
            <span aria-hidden="true">? </span>Klärungsfragen
          </div>
          <DecisionQuestionBlock
            questions={section.decisionQuestions}
            statuses={statuses}
            onChange={onChange}
          />
        </div>
      )}

      {/*
        Accordion-Gruppen + Fallback-Gruppe für ungemappte Checkpoints –
        nur rendern, wenn das Profil noch kein neues
        SECTION_INTRO_GROUPS_BY_PROFILE-Mapping besitzt. Bei vorhandenem
        Mapping übernimmt `ProfileSectionIntroDrawers` (oben) sowohl die
        Gruppierung als auch den eigenen "Weitere passende Hinweise"-Drawer
        für nicht zugeordnete EXPLANATION-Checkpoints.
      */}
      {!hasSectionIntroMapping(section.inquiryId) && (
        <div style={{ marginBottom: "0.75rem" }}>
          {ONBOARDING_GROUPS.map((group) => {
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
                shortLabels={ONBOARDING_SHORT_LABELS}
              />
            );
          })}

          {/* Fallback-Gruppe: noch nicht zugeordnete ONBOARDING-Checkpoints. */}
          {ungroupedCheckpoints.length > 0 && (
            <PrescriptionGroupAccordion
              key="onb_weitere_hinweise"
              group={{
                id: "onb_weitere_hinweise",
                label: "Weitere passende Hinweise",
                description: "",
                checkpointIds: ungroupedCheckpoints.map((cp) => cp.id),
                defaultOpen: false,
              }}
              checkpoints={ungroupedCheckpoints}
              statuses={statuses}
              onChange={onChange}
              shortLabels={ONBOARDING_SHORT_LABELS}
            />
          )}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ende ONBOARDING M2 Gruppen-Prototyp
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
        marginBottom: "1.25rem",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "0.5rem 0.75rem",
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
    setStatuses((prev) => applyLabCheckpointCoupling(prev, checkpointId, value));
  }

  // Pilot: globale Liste aller in dieser Session verfügbaren Section-Intro-IDs
  // (Vereinigung der Pro-Profil-Whitelists). `applySectionIntroToggle` setzt
  // alle Section-Intros aus dieser Liste auf INACTIVE und nur das geklickte
  // ggf. auf ACTIVE → max. ein Section-Intro aktiv. Wenn keine Section-Intros
  // verfügbar sind (z. B. nicht-Pilot-Profil), bleibt die Liste leer und der
  // Picker wird nirgends gerendert.
  const sectionIntroIds = Array.from(
    new Set(
      sections.flatMap((s) =>
        (s.sectionIntroCheckpoints ?? []).map((cp) => cp.id),
      ),
    ),
  );

  function toggleSectionIntro(clickedId: string) {
    setStatuses((prev) => applySectionIntroToggle(prev, clickedId, sectionIntroIds));
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
      {/* 1. GLOBAL Checkpoints – kompakter, optionaler Zusatzbereich oben.
           Bewusst weniger dominant: keine massive graue Fläche, nur dezenter
           Rahmen, damit der Fokus auf den Profil-Antwortkontexten bleibt. */}
      {globalCheckpoints.length > 0 && (
        <section
          style={{
            marginBottom: "1.25rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "0.6rem 0.8rem",
          }}
        >
          <div
            className="text-muted text-small"
            style={{ ...GROUP_BADGE_STYLE, marginBottom: "0.25rem" }}
          >
            <span aria-hidden="true">ⓘ </span>Globale Hinweise
          </div>
          <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
            Basisinformationen
          </div>
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
           Alle Profil-Sektionen rendern Antwortkontexte (Section-Intros) als Schubladen-Akkordeon;
           profilspezifische Sektionen ergänzen ihre eigenen Gruppen-Akkordeons. */}
      {sections.map((section) =>
        section.inquiryId === "PRESCRIPTION" ? (
          <PrescriptionSpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
            onSectionIntroToggle={toggleSectionIntro}
          />
        ) : section.inquiryId === "AU" ? (
          <AUSpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
            onSectionIntroToggle={toggleSectionIntro}
          />
        ) : section.inquiryId === "REFERRAL" ? (
          <ReferralSpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
            onSectionIntroToggle={toggleSectionIntro}
          />
        ) : section.inquiryId === "HOSPITAL_ADMISSION" ? (
          <HospitalAdmissionSpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
            onSectionIntroToggle={toggleSectionIntro}
          />
        ) : section.inquiryId === "LAB" ? (
          <LabSpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
            onSectionIntroToggle={toggleSectionIntro}
          />
        ) : section.inquiryId === "APPOINTMENT" ? (
          <AppointmentSpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
            onSectionIntroToggle={toggleSectionIntro}
          />
        ) : section.inquiryId === "IMMUNIZATION" ? (
          <ImmunizationSpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
            onSectionIntroToggle={toggleSectionIntro}
          />
        ) : section.inquiryId === "ONBOARDING" ? (
          <OnboardingSpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
            onSectionIntroToggle={toggleSectionIntro}
          />
        ) : (
          <SpecificSection
            key={section.inquiryId}
            section={section}
            statuses={statuses}
            onChange={setStatus}
            onSectionIntroToggle={toggleSectionIntro}
          />
        ),
      )}

      {/* 4. Weitere passende Hinweise – nur für Profile ohne PRESCRIPTION / AU / REFERRAL / HOSPITAL_ADMISSION / LAB / IMMUNIZATION / ONBOARDING.
           Für diese Profile werden Actions in M3 durch Trigger-Logik freigeschaltet. */}
      {profileActionCheckpoints.length > 0 &&
        !sections.some((s) => s.inquiryId === "PRESCRIPTION" || s.inquiryId === "AU" || s.inquiryId === "REFERRAL" || s.inquiryId === "HOSPITAL_ADMISSION" || s.inquiryId === "LAB" || s.inquiryId === "APPOINTMENT" || s.inquiryId === "IMMUNIZATION" || s.inquiryId === "ONBOARDING") && (
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
