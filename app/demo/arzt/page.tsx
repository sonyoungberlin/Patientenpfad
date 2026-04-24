"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DOCTOR_TOUR } from "@/lib/tours/doctorTour";

/**
 * Standalone Demo-Tour für die Arzt-Perspektive (/demo/arzt).
 *
 * Zeigt eine lineare, kontrollierte Tour ohne echte App-Seiten,
 * echte Case-Daten oder klickbare App-Buttons.
 *
 * Demo-Screens ersetzen: Legen Sie einen Screenshot unter
 * /public/demo/screens/<dateiname>.png ab und tragen Sie den Pfad
 * als `imageSrc` im entsprechenden DOCTOR_TOUR-Schritt ein.
 * Der Platzhalter wird dann automatisch durch das Bild ersetzt.
 */
export default function ArztDemoPage() {
  const router = useRouter();
  const steps = DOCTOR_TOUR;
  const total = steps.length;
  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];
  if (!step) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === total - 1;

  function handleNavigate(delta: number) {
    setCurrentStep((prev) => Math.max(0, Math.min(prev + delta, total - 1)));
  }

  function handleClose() {
    router.push("/");
  }

  return (
    <main style={{ maxWidth: "640px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Demo: Arzt-Perspektive</h1>
        <button type="button" onClick={handleClose}>
          Demo beenden
        </button>
      </div>

      {/* Step counter */}
      <p className="text-muted text-small" style={{ margin: "0 0 0.5rem" }} aria-live="polite">
        Schritt {currentStep + 1} von {total}
      </p>

      {/* Progress bar */}
      <div
        aria-hidden="true"
        style={{
          height: "4px",
          borderRadius: "2px",
          background: "var(--muted)",
          marginBottom: "1.5rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((currentStep + 1) / total) * 100}%`,
            background: "var(--primary)",
            borderRadius: "2px",
            transition: "width 0.2s ease",
          }}
        />
      </div>

      {/* Content card */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.75rem", fontSize: "1.125rem" }}>{step.title}</h2>
        <p style={{ margin: 0 }}>{step.body}</p>
      </div>

      {/* Demo screen: real image or placeholder */}
      {step.imageSrc ? (
        <div
          className="card"
          style={{ marginBottom: "1.5rem", padding: 0, overflow: "hidden" }}
        >
          <Image
            src={step.imageSrc}
            alt={step.imageAlt ?? step.title}
            width={640}
            height={400}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      ) : (
        <DemoScreenPlaceholder stepId={step.id} title={step.title} />
      )}

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          marginTop: "0.5rem",
        }}
      >
        <button
          type="button"
          onClick={handleClose}
          style={{ marginRight: "auto" }}
        >
          Tour beenden
        </button>

        {!isFirst && (
          <button type="button" onClick={() => handleNavigate(-1)}>
            ← Zurück
          </button>
        )}

        {isLast ? (
          <button type="button" className="btn-primary" onClick={handleClose}>
            Fertig
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleNavigate(1)}
          >
            Weiter →
          </button>
        )}
      </div>
    </main>
  );
}

/** Placeholder card rendered when no imageSrc is set for a step. */
function DemoScreenPlaceholder({ stepId, title }: { stepId: string; title: string }) {
  const screens: Record<string, React.ReactNode> = {
    "why-this-tool": <WhyThisToolScreen />,
    "multi-select": <MultiSelectScreen />,
    "unclear-areas": <UnclearAreasScreen />,
    "k12-assessment": <K12AssessmentScreen />,
    "mark-prepared": <MarkPreparedScreen />,
    "case-list": <CaseListScreen />,
    "m2-preparation": <M2PreparationScreen />,
    "m3-review": <M3ReviewScreen />,
    "m3-order": <M3ReviewScreen />,
    "confirm-case": <ConfirmCaseScreen />,
    "use-texts": <UseTextsScreen />,
    "case-done": <CaseDoneScreen />,
  };

  const content = screens[stepId] ?? (
    <PlaceholderBox label={title} />
  );

  return (
    <div
      className="card"
      style={{
        marginBottom: "1.5rem",
        background: "var(--muted)",
        border: "1px dashed var(--border)",
        minHeight: "200px",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1.25rem 1.5rem",
      }}
      aria-label={`Demo-Ansicht: ${title}`}
    >
      {content}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Individual demo screen mocks                                         */
/* ------------------------------------------------------------------ */

function ScreenLabel({ text }: { text: string }) {
  return (
    <p
      className="text-muted text-small"
      style={{ margin: 0, fontStyle: "italic" }}
    >
      Demo-Ansicht · {text}
    </p>
  );
}

function FakeButton({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        padding: "0.3rem 0.75rem",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: primary ? "var(--primary)" : "var(--background)",
        color: primary ? "var(--background)" : "var(--foreground)",
        fontSize: "0.9rem",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function FakeRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.4rem 0",
        borderBottom: "1px solid var(--border)",
        gap: "0.5rem",
      }}
    >
      <span style={{ fontSize: "0.9rem" }}>{label}</span>
      <span
        style={{
          fontSize: "0.875rem",
          color: "var(--muted-foreground)",
          fontStyle: "italic",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PlaceholderBox({ label }: { label: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "120px",
        color: "var(--muted-foreground)",
        fontSize: "0.9rem",
        fontStyle: "italic",
      }}
    >
      {label}
    </div>
  );
}

function WhyThisToolScreen() {
  return (
    <>
      <ScreenLabel text="Startseite – Vorbereitung eines Falls" />
      <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "1rem" }}>
        <p style={{ margin: "0 0 0.5rem", fontWeight: 500 }}>
          Liegt genug Information vor, damit der Arzt direkt entscheiden kann?
        </p>
        <p className="text-muted text-small" style={{ margin: 0 }}>
          „Wissen wir genug über die Situation – nicht, ob sie gut oder schlecht ist?"
        </p>
      </div>
    </>
  );
}

function MultiSelectScreen() {
  return (
    <>
      <ScreenLabel text="Anlass / Besonderheiten" />
      <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p style={{ margin: "0 0 0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Besonderheiten (optional)</p>
        {["Neupatient", "Formularanliegen", "Kontaktperson vorhanden"].map((label) => (
          <label key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 400, fontSize: "0.875rem", cursor: "default" }}>
            <input type="checkbox" readOnly style={{ accentColor: "var(--primary)" }} />
            {label}
          </label>
        ))}
      </div>
    </>
  );
}

function UnclearAreasScreen() {
  const areas = [
    "Kommunikation",
    "Medizinische Lage",
    "Versorgung im Alltag",
    "Pflegebeobachtung",
  ];
  return (
    <>
      <ScreenLabel text="Unklare Bereiche" />
      <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {areas.map((area) => (
          <FakeRow key={area} label={area} value="unklar" />
        ))}
      </div>
    </>
  );
}

function K12AssessmentScreen() {
  return (
    <>
      <ScreenLabel text="K12-Einschätzung (optional)" />
      <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <input type="checkbox" readOnly style={{ accentColor: "var(--primary)" }} aria-hidden="true" />
        <span style={{ fontSize: "0.9rem" }}>Einschätzung zur Alltagssituation einholen (K12)</span>
      </div>
    </>
  );
}

function MarkPreparedScreen() {
  return (
    <>
      <ScreenLabel text="Vorbereitung abschließen" />
      <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <FakeButton label="Fall anlegen" />
        <FakeButton label="Ärztlich vorbereitet" primary />
      </div>
    </>
  );
}

function CaseListScreen() {
  return (
    <>
      <ScreenLabel text="Fallliste" />
      <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p style={{ margin: "0 0 0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Offene Fälle</p>
        {["P-2024-001 · ärztlich vorbereitet", "P-2024-002 · in Vorbereitung"].map((row) => (
          <div
            key={row}
            className="card"
            style={{ fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}
          >
            {row}
          </div>
        ))}
      </div>
    </>
  );
}

function M2PreparationScreen() {
  return (
    <>
      <ScreenLabel text="Vorbereitung durch MFA (M2)" />
      <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p style={{ margin: "0 0 0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Informationen zusammentragen</p>
        {["Kommunikation", "Medizinische Lage"].map((area) => (
          <FakeRow key={area} label={area} value="wird vorbereitet …" />
        ))}
      </div>
    </>
  );
}

function M3ReviewScreen() {
  return (
    <>
      <ScreenLabel text="Ärztliche Bewertung (M3)" />
      <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p style={{ margin: "0 0 0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Bewertung der vorliegenden Informationen</p>
        {["Kommunikation", "Medizinische Lage", "Versorgung im Alltag"].map((area) => (
          <div key={area} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid var(--border)", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.9rem" }}>{area}</span>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <FakeButton label="reicht aus" />
              <FakeButton label="reicht nicht aus" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ConfirmCaseScreen() {
  return (
    <>
      <ScreenLabel text="Ärztlich bestätigen" />
      <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <FakeButton label="Bewertung speichern" primary />
      </div>
    </>
  );
}

function UseTextsScreen() {
  return (
    <>
      <ScreenLabel text="Vorbereitete Texte" />
      <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p style={{ margin: "0 0 0.25rem", fontWeight: 500, fontSize: "0.9rem" }}>Texte für Dokumentation & Kommunikation</p>
        <pre style={{ margin: 0, fontSize: "0.8rem" }}>
          Patientenkommunikation: …{"\n"}Praxisdokumentation: …
        </pre>
      </div>
    </>
  );
}

function CaseDoneScreen() {
  return (
    <>
      <ScreenLabel text="Fall abgeschlossen" />
      <div style={{ background: "var(--background)", borderRadius: "var(--radius)", padding: "1rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
        Fall wurde aus der Liste entfernt. ✓
      </div>
    </>
  );
}
