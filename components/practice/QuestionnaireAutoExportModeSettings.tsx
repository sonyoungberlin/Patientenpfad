"use client";

import { useEffect, useState } from "react";

type ExportMode = "BROWSER" | "WINDOWS";

const ENDPOINT = "/api/practice/questionnaire-auto-export-mode";

export default function QuestionnaireAutoExportModeSettings() {
  const [mode, setMode] = useState<ExportMode | null>(null);
  const [selectedMode, setSelectedMode] = useState<ExportMode>("BROWSER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(ENDPOINT)
      .then(async (response) => {
        if (!response.ok) throw new Error("status_failed");
        return response.json() as Promise<{ mode: ExportMode }>;
      })
      .then(({ mode: currentMode }) => {
        setMode(currentMode);
        setSelectedMode(currentMode);
      })
      .catch(() => setError("Exportmodus konnte nicht geladen werden."));
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selectedMode }),
      });
      if (!response.ok) throw new Error("save_failed");
      const result = await response.json() as { mode: ExportMode };
      setMode(result.mode);
      setSelectedMode(result.mode);
    } catch {
      setError("Exportmodus konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: "2.5rem" }} data-testid="questionnaire-auto-export-mode">
      <h2>Automatischer Fragebogen-Export</h2>
      <label>
        Exportweg
        <select
          value={selectedMode}
          onChange={(event) => setSelectedMode(event.target.value as ExportMode)}
          disabled={mode === null || busy}
        >
          <option value="BROWSER">Browser-Autoexport</option>
          <option value="WINDOWS">Windows-AutoDownload</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() => void save()}
        disabled={mode === null || busy || selectedMode === mode}
        style={{ marginLeft: "0.5rem" }}
      >
        Exportweg speichern
      </button>
      {error && <p role="alert" className="text-error">{error}</p>}
      {mode === "WINDOWS" && (
        <p className="text-muted text-small">
          Der Browser übernimmt keine Exporte, auch wenn der Windows-Dienst offline ist.
        </p>
      )}
    </section>
  );
}