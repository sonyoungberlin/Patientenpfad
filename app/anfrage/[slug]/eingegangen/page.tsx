/**
 * Phase A: Bestätigungsseite nach Einreichung einer Digitalen Anfrage.
 *
 * Statische Seite ohne DB-Zugriff. Kein Token, kein Auth.
 * Zeigt nur die neutrale Erfolgsrückmeldung.
 */

export default function EingegangeneAnfragePage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold">Anfrage eingegangen</h1>
      <p className="text-sm text-gray-700">
        Vielen Dank. Ihre Anfrage wurde übermittelt. Die Praxis prüft Ihr
        Anliegen und meldet sich mit dem nächsten Schritt.
      </p>
    </main>
  );
}
