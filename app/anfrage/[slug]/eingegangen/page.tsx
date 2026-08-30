/**
 * Phase A: Bestätigungsseite nach Einreichung einer Digitalen Anfrage.
 *
 * Statische Seite ohne DB-Zugriff. Kein Token, kein Auth.
 * Zeigt nur die neutrale Erfolgsrückmeldung.
 */

import { notFound } from "next/navigation";
import { validateSlug } from "@/lib/websiteForms/slug";
import { getPublicPracticeIdentityBySlug } from "@/lib/practice/publicIdentity";
import { PublicPracticeFooter } from "@/components/practice/PublicPracticeFooter";

export default async function EingegangeneAnfragePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const validation = validateSlug(slug);
  if (!validation.ok) notFound();
  const practice = await getPublicPracticeIdentityBySlug(validation.slug);
  if (!practice || !practice.is_approved || !practice.patient_communication_enabled) notFound();
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold">Anfrage eingegangen</h1>
      <p className="text-sm text-gray-700">
        Vielen Dank. Ihre Anfrage wurde übermittelt. Die Praxis prüft Ihr
        Anliegen und meldet sich mit dem nächsten Schritt.
      </p>
      <PublicPracticeFooter practice={practice} />
    </main>
  );
}
