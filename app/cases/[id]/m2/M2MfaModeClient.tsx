"use client";

/**
 * MFA-Vorbereitung – Navigationselement in M2.
 *
 * Schaltet das M2-Formular zurück in den MFA-Modus
 * (gleiche Persistenz – nur andere Fragenquelle).
 */
export function M2MfaModeClient() {
  function handleClick() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("m2-set-mode", { detail: "mfa" }),
      );
    }
    if (typeof document === "undefined") return;
    const target = document.getElementById("m2-mfa-form");
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div data-m2-mfa-mode style={{ flex: "0 0 auto" }}>
      <button
        type="button"
        data-m2-mfa-mode-button
        onClick={handleClick}
      >
        MFA-Vorbereitung
      </button>
    </div>
  );
}
