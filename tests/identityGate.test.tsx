/**
 * Tests für die IdentityGate-Komponente.
 *
 * Da der Testrunner Node.js ohne DOM verwendet, wird renderToStaticMarkup eingesetzt,
 * das den initialen State (passed=false) der Client-Komponente rendert.
 * Interaktive Übergänge (Weiter-Button) werden über die exportierte
 * validateGateInput-Funktion unit-getestet.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { IdentityGate, validateGateInput } from "@/components/IdentityGate";

describe("validateGateInput", () => {
  it("gibt false zurück wenn Geburtsdatum leer ist", () => {
    expect(validateGateInput("", "Mül")).toBe(false);
  });

  it("gibt false zurück wenn Nachnamenpräfix kürzer als 3 Zeichen ist", () => {
    expect(validateGateInput("2000-01-01", "Mü")).toBe(false);
  });

  it("gibt false zurück wenn beide Felder leer sind", () => {
    expect(validateGateInput("", "")).toBe(false);
  });

  it("gibt false zurück wenn nur das Geburtsdatum fehlt", () => {
    expect(validateGateInput("", "Müller")).toBe(false);
  });

  it("gibt true zurück wenn Geburtsdatum gesetzt und Nachname mind. 3 Zeichen hat", () => {
    expect(validateGateInput("2000-01-01", "Mül")).toBe(true);
  });

  it("gibt true zurück bei mehr als 3 Zeichen im Nachname", () => {
    expect(validateGateInput("1990-06-15", "Müller")).toBe(true);
  });

  it("ignoriert führende/nachfolgende Leerzeichen beim Vergleich", () => {
    expect(validateGateInput("  ", "Mül")).toBe(false);
    expect(validateGateInput("2000-01-01", "  M")).toBe(false);
  });
});

describe("IdentityGate – initiales Rendering (Gate nicht passiert)", () => {
  it("rendert Gate-UI und nicht den Formular-Inhalt", () => {
    const markup = renderToStaticMarkup(
      <IdentityGate>
        <div data-form-content>FORM_CONTENT</div>
      </IdentityGate>,
    );
    expect(markup).toContain("data-identity-gate");
    expect(markup).not.toContain("data-form-content");
    expect(markup).not.toContain("FORM_CONTENT");
  });

  it("zeigt den Datenschutzhinweis", () => {
    const markup = renderToStaticMarkup(
      <IdentityGate>
        <div>FORM</div>
      </IdentityGate>,
    );
    expect(markup).toContain("data-identity-gate-notice");
    expect(markup).toContain("verschlüsselt");
    expect(markup).toContain("Datenschutzerklärung");
  });

  it("zeigt das Geburtsdatum-Eingabefeld", () => {
    const markup = renderToStaticMarkup(
      <IdentityGate>
        <div>FORM</div>
      </IdentityGate>,
    );
    expect(markup).toContain("data-identity-gate-birthdate");
    expect(markup).toContain('type="date"');
  });

  it("zeigt das Nachname-Eingabefeld", () => {
    const markup = renderToStaticMarkup(
      <IdentityGate>
        <div>FORM</div>
      </IdentityGate>,
    );
    expect(markup).toContain("data-identity-gate-lastname");
  });

  it("zeigt den Weiter-Button", () => {
    const markup = renderToStaticMarkup(
      <IdentityGate>
        <div>FORM</div>
      </IdentityGate>,
    );
    expect(markup).toContain("data-identity-gate-submit");
    expect(markup).toContain("Weiter");
  });

  it("zeigt initial keine Fehlermeldung", () => {
    const markup = renderToStaticMarkup(
      <IdentityGate>
        <div>FORM</div>
      </IdentityGate>,
    );
    expect(markup).not.toContain("data-identity-gate-error");
  });

  it("enthält keine Absenden-Schaltfläche des inneren Formulars", () => {
    const markup = renderToStaticMarkup(
      <IdentityGate>
        <button data-q-submit>Absenden</button>
      </IdentityGate>,
    );
    expect(markup).not.toContain("data-q-submit");
  });
});
