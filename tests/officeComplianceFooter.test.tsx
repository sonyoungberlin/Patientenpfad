import { renderToStaticMarkup } from "react-dom/server";
import OfficeComplianceFooter from "@/components/office/OfficeComplianceFooter";
import {
  getEmptyCompliance,
  type CheckpointComplianceView,
} from "@/lib/office/checkpointCompliance";

function fullCompliance(): CheckpointComplianceView {
  return {
    legalSources: [
      {
        id: "SGB_V_PAR_106D",
        title: "SGB V § 106d Abrechnungsprüfung durch die Krankenkassen und die Kassenärztlichen Vereinigungen",
        paragraph: "§ 106d",
        shortName: "SGB V",
        jurisdiction: "BUND",
        sourceUrl: "https://www.gesetze-im-internet.de/sgb_5/__106d.html",
      },
      {
        id: "BMV_AE",
        title: "Bundesmantelvertrag-Aerzte",
        shortName: "BMV-Ae",
        jurisdiction: "BUND",
        sourceUrl: "https://www.kbv.de/html/bundesmantelvertrag.php",
        note: "Legacy-Pauschalquelle ohne Paragraph. Bestehende Referenzen bleiben; neue Einbindungen nur paragraphengenau.",
      },
    ],
    authorities: [
      {
        id: "KV_BERLIN",
        name: "Kassenaerztliche Vereinigung Berlin",
        kind: "KV",
        scope: "BERLIN",
        sourceUrl: "https://www.kvberlin.de/",
      },
    ],
    requiredEvidences: [
      {
        id: "KV_SCHREIBEN_ABRECHNUNG",
        label: "KV-Schreiben zur Abrechnungsruckfrage",
        category: "EINGEHENDES_DOKUMENT",
        formatHint: "Original-PDF aus dem KV-Sicheren-Nachrichten-Postfach.",
      },
    ],
    optionalEvidences: [
      {
        id: "QUARTALSPROFIL_PVS",
        label: "Quartalsprofil-Auswertung aus dem Praxisverwaltungssystem",
        category: "AUSWERTUNG",
      },
    ],
  };
}

describe("OfficeComplianceFooter", () => {
  it("rendert nichts, wenn alle Listen leer sind", () => {
    const html = renderToStaticMarkup(
      <OfficeComplianceFooter compliance={getEmptyCompliance()} />,
    );
    expect(html).toBe("");
  });

  it("zeigt Counts in der Summary und alle vier Sektionen", () => {
    const html = renderToStaticMarkup(
      <OfficeComplianceFooter
        compliance={fullCompliance()}
        checkpointId="KV-02"
      />,
    );
    expect(html).toContain("Compliance");
    expect(html).toContain("2 Rechtsgrundlagen");
    expect(html).toContain("1 zustaendige Stelle");
    expect(html).toContain("1 Pflichtnachweis");
    expect(html).toContain("1 optionaler Nachweis");

    expect(html).toContain("Rechtsgrundlagen");
    expect(html).toContain("Zustaendige Stellen");
    expect(html).toContain("Pflichtnachweise");
    expect(html).toContain("Optionale Nachweise");
    expect(html).toContain("KV-Schreiben zur Abrechnungsruckfrage");
    expect(html).toContain("Quartalsprofil-Auswertung");
    expect(html).toContain("Kassenaerztliche Vereinigung Berlin");
    expect(html).toContain("data-testid=\"office-compliance-footer-KV-02\"");
  });

  it("rendert externe Links mit target=_blank und rel=noreferrer noopener", () => {
    const html = renderToStaticMarkup(
      <OfficeComplianceFooter compliance={fullCompliance()} />,
    );
    expect(html).toContain('href="https://www.gesetze-im-internet.de/sgb_5/__106d.html"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
  });

  it("Notes werden klein angezeigt, nicht als Warnbanner (keine role=alert / kein Warn-CSS)", () => {
    const html = renderToStaticMarkup(
      <OfficeComplianceFooter compliance={fullCompliance()} />,
    );
    expect(html).toContain("Legacy-Pauschalquelle");
    expect(html).not.toMatch(/role="alert"/i);
    expect(html).not.toMatch(/class="[^"]*warn/i);
    expect(html).not.toMatch(/background[^;]*(red|orange|yellow|#f[0-9a-f]{0,5}[0-2])/i);
  });

  it("blendet leere Sektionen aus, behaelt die nichtleeren bei", () => {
    const partial: CheckpointComplianceView = {
      ...getEmptyCompliance(),
      authorities: [
        {
          id: "KV_BERLIN",
          name: "Kassenaerztliche Vereinigung Berlin",
          kind: "KV",
          scope: "BERLIN",
        },
      ],
    };
    const html = renderToStaticMarkup(
      <OfficeComplianceFooter compliance={partial} />,
    );
    expect(html).toContain("Zustaendige Stellen");
    expect(html).toContain("Kassenaerztliche Vereinigung Berlin");
    expect(html).not.toContain("Rechtsgrundlagen");
    expect(html).not.toContain("Pflichtnachweise");
    expect(html).not.toContain("Optionale Nachweise");
  });

  it("Legacy-Quellen (BMV_AE) werden nicht gesondert hervorgehoben", () => {
    const html = renderToStaticMarkup(
      <OfficeComplianceFooter compliance={fullCompliance()} />,
    );
    // Markup darf BMV-Ae als normalen Listeneintrag zeigen, ohne spezielle
    // CSS-Klassen wie "warn", "legacy", "highlight" oder einen Banner.
    expect(html).toContain("BMV-Ae");
    expect(html).not.toMatch(/class="[^"]*(legacy|highlight|warn)[^"]*"/i);
  });
});
