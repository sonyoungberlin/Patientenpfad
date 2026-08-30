import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
};

export default function DatenschutzPage() {
  return (
    <main className="static-page">
      <h1>Datenschutzhinweise</h1>

      <h2>1. Zuständige Praxis</h2>
      <p>
        Die Praxis, die Ihnen einen Fragebogen oder öffentlichen Eingangsweg
        bereitstellt, bestimmt, welche Angaben für den jeweiligen Vorgang
        benötigt werden. Sie legt außerdem fest, welche berechtigten
        Mitarbeitenden die Eingänge bearbeiten und welche Informationen in
        das eigene Praxisverwaltungssystem übernommen werden.
      </p>
      <p>
        Name der Praxis: [DURCH DIE PRAXIS ZU ERGÄNZEN]<br />
        Anschrift: [DURCH DIE PRAXIS ZU ERGÄNZEN]<br />
        Kontakt: [DURCH DIE PRAXIS ZU ERGÄNZEN]<br />
        Datenschutzkontakt: [GEGEBENENFALLS DURCH DIE PRAXIS ZU ERGÄNZEN]
      </p>
      <p>
        [RECHTLICH ZU PRÜFEN/AV-VERTRAG: Rollenverteilung Praxis als
        Verantwortliche und Plattformbetreiber als Auftragsverarbeiter]
      </p>

      <h2>2. Aufgabe der Plattform</h2>
      <p>
        Die Plattform stellt die technische Infrastruktur zur Bereitstellung
        von Fragebögen, zur Übermittlung und vorübergehenden Speicherung von
        Eingängen, zur Bearbeitung durch die Praxis, zur PDF- und Textausgabe
        sowie zur automatischen Löschung bestimmter temporärer Vorgänge bereit.
      </p>
      <p>
        Angaben zum Plattformbetreiber finden Sie im Impressum. Weitere
        Betreiber- und Datenschutzangaben sind rechtlich zu prüfen und bei
        Bedarf zu ergänzen.
      </p>

      <h2>3. Keine vollständige Patientenakte</h2>
      <p>
        Die Anwendung ist nicht als vollständige elektronische Patientenakte
        oder als führendes Praxisverwaltungssystem konzipiert. Informationen
        werden einzelnen Fragebögen, Anfragen oder Arbeitsvorgängen zugeordnet.
      </p>
      <p>
        Nach dem Abruf kann die Praxis Angaben beispielsweise als PDF oder
        kopierbaren Text in ihr eigenes Praxisverwaltungssystem übernehmen.
        Für diese Kopien gelten anschließend die Datenschutz- und
        Aufbewahrungsregelungen der Praxis beziehungsweise des verwendeten
        Zielsystems.
      </p>

      <h2>4. Welche Angaben verarbeitet werden können</h2>
      <p>
        Welche Felder erscheinen, hängt vom konkreten Fragebogen oder
        Eingangsweg der Praxis ab. Verarbeitet werden können insbesondere:
      </p>
      <ul>
        <li>interne Praxis- oder Patientenreferenzen,</li>
        <li>Name, Anschrift, Telefonnummer, E-Mail-Adresse und Geburtsdatum,</li>
        <li>Versicherungsinformationen,</li>
        <li>Antworten zu Gesundheit, Versorgung, Medikamenten oder Behandlungen,</li>
        <li>Angaben zu digitalen Patientenanfragen oder Bewerbungen,</li>
        <li>Zeitpunkte, Statusangaben und technisch notwendige Protokolldaten.</li>
      </ul>
      <p>
        Bei einem intern durch die Praxis gestarteten Fragebogen erfolgt die
        Zuordnung grundsätzlich über eine von der Praxis eingegebene Referenz
        und einen persönlichen Link. Name, E-Mail-Adresse oder Geburtsdatum
        sind für diesen technischen Basisablauf nicht erforderlich. Sie können
        jedoch Bestandteil des von der Praxis ausgewählten Fragebogens sein.
      </p>
      <p>
        Bei öffentlichen digitalen Anfragen werden Name, E-Mail-Adresse,
        Geburtsdatum und das gewählte Anliegen erhoben. Bei
        Bewerbungsanfragen werden Name, E-Mail-Adresse, gewünschte Tätigkeit
        und gegebenenfalls eine Nachricht erhoben. Öffentliche
        Website-Formulare benötigen eine E-Mail-Adresse für den
        Bestätigungslink und können weitere von der Praxis ausgewählte Angaben
        enthalten.
      </p>

      <h2>5. Persönliche Links</h2>
      <p>
        Individuelle Links dienen als Zugangsschlüssel zu einem bestimmten
        Vorgang. Sie sind zeitlich begrenzt und werden nach erfolgreicher
        Übermittlung ungültig. Öffnen und beantworten Sie einen solchen Link
        nur, wenn Sie ihn von Ihrer Praxis erhalten haben. Vor dem Öffnen wird
        keine zusätzliche Identitätsprüfung durch Name oder Geburtsdatum
        durchgeführt.
      </p>

      <h2>6. Technische Speicherfristen</h2>
      <ul>
        <li>
          Abgeschlossene Fragebögen werden sieben Tage nach der Einreichung
          aus der aktiven Primärdatenbank gelöscht.
        </li>
        <li>
          Noch offene interne Fragebögen werden sieben Tage nach ihrer
          Erstellung gelöscht.
        </li>
        <li>
          Nicht bestätigte Website-Übermittlungen werden nach Ablauf des
          48 Stunden gültigen Bestätigungslinks beim nächsten Löschlauf entfernt.
        </li>
        <li>
          Digitale Patientenanfragen und Bewerbungsanfragen werden sieben Tage
          nach ihrer Erstellung gelöscht.
        </li>
      </ul>
      <p>
        Der automatische Löschlauf ist täglich vorgesehen. Manuell in den
        Papierkorb verschobene Fragebögen werden zunächst nur ausgeblendet und
        sieben Tage nach dem Löschzeitpunkt physisch entfernt.
      </p>
      <p>
        Patientenfälle und patientenbezogene Kommunikationsvorgänge werden
        spätestens 30 Tage nach ihrer Erstellung automatisch aus der aktiven
        Datenbank gelöscht. Dies gilt unabhängig vom Bearbeitungsstatus. Nach
        Ablauf der jeweiligen Frist können diese Vorgänge innerhalb der
        Plattform nicht wiederhergestellt werden.
      </p>
      <p>
        Praxisaccounts, Rollen, Praxiskonfigurationen, Kataloge und
        organisatorische Prozessdaten ohne Patientenbezug bleiben bestehen,
        solange sie für den Betrieb der Praxis auf der Plattform benötigt werden.
      </p>
      <p>
        [BETREIBERSEITIG ZU ERGÄNZEN: Fristen und Löschverfahren für
        Datenbank- und Hosting-Backups]
      </p>

      <h2>7. PDF- und Textausgabe</h2>
      <p>
        PDFs werden bei Anforderung dynamisch erzeugt und nicht als eigene
        Datei auf dem Server gespeichert. Heruntergeladene PDFs, kopierte Texte
        und in ein Praxisverwaltungssystem übernommene Angaben liegen
        anschließend außerhalb dieser Plattform und werden durch deren
        automatischen Löschlauf nicht entfernt.
      </p>

      <h2>8. E-Mail-Versand</h2>
      <p>
        E-Mail wird unter anderem für Bestätigungslinks, individuelle
        Fragebogenlinks und Rückmeldungen zu Anfragen verwendet. Der eingesetzte
        E-Mail-Dienst erhält dabei mindestens die Empfängeradresse, den
        Nachrichtentext und gegebenenfalls den persönlichen Link.
      </p>
      <p>
        [BETREIBERSEITIG ZU ERGÄNZEN: tatsächlich eingesetzter
        SMTP-/E-Mail-Anbieter, Standort und Datenschutzinformationen]
      </p>

      <h2>9. Optionale sprachliche Textglättung</h2>
      <p>
        Berechtigte Praxismitarbeitende können vor Erstellung eines
        Fragebogenlinks eine optionale sprachliche Textglättung auslösen. Dabei
        wird der zusammengesetzte Nachrichtentext an OpenAI übertragen. Diese
        Funktion läuft nicht automatisch und ist für den übrigen Betrieb nicht
        erforderlich.
      </p>
      <p>
        Der technische Ablauf übermittelt keine Patientenreferenz, keine
        Fragebogenantworten und keine aktiven internen Fragebogenlinks.
        Nachrichtentexte bestehen überwiegend aus festgelegten Bausteinen,
        können aber zusätzlich von der Praxis gepflegte allgemeine Infotexte
        und die Praxissignatur enthalten.
      </p>
      <p>
        [RECHTLICH/BETREIBERSEITIG ZU ERGÄNZEN: OpenAI-Konfiguration,
        Vertragsgrundlage, Verarbeitungsbedingungen und mögliche Übermittlung
        in Drittländer]
      </p>

      <h2>10. Hosting und Datenbank</h2>
      <p>
        Für den technischen Betrieb werden Hosting- und Datenbankdienste
        eingesetzt. Dabei können unter anderem IP-Adresse, Zeitstempel,
        aufgerufene URL, Session-Cookie sowie die in der Anwendung gespeicherten
        Vorgangsdaten verarbeitet werden.
      </p>
      <p>
        [BETREIBERSEITIG ZU ERGÄNZEN: tatsächlich eingesetzter Hosting- und
        Datenbankanbieter, Verarbeitungsorte und Unterauftragnehmer]
      </p>

      <h2>11. Rechtsgrundlagen und Rechte</h2>
      <p>
        [RECHTLICH ZU ERGÄNZEN: Rechtsgrundlagen für die jeweiligen
        Verarbeitungen, insbesondere für Gesundheitsdaten, E-Mail-Versand,
        Hosting und optionale Textglättung]
      </p>
      <p>
        [RECHTLICH/BETREIBERSEITIG ZU ERGÄNZEN: anwendbare Betroffenenrechte,
        Kontaktweg, zuständige Aufsichtsbehörde und Beschwerdemöglichkeit]
      </p>

      <h2>12. Pilotbetrieb und Änderungen</h2>
      <p>
        Die Anwendung befindet sich in einer Pilot- und Entwicklungsphase.
        Funktionen und Datenverarbeitung können sich ändern. Diese Hinweise
        müssen bei technischen oder betrieblichen Änderungen entsprechend
        aktualisiert werden.
      </p>
    </main>
  );
}
