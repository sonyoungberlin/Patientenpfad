"use client";

/**
 * Patientengespräch – alternativer Weg innerhalb von M2.
 *
 * Technisch nutzt dieser Weg den bestehenden MFA-Patienten-Prefill
 * (dieselben M2-Fragen werden gemeinsam mit dem Patienten beantwortet).
 * Daher wird hier nur ein Anker auf das bestehende MFA-Formular gesetzt –
 * keine neue Architektur, kein neuer Status.
 */
export function M2PatientConversationClient() {
  function handleClick() {
    if (typeof window !== "undefined") {
      // Schaltet das bestehende M2-Formular auf den Patientenfragen-Katalog
      // um (gleiche UI, gleiche Persistenz – nur andere Fragenquelle).
      window.dispatchEvent(
        new CustomEvent("m2-set-mode", { detail: "patient" }),
      );
    }
    if (typeof document === "undefined") return;
    const target = document.getElementById("m2-mfa-form");
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div data-m2-patient-conversation style={{ flex: "0 0 auto" }}>
      <button
        type="button"
        data-m2-patient-conversation-button
        onClick={handleClick}
      >
        Patientengespräch
      </button>
    </div>
  );
}
