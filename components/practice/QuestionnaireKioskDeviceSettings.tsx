"use client";

import { useState } from "react";

type Device = { id: string; name: string; is_active: boolean; revoked_at: string | Date | null; created_at: string | Date; last_seen_at: string | Date | null; capabilities?: string[] };

export async function readKioskResponseError(response: Response): Promise<{ error?: string }> {
  const body = await response.text();
  if (!body.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as { error?: string }
      : {};
  } catch {
    return {};
  }
}

export default function QuestionnaireKioskDeviceSettings({ initialDevices }: { initialDevices: Device[] }) {
  const [devices, setDevices] = useState(initialDevices);
  const [error, setError] = useState<string | null>(null);
  async function activate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/practice/questionnaire-kiosk-devices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(form), capabilities: form.getAll("capabilities") }) });
    if (response.ok) { window.location.replace("/questionnaire-kiosk/lock"); return; }
    const data = await readKioskResponseError(response);
    setError(data.error ?? "Einrichtung fehlgeschlagen.");
  }
  async function action(id: string, actionName: string, pin?: string) {
    const response = await fetch(`/api/practice/questionnaire-kiosk-devices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName, ...(pin ? { pin } : {}) }) });
    if (!response.ok) { const data = await readKioskResponseError(response); setError(data.error ?? "Aktion fehlgeschlagen."); return; }
    if (actionName === "revoke") setDevices((current) => current.map((item) => item.id === id ? { ...item, revoked_at: new Date(), is_active: false } : item));
    if (actionName === "deactivate" || actionName === "reactivate") setDevices((current) => current.map((item) => item.id === id ? { ...item, is_active: actionName === "reactivate" } : item));
  }
  return <>
    <section><h2>Dieses Gerät als Kiosk einrichten</h2><form onSubmit={activate} autoComplete="off" style={{ display: "grid", gap: "0.75rem", maxWidth: "24rem" }}><label>Gerätename<input name="name" maxLength={100} required autoComplete="off" /></label><label>Sechsstellige PIN<input name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="new-password" /></label><label>PIN bestätigen<input name="pin_confirmation" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="new-password" /></label><label><input type="checkbox" name="capabilities" value="internal_documentation" /> Interne Dokumentation</label><button type="submit">Dieses Gerät als Kiosk einrichten</button></form></section>
    {error ? <p role="alert" className="text-error">{error}</p> : null}
    <section style={{ marginTop: "2rem" }}><h2>Geräte</h2>{devices.length === 0 ? <p>Keine Kiosk-Geräte eingerichtet.</p> : <table><thead><tr><th>Name</th><th>Status</th><th>Erstellt</th><th>Letzter Zugriff</th><th>Aktionen</th></tr></thead><tbody>{devices.map((device) => <tr key={device.id}><td>{device.name}</td><td>{device.revoked_at ? "Widerrufen" : device.is_active ? "Aktiv" : "Gesperrt"}</td><td>{new Date(device.created_at).toLocaleDateString("de-DE")}</td><td>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString("de-DE") : "Noch nie"}</td><td><div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>{!device.revoked_at && <><button type="button" onClick={() => void action(device.id, "lock")}>Sperren</button><button type="button" onClick={() => void action(device.id, device.is_active ? "deactivate" : "reactivate")}>{device.is_active ? "Deaktivieren" : "Reaktivieren"}</button><button type="button" onClick={() => { const pin = window.prompt("Neue sechsstellige PIN"); if (pin) void action(device.id, "change_pin", pin); }}>PIN ändern</button><button type="button" onClick={() => void action(device.id, "revoke")}>Entfernen</button></>}</div></td></tr>)}</tbody></table>}</section>
  </>;
}