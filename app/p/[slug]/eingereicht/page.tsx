/**
 * Phase 3d: Hinweisseite nach erfolgreichem Submit von `/p/[slug]`.
 *
 * Bewusst statisch (ohne DB-Zugriff): die Seite gibt keinerlei Information
 * über die Existenz oder den Zustand einer konkreten Submission preis.
 *
 * Inhalt entspricht der UX-Vorgabe (Plan-Anpassung 10):
 *   - E-Mail-Postfach prüfen
 *   - Spam-Ordner prüfen
 *   - Bestätigungslink läuft nach 48 Stunden ab
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SubmittedPage() {
  return (
    <main>
      <h1>Bitte bestätigen Sie Ihre E-Mail</h1>
      <p data-public-form-submitted-notice>
        Vielen Dank für Ihre Übermittlung. Wir haben Ihnen eine
        Bestätigungs-E-Mail geschickt.
      </p>
      <ul>
        <li>Bitte prüfen Sie Ihr E-Mail-Postfach.</li>
        <li>Sehen Sie auch im Spam-Ordner nach.</li>
        <li>Der Bestätigungslink läuft nach 48 Stunden ab.</li>
      </ul>
      <p>
        Erst nach Klick auf den Link in der E-Mail werden Ihre Angaben an
        die Praxis übermittelt.
      </p>
    </main>
  );
}
