"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  CriterionOperator,
  DefinitionDimensionDecision,
  PracticeCheckpointDefinitionContent,
  PracticeCheckpointDefinitionVersionSnapshot,
  PracticeCheckpointTemplateSnapshot,
} from "@/lib/practiceProcesses/practiceDefinition";

type SaveState = "idle" | "saving" | "saved" | "error";

const OPERATORS: { value: CriterionOperator; label: string }[] = [
  { value: "PRESENT", label: "Angabe vorhanden" },
  { value: "EQUALS", label: "ist gleich" },
  { value: "NOT_EQUALS", label: "ist ungleich" },
  { value: "GREATER_THAN", label: "ist größer als" },
  { value: "GREATER_THAN_OR_EQUAL", label: "ist mindestens" },
  { value: "LESS_THAN", label: "ist kleiner als" },
  { value: "LESS_THAN_OR_EQUAL", label: "ist höchstens" },
  { value: "IN", label: "ist einer der Werte" },
];

const fieldStyle: React.CSSProperties = { width: "100%", padding: "0.45rem 0.55rem", font: "inherit" };

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeExpectedValue(value: string | number | boolean | string[] | undefined, operator: CriterionOperator) {
  if (operator === "PRESENT") return undefined;
  if (Array.isArray(value) || typeof value !== "string") return value;
  const trimmed = value.trim();
  if (operator === "IN") return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const numericValue = Number(trimmed);
  return trimmed !== "" && Number.isFinite(numericValue) ? numericValue : trimmed;
}

export default function PracticeDefinitionEditor({
  template,
  initialContent,
  currentVersion: initialVersion,
}: {
  template: PracticeCheckpointTemplateSnapshot;
  initialContent: PracticeCheckpointDefinitionContent;
  currentVersion: PracticeCheckpointDefinitionVersionSnapshot | null;
}) {
  const [content, setContent] = useState(initialContent);
  const [currentVersion, setCurrentVersion] = useState(initialVersion);
  const [logicKind, setLogicKind] = useState<"ALL" | "ANY">(
    content.expression.kind === "ANY" ? "ANY" : "ALL",
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [issues, setIssues] = useState<string[]>([]);

  function contentForSave(): PracticeCheckpointDefinitionContent {
    return {
      ...content,
      criteria: content.criteria.map((criterion) => ({
        ...criterion,
        expectedValue: normalizeExpectedValue(criterion.expectedValue, criterion.operator),
      })),
      expression: {
        kind: logicKind,
        operands: content.criteria.map((criterion) => ({ kind: "CRITERION" as const, criterionId: criterion.id })),
      },
    };
  }

  async function saveDraft() {
    setSaveState("saving");
    setIssues([]);
    const next = contentForSave();
    const response = await fetch(`/api/practice-checkpoint-definitions/${template.checkpointId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: next }),
    });
    const data = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setSaveState("error");
      setIssues([data.error ?? "Entwurf konnte nicht gespeichert werden."]);
      return false;
    }
    setContent(next);
    setSaveState("saved");
    return true;
  }

  async function release() {
    if (!(await saveDraft())) return;
    setSaveState("saving");
    const response = await fetch(`/api/practice-checkpoint-definitions/${template.checkpointId}`, { method: "POST" });
    const data = await response.json() as { ok?: boolean; error?: string; issues?: string[]; version?: PracticeCheckpointDefinitionVersionSnapshot };
    if (!response.ok || !data.ok || !data.version) {
      setSaveState("error");
      setIssues(data.issues ?? [data.error ?? "Definition konnte nicht freigegeben werden."]);
      return;
    }
    setCurrentVersion(data.version);
    setSaveState("saved");
  }

  function setDimension(dimensionId: string, decision: DefinitionDimensionDecision) {
    setContent((value) => ({
      ...value,
      dimensions: value.dimensions.map((item) => item.dimensionId === dimensionId ? { ...item, decision } : item),
    }));
    setSaveState("idle");
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "68rem", margin: "0 auto", display: "grid", gap: "1.25rem" }}>
      <header>
        <Link href="/practice/checkpoint-definitions" className="text-small text-muted">← Checkpoint-Definitionen</Link>
        <h1 style={{ marginBottom: "0.25rem" }}>{template.title}</h1>
        <p className="text-muted" style={{ margin: 0 }}>{template.description}</p>
        <p className="text-small" style={{ marginBottom: 0 }}>
          {currentVersion ? `Aktuell freigegeben: Version ${currentVersion.version}` : "Noch keine freigegebene Praxisdefinition"}
        </p>
      </header>

      <section className="card" style={{ padding: "1rem", display: "grid", gap: "0.6rem" }}>
        <h2 style={{ margin: 0 }}>Eine prüfbare Aussage</h2>
        <label>Was bedeutet dieser Checkpoint bei euch?
          <textarea value={content.statement} onChange={(event) => setContent({ ...content, statement: event.target.value })} rows={3} style={fieldStyle} placeholder="Eine Aussage, die im konkreten Lauf mit Ja oder Nein beantwortet wird." />
        </label>
      </section>

      <section className="card" style={{ padding: "1rem", display: "grid", gap: "0.8rem" }}>
        <h2 style={{ margin: 0 }}>Mögliche Definitionsdimensionen</h2>
        <p className="text-small text-muted" style={{ margin: 0 }}>Jeder Vorschlag muss ausdrücklich einbezogen oder ausgeschlossen werden. Kein Vorschlag enthält automatisch eine Praxisregel.</p>
        {template.dimensions.map((dimension) => {
          const selected = content.dimensions.find((item) => item.dimensionId === dimension.id)?.decision ?? "UNDECIDED";
          return <fieldset key={dimension.id} style={{ border: "1px solid #ddd", padding: "0.75rem" }}>
            <legend>{dimension.prompt}</legend>
            {(["UNDECIDED", "INCLUDED", "EXCLUDED"] as const).map((decision) => <label key={decision} style={{ marginRight: "1rem" }}>
              <input type="radio" name={dimension.id} checked={selected === decision} onChange={() => setDimension(dimension.id, decision)} /> {decision === "UNDECIDED" ? "Noch offen" : decision === "INCLUDED" ? "Spielt eine Rolle" : "Spielt ausdrücklich keine Rolle"}
            </label>)}
          </fieldset>;
        })}
      </section>

      <section className="card" style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Benötigte Daten</h2>
        {content.requiredData.map((item, index) => <div key={item.key || index} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr auto", gap: "0.5rem" }}>
          <input value={item.key} onChange={(event) => setContent({ ...content, requiredData: content.requiredData.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, key: event.target.value } : candidate) })} placeholder="Daten-ID" />
          <input value={item.label} onChange={(event) => setContent({ ...content, requiredData: content.requiredData.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, label: event.target.value } : candidate) })} placeholder="Welche Angabe wird benötigt?" />
          <input value={item.source ?? ""} onChange={(event) => setContent({ ...content, requiredData: content.requiredData.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, source: event.target.value } : candidate) })} placeholder="Mögliche Quelle" />
          <button type="button" onClick={() => setContent({ ...content, requiredData: content.requiredData.filter((_, candidateIndex) => candidateIndex !== index) })}>Entfernen</button>
        </div>)}
        <button type="button" onClick={() => setContent({ ...content, requiredData: [...content.requiredData, { key: newId("data"), label: "" }] })}>Angabe hinzufügen</button>
      </section>

      <section className="card" style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Konkrete Kriterien</h2>
        {content.criteria.map((criterion, index) => <div key={criterion.id} style={{ border: "1px solid #ddd", padding: "0.75rem", display: "grid", gap: "0.5rem" }}>
          <input value={criterion.label} onChange={(event) => setContent({ ...content, criteria: content.criteria.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, label: event.target.value } : candidate) })} placeholder="Konkretes Kriterium der Praxis" />
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr 2fr 1fr auto", gap: "0.5rem" }}>
            <select value={criterion.sourceDimensionId ?? ""} onChange={(event) => setContent({ ...content, criteria: content.criteria.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, sourceDimensionId: event.target.value || undefined } : candidate) })}>
              <option value="">Eigenes Kriterium</option>
              {template.dimensions.map((dimension) => <option key={dimension.id} value={dimension.id}>{dimension.prompt}</option>)}
            </select>
            <select value={criterion.dataKey} onChange={(event) => setContent({ ...content, criteria: content.criteria.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, dataKey: event.target.value } : candidate) })}>
              <option value="">Benötigte Angabe</option>
              {content.requiredData.map((item) => <option key={item.key} value={item.key}>{item.label || item.key}</option>)}
            </select>
            <select value={criterion.operator} onChange={(event) => setContent({ ...content, criteria: content.criteria.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, operator: event.target.value as CriterionOperator } : candidate) })}>
              {OPERATORS.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
            </select>
            <input disabled={criterion.operator === "PRESENT"} value={criterion.expectedValue === undefined ? "" : String(criterion.expectedValue)} onChange={(event) => setContent({ ...content, criteria: content.criteria.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, expectedValue: event.target.value } : candidate) })} placeholder="Praxiswert" />
            <input value={criterion.unit ?? ""} onChange={(event) => setContent({ ...content, criteria: content.criteria.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, unit: event.target.value } : candidate) })} placeholder="Einheit" />
            <button type="button" onClick={() => setContent({ ...content, criteria: content.criteria.filter((_, candidateIndex) => candidateIndex !== index) })}>Entfernen</button>
          </div>
        </div>)}
        <button type="button" onClick={() => setContent({ ...content, criteria: [...content.criteria, { id: newId("criterion"), label: "", dataKey: "", operator: "PRESENT" }] })}>Kriterium hinzufügen</button>
        <fieldset>
          <legend>Wie werden alle Kriterien verknüpft?</legend>
          <label style={{ marginRight: "1rem" }}><input type="radio" checked={logicKind === "ALL"} onChange={() => setLogicKind("ALL")} /> Alle müssen erfüllt sein</label>
          <label><input type="radio" checked={logicKind === "ANY"} onChange={() => setLogicKind("ANY")} /> Mindestens eines muss erfüllt sein</label>
        </fieldset>
      </section>

      <section className="card" style={{ padding: "1rem", display: "grid", gap: "0.6rem" }}>
        <h2 style={{ margin: 0 }}>Verantwortlichkeit</h2>
        <label>Wer erhebt die Angaben?<input style={fieldStyle} value={content.responsibility.collectedBy.join(", ")} onChange={(event) => setContent({ ...content, responsibility: { ...content.responsibility, collectedBy: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } })} /></label>
        <label>Wer schätzt die Aussage ein?<input style={fieldStyle} value={content.responsibility.assessedBy.join(", ")} onChange={(event) => setContent({ ...content, responsibility: { ...content.responsibility, assessedBy: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } })} /></label>
        <label>Wo findet die Einschätzung statt?<input style={fieldStyle} value={content.responsibility.assessmentLocation} onChange={(event) => setContent({ ...content, responsibility: { ...content.responsibility, assessmentLocation: event.target.value } })} /></label>
        <label>Wo wird sie dokumentiert?<input style={fieldStyle} value={content.responsibility.documentationLocation} onChange={(event) => setContent({ ...content, responsibility: { ...content.responsibility, documentationLocation: event.target.value } })} /></label>
        <label>Besonderheiten<textarea style={fieldStyle} rows={2} value={content.notes ?? ""} onChange={(event) => setContent({ ...content, notes: event.target.value })} /></label>
      </section>

      {issues.length > 0 && <section role="alert" style={{ border: "1px solid #a00", padding: "0.75rem" }}><strong>Noch nicht freigabefähig</strong><ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></section>}
      <footer style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <button type="button" onClick={() => void saveDraft()} disabled={saveState === "saving"}>Entwurf speichern</button>
        <button type="button" onClick={() => void release()} disabled={saveState === "saving"}>Als neue Version freigeben</button>
        {saveState === "saved" && <span className="text-small text-muted">Gespeichert.</span>}
      </footer>
    </main>
  );
}