"use client";

import Link from "next/link";
import { useState } from "react";
import { continueRunner, createRunnerState, followRunnerTarget, getRunnerContinuationStatus, goBackRunner } from "@/lib/practiceChains/runner";
import type { RunnerChain } from "@/lib/practiceChains/runner";

export default function Runner({ runner }: { runner: RunnerChain }) {
  const [chains, setChains] = useState(() => [runner]);
  const [state, setState] = useState(() => createRunnerState(runner.startStepId));
  const [currentChainId, setCurrentChainId] = useState(runner.id);
  const [historyMeta, setHistoryMeta] = useState<{ chainId: string; catalogEntryId: string }[]>([]);
  const [visitedChainIds, setVisitedChainIds] = useState([runner.id]);
  const [continuationCount, setContinuationCount] = useState(0);
  const [exited, setExited] = useState(false);
  const chainById = new Map(chains.map((chain) => [chain.id, chain]));
  const currentChain = chainById.get(currentChainId) ?? runner;
  const stepById = new Map(currentChain.steps.map((step) => [step.id, step]));
  const current = state.currentStepId ? stepById.get(state.currentStepId) : null;
  const transition = current ? currentChain.transitions.find((item) => item.fromStepId === current.id) : null;
  const continuationSourceStepId = state.history.at(-1);
  const continuation = state.finished && continuationSourceStepId && state.finishedViaExitId ? currentChain.connections.find((connection) => connection.sourceStepId === continuationSourceStepId && connection.sourceExitId === state.finishedViaExitId) : undefined;
  const continuationStatus = continuation ? getRunnerContinuationStatus(visitedChainIds, continuation.targetChainId, continuationCount) : null;

  function restart() {
    setState(createRunnerState(runner.startStepId));
    setCurrentChainId(runner.id);
    setHistoryMeta([]);
    setVisitedChainIds([runner.id]);
    setContinuationCount(0);
    setExited(false);
  }

  async function executeContinuation() {
    if (!continuation || !continuationSourceStepId) return;
    if (continuationStatus?.limited) {
      setState((value) => ({ ...value, error: "Der technische Laufverlauf hat seine maximale Länge erreicht. Bitte starten Sie einen neuen Lauf." }));
      return;
    }
    const response = await fetch(`/api/practice-chains/${currentChainId}/runner/continuation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceStepId: continuationSourceStepId, sourceExitId: continuation.sourceExitId, targetChainId: continuation.targetChainId, targetStepId: continuation.targetStepId }),
    });
    const data = await response.json() as { ok?: boolean; runner?: RunnerChain; error?: string };
    if (!response.ok || !data.ok || !data.runner) {
      setState((value) => ({ ...value, error: data.error ?? "Der Anschluss ist nicht mehr freigegeben." }));
      return;
    }
    setChains((value) => value.some((item) => item.id === data.runner?.id) ? value : [...value, data.runner!]);
    const previousCatalogEntryId = currentChain.steps.find((step) => step.id === continuationSourceStepId)?.catalogEntryId;
    const targetCatalogEntryId = data.runner.steps.find((step) => step.id === data.runner?.startStepId)?.catalogEntryId;
    setState((value) => continueRunner(value, data.runner!, targetCatalogEntryId, previousCatalogEntryId));
    setCurrentChainId(data.runner.id);
    setVisitedChainIds((value) => value.includes(data.runner!.id) ? value : [...value, data.runner!.id]);
    setContinuationCount((value) => value + 1);
    if (targetCatalogEntryId !== previousCatalogEntryId) {
      setHistoryMeta((value) => [...value, { chainId: currentChain.id, catalogEntryId: previousCatalogEntryId ?? "" }]);
    } else {
      setHistoryMeta((value) => value.slice(0, -1));
    }
  }

  if (exited) {
    return (
      <main style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>
        <h1>Lauf beendet</h1>
        <p className="text-muted">Dieser Lauf wurde nicht gespeichert und enthält keine Patientendaten.</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="button" onClick={restart}>Von vorn beginnen</button>
          <Link href="/practice/chains">Zur Praxisfall-Ketten</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "64rem", margin: "0 auto", display: "grid", gap: "1.25rem" }}>
      <header>
        <Link href="/practice/chains" className="text-small text-muted">← Praxisfall-Ketten</Link>
        <h1 style={{ marginBottom: "0.35rem" }}>{runner.name}</h1>
        <p className="text-small text-muted" style={{ margin: 0 }}>Version {runner.version} · Flüchtiger Lauf ohne Patientendaten</p>
      </header>

      <section aria-label="Verlauf" className="card" style={{ padding: "1rem 1.25rem" }}>
        <strong>Verlauf</strong>
        <ol style={{ marginBottom: 0 }}>
          {[...state.history.map((stepId, index) => ({ stepId, meta: historyMeta[index] })), ...(state.currentStepId ? [{ stepId: state.currentStepId, meta: { chainId: currentChainId, catalogEntryId: "" } }] : [])].map((item, index) => (
            <li key={`${item.meta?.chainId ?? ""}-${item.stepId}-${index}`}>{chainById.get(item.meta?.chainId ?? runner.id)?.steps.find((step) => step.id === item.stepId)?.title ?? "Unbekannter Praxisfall"}</li>
          ))}
        </ol>
      </section>

      {state.finished ? (
        <section className="card" style={{ padding: "1.25rem" }}>
          <h2>Kette beendet</h2>
          <p className="text-muted">Die Praxis hat diesen Pfad ausdrücklich beendet.</p>
          {state.error && <p role="alert" style={{ color: "#a00" }}>{state.error}</p>}
          {continuationStatus?.alreadyVisited && <p role="status" className="text-muted">Die Zielkette wurde in diesem Lauf bereits besucht. Das erneute Betreten erfordert Ihre ausdrückliche Bestätigung.</p>}
          {continuation && !continuationStatus?.limited && <p><button type="button" onClick={() => void executeContinuation()}>{continuationStatus?.alreadyVisited ? "Bereits besuchte Kette erneut betreten" : "Freigegebenen Anschluss ausführen"}: {continuation.targetTitle} ({continuation.targetName} · Version {continuation.targetVersion})</button></p>}
        </section>
      ) : current && transition ? (
        <section className="card" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
          <div>
            <p className="text-small text-muted" style={{ margin: 0 }}>Aktueller Praxisfall</p>
            <h2 style={{ margin: "0.25rem 0" }}>{current.title}</h2>
            {current.description && <p>{current.description}</p>}
          </div>
          <div>
            <h3>Gespeicherter Praxisstandard</h3>
            {current.standards.length === 0 ? <p className="text-muted">Für diesen Praxisfall ist kein Standard gespeichert.</p> : (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {current.standards.map((standard) => (
                  <section key={standard.title}>
                    <strong>{standard.title}</strong>
                    {standard.selectedAnchors.length > 0 && (
                      <ul>{standard.selectedAnchors.map((anchor, index) => <li key={`${index}-${anchor}`}>{anchor}</li>)}</ul>
                    )}
                    {standard.missingAnchorCount > 0 && (
                      <p className="text-muted">{standard.missingAnchorCount === 1 ? "Ein ausgewähltes Kriterium" : `${standard.missingAnchorCount} ausgewählte Kriterien`} ist in dieser veröffentlichten Version nicht verfügbar.</p>
                    )}
                    {standard.implementation && (
                      <p><strong>Zusätzliche Umsetzung:</strong> {standard.implementation}</p>
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>
          {state.error ? (
            <p role="alert" style={{ color: "#a00", margin: 0 }}>{state.error}</p>
          ) : transition.kind === "DIRECT" ? (
              <button type="button" onClick={() => { setHistoryMeta((value) => [...value, { chainId: currentChain.id, catalogEntryId: stepById.get(current.id)?.catalogEntryId ?? current.id }]); setState((value) => followRunnerTarget(value, transition.targetStepId, transition.id)); }}>
              {transition.targetStepId ? "Zum nächsten Praxisfall" : "Kette beenden"}
            </button>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <h3>{transition.question?.prompt}</h3>
              {transition.question?.answers.map((answer) => (
                <button key={answer.id} type="button" onClick={() => { setHistoryMeta((value) => [...value, { chainId: currentChain.id, catalogEntryId: stepById.get(current.id)?.catalogEntryId ?? current.id }]); setState((value) => followRunnerTarget(value, answer.targetStepId, answer.id)); }}>
                  {answer.label}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="card" style={{ padding: "1.25rem" }}><p>Dieser READY-Kette fehlt ein ausführbarer Übergang.</p></section>
      )}

      <nav style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }} aria-label="Laufsteuerung">
        <button type="button" onClick={() => { const previous = historyMeta.at(-1); setHistoryMeta((value) => value.slice(0, -1)); if (previous) setCurrentChainId(previous.chainId); setState(goBackRunner(state)); }} disabled={state.history.length === 0}>Zurück</button>
        <button type="button" onClick={restart}>Von vorn beginnen</button>
        <button type="button" onClick={() => setExited(true)}>Lauf beenden</button>
      </nav>
    </main>
  );
}