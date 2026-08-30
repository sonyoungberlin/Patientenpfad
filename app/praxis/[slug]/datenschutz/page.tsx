import Link from "next/link";
import { notFound } from "next/navigation";
import { validateSlug } from "@/lib/websiteForms/slug";
import {
  getPublicPracticeIdentityBySlug,
  publicPracticeName,
  publicPracticeSlug,
} from "@/lib/practice/publicIdentity";
import { PublicPracticeFooter } from "@/components/practice/PublicPracticeFooter";

export const dynamic = "force-dynamic";

export default async function PracticePrivacyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const validation = validateSlug(slug);
  if (!validation.ok) notFound();
  const practice = await getPublicPracticeIdentityBySlug(validation.slug);
  if (!practice || !practice.is_approved) notFound();
  const profile = practice.legal_profile;
  const stableSlug = publicPracticeSlug(practice);

  return (
    <main className="static-page">
      <h1>Datenschutzhinweise · {publicPracticeName(practice)}</h1>

      <h2>Empfangende Praxis</h2>
      <p>
        Die Praxis bestimmt, welchen Fragebogen sie einsetzt, welche Fragen sie
        auswählt, welche Informationen für den konkreten Vorgang benötigt werden,
        welche berechtigten Mitarbeitenden die Angaben bearbeiten und welche
        Informationen anschließend in das Praxisverwaltungssystem übernommen werden.
      </p>
      {profile ? (
        <address style={{ fontStyle: "normal" }}>
          <strong>{profile.official_practice_name}</strong><br />
          {profile.contract_party_name && <>{profile.contract_party_name}<br /></>}
          {profile.street} {profile.house_number}<br />
          {profile.postal_code} {profile.city}, {profile.country}<br />
          {profile.official_email} · {profile.phone}
        </address>
      ) : (
        <p>Offizielle Kontaktdaten wurden für diese Praxis noch nicht hinterlegt.</p>
      )}
      <p><Link href={`/praxis/${stableSlug}/impressum`}>Zum Praxis-Impressum</Link></p>

      <h2>Technischer Plattformbetrieb</h2>
      <p>
        Die Plattform stellt die technische Infrastruktur für Bereitstellung,
        Übermittlung, vorübergehende Speicherung, Bearbeitung, PDF-/Textausgabe
        und automatische Löschung bereit. Die konkreten rechtlichen Rollen ergeben
        sich zusätzlich aus den Vereinbarungen und dem anwendbaren Datenschutzrecht.
      </p>
      <p><Link href="/impressum">Impressum des Plattformbetreibers</Link></p>

      <h2>Verarbeitete Angaben</h2>
      <p>
        Abhängig vom gewählten Formular können personenbezogene Daten,
        Versicherungsinformationen und Gesundheitsangaben verarbeitet werden.
        Persönliche Links sind zeitlich begrenzte Zugangsschlüssel zu einem
        einzelnen Vorgang und werden nach erfolgreicher Übermittlung ungültig.
      </p>

      <h2>Speicherdauer</h2>
      <ul>
        <li>Abgeschlossene Fragebögen: sieben Tage nach Einreichung.</li>
        <li>Offene interne Fragebögen: sieben Tage nach Erstellung.</li>
        <li>Unbestätigte Website-Eingänge: nach Ablauf des Bestätigungslinks.</li>
        <li>Digitale Patienten- und Bewerbungsanfragen: sieben Tage nach Erstellung.</li>
        <li>Patientenfälle und patientenbezogene Kommunikationsvorgänge: spätestens 30 Tage nach Erstellung.</li>
      </ul>
      <p>
        Nach dem Hard Delete können diese Vorgänge innerhalb der Plattform nicht
        wiederhergestellt werden. Zuvor in ein PVS, eine PDF, E-Mail, Zwischenablage
        oder ein anderes Zielsystem übernommene Kopien unterliegen den Regeln der
        Praxis beziehungsweise des Zielsystems.
      </p>
      <p>
        Fristen und Löschverfahren technischer Backups sind durch den Betreiber zu dokumentieren.
      </p>

      <h2>E-Mail und optionale Textglättung</h2>
      <p>
        E-Mail-Dienste können Empfängeradresse, Nachricht und persönlichen Link
        verarbeiten. Eine optionale OpenAI-Textglättung wird nur durch
        Praxismitarbeitende ausgelöst. Aktive interne Fragebogenlinks,
        Patientenreferenzen und Fragebogenantworten werden dabei technisch nicht
        an OpenAI weitergegeben.
      </p>

      <PublicPracticeFooter practice={practice} />
    </main>
  );
}