"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateChainDefinition } from "@/lib/practiceChains/validate";
import type {
  PracticeCaseChainDefinition,
  PracticeCaseChainRecord,
  PracticeCaseChainTransition,
  PracticeCaseChainAnswer,
} from "@/lib/practiceChains/types";
import type { CatalogEntryRow } from "@/lib/practiceCatalog/types";
import type { PracticeChainSegment } from "@/lib/practiceChains/discovery";

type Props = {
  chain: PracticeCaseChainRecord;
  entries: CatalogEntryRow[];
  discovery: { segments: PracticeChainSegment[]; attachmentCandidates: { sourceChainId: string; sourceStepId: string; sourceExitId: string; sourceExitPrompt: string | null; sourceExitLabel: string | null; target: PracticeChainSegment }[] };
  approvals: { entries: { chain_id: string; step_id: string; approval_version: number }[]; connections: { source_chain_id: string; source_step_id: string; source_exit_id: string; target_chain_id: string; target_step_id: string; selection_version: number }[] };
};

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function issueLocation(path: string) {
  const transition = path.match(/^transitions\.(\d+)/);
  if (transition) return `Übergang ${Number(transition[1]) + 1}`;
  const step = path.match(/^steps\.(\d+)/);
  if (step) return `Praxisfall ${Number(step[1]) + 1}`;
  if (path === "startStepId") return "Startschritt";
  return "Kettendefinition";
}

const CHAIN_END_VALUE = "__CHAIN_END__";

export default function ChainEditor({ chain, entries, discovery, approvals }: Props) {
  const router = useRouter();
  const [name, setName] = useState(chain.name);
  const [status, setStatus] = useState(chain.status);
  const [definition, setDefinition] = useState<PracticeCaseChainDefinition>(chain.definition);
  const [selectedEntry, setSelectedEntry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const readOnly = chain.status === "READY";

  const entryTitle = new Map(entries.map((entry) => [entry.id, `${entry.title} · Version ${entry.version}`]));
  const stepTitle = (stepId: string) => {
    const step = definition.steps.find((item) => item.id === stepId);
    return step ? entryTitle.get(step.catalogEntryId) ?? "Unbekannter Praxisfall" : "Kein Schritt";
  };

  function updateDefinition(update: (current: PracticeCaseChainDefinition) => PracticeCaseChainDefinition) {
    setDefinition((current) => update(current));
    setStatus("DRAFT");
    setError(null);
    setIssues([]);
  }

  function addStep() {
    if (!selectedEntry || definition.steps.some((step) => step.catalogEntryId === selectedEntry)) return;
    updateDefinition((current) => ({
      ...current,
      steps: [...current.steps, { id: id("step"), catalogEntryId: selectedEntry }],
    }));
    setSelectedEntry("");
  }

  function removeStep(stepId: string) {
    updateDefinition((current) => ({
      ...current,
      startStepId: current.startStepId === stepId ? null : current.startStepId,
      steps: current.steps.filter((step) => step.id !== stepId),
      transitions: current.transitions.filter((transition) => transition.fromStepId !== stepId && transition.targetStepId !== stepId),
    }));
  }

  function addTransition() {
    const transition: PracticeCaseChainTransition = {
      id: id("transition"),
      fromStepId: "",
      kind: "DIRECT",
    };
    updateDefinition((current) => ({ ...current, transitions: [...current.transitions, transition] }));
  }

  function updateTransition(transitionId: string, update: (transition: PracticeCaseChainTransition) => PracticeCaseChainTransition) {
    updateDefinition((current) => ({
      ...current,
      transitions: current.transitions.map((transition) => transition.id === transitionId ? update(transition) : transition),
    }));
  }

  function removeTransition(transitionId: string) {
    updateDefinition((current) => ({ ...current, transitions: current.transitions.filter((transition) => transition.id !== transitionId) }));
  }

  function addAnswer(transitionId: string) {
    updateTransition(transitionId, (transition) => ({
      ...transition,
      question: {
        prompt: transition.question?.prompt ?? "",
        answers: [...(transition.question?.answers ?? []), { id: id("answer"), label: "" }],
      },
    }));
  }

  function updateAnswer(transitionId: string, answerId: string, update: (answer: PracticeCaseChainAnswer) => PracticeCaseChainAnswer) {
    updateTransition(transitionId, (transition) => ({
      ...transition,
      question: transition.question ? {
        ...transition.question,
        answers: transition.question.answers.map((answer) => answer.id === answerId ? update(answer) : answer),
      } : undefined,
    }));
  }

  function removeAnswer(transitionId: string, answerId: string) {
    updateTransition(transitionId, (transition) => ({
      ...transition,
      question: transition.question ? {
        ...transition.question,
        answers: transition.question.answers.filter((answer) => answer.id !== answerId),
      } : undefined,
    }));
  }

  async function save(nextStatus: "DRAFT" | "READY") {
    setSaving(true);
    setError(null);
    setIssues([]);
    try {
      const response = await fetch(`/api/practice-chains/${chain.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status: nextStatus, definition }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; issues?: { path: string; message: string }[] };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Kette konnte nicht gespeichert werden.");
        setIssues(data.issues ?? []);
        return;
      }
      setStatus(nextStatus);
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  }

  async function createRevision() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/practice-chains/${chain.id}/revision`, { method: "POST" });
      const data = await response.json() as { ok?: boolean; chain?: { id: string }; error?: string };
      if (!response.ok || !data.ok || !data.chain) {
        setError(data.error ?? "Entwurfsversion konnte nicht angelegt werden.");
        return;
      }
      router.push(`/practice/chains/${data.chain.id}`);
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  }

  const visibleIssues = validateChainDefinition(definition, new Set(entries.map((entry) => entry.id)));

  async function approve(body: Record<string, string>) {
    setApprovalError(null);
    const response = await fetch(`/api/practice-chains/${chain.id}/approvals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setApprovalError(data.error ?? "Freigabe konnte nicht gespeichert werden.");
      return;
    }
    router.refresh();
  }

  async function revoke(body: Record<string, string>) {
    setApprovalError(null);
    const response = await fetch(`/api/practice-chains/${chain.id}/approvals`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setApprovalError(data.error ?? "Freigabe konnte nicht zurückgenommen werden.");
      return;
    }
    router.refresh();
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "72rem", margin: "0 auto", display: "grid", gap: "1.25rem" }}>
      <header>
        <Link href="/practice/chains" className="text-small text-muted">← Praxisfall-Ketten</Link>
        <input value={name} disabled={readOnly} onChange={(event) => { setName(event.target.value); setStatus("DRAFT"); }} style={{ display: "block", fontSize: "1.7rem", fontWeight: 700, marginTop: "0.6rem", width: "100%" }} />
        <p className="text-small text-muted" style={{ marginBottom: 0 }}>
          Status: {status === "READY" ? "Einsatzbereit" : "Entwurf"}. Katalogeinträge bleiben auf die ausgewählte Version eingefroren.
        </p>
      </header>

      <section className="card" style={{ padding: "1rem 1.25rem", display: "grid", gap: "0.8rem" }}>
        <h2 style={{ margin: 0 }}>1. Praxisfälle auswählen</h2>
        <p className="text-small text-muted" style={{ margin: 0 }}>Nur veröffentlichte Versionen dieser Praxis können als konkrete Schritte verwendet werden.</p>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <select value={selectedEntry} disabled={readOnly} onChange={(event) => setSelectedEntry(event.target.value)}>
            <option value="">Praxisfall-Version auswählen</option>
            {entries.filter((entry) => !definition.steps.some((step) => step.catalogEntryId === entry.id)).map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.title} · Version {entry.version}</option>
            ))}
          </select>
          <button type="button" onClick={addStep} disabled={readOnly || !selectedEntry}>Schritt hinzufügen</button>
        </div>
        {definition.steps.map((step, index) => (
          <div key={step.id} style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            <strong>{index + 1}.</strong><span style={{ flex: 1 }}>{stepTitle(step.id)}</span>
            <button type="button" disabled={readOnly} onClick={() => updateDefinition((current) => ({ ...current, startStepId: step.id }))}>
              {definition.startStepId === step.id ? "Startschritt" : "Als Start setzen"}
            </button>
            <button type="button" disabled={readOnly} onClick={() => removeStep(step.id)}>Entfernen</button>
          </div>
        ))}
        {!definition.startStepId && <p style={{ color: "#8a5200", margin: 0 }}>Offen: Es ist noch kein Startschritt bestimmt.</p>}
      </section>

      <section className="card" style={{ padding: "1rem 1.25rem", display: "grid", gap: "1rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>2. Übergänge festlegen</h2>
          <p className="text-small text-muted" style={{ margin: "0.35rem 0 0" }}>Die Praxis formuliert Fragen und Antwortmöglichkeiten selbst. Das System ergänzt keine medizinischen Regeln.</p>
        </div>
        <button type="button" onClick={addTransition} disabled={readOnly || definition.steps.length === 0}>Übergang hinzufügen</button>
        {definition.transitions.map((transition) => (
          <article key={transition.id} style={{ border: "1px solid #ddd", padding: "0.8rem", display: "grid", gap: "0.6rem" }}>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <label>Von <select disabled={readOnly} value={transition.fromStepId} onChange={(event) => updateTransition(transition.id, (current) => ({ ...current, fromStepId: event.target.value }))}><option value="">Ausgang wählen</option>{definition.steps.map((step) => <option key={step.id} value={step.id}>{stepTitle(step.id)}</option>)}</select></label>
              <label>Art <select disabled={readOnly} value={transition.kind} onChange={(event) => updateTransition(transition.id, (current) => event.target.value === "QUESTION" ? { id: current.id, fromStepId: current.fromStepId, kind: "QUESTION", question: current.question ?? { prompt: "", answers: [] } } : { id: current.id, fromStepId: current.fromStepId, kind: "DIRECT" })}><option value="DIRECT">Direkt zum Fall</option><option value="QUESTION">Praxisfrage</option></select></label>
              <button type="button" disabled={readOnly} onClick={() => removeTransition(transition.id)}>Übergang entfernen</button>
            </div>
            {transition.kind === "DIRECT" ? (
              <label>Ziel <select disabled={readOnly} value={transition.targetStepId === null ? CHAIN_END_VALUE : transition.targetStepId ?? ""} onChange={(event) => updateTransition(transition.id, (current) => ({ ...current, targetStepId: event.target.value === CHAIN_END_VALUE ? null : event.target.value || undefined }))}><option value="">Ziel wählen</option><option value={CHAIN_END_VALUE}>Ende der Kette</option>{definition.steps.map((step) => <option key={step.id} value={step.id}>{stepTitle(step.id)}</option>)}</select></label>
              ) : (
              <div style={{ display: "grid", gap: "0.6rem" }}>
                <label>Frage <input disabled={readOnly} value={transition.question?.prompt ?? ""} onChange={(event) => updateTransition(transition.id, (current) => ({ ...current, question: { prompt: event.target.value, answers: current.question?.answers ?? [] } }))} placeholder="Frage der Praxis" style={{ width: "100%" }} /></label>
                {(transition.question?.answers ?? []).map((answer) => (
                  <div key={answer.id} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <input disabled={readOnly} value={answer.label} onChange={(event) => updateAnswer(transition.id, answer.id, (current) => ({ ...current, label: event.target.value }))} placeholder="Antwortmöglichkeit" style={{ flex: "1 1 14rem" }} />
                    <select disabled={readOnly} value={answer.targetStepId === null ? CHAIN_END_VALUE : answer.targetStepId ?? ""} onChange={(event) => updateAnswer(transition.id, answer.id, (current) => ({ ...current, targetStepId: event.target.value === CHAIN_END_VALUE ? null : event.target.value || undefined }))}><option value="">Ziel wählen</option><option value={CHAIN_END_VALUE}>Ende der Kette</option>{definition.steps.map((step) => <option key={step.id} value={step.id}>{stepTitle(step.id)}</option>)}</select>
                    <button type="button" disabled={readOnly} onClick={() => removeAnswer(transition.id, answer.id)}>Antwort entfernen</button>
                  </div>
                ))}
                <button type="button" disabled={readOnly} onClick={() => addAnswer(transition.id)}>Antwortmöglichkeit hinzufügen</button>
              </div>
              )}
          </article>
        ))}
      </section>

      <section className="card" style={{ padding: "1rem 1.25rem", display: "grid", gap: "0.75rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>Gefundene Teilstrecken und mögliche Anschlüsse</h2>
          <p className="text-small text-muted" style={{ margin: "0.35rem 0 0" }}>
            Diese Hinweise werden aus unveränderlichen READY-Ketten und konkreten Katalogversionen abgeleitet. Nichts wird automatisch verbunden oder ausgeführt.
          </p>
        </div>
        {discovery.segments.filter((segment) => segment.chainId === chain.id).map((segment) => (
          <div key={`${segment.chainId}:${segment.startStepId}`}>
            <strong>{segment.start.title}</strong>
            {segment.paths.map((path, index) => <div className="text-small text-muted" key={`${segment.startStepId}:${index}`}>Teilstrecke: {path.map((step) => step.title).join(" → ")}</div>)}
          </div>
        ))}
        {discovery.segments.filter((segment) => segment.chainId === chain.id).map((segment) => (
          <div key={`entry:${segment.chainId}:${segment.startStepId}`}>
            <strong>Einstieg ab {segment.start.title}</strong>
            {approvals.entries.some((approval) => approval.step_id === segment.startStepId) ? <><span className="text-small text-muted" style={{ marginLeft: "0.5rem" }}>freigegeben</span> <Link href={`/practice/chains/${chain.id}/run?startStepId=${encodeURIComponent(segment.startStepId)}`} className="text-small">Ab hier ausführen</Link> <button type="button" onClick={() => { const current = approvals.entries.find((approval) => approval.step_id === segment.startStepId); return current ? void revoke({ kind: "ENTRY", stepId: segment.startStepId, expectedApprovalVersion: String(current.approval_version) }) : undefined; }}>Freigabe zurücknehmen</button></> : <button type="button" onClick={() => void approve({ kind: "ENTRY", stepId: segment.startStepId })}>Als Einstieg freigeben</button>}
          </div>
        ))}
        {discovery.attachmentCandidates.length === 0 ? <p className="text-small text-muted" style={{ margin: 0 }}>Keine passende READY-Teilstrecke aus einer anderen Kette gefunden.</p> : discovery.attachmentCandidates.map((candidate) => (
          <div key={`${candidate.sourceChainId}:${candidate.sourceExitId}:${candidate.target.chainId}:${candidate.target.startStepId}`}>
            <strong>Anschluss von {candidate.sourceChainId} ab {candidate.target.start.title}</strong>
            <div className="text-small">{candidate.sourceExitPrompt ? `Frage: ${candidate.sourceExitPrompt} · ` : ""}{candidate.sourceExitLabel ?? "Unbekannter Endübergang"}</div>
            <div className="text-small text-muted">{candidate.target.chainName} · Version {candidate.target.chainVersion} · {candidate.target.paths[0]?.map((step) => step.title).join(" → ")}</div>
            {approvals.connections.some((approval) => approval.source_chain_id === candidate.sourceChainId && approval.source_exit_id === candidate.sourceExitId && approval.target_chain_id === candidate.target.chainId && approval.target_step_id === candidate.target.startStepId) ? <><span className="text-small text-muted">ausgewählt</span> <button type="button" onClick={() => { const current = approvals.connections.find((approval) => approval.source_chain_id === candidate.sourceChainId && approval.source_exit_id === candidate.sourceExitId); return current ? void revoke({ kind: "CONNECTION", sourceStepId: candidate.sourceStepId, sourceExitId: candidate.sourceExitId, expectedSelectionVersion: String(current.selection_version) }) : undefined; }}>Anschluss zurücknehmen</button></> : <button type="button" onClick={() => { const current = approvals.connections.find((approval) => approval.source_chain_id === candidate.sourceChainId && approval.source_exit_id === candidate.sourceExitId); return void approve({ kind: "CONNECTION", sourceChainId: candidate.sourceChainId, sourceStepId: candidate.sourceStepId, sourceExitId: candidate.sourceExitId, targetChainId: candidate.target.chainId, targetStepId: candidate.target.startStepId, ...(current ? { expectedSelectionVersion: String(current.selection_version) } : {}) }); }}>Anschluss auswählen</button>}
          </div>
        ))}
        {approvalError && <p role="alert" style={{ color: "#a00", margin: 0 }}>{approvalError}</p>}
      </section>

      {(visibleIssues.length > 0 || issues.length > 0) && (
        <section style={{ border: "1px solid #d9a441", padding: "0.8rem", background: "#fffaf0" }}>
          <strong>Offene Stellen</strong>
          <ul>{[...new Map([...visibleIssues, ...issues].map((issue) => [`${issue.path}:${issue.message}`, issue])).values()].map((issue) => <li key={`${issue.path}:${issue.message}`}><strong>{issueLocation(issue.path)}:</strong> {issue.message}<span className="text-small text-muted"> ({issue.path})</span></li>)}</ul>
        </section>
      )}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {readOnly ? (
          <button type="button" onClick={() => void createRevision()} disabled={saving}>Neue Entwurfsversion erstellen</button>
        ) : (
          <>
            <button type="button" onClick={() => void save("DRAFT")} disabled={saving}>Entwurf speichern</button>
            <button type="button" onClick={() => void save("READY")} disabled={saving}>Als einsatzbereit markieren</button>
          </>
        )}
        {error && <p style={{ color: "#a00", margin: 0 }}>{error}</p>}
      </div>
    </main>
  );
}