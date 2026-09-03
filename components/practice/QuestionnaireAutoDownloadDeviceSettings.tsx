"use client";

import { useEffect, useState } from "react";
import { getOrCreateQuestionnaireAutoDeviceId } from "@/lib/questionnaire/autoDownloadDeviceClient";

type DeviceStatus = {
  enabled: boolean;
  isCurrentDevice: boolean;
  canManage: boolean;
};

const ENDPOINT = "/api/practice/questionnaire-auto-download";

export default function QuestionnaireAutoDownloadDeviceSettings() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus(id: string) {
    const response = await fetch(ENDPOINT, {
      headers: { "X-Questionnaire-Auto-Device": id },
    });
    if (!response.ok) throw new Error("status_failed");
    setStatus((await response.json()) as DeviceStatus);
  }

  useEffect(() => {
    try {
      const id = getOrCreateQuestionnaireAutoDeviceId();
      setDeviceId(id);
      void loadStatus(id).catch(() => {
        setError("Status konnte nicht geladen werden.");
      });
    } catch {
      setError("Die lokale Gerätekennung konnte nicht gespeichert werden.");
    }
  }, []);

  async function activate() {
    if (!deviceId) return;
    if (
      status?.enabled &&
      !status.isCurrentDevice &&
      !window.confirm(
        "Der automatische Download wird künftig auf diesem Computer ausgeführt.\nDas bisherige Download-Gerät wird deaktiviert.",
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "PUT",
        headers: { "X-Questionnaire-Auto-Device": deviceId },
      });
      if (!response.ok) throw new Error("activate_failed");
      await loadStatus(deviceId);
    } catch {
      setError("Einstellung konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!deviceId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINT, {
        method: "DELETE",
        headers: { "X-Questionnaire-Auto-Device": deviceId },
      });
      if (!response.ok) throw new Error("disable_failed");
      await loadStatus(deviceId);
    } catch {
      setError("Automatischer Download konnte nicht deaktiviert werden.");
    } finally {
      setBusy(false);
    }
  }

  let statusText = "Status wird geladen …";
  if (status && !status.enabled) statusText = "Nicht eingerichtet";
  if (status?.enabled && status.isCurrentDevice) {
    statusText = "Automatischer Download ist auf diesem Computer aktiv.";
  }
  if (status?.enabled && !status.isCurrentDevice) {
    statusText = "Automatischer Download ist auf einem anderen Computer aktiv.";
  }

  return (
    <section
      style={{ marginTop: "2.5rem" }}
      data-testid="questionnaire-auto-download-settings"
    >
      <h2>Automatischer Fragebogen-Download</h2>
      <p>{statusText}</p>

      {status?.canManage && !status.enabled && (
        <button type="button" disabled={busy} onClick={activate}>
          Diesen Computer für automatische Downloads verwenden
        </button>
      )}
      {status?.canManage && status.enabled && status.isCurrentDevice && (
        <button type="button" disabled={busy} onClick={disable}>
          Automatischen Download deaktivieren
        </button>
      )}
      {status?.canManage && status.enabled && !status.isCurrentDevice && (
        <button type="button" disabled={busy} onClick={activate}>
          Diesen Computer stattdessen verwenden
        </button>
      )}

      {error && (
        <p role="alert" style={{ color: "var(--danger-fg, #b91c1c)" }}>
          {error}
        </p>
      )}

      <p className="text-muted text-small" style={{ marginTop: "0.75rem" }}>
        Chrome muss automatische Downloads für Patientenpfad erlauben.<br />
        Der Speicherort wird in Chrome festgelegt.<br />
        Die Option „Vor jedem Download fragen“ sollte ausgeschaltet sein.
      </p>
    </section>
  );
}