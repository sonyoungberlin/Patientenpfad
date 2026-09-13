"use client";

import { useEffect, useState } from "react";

type Device = {
  id: string;
  name: string;
  is_active: boolean;
  revoked_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  enrollment_expires_at: string | null;
  enrolled: boolean;
};

type Enrollment = {
  code: string;
  expiresAt: string;
};

const ENDPOINT = "/api/practice/auto-download-devices";

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export default function PersistentAutoDownloadDeviceSettings() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDevices() {
    const response = await fetch(ENDPOINT);
    const body = await readJson(response);
    if (!response.ok || !Array.isArray(body.devices)) {
      throw new Error(typeof body.error === "string" ? body.error : "Geräte konnten nicht geladen werden.");
    }
    setDevices(body.devices as Device[]);
  }

  useEffect(() => {
    void loadDevices().catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Geräte konnten nicht geladen werden.");
    });
  }, []);

  async function createDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("name") }),
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Gerät konnte nicht angelegt werden.");
      }
      setEnrollment({
        code: String(body.enrollmentCode),
        expiresAt: String(body.enrollmentExpiresAt),
      });
      form.reset();
      await loadDevices();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Gerät konnte nicht angelegt werden.");
    } finally {
      setBusy(false);
    }
  }

  async function updateDevice(id: string, action: "deactivate" | "reactivate" | "revoke") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${ENDPOINT}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Aktion fehlgeschlagen.");
      }
      await loadDevices();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: "2.5rem" }} data-testid="persistent-auto-download-devices">
      <h2>Dauerhafte Auto-Download-Geräte</h2>
      <form onSubmit={createDevice} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "end" }}>
        <label>
          Gerätename
          <input name="name" required maxLength={100} autoComplete="off" />
        </label>
        <button type="submit" disabled={busy}>Gerät anlegen</button>
      </form>

      {enrollment && (
        <div role="status" style={{ marginTop: "1rem" }}>
          <label>
            Einmaliger Enrollment-Code
            <input readOnly value={enrollment.code} aria-label="Enrollment-Code" />
          </label>
          <p className="text-muted text-small">
            Gültig bis {new Date(enrollment.expiresAt).toLocaleString("de-DE")}.
          </p>
        </div>
      )}

      {error && <p role="alert" className="text-error">{error}</p>}

      {devices.length === 0 ? (
        <p style={{ marginTop: "1rem" }}>Keine dauerhaften Geräte eingerichtet.</p>
      ) : (
        <table style={{ marginTop: "1rem" }}>
          <thead>
            <tr><th>Name</th><th>Status</th><th>Enrollment</th><th>Letzter Zugriff</th><th>Aktionen</th></tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id}>
                <td>{device.name}</td>
                <td>{device.revoked_at ? "Widerrufen" : device.is_active ? "Aktiv" : "Deaktiviert"}</td>
                <td>{device.enrolled ? "Abgeschlossen" : "Ausstehend"}</td>
                <td>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString("de-DE") : "Noch nie"}</td>
                <td>
                  {!device.revoked_at && (
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateDevice(device.id, device.is_active ? "deactivate" : "reactivate")}
                      >
                        {device.is_active ? "Deaktivieren" : "Reaktivieren"}
                      </button>
                      <button type="button" disabled={busy} onClick={() => void updateDevice(device.id, "revoke")}>Widerrufen</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
