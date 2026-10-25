"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { WorkflowCasesExportReference } from "@/lib/workflow/workflowCasesExportTypes";

type SessionItem = {
  id: string;
  createdAt: string | null;
  updatedAt?: string | null;
  title: string | null;
  topicTitle: string | null;
  role: string | null;
  pointCount: number;
  href?: string | null;
  kind?: string;
  sessionStatus?: string;
  clinicalPointStatuses?: Array<"ERKENNBAR" | "NICHT_ERFASST" | "UNKLAR">;
  exportRef?: WorkflowCasesExportReference;
  profileId?: string;
  workingSessionId?: string | null;
};

const CLINICAL_STATUS_LABELS = {
  ERKENNBAR: "Erkennbar",
  NICHT_ERFASST: "Nicht erfasst",
  UNKLAR: "Unklar",
} as const;

function exportKey(reference: WorkflowCasesExportReference): string {
  return JSON.stringify(reference);
}

function itemStatusValues(item: SessionItem): string[] {
  return [
    ...(item.sessionStatus ? [`session:${item.sessionStatus}`] : []),
    ...(item.clinicalPointStatuses ?? []).map((status) => `clinical:${status}`),
  ];
}

function statusOptionLabel(value: string): string {
  if (value.startsWith("clinical:")) {
    return CLINICAL_STATUS_LABELS[value.slice("clinical:".length) as keyof typeof CLINICAL_STATUS_LABELS];
  }
  return value.slice("session:".length);
}

export default function WorkflowCasesListClient({ items: initialItems }: { items: SessionItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<"summary" | "detail">("summary");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setItems(initialItems);
    setSelectedKeys(new Set());
  }, [initialItems]);

  const statusOptions = Array.from(new Set(items.flatMap(itemStatusValues))).sort((left, right) =>
    statusOptionLabel(left).localeCompare(statusOptionLabel(right), "de"),
  );
  const visibleItems = items.filter((item) => {
    if (selectedStatuses.length === 0) return true;
    const values = itemStatusValues(item);
    return selectedStatuses.some((status) => values.includes(status));
  });
  const visibleExportable = visibleItems.filter((item) => item.exportRef);
  const selectedReferences = items.flatMap((item) =>
    item.exportRef && selectedKeys.has(exportKey(item.exportRef)) ? [item.exportRef] : [],
  );
  const allVisibleSelected = visibleExportable.length > 0 && visibleExportable.every((item) =>
    item.exportRef && selectedKeys.has(exportKey(item.exportRef)),
  );

  function toggleSelected(reference: WorkflowCasesExportReference) {
    const key = exportKey(reference);
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setExportError(null);
  }

  function toggleVisibleSelection() {
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      for (const item of visibleExportable) {
        if (!item.exportRef) continue;
        const key = exportKey(item.exportRef);
        if (allVisibleSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
    setExportError(null);
  }

  async function handleExport() {
    if (selectedReferences.length === 0) return;
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch("/api/workflow-cases/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: selectedReferences, mode: printMode }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        setExportError(data.error ?? "Der PDF-Export ist fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }
      const url = window.URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "arbeitsprozesse.pdf";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError("Der PDF-Export konnte wegen eines Netzwerkfehlers nicht gestartet werden.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(id: string, title: string | null) {
    const label = title ? `"${title}"` : "diese Sitzung";
    if (!window.confirm(`${label} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/workflow-cases/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as { ok?: boolean }).ok) {
        alert((data as { error?: string }).error ?? "Löschen fehlgeschlagen.");
        return;
      }
      setItems((prev) =>
        prev.filter((item) => item.id !== id && item.workingSessionId !== id),
      );
      router.refresh();
    } catch {
      alert("Netzwerkfehler beim Löschen.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleWeiterbearbeiten(item: SessionItem) {
    const sessionId = item.workingSessionId ?? item.id;
    router.push(`/workflow-cases/internal-protocol/draft/resume?sessionId=${encodeURIComponent(sessionId)}`);
  }

  async function handlePracticeCase(item: SessionItem) {
    if (item.workingSessionId || !item.profileId) {
      handleWeiterbearbeiten(item);
      return;
    }
    const response = await fetch("/api/workflow-cases/internal-protocol/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseProfileId: item.profileId }),
    });
    const data = (await response.json()) as { ok?: boolean; sessionId?: string; error?: string };
    if (!response.ok || !data.ok || !data.sessionId) {
      alert(data.error ?? "Praxisfall konnte nicht gestartet werden.");
      return;
    }
    router.push(`/workflow-cases/internal-protocol/draft/m2?sessionId=${encodeURIComponent(data.sessionId)}`);
  }

  if (items.length === 0) {
    return <p className="text-muted">Noch keine Sitzungen gespeichert.</p>;
  }

  return (
    <section>
      <h2>Gespeicherte Sitzungen</h2>
      <div style={{ display: "flex", gap: "1rem", alignItems: "end", flexWrap: "wrap", marginBlock: "1rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          Statusfilter
          <select
            multiple
            size={Math.min(Math.max(statusOptions.length, 2), 6)}
            value={selectedStatuses}
            onChange={(event) => {
              setSelectedStatuses(Array.from(event.currentTarget.selectedOptions, (option) => option.value));
              setExportError(null);
            }}
          >
            {statusOptions.map((status) => <option key={status} value={status}>{statusOptionLabel(status)}</option>)}
          </select>
        </label>
        <button type="button" onClick={toggleVisibleSelection} disabled={visibleExportable.length === 0}>
          {allVisibleSelected ? "Sichtbare Auswahl aufheben" : "Alle sichtbaren auswählen"}
        </button>
        <fieldset style={{ display: "flex", gap: "0.75rem", border: 0, padding: 0, margin: 0 }}>
          <legend>PDF-Ausgabe</legend>
          <label>
            <input type="radio" name="workflow-print-mode" checked={printMode === "summary"} onChange={() => setPrintMode("summary")} />
            Kurzübersicht
          </label>
          <label>
            <input type="radio" name="workflow-print-mode" checked={printMode === "detail"} onChange={() => setPrintMode("detail")} />
            Ausführliche Übersicht
          </label>
        </fieldset>
        <button type="button" onClick={() => void handleExport()} disabled={selectedReferences.length === 0 || exporting}>
          {exporting ? "PDF wird erstellt…" : `Auswahl als PDF (${selectedReferences.length})`}
        </button>
      </div>
      {exportError && <p role="alert">{exportError}</p>}
      <table>
        <thead>
          <tr>
            <th scope="col">Auswahl</th>
            <th>Datum</th>
            <th>Musterprozess</th>
            <th>Rolle</th>
            <th>Titel</th>
            <th>Status</th>
            <th>Punkte</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((item) => (
            <tr key={item.id}>
              <td>
                {item.exportRef ? (
                  <input
                    type="checkbox"
                    aria-label={`${item.topicTitle ?? item.title ?? "Eintrag"} auswählen`}
                    checked={selectedKeys.has(exportKey(item.exportRef))}
                    onChange={() => toggleSelected(item.exportRef!)}
                  />
                ) : "–"}
              </td>
              <td>{item.updatedAt ?? item.createdAt ?? "–"}</td>
              <td>{item.topicTitle ?? "–"}</td>
              <td>{item.role ?? "–"}</td>
              <td>{item.title ?? "–"}</td>
              <td>{item.sessionStatus ?? ((item.clinicalPointStatuses ?? []).map((status) => CLINICAL_STATUS_LABELS[status]).join(", ") || "–")}</td>
              <td>{item.pointCount}</td>
              <td style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {item.href && (
                  <Link href={item.href}>
                    <button type="button">Öffnen</button>
                  </Link>
                )}
                {item.kind === "practice-workflow" && (
                  <button
                    type="button"
                    onClick={() => handleWeiterbearbeiten(item)}
                  >
                    Weiterbearbeiten
                  </button>
                )}
                {item.kind === "practice-case" && (
                  <button type="button" onClick={() => void handlePracticeCase(item)}>
                    {item.workingSessionId ? "Weiterbearbeiten" : "Bearbeiten"}
                  </button>
                )}
                {item.kind !== "practice-case" && <button
                  type="button"
                  onClick={() => void handleDelete(item.id, item.title)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? "Löscht…" : "Löschen"}
                </button>}
                {item.kind === "practice-case" && item.workingSessionId && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.workingSessionId!, item.title)}
                    disabled={deletingId === item.workingSessionId}
                  >
                    {deletingId === item.workingSessionId ? "Löscht…" : "Verwerfen"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
