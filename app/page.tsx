"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CaseMode, M1BlockStatus, M1Selection } from "@/lib/types";
import {
  getCreateSuccessRedirectPath,
  isGatekeeperResponse,
} from "@/lib/flow/caseNavigation";

const INITIAL_SELECTION: M1Selection = {
  kommunikation: "unklar",
  medizinische_lage: "unklar",
  versorgung_im_alltag: "unklar",
};

const BLOCK_LABELS: Record<keyof M1Selection, string> = {
  kommunikation: "Kommunikation",
  medizinische_lage: "Medizinische Lage",
  versorgung_im_alltag: "Versorgung im Alltag",
};

type AccountInfo = {
  id: string;
  email: string;
  is_approved: boolean;
};

export default function HomePage() {
  const router = useRouter();
  const [selection, setSelection] = useState<M1Selection>(INITIAL_SELECTION);
  const [mode, setMode] = useState<CaseMode>("guest");
  const [patientReference, setPatientReference] = useState("");
  const [gatekeeper, setGatekeeper] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Auth state & refs
  const loginSectionRef = React.useRef<HTMLDivElement>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  // Registration state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setAccount(d.account as AccountInfo);
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  async function handleLogin() {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLoginError((data.error as string | undefined) ?? "Login fehlgeschlagen.");
        return;
      }
      setAccount(data.account as AccountInfo);
      setLoginEmail("");
    } catch {
      setLoginError("Netzwerkfehler");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister() {
    setRegLoading(true);
    setRegError(null);
    setRegSuccess(false);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setRegError((data.error as string | undefined) ?? "Registrierung fehlgeschlagen.");
        return;
      }
      setRegSuccess(true);
      setRegName("");
      setRegEmail("");
    } catch {
      setRegError("Netzwerkfehler");
    } finally {
      setRegLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setAccount(null);
  }

  function handleBlockChange(blockId: keyof M1Selection, value: M1BlockStatus) {
    setSelection((prev) => ({ ...prev, [blockId]: value }));
  }

  async function handleCreate() {
    setLoading(true);
    setGatekeeper(false);
    setError(null);
    try {
      const body: Record<string, unknown> = { m1Selection: selection, mode };
      if (mode === "practice" && patientReference.trim()) {
        body.patient_reference = patientReference.trim();
      }
      const res = await fetch("/api/cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError("Der Fall konnte gerade nicht angelegt werden. Bitte versuchen Sie es erneut.");
        return;
      }
      if (isGatekeeperResponse(data)) {
        setGatekeeper(true);
        return;
      }
      const redirectPath = getCreateSuccessRedirectPath(data);
      if (redirectPath) {
        router.push(redirectPath);
      } else {
        setError("Fall-ID fehlt in der Antwort. Bitte erneut versuchen.");
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked) {
    return <main>Lädt…</main>;
  }

  if (!account) {
    return (
      <main style={{ maxWidth: "500px" }}>
        <h1>Struktur im Praxisalltag</h1>
        <p style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          Offene Fragen sichtbar machen – klare Zuordnung ermöglichen.
        </p>
        <p className="text-muted text-small" style={{ marginBottom: "1.5rem" }}>
          Die medizinische Entscheidung bleibt beim Arzt.
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          Im Praxisalltag gibt es immer wieder Situationen, in denen unklar ist, was noch fehlt oder wie es weitergeht.
          Die Anwendung macht diese offenen Fragen sichtbar und unterstützt dabei, die nächsten Schritte klar zuzuordnen.
          Aktuell testen wir dies im Rahmen einer Pilotphase.
        </p>

        {/* Registrierungsformular */}
        <h2>Für Pilotphase registrieren</h2>
        {regSuccess ? (
          <div className="banner-warning" style={{ marginBottom: "1rem" }}>
            <strong>Registrierung erfolgreich.</strong> Ihr Zugang wird manuell freigeschaltet.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "0.75rem" }}>
              <label htmlFor="reg_name">Name</label>
              <input
                id="reg_name"
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Vor- und Nachname"
                style={{ marginTop: "0.5rem" }}
              />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label htmlFor="reg_email">E-Mail-Adresse</label>
              <input
                id="reg_email"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@beispiel.de"
                style={{ marginTop: "0.5rem" }}
              />
            </div>
            <button
              className="btn-primary"
              onClick={handleRegister}
              disabled={regLoading}
              style={{ marginTop: "0.5rem" }}
            >
              {regLoading ? "Lädt…" : "Registrieren"}
            </button>
            {regError && (
              <p className="text-error" style={{ marginTop: "0.5rem" }}>{regError}</p>
            )}
          </>
        )}
        <p className="text-muted text-small" style={{ marginTop: "0.75rem" }}>
          Zugänge werden aktuell manuell freigeschaltet.
        </p>

        {/* Sekundärer Login-Bereich */}
        <div ref={loginSectionRef} className="section-divider">
          <p className="text-muted text-small" style={{ marginBottom: "0.5rem" }}>
            Bereits freigeschaltet?
          </p>
          <div>
            <label htmlFor="login_email">E-Mail-Adresse</label>
            <input
              id="login_email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="name@beispiel.de"
              style={{ marginTop: "0.5rem" }}
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loginLoading}
            style={{ marginTop: "0.75rem" }}
          >
            {loginLoading ? "Lädt…" : "Anmelden"}
          </button>
          {loginError && (
            <p className="text-error" style={{ marginTop: "0.5rem" }}>{loginError}</p>
          )}
        </div>
      </main>
    );
  }

  if (!account.is_approved) {
    return (
      <main style={{ maxWidth: "500px" }}>
        <div className="account-bar">
          <span className="account-email">{account.email}</span>
          <button onClick={handleLogout}>Abmelden</button>
        </div>
        <h1>Freischaltung ausstehend</h1>
        <p className="text-muted">
          Ihr Account ist noch nicht freigeschaltet. Bitte warten Sie auf die
          Freischaltung durch den Administrator.
        </p>
      </main>
    );
  }

  return (
    <main>
      {/* Account-Bar */}
      <div className="account-bar">
        <span className="account-email">{account.email}</span>
        <button onClick={handleLogout}>Abmelden</button>
      </div>

      <h1>Was ist aktuell unklar oder klärungsbedürftig?</h1>
      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
        Nur bei <strong>unklar</strong> wird ein Strukturfall mit Checkpoints gestartet.
      </p>

      {/* Modus-Auswahl */}
      <div style={{ marginBottom: "1.5rem" }}>
        <strong>Modus</strong>
        <div style={{ marginTop: "0.4rem" }}>
          {(["guest", "practice"] as CaseMode[]).map((m) => (
            <label key={m} style={{ marginRight: "1.5rem", cursor: "pointer", fontWeight: 400 }}>
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                style={{ marginRight: "0.3rem" }}
              />
              {m === "guest" ? "Als Gast starten" : "Mit Praxiszuordnung starten"}
            </label>
          ))}
        </div>
        {mode === "practice" && (
          <div style={{ marginTop: "0.75rem" }}>
            <label htmlFor="patient_reference">Patientennummer (optional)</label>
            <input
              id="patient_reference"
              type="text"
              value={patientReference}
              onChange={(e) => setPatientReference(e.target.value)}
              placeholder="z. B. P-2024-001"
              style={{ marginTop: "0.5rem" }}
            />
          </div>
        )}
      </div>

      <p className="text-muted text-small" style={{ marginBottom: "1.5rem" }}>
        Hinweis: Der Fall erscheint in Ihrer Fallübersicht. Eine Patienten-Referenz hilft beim späteren Wiederfinden.
      </p>

      {/* M1-Blöcke */}
      <div>
        {(Object.keys(BLOCK_LABELS) as (keyof M1Selection)[]).map((blockId) => (
          <div key={blockId} style={{ marginBottom: "1rem" }}>
            <strong>{BLOCK_LABELS[blockId]}</strong>
            <div style={{ marginTop: "0.3rem" }}>
              {(["klar", "unklar"] as M1BlockStatus[]).map((val) => (
                <label
                  key={val}
                  style={{ marginRight: "1.5rem", cursor: "pointer", fontWeight: 400 }}
                >
                  <input
                    type="radio"
                    name={blockId}
                    value={val}
                    checked={selection[blockId] === val}
                    onChange={() => handleBlockChange(blockId, val)}
                    style={{ marginRight: "0.3rem" }}
                  />
                  {val}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        onClick={handleCreate}
        disabled={loading}
        style={{ marginTop: "1rem" }}
      >
        {loading ? "Lädt…" : "Fall anlegen"}
      </button>

      {gatekeeper && (
        <div className="banner-warning" style={{ marginTop: "1.5rem" }}>
          <strong>Kein Strukturfall erforderlich.</strong> Alle Bereiche sind
          geklärt – es werden keine Checkpoints gestartet.
        </div>
      )}

      {error && (
        <p className="text-error" style={{ marginTop: "1rem" }}>Fehler: {error}</p>
      )}


    </main>
  );
}
