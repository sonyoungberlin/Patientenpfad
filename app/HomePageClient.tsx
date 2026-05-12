"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ActiveCheckpointMultiSelect, CaseMode, M1BlockStatus, M1Selection } from "@/lib/types";
import {
  getCreateSuccessRedirectPath,
  isGatekeeperResponse,
} from "@/lib/flow/caseNavigation";
import M1SelectionForm from "@/components/M1SelectionForm";
import MultiSelectCheckpointSection from "@/components/MultiSelectCheckpointSection";
import AssessmentCheckpointSection from "@/components/AssessmentCheckpointSection";
import AppShell from "@/components/AppShell";
import {
  ALWAYS_PRESENT_ASSESSMENT_IDS,
  CHECKPOINT_CATALOGUE,
  MULTI_SELECT_CATALOGUE,
} from "@/lib/logic/checkpointCatalog";

const INITIAL_SELECTION: M1Selection = {
  kommunikation: "unklar",
  medizinische_lage: "unklar",
  versorgung_im_alltag: "unklar",
  pflegebeobachtung: "klar",
};

const ASSESSMENT_CHECKBOX_IDS: readonly string[] = ALWAYS_PRESENT_ASSESSMENT_IDS.filter(
  (id) => Object.prototype.hasOwnProperty.call(CHECKPOINT_CATALOGUE, id),
);

function buildInitialAssessmentEnabled(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const id of ASSESSMENT_CHECKBOX_IDS) {
    out[id] = false;
  }
  return out;
}

function buildInitialMultiSelectCheckpoints(): ActiveCheckpointMultiSelect[] {
  return Object.values(MULTI_SELECT_CATALOGUE).map((template) => ({
    ...template,
    enabled: false,
    selections: [],
  })) as ActiveCheckpointMultiSelect[];
}

type AccountInfo = {
  id: string;
  email: string;
  is_approved: boolean;
  is_admin: boolean;
  inquiry_assistant_enabled: boolean;
  patient_communication_enabled: boolean;
  website_forms_enabled: boolean;
  office_cases_enabled: boolean;
  current_practice?: { id: string } | null;
  memberships?: Array<{ practice_id: string; role: "OWNER" | "ADMIN" | "USER" | "INBOX_ONLY" }>;
};

export default function HomePageClient() {
  const router = useRouter();
  const [selection, setSelection] = useState<M1Selection>(INITIAL_SELECTION);
  const [multiSelectCheckpoints, setMultiSelectCheckpoints] = useState<ActiveCheckpointMultiSelect[]>(
    buildInitialMultiSelectCheckpoints,
  );
  const [assessmentEnabled, setAssessmentEnabled] = useState<Record<string, boolean>>(
    buildInitialAssessmentEnabled,
  );
  const [mode, setMode] = useState<CaseMode>("guest");
  const [patientReference, setPatientReference] = useState("");
  const [gatekeeper, setGatekeeper] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loginSectionRef = React.useRef<HTMLDivElement>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);
  const [preparingLoading, setPreparingLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok)
          setAccount({
            ...(d.account as AccountInfo),
            office_cases_enabled:
              (d.account as { office_cases_enabled?: boolean })
                .office_cases_enabled ?? false,
          });
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
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLoginError((data.error as string | undefined) ?? "Login fehlgeschlagen.");
        return;
      }
      setAccount({
        ...(data.account as AccountInfo),
        office_cases_enabled:
          (data.account as { office_cases_enabled?: boolean })
            .office_cases_enabled ?? false,
      });
      setLoginEmail("");
      setLoginPassword("");
      const target =
        typeof data.redirectTo === "string" && data.redirectTo.startsWith("/")
          ? data.redirectTo
          : "/dashboard";
      router.push(target);
      router.refresh();
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
        body: JSON.stringify({ email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setRegError((data.error as string | undefined) ?? "Registrierung fehlgeschlagen.");
        return;
      }
      setRegSuccess(true);
      setRegEmail("");
      setRegPassword("");
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

  function handleMultiToggleEnabled(id: string) {
    setMultiSelectCheckpoints((prev) =>
      prev.map((cp) =>
        cp.id === id ? { ...cp, enabled: !cp.enabled, selections: cp.enabled ? [] : cp.selections } : cp,
      ),
    );
  }

  function handleMultiToggleOption(id: string, option: string) {
    setMultiSelectCheckpoints((prev) =>
      prev.map((cp) => {
        if (cp.id !== id || !cp.enabled) return cp;
        const newSelections = cp.selections.includes(option)
          ? cp.selections.filter((s) => s !== option)
          : [...cp.selections, option];
        return { ...cp, selections: newSelections };
      }),
    );
  }

  function handleAssessmentToggle(id: string) {
    setAssessmentEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCreate() {
    setLoading(true);
    setGatekeeper(false);
    setError(null);
    try {
      const multiSelectSelections: Record<string, { enabled: boolean; selections: string[] }> = {};
      for (const cp of multiSelectCheckpoints) {
        multiSelectSelections[cp.id] = { enabled: cp.enabled, selections: cp.selections };
      }
      const body: Record<string, unknown> = {
        m1Selection: selection,
        mode,
        multiSelectSelections,
        assessmentEnabled,
      };
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

  async function handleCreateAndPrepare() {
    if (preparingLoading || loading) return;
    setPreparingLoading(true);
    setGatekeeper(false);
    setError(null);
    try {
      const multiSelectSelectionsForPreview: Record<string, { enabled: boolean; selections: string[] }> = {};
      for (const cp of multiSelectCheckpoints) {
        multiSelectSelectionsForPreview[cp.id] = { enabled: cp.enabled, selections: cp.selections };
      }
      const body: Record<string, unknown> = {
        m1Selection: selection,
        mode,
        multiSelectSelections: multiSelectSelectionsForPreview,
        assessmentEnabled,
      };
      if (mode === "practice" && patientReference.trim()) {
        body.patient_reference = patientReference.trim();
      }
      const res = await fetch("/api/cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; case_id?: string; gatekeeper?: boolean };
      if (!res.ok || !data.ok) {
        setError("Der Fall konnte gerade nicht angelegt werden. Bitte versuchen Sie es erneut.");
        return;
      }
      if (isGatekeeperResponse(data)) {
        setGatekeeper(true);
        return;
      }
      const caseId = data.case_id;
      if (!caseId) {
        setError("Fall-ID fehlt in der Antwort. Bitte erneut versuchen.");
        return;
      }
      try {
        await fetch(`/api/cases/${caseId}/clinical-status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "prepared" }),
        });
      } catch {
      }
      router.push("/cases");
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setPreparingLoading(false);
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

        <h2>Für Pilotphase registrieren</h2>
        {regSuccess ? (
          <div className="banner-warning" style={{ marginBottom: "1rem" }}>
            <strong>Registrierung erfolgreich.</strong> Ihr Zugang wird manuell freigeschaltet.
          </div>
        ) : (
          <>
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
            <div style={{ marginBottom: "0.75rem" }}>
              <label htmlFor="reg_password">Passwort (mind. 10 Zeichen)</label>
              <input
                id="reg_password"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                autoComplete="new-password"
                minLength={10}
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
              autoComplete="username"
              style={{ marginTop: "0.5rem" }}
            />
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <label htmlFor="login_password">Passwort</label>
            <input
              id="login_password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
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
    <>
      <main>
        <AppShell account={account} onLogout={handleLogout} />
        <h1>Liegt genug Information vor, damit der Arzt direkt entscheiden kann?</h1>
        <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
          „Wissen wir genug über die Situation – nicht, ob sie gut oder schlecht ist?"
          Wenn etwas bekannt ist, auch als Problem, muss es nicht erneut abgefragt werden.
        </p>

        <div data-tour-id="mode-selection" style={{ marginBottom: "1.5rem" }}>
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

        <div data-tour-id="multi-select-section">
          <MultiSelectCheckpointSection
            checkpoints={multiSelectCheckpoints}
            onToggleEnabled={handleMultiToggleEnabled}
            onToggleOption={handleMultiToggleOption}
          />
        </div>

        <div data-tour-id="m1-form">
          <M1SelectionForm
            selection={selection}
            onBlockChange={handleBlockChange}
          />
        </div>

        <div data-tour-id="k12-checkbox">
          <AssessmentCheckpointSection
            checkpoints={ASSESSMENT_CHECKBOX_IDS.map((id) => {
              const template = CHECKPOINT_CATALOGUE[id]!;
              return {
                id,
                title: template.title,
                description: template.introText,
                enabled: assessmentEnabled[id] === true,
              };
            })}
            onToggleEnabled={handleAssessmentToggle}
          />
        </div>

        <button
          className="btn-primary"
          data-tour-id="create-actions"
          onClick={() => void handleCreate()}
          disabled={loading || preparingLoading}
          style={{ marginTop: "1rem" }}
        >
          {loading ? "Lädt…" : "Fall anlegen"}
        </button>

        <button
          type="button"
          data-clinical-status-prepared
          className="answer-btn"
          onClick={() => void handleCreateAndPrepare()}
          disabled={preparingLoading || loading}
          style={{ marginTop: "0.75rem" }}
        >
          {preparingLoading ? "Wird gespeichert…" : "Ärztlich vorbereitet"}
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
    </>
  );
}
