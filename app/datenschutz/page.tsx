import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
};

export default function DatenschutzPage() {
  return (
    <main className="static-page">
      <h1>Datenschutzerklärung</h1>

      <h2>1. Allgemeine Hinweise</h2>
      <p>
        Diese Anwendung wird im Rahmen einer Pilotphase betrieben und dient
        ausschließlich der strukturierten Erfassung und Darstellung von
        Informationen im Praxisalltag.
      </p>
      <p>
        Der Schutz personenbezogener Daten wird ernst genommen.
        <br />
        Die Verarbeitung erfolgt ausschließlich im erforderlichen Umfang und
        gemäß den geltenden Datenschutzbestimmungen (DSGVO).
      </p>

      <h2>2. Art der verarbeiteten Daten</h2>
      <p>
        Im Rahmen der Nutzung können folgende Daten verarbeitet werden:
      </p>
      <ul>
        <li>E-Mail-Adresse (für Login / Zugriff)</li>
        <li>
          technisch erforderliche Daten (z.&nbsp;B. IP-Adresse, Zeitstempel,
          Server-Logs)
        </li>
      </ul>
      <p>Nicht verarbeitet werden:</p>
      <ul>
        <li>
          direkt identifizierende Patientendaten (z.&nbsp;B. Name,
          Geburtsdatum)
        </li>
        <li>
          medizinische Inhalte mit Personenbezug innerhalb der Anwendung
        </li>
      </ul>
      <p>
        Zur internen Zuordnung können technische Referenzen (z.&nbsp;B.
        Patienten-ID) verwendet werden, die für sich genommen keinen
        Personenbezug innerhalb dieser Anwendung herstellen.
      </p>

      <h2>3. Zweck der Verarbeitung</h2>
      <p>
        Die Verarbeitung erfolgt ausschließlich zu folgenden Zwecken:
      </p>
      <ul>
        <li>Bereitstellung der Anwendung</li>
        <li>Zugriffskontrolle im Rahmen der Pilotphase</li>
        <li>technische Sicherstellung des Betriebs</li>
      </ul>

      <h2>4. Rechtsgrundlage</h2>
      <p>Die Verarbeitung erfolgt auf Grundlage von:</p>
      <ul>
        <li>
          Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Betrieb und
          Test der Anwendung)
        </li>
      </ul>

      <h2>5. Speicherung und Löschung</h2>
      <p>
        Daten werden nur so lange gespeichert, wie dies für den Betrieb der
        Anwendung erforderlich ist.
      </p>
      <p>
        Die Anwendung ist auf eine temporäre Nutzung einzelner Fälle ausgelegt.
        <br />
        Eine dauerhafte Speicherung innerhalb der Anwendung ist nicht
        vorgesehen.
      </p>

      <h2>6. Weitergabe von Daten</h2>
      <p>
        Eine Weitergabe von Daten an Dritte erfolgt nicht, außer:
      </p>
      <ul>
        <li>
          im Rahmen technisch notwendiger Infrastruktur (z.&nbsp;B.
          Hosting-Anbieter)
        </li>
      </ul>

      <h2>7. Hosting</h2>
      <p>
        Die Anwendung wird bei einem externen Dienstleister gehostet.
        <br />
        Dabei können technisch notwendige Daten (z.&nbsp;B. IP-Adresse)
        verarbeitet werden.
      </p>

      <h2>8. Rechte der Nutzer</h2>
      <p>
        Nutzer haben im Rahmen der gesetzlichen Bestimmungen das Recht auf:
      </p>
      <ul>
        <li>Auskunft über gespeicherte Daten</li>
        <li>Berichtigung unrichtiger Daten</li>
        <li>Löschung von Daten, soweit möglich</li>
        <li>Einschränkung der Verarbeitung</li>
      </ul>
      <p>
        Zur Ausübung dieser Rechte genügt eine formlose Mitteilung an die im
        Impressum angegebene Kontaktadresse.
      </p>

      <h2>9. Pilotbetrieb</h2>
      <p>
        Diese Anwendung befindet sich in einer Testphase.
        <br />
        Funktionalität und Datenverarbeitung können sich im Rahmen der
        Weiterentwicklung ändern.
      </p>

      <h2>10. Änderungen</h2>
      <p>
        Diese Datenschutzerklärung kann bei Bedarf angepasst werden.
      </p>
    </main>
  );
}
