"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRunnerState, followRunnerTarget, goBackRunner } from "@/lib/practiceChains/runner";
import type { RunnerChain } from "@/lib/practiceChains/runner";

export default function Runner({ runner }: { runner: RunnerChain }) {
  const router = useRouter();
  const [state, setState] = useState(() => createRunnerState(runner.startStepId));
  const [exited, setExited] = useState(false);
  const stepById = new Map(runner.steps.map((step) => [step.id, step]));
  const current = state.currentStepId ? stepById.get(state.currentStepId) : null;
  const transition = current ? runner.transitions.find((item) => item.fromStepId === current.id) : null;

  function restart() {
    setState(createRunnerState(runner.startStepId));
    setExited(false);
  }

  if (exited) {
    return (
      <main style={{ padding: "2rem", maxWidth: "56rem", margin: "0 auto" }}>
        <h1>Lauf beendet</h1>
        <p className="text-muted">Dieser Lauf wurde nicht gespeichert und enthält keine Patientendaten.</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="button" onClick={restart}>Von vorn beginnen</button>
          <Link href="/practice/chains">Zur Kettenverwaltung</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "64rem", margin: "0 auto", display: "grid", gap: "1.25rem" }}>
      <header>
        <Link href="/practice/chains" className="text-small text-muted">← Kettenverwaltung</Link>
        <h1 style={{ marginBottom: "0.35rem" }}>{runner.name}</h1>
        <p className="text-small text-muted" style={{ margin: 0 }}>Version {runner.version} · Flüchtiger Lauf ohne Patientendaten</p>
      </header>

      <section aria-label="Verlauf" className="card" style={{ padding: "1rem 1.25rem" }}>
        <strong>Verlauf</strong>
        <ol style={{ marginBottom: 0 }}>
          {[...state.history, state.currentStepId].filter((id): id is string => Boolean(id)).map((id, index) => (
            <li key={`${id}-${index}`}>{stepById.get(id)?.title ?? "Unbekannter Praxisfall"}</li>
          ))}
        </ol>
      </section>

      {state.finished ? (
        <section className="card" style={{ padding: "1.25rem" }}>
          <h2>Kette beendet</h2>
          <p className="text-muted">Die Praxis hat diesen Pfad ausdrücklich beendet.</p>
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
            {current.standards.length === 0 ? <p className="text-muted">Für diesen Praxisfall ist kein Standardtext gespeichert.</p> : (
              <ul>{current.standards.map((standard) => <li key={standard.title}><strong>{standard.title}</strong>{standard.implementation && <>: {standard.implementation}</>}</li>)}</ul>
            )}
          </div>
          {state.error ? (
            <p role="alert" style={{ color: "#a00", margin: 0 }}>{state.error}</p>
          ) : transition.kind === "DIRECT" ? (
            <button type="button" onClick={() => setState((value) => followRunnerTarget(value, transition.targetStepId))}>
              {transition.targetStepId ? "Zum nächsten Praxisfall" : "Kette beenden"}
            </button>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <h3>{transition.question?.prompt}</h3>
              {transition.question?.answers.map((answer) => (
                <button key={answer.id} type="button" onClick={() => setState((value) => followRunnerTarget(value, answer.targetStepId))}>
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
        <button type="button" onClick={() => setState(goBackRunner(state))} disabled={state.history.length === 0}>Zurück</button>
        <button type="button" onClick={restart}>Von vorn beginnen</button>
        <button type="button" onClick={() => setExited(true)}>Lauf beenden</button>
      </nav>
    </main>
  );
}