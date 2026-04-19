import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function ImpressumPage() {
  return (
    <main className="static-page">
      <h1>Impressum</h1>

      <p>Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)</p>

      <p>
        Name / Anbieter:
        <br />
        Son-Young Ramert
      </p>

      <p>
        Anschrift:
        <br />
        Jülicher Str. 12, 13357 Berlin, Deutschland
      </p>

      <p>
        Kontakt:
        <br />
        E-Mail: office@teamwork.contact
      </p>

      <hr />

      <p>
        Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:
        <br />
        Name und Anschrift wie oben
      </p>

      <hr />

      <h2>Hinweis zum Pilotbetrieb</h2>
      <p>
        Diese Anwendung wird im Rahmen einer Pilot- und Testphase
        bereitgestellt.
        <br />
        Es handelt sich nicht um ein produktives System.
      </p>

      <hr />

      <h2>Haftung für Inhalte</h2>
      <p>
        Die Inhalte dieser Anwendung wurden mit größtmöglicher Sorgfalt
        erstellt.
        <br />
        Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte wird
        jedoch keine Gewähr übernommen.
      </p>

      <hr />

      <h2>Externe Links (falls zutreffend)</h2>
      <p>
        Diese Anwendung kann Links zu externen Websites enthalten.
        <br />
        Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
        oder Betreiber verantwortlich.
      </p>
    </main>
  );
}
