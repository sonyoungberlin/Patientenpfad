"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PracticeCheckpoint } from "@/lib/practiceProcesses";

type Label = { id: string; name: string; checkpointIds: string[] };
type View = "all" | "unlabeled" | "labels";
const positionPrefix = "checkpoint-library-position:";

function checkpointMatches(checkpoint: PracticeCheckpoint, query: string) {
  return !query || `${checkpoint.title}\n${checkpoint.description ?? ""}`.toLocaleLowerCase().includes(query);
}

export default function CheckpointsListClient({
  checkpoints,
  initialLabels,
  initialView,
  initialQuery,
  initialOpenLabelIds,
}: {
  checkpoints: PracticeCheckpoint[];
  initialLabels: Label[];
  initialView: View;
  initialQuery: string;
  initialOpenLabelIds: string[];
}) {
  const [labels, setLabels] = useState(() => [...initialLabels].sort((a, b) => a.name.localeCompare(b.name, "de")));
  const [view, setView] = useState<View>(initialView);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [openLabelIds, setOpenLabelIds] = useState(() => new Set(initialOpenLabelIds));
  const [labelName, setLabelName] = useState("");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [labelStatus, setLabelStatus] = useState<string | null>(null);
  const [isSavingLabel, setIsSavingLabel] = useState(false);

  const query = searchQuery.trim().toLocaleLowerCase();
  const filteredCheckpoints = useMemo(
    () => checkpoints.filter((checkpoint) => checkpointMatches(checkpoint, query)),
    [checkpoints, query],
  );
  const labelIdsByCheckpoint = useMemo(() => {
    const ids = new Set<string>();
    for (const label of labels) for (const checkpointId of label.checkpointIds) ids.add(checkpointId);
    return ids;
  }, [labels]);
  const untaggedCheckpoints = filteredCheckpoints.filter((checkpoint) => !labelIdsByCheckpoint.has(checkpoint.id));
  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("view", view);
    if (searchQuery) params.set("q", searchQuery);
    if (openLabelIds.size) params.set("open", [...openLabelIds].join(","));
    return `/admin/practice-processes/checkpoints?${params.toString()}`;
  }, [view, searchQuery, openLabelIds]);
  const newCheckpointHref = `/admin/practice-processes/checkpoints/new?returnTo=${encodeURIComponent(listUrl)}`;

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", view);
    if (searchQuery) params.set("q", searchQuery);
    if (openLabelIds.size) params.set("open", [...openLabelIds].join(","));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [view, searchQuery, openLabelIds]);

  useEffect(() => {
    const key = `${positionPrefix}${window.location.pathname}${window.location.search}`;
    const stored = sessionStorage.getItem(key);
    if (!stored) return;
    sessionStorage.removeItem(key);
    try {
      const position = JSON.parse(stored) as { scrollY: number; checkpointId?: string };
      requestAnimationFrame(() => {
        const item = position.checkpointId
          ? [...document.querySelectorAll<HTMLElement>("[data-checkpoint-id]")]
              .find((candidate) => candidate.dataset.checkpointId === position.checkpointId) ?? null
          : null;
        if (item) item.scrollIntoView({ block: "center" });
        else window.scrollTo({ top: position.scrollY });
      });
    } catch {
      sessionStorage.removeItem(key);
    }
  }, []);

  function rememberPosition(checkpointId?: string) {
    sessionStorage.setItem(`${positionPrefix}${listUrl}`, JSON.stringify({ scrollY: window.scrollY, checkpointId }));
  }

  async function responseError(response: Response) {
    const data = await response.json() as { error?: string };
    return data.error ?? "Die Änderung konnte nicht gespeichert werden.";
  }

  async function createLabel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingLabel(true);
    setLabelError(null);
    setLabelStatus(null);
    try {
      const response = await fetch("/api/admin/checkpoint-labels", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: labelName }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json() as { label: { id: string; name: string } };
      setLabels((current) => [...current, { ...data.label, checkpointIds: [] }].sort((a, b) => a.name.localeCompare(b.name, "de")));
      setLabelName("");
      setLabelStatus(`Label „${data.label.name}“ erstellt.`);
    } catch (cause) {
      setLabelError(cause instanceof Error ? cause.message : "Label konnte nicht erstellt werden.");
    } finally {
      setIsSavingLabel(false);
    }
  }

  async function renameLabel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLabelId) return;
    setIsSavingLabel(true);
    setLabelError(null);
    setLabelStatus(null);
    try {
      const response = await fetch(`/api/admin/checkpoint-labels/${editingLabelId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editingName }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json() as { label: { id: string; name: string } };
      setLabels((current) => current.map((label) => label.id === data.label.id ? { ...label, name: data.label.name } : label)
        .sort((a, b) => a.name.localeCompare(b.name, "de")));
      setEditingLabelId(null);
      setLabelStatus("Label umbenannt.");
    } catch (cause) {
      setLabelError(cause instanceof Error ? cause.message : "Label konnte nicht umbenannt werden.");
    } finally {
      setIsSavingLabel(false);
    }
  }

  async function removeLabel(label: Label) {
    if (!window.confirm(`Label „${label.name}“ löschen? Die Checkpoints bleiben erhalten.`)) return;
    setIsSavingLabel(true);
    setLabelError(null);
    setLabelStatus(null);
    try {
      const response = await fetch(`/api/admin/checkpoint-labels/${label.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      setLabels((current) => current.filter((item) => item.id !== label.id));
      setOpenLabelIds((current) => { const next = new Set(current); next.delete(label.id); return next; });
      setLabelStatus(`Label „${label.name}“ gelöscht.`);
    } catch (cause) {
      setLabelError(cause instanceof Error ? cause.message : "Label konnte nicht gelöscht werden.");
    } finally {
      setIsSavingLabel(false);
    }
  }

  function checkpointLink(checkpoint: PracticeCheckpoint) {
    const href = `/admin/practice-processes/checkpoints/${checkpoint.id}?returnTo=${encodeURIComponent(listUrl)}`;
    return (
      <Link key={checkpoint.id} href={href} onClick={() => rememberPosition(checkpoint.id)} data-checkpoint-id={checkpoint.id} style={{ textDecoration: "none", color: "inherit" }}>
        <article className="card" style={{ display: "grid", gap: "0.4rem" }}>
          <strong>{checkpoint.title}</strong>
          {checkpoint.description && <p className="text-small text-muted" style={{ margin: 0 }}>{checkpoint.description}</p>}
          <span className="text-small text-muted">{checkpoint.orientationAnchors?.length ?? 0} Orientierungsanker</span>
        </article>
      </Link>
    );
  }

  const shownCheckpoints = view === "unlabeled" ? untaggedCheckpoints : filteredCheckpoints;

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <Link href={newCheckpointHref} onClick={() => rememberPosition()} className="text-small">+ Neuer Checkpoint</Link>
        <details style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "0.75rem 0" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Labels verwalten ({labels.length})</summary>
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
            <form onSubmit={createLabel} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
              <label htmlFor="new-checkpoint-label" className="text-small">Neues Label</label>
              <input id="new-checkpoint-label" value={labelName} maxLength={80} onChange={(event) => setLabelName(event.target.value)} />
              <button type="submit" disabled={isSavingLabel || !labelName.trim()}>Erstellen</button>
            </form>
            {labels.map((label) => (
              <div key={label.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                {editingLabelId === label.id ? (
                  <form onSubmit={renameLabel} style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                    <label htmlFor={`rename-label-${label.id}`} className="text-small">Labelname</label>
                    <input id={`rename-label-${label.id}`} value={editingName} maxLength={80} onChange={(event) => setEditingName(event.target.value)} autoFocus />
                    <button type="submit" disabled={isSavingLabel || !editingName.trim()}>Speichern</button>
                    <button type="button" onClick={() => setEditingLabelId(null)}>Abbrechen</button>
                  </form>
                ) : <><span>{label.name}</span><button type="button" className="text-small" onClick={() => { setEditingLabelId(label.id); setEditingName(label.name); }}>Umbenennen</button><button type="button" className="text-small" onClick={() => void removeLabel(label)} disabled={isSavingLabel}>Löschen</button></>}
              </div>
            ))}
            {labelError && <p role="alert" className="text-small text-error" style={{ margin: 0 }}>{labelError}</p>}
            {labelStatus && <p role="status" className="text-small" style={{ margin: 0 }}>{labelStatus}</p>}
            {!labels.length && <p className="text-small text-muted" style={{ margin: 0 }}>Noch keine Labels angelegt.</p>}
          </div>
        </details>
      </div>

      <label htmlFor="checkpoint-search" className="text-small">Checkpoint-Suche</label>
      <input id="checkpoint-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Titel oder Beschreibung suchen" style={{ fontFamily: "inherit", fontSize: "inherit", width: "100%", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.4rem 0.55rem", background: "var(--background)", color: "var(--foreground)" }} />

      <div role="group" aria-label="Checkpoint-Ansicht" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <button type="button" aria-pressed={view === "all"} onClick={() => setView("all")}>Alle Checkpoints ({filteredCheckpoints.length})</button>
        <button type="button" aria-pressed={view === "unlabeled"} onClick={() => setView("unlabeled")}>Ohne Label ({untaggedCheckpoints.length})</button>
        <button type="button" aria-pressed={view === "labels"} onClick={() => setView("labels")}>Nach Labels ({labels.length})</button>
      </div>

      {view === "labels" ? (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {!labels.length && <p className="text-small text-muted" style={{ margin: 0 }}>Noch keine Labels angelegt.</p>}
          {labels.map((label) => {
            const members = label.checkpointIds
              .map((id) => checkpoints.find((checkpoint) => checkpoint.id === id))
              .filter((checkpoint): checkpoint is PracticeCheckpoint => Boolean(checkpoint && checkpointMatches(checkpoint, query)));
            const isOpen = openLabelIds.has(label.id);
            const panelId = `checkpoint-label-panel-${label.id}`;
            return (
              <section key={label.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <button type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpenLabelIds((current) => {
                  const next = new Set(current);
                  if (next.has(label.id)) next.delete(label.id); else next.add(label.id);
                  return next;
                })} style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", gap: "0.75rem", padding: "0.75rem 0", border: 0, background: "transparent", color: "inherit", cursor: "pointer", font: "inherit" }}>
                  <span>{isOpen ? "▾" : "▸"} {label.name}</span>
                  <span className="text-small text-muted">{label.checkpointIds.length}</span>
                </button>
                <div id={panelId} hidden={!isOpen} style={{ display: isOpen ? "grid" : "none", gap: "0.75rem", paddingBottom: "0.75rem" }}>
                  {members.length ? members.map(checkpointLink) : <p className="text-small text-muted" style={{ margin: 0 }}>Keine Checkpoints in diesem Label gefunden.</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {!shownCheckpoints.length && <p className="text-muted" style={{ margin: 0 }}>Keine Checkpoints gefunden.</p>}
          {shownCheckpoints.map(checkpointLink)}
        </div>
      )}
    </section>
  );
}
