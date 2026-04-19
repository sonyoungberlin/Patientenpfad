import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hinweise zur Nutzung – Pilotphase",
};

export default function HinweisePage() {
  return (
    <main className="static-page">
      <h1>Hinweise zur Nutzung – Pilotphase</h1>

      <h2>1. Zweck der Anwendung</h2>
      <p>
        Diese Anwendung dient ausschließlich der strukturierten Erfassung und
        Darstellung von Informationen im Praxisalltag.
      </p>
      <p>
        Ziel ist es, bereits bekannte oder erhobene Informationen in eine
        nachvollziehbare, standardisierte Form zu überführen und als Grundlage
        für die Dokumentation im bestehenden Praxisverwaltungssystem (PVS) zu
        nutzen.
      </p>
      <p>
        Die Anwendung stellt keine vollständige Patientenakte dar und ersetzt
        kein bestehendes Dokumentationssystem.
      </p>

      <h2>2. Keine medizinische Entscheidungsunterstützung</h2>
      <p>Die Anwendung:</p>
      <ul>
        <li>trifft keine medizinischen Entscheidungen</li>
        <li>gibt keine Therapieempfehlungen</li>
        <li>bewertet keine Diagnosen oder Behandlungsnotwendigkeiten</li>
      </ul>
      <p>
        Alle Inhalte dienen ausschließlich der Strukturierung und Darstellung
        von Informationen.
      </p>
      <p>
        Die medizinische Bewertung und Entscheidung liegt ausschließlich beim
        behandelnden Arzt.
      </p>

      <h2>3. Keine Vollständigkeit oder Richtigkeit</h2>
      <p>Die in der Anwendung dargestellten Inhalte:</p>
      <ul>
        <li>
          basieren ausschließlich auf den jeweils eingegebenen Informationen
        </li>
        <li>erheben keinen Anspruch auf Vollständigkeit</li>
        <li>
          erheben keinen Anspruch auf inhaltliche Richtigkeit oder Aktualität
        </li>
      </ul>
      <p>
        Die Anwendung ersetzt nicht die ärztliche Dokumentation im PVS oder in
        der Patientenakte.
      </p>

      <h2>4. Pilot- und Testbetrieb</h2>
      <p>
        Diese Anwendung befindet sich in einer Pilot- und Testphase.
      </p>
      <p>Sie ist:</p>
      <ul>
        <li>nicht für den regulären produktiven Einsatz bestimmt</li>
        <li>nicht als final validiertes System zu verstehen</li>
      </ul>
      <p>Funktionen, Inhalte und Verhalten können sich jederzeit ändern.</p>

      <h2>5. Datenverarbeitung und Personenbezug</h2>
      <p>
        In der Anwendung werden keine direkt personenbezogenen Patientendaten
        gespeichert.
      </p>
      <p>
        Zur temporären Zuordnung von Fällen kann eine interne Referenz (z.&nbsp;B.
        Patienten-ID) verwendet werden.
        <br />
        Diese Referenz ermöglicht allein keine Identifikation einer Person
        innerhalb der Anwendung.
      </p>
      <p>
        Die Anwendung ist so konzipiert, dass Inhalte ohne direkten
        Personenbezug verarbeitet werden.
      </p>

      <h2>6. Temporäre Nutzung von Fallinformationen</h2>
      <p>
        Die Anwendung dient der kurzzeitigen Bearbeitung einzelner Fälle.
      </p>
      <ul>
        <li>Fälle sind nicht als dauerhafte Dokumentation vorgesehen</li>
        <li>
          die finale Dokumentation erfolgt im jeweiligen Primärsystem
          (z.&nbsp;B. PVS)
        </li>
      </ul>
      <p>
        Eine langfristige Speicherung oder Archivierung innerhalb der Anwendung
        ist nicht vorgesehen.
      </p>

      <h2>7. Verantwortlichkeit der Nutzer</h2>
      <p>
        Die Nutzung der Anwendung erfolgt in eigener fachlicher Verantwortung.
      </p>
      <p>Insbesondere sind die Nutzer dafür verantwortlich:</p>
      <ul>
        <li>die Richtigkeit der eingegebenen Informationen zu prüfen</li>
        <li>die Ergebnisse angemessen einzuordnen</li>
        <li>
          die finale Dokumentation im vorgesehenen Primärsystem durchzuführen
        </li>
      </ul>

      <h2>8. Zugriff und Nutzung</h2>
      <p>
        Der Zugriff auf die Anwendung ist auf einen definierten Nutzerkreis im
        Rahmen der Pilotphase beschränkt.
      </p>
      <p>
        Ein Anspruch auf Verfügbarkeit oder fehlerfreien Betrieb besteht nicht.
      </p>

      <h2>9. Haftung</h2>
      <p>
        Für Entscheidungen oder Maßnahmen, die auf Basis der Nutzung dieser
        Anwendung getroffen werden, wird keine Haftung übernommen.
      </p>
      <p>
        Die Anwendung stellt ausschließlich ein Hilfsmittel zur Strukturierung
        von Informationen dar.
      </p>

      <h2>10. Änderungen</h2>
      <p>
        Diese Hinweise können im Rahmen der Weiterentwicklung der Anwendung
        jederzeit angepasst werden.
      </p>
    </main>
  );
}
