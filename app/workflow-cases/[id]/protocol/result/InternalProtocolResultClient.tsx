"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  InternalProtocolWorkflowSnapshot,
  ProtocolClarificationJudgement,
} from "@/lib/workflow/internalProtocol/workflowAdapter";
import { getPracticeProcessMode } from "@/lib/workflow/internalProtocol/workflowAdapter";
import { getPatientWithoutAppointmentSections } from "@/lib/workflow/internalProtocol/patientWithoutAppointment";
import {
  synthesizeCheckpoint,
  clarificationJudgementLabel,
  type SynthesisItem,
} from "@/lib/workflow/internalProtocol/synthesis";
import {
  buildProcessNarrative,
  type NarrativeSection,
} from "@/lib/workflow/internalProtocol/narrativeEngine";
import { buildChangeComparison } from "@/lib/workflow/internalProtocol/changeComparison";

type Props = {
  sessionId: string;
  sessionCreatedAt: string;
  snapshot: InternalProtocolWorkflowSnapshot;
  sourceSnapshot?: InternalProtocolWorkflowSnapshot | null;
};

// ---------------------------------------------------------------------------
// Entwickeln-Button
// ---------------------------------------------------------------------------

function DevelopTargetButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDevelop() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workflow-cases/${sessionId}/protocol/develop-target`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as { ok?: boolean }).ok) {
        setError((data as { error?: string }).error ?? "Erstellen fehlgeschlagen.");
        return;
      }
      const newId = (data as { id?: string }).id;
      if (!newId) {
        setError("Keine Session-ID erhalten.");
        return;
      }
      router.push(`/workflow-cases/${newId}/protocol`);
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "0.4rem" }}>
      <button type="button" onClick={() => void handleDevelop()} disabled={loading}>
        {loading ? "Wird erstellt…" : "Zukünftigen Ablauf daraus entwickeln"}
      </button>
      {error && <p className="text-small" style={{ margin: 0, color: "#c44" }}>{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kompakter Prozess-Abschnitt: eine Sektion als Überschrift + Bullet-Liste
// ---------------------------------------------------------------------------

function ProcessSection({ section }: { section: NarrativeSection }) {
  if (section.sentences.length === 0) return null;
  return (
    <div>
      <h3 style={{ margin: "0 0 0.3rem", fontSize: "0.875rem", fontWeight: 600, color: "#334" }}>
        {section.sectionTitle}
      </h3>
      <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.15rem" }}>
        {section.sentences.map((s, i) => (
          <li key={i} className="text-small" style={{ color: "#444" }}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail-Abschnitt pro Aspekt (nur im ausgeklappten Bereich)
// ---------------------------------------------------------------------------

function AspectDetailSection({
  title,
  judgement,
  items,
}: {
  title: string;
  judgement: ProtocolClarificationJudgement;
  items: SynthesisItem[];
}) {
  const confirmedItems = items.filter((i) => i.status === "confirmed");
  const unclearItems = items.filter((i) => i.status === "unclear");
  const openItems = items.filter((i) => i.status === "open");
  const statusColor =
    judgement === "SUFFICIENTLY_CLARIFIED" ? "#1a6" : judgement === "NOT_RELEVANT" ? "#777" : "#c44";

  return (
    <article
      style={{
        border: "1px solid #d8e0ea",
        borderRadius: "0.4rem",
        padding: "0.75rem 1rem",
        display: "grid",
        gap: "0.5rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: "0.9rem" }}>{title}</h3>
        <span className="text-small" style={{ color: statusColor, fontWeight: 600 }}>
          {clarificationJudgementLabel(judgement)}
        </span>
      </div>
      {confirmedItems.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.15rem" }}>
          {confirmedItems.map((item, i) => (
            <li key={i} className="text-small" style={{ color: "#444" }}>{item.text}</li>
          ))}
        </ul>
      )}
      {unclearItems.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.15rem" }}>
          {unclearItems.map((item, i) => (
            <li key={i} className="text-small" style={{ color: "#887" }}>{item.text}</li>
          ))}
        </ul>
      )}
      {openItems.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.15rem" }}>
          {openItems.map((item, i) => (
            <li key={i} className="text-small" style={{ color: "#c44" }}>○ {item.text}</li>
          ))}
        </ul>
      )}
      {items.length === 0 && judgement !== "NOT_RELEVANT" && (
        <p className="text-small text-muted" style={{ margin: 0, fontStyle: "italic" }}>
          Keine Angaben erfasst.
        </p>
      )}
      {judgement === "NOT_RELEVANT" && items.length === 0 && (
        <p className="text-small text-muted" style={{ margin: 0, fontStyle: "italic" }}>
          Dieser Aspekt wurde als nicht relevant eingestuft.
        </p>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Aufklappbare Detail-Sektion ("Details anzeigen")
// ---------------------------------------------------------------------------

function CollapsibleDetails({
  snapshot,
  allSections,
}: {
  snapshot: InternalProtocolWorkflowSnapshot;
  allSections: ReturnType<typeof getPatientWithoutAppointmentSections>;
}) {
  const [open, setOpen] = useState(false);

  const aspectResults = snapshot.checkpoints.map((cp) => {
    const section = allSections.find((s) => s.id === cp.id);
    const items = section ? synthesizeCheckpoint(section, cp) : [];
    const judgement: ProtocolClarificationJudgement = cp.clarificationJudgement ?? "OPEN";
    return { cp, items, judgement };
  });

  return (
    <div style={{ borderTop: "1px solid #e0e4ea", paddingTop: "1rem" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          color: "#557",
          cursor: "pointer",
          fontWeight: 500,
          padding: 0,
          textDecoration: "underline",
          fontSize: "0.875rem",
        }}
      >
        {open ? "▲ Details ausblenden" : "▼ Details anzeigen"}
      </button>
      {open && (
        <div style={{ display: "grid", gap: "0.6rem", marginTop: "1rem" }}>
          {aspectResults.map(({ cp, items, judgement }) => (
            <AspectDetailSection
              key={cp.id}
              title={cp.title}
              judgement={judgement}
              items={items}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function BottomNav({
  sessionId,
  processMode,
}: {
  sessionId: string;
  processMode: "CURRENT_STATE" | "TARGET_STATE";
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        alignItems: "center",
        flexWrap: "wrap",
        borderTop: "1px solid #e0e0e0",
        paddingTop: "0.75rem",
      }}
    >
      <Link href={`/workflow-cases/${sessionId}/protocol/m3`} className="text-small">
        ← Klärungsstand bearbeiten
      </Link>
      <Link href="/workflow-cases" className="text-small" style={{ marginLeft: "auto" }}>
        ← Zur Übersicht
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export default function InternalProtocolResultClient({
  sessionId,
  sessionCreatedAt,
  snapshot,
  sourceSnapshot,
}: Props) {
  const allSections = useMemo(() => getPatientWithoutAppointmentSections(), []);
  const createdDate = sessionCreatedAt.slice(0, 10);
  const processMode = getPracticeProcessMode(snapshot);
  const hasSource = sourceSnapshot !== null && sourceSnapshot !== undefined;
  const modeLabel =
    processMode === "CURRENT_STATE" ? "Bestandsaufnahme" : "Zukünftiger Praxisablauf";

  const narrative = useMemo(
    () => buildProcessNarrative(allSections, snapshot.checkpoints, processMode),
    [allSections, snapshot.checkpoints, processMode],
  );

  // Offene und unklare Punkte aus allen Sektionen als flache Liste
  const allOpenItems = useMemo(
    () => narrative.flatMap((s) => [...s.unclearTexts, ...s.openTexts]),
    [narrative],
  );

  // Neu beschlossene Punkte aus dem IS/SOLL-Vergleich (nur bei vorhandener Quell-Session)
  const newDecisions = useMemo<string[] | null>(() => {
    if (!sourceSnapshot) return null;
    const sections = buildChangeComparison(
      allSections,
      sourceSnapshot.checkpoints,
      snapshot.checkpoints,
    );
    return sections.flatMap((section) =>
      section.diffs
        .filter((d) => d.kind !== "unchanged" && d.kind !== "removed")
        .flatMap((d) => (d.kind === "multi-partial" ? d.addedTexts : d.afterTexts)),
    );
  }, [allSections, sourceSnapshot, snapshot.checkpoints]);

  return (
    <section className="card" style={{ display: "grid", gap: "1.5rem" }}>

      {/* 1. Kurzüberblick */}
      <header style={{ display: "grid", gap: "0.25rem" }}>
        <div className="text-small text-muted">Patient ohne Termin · {modeLabel}</div>
        <h1 style={{ margin: 0 }}>{modeLabel}</h1>
        <div
          className="text-small text-muted"
          style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}
        >
          <span>Erstellt: {createdDate}</span>
          {allOpenItems.length > 0 && (
            <span style={{ color: "#c44" }}>
              {allOpenItems.length} offene{allOpenItems.length === 1 ? "r Punkt" : " Punkte"}
            </span>
          )}
          {processMode === "TARGET_STATE" && !hasSource && snapshot.sourceWorkflowSessionId && (
            <span style={{ color: "#c88" }}>Die zugehörige Bestandsaufnahme ist nicht mehr verfügbar.</span>
          )}
        </div>
      </header>

      {/* 2. Praxisablauf: eine kompakte Sektion pro Themenbereich */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {narrative.map((s) => (
          <ProcessSection key={s.sectionId} section={s} />
        ))}
      </div>

      {/* 3. Neu beschlossen (nur TARGET_STATE mit Quell-Session und echten Änderungen) */}
      {newDecisions !== null && newDecisions.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #e0e4ea",
            paddingTop: "1rem",
            display: "grid",
            gap: "0.5rem",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "#334" }}>
            Neu beschlossen
          </h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.15rem" }}>
            {newDecisions.map((text, i) => (
              <li key={i} className="text-small" style={{ color: "#444" }}>{text}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Noch offene Punkte */}
      {allOpenItems.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #e0e4ea",
            paddingTop: "1rem",
            display: "grid",
            gap: "0.5rem",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "#c44" }}>
            Noch offene Punkte
          </h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.15rem" }}>
            {allOpenItems.map((t, i) => (
              <li key={i} className="text-small" style={{ color: "#c44" }}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* CURRENT_STATE: Hinweis auf Weiterentwicklung */}
      {processMode === "CURRENT_STATE" && (
        <div
          style={{
            borderTop: "1px solid #e0e4ea",
            paddingTop: "1rem",
            display: "grid",
            gap: "0.5rem",
          }}
        >
          <p className="text-small text-muted" style={{ margin: 0 }}>
            Aus dieser Bestandsaufnahme kann ein gemeinsam abgestimmter Zielzustand entwickelt werden.
          </p>
          <DevelopTargetButton sessionId={sessionId} />
        </div>
      )}

      {/* 5. Details (vollständig eingeklappt) */}
      <CollapsibleDetails snapshot={snapshot} allSections={allSections} />

      <BottomNav sessionId={sessionId} processMode={processMode} />
    </section>
  );
}
