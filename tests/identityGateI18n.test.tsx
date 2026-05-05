/**
 * Tests für die Sprach-Lokalisierung von `components/IdentityGate.tsx`.
 *
 * Die Komponente wird von `/q/[token]` (Patientenformular) verwendet und ist
 * im Default deutsch. Das ist wichtig, damit `/p/[slug]` und alle anderen
 * Aufrufer ohne Anpassung wie bisher rendern. Die optionale `language`-Prop
 * darf das Verhalten ausschließlich auf den Token-Pfad lokalisieren.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { IdentityGate } from "@/components/IdentityGate";

describe("IdentityGate Sprache", () => {
  it("rendert standardmäßig (ohne Prop) deutsch", () => {
    const html = renderToStaticMarkup(
      <IdentityGate>
        <div>kids</div>
      </IdentityGate>,
    );
    expect(html).toContain("Geburtsdatum");
    expect(html).toContain("Erste 3 Buchstaben des Nachnamens");
    expect(html).toContain(">Weiter<");
    expect(html).toContain("Hinweis:");
  });

  it("rendert mit language='en' vollständig englisch", () => {
    const html = renderToStaticMarkup(
      <IdentityGate language="en">
        <div>kids</div>
      </IdentityGate>,
    );
    expect(html).toContain("Date of birth");
    expect(html).toContain("First 3 letters of your last name");
    expect(html).toContain(">Continue<");
    expect(html).toContain("Note:");

    // Keine deutschen Originaltexte
    expect(html).not.toContain("Geburtsdatum");
    expect(html).not.toContain("Erste 3 Buchstaben");
    expect(html).not.toContain(">Weiter<");
    expect(html).not.toContain("Hinweis:");
  });

  it("language='de' verhält sich identisch zum Default", () => {
    const a = renderToStaticMarkup(
      <IdentityGate>
        <div>kids</div>
      </IdentityGate>,
    );
    const b = renderToStaticMarkup(
      <IdentityGate language="de">
        <div>kids</div>
      </IdentityGate>,
    );
    expect(a).toBe(b);
  });
});
