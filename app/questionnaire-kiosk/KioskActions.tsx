"use client";

import { useEffect, useState } from "react";

export function KioskUnlockForm() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const resetOnRestore = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener("pageshow", resetOnRestore);
    return () => window.removeEventListener("pageshow", resetOnRestore);
  }, []);
  async function unlock(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    const response = await fetch("/api/questionnaire-kiosk/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    const data = await response.json() as { error?: string };
    if (response.ok) window.location.replace("/questionnaire-kiosk");
    else { setError(data.error ?? "Entsperren fehlgeschlagen."); setPin(""); setLoading(false); }
  }
  return <form onSubmit={unlock} autoComplete="off" style={{ display: "grid", gap: "1rem", maxWidth: "20rem" }}>
    <label>PIN<input autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength={6} type="password" name="kiosk_pin" autoComplete="off" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
    {error ? <p role="alert" className="text-error">{error}</p> : null}
    <button type="submit" disabled={loading || pin.length !== 6}>{loading ? "Wird entsperrt…" : "Entsperren"}</button>
  </form>;
}

export function KioskLockButton() {
  async function lock() {
    await fetch("/api/questionnaire-kiosk/lock", { method: "POST" });
    window.location.replace("/questionnaire-kiosk/lock");
  }
  return <button type="button" onClick={() => void lock()}>Kiosk sperren</button>;
}