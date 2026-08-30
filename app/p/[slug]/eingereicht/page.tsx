/**
 * Phase 3d: Hinweisseite nach erfolgreichem Submit von `/p/[slug]`.
 *
 * Praxiszuordnung erfolgt ausschließlich über das öffentliche Formular.
 *
 * Inhalt entspricht der UX-Vorgabe (Plan-Anpassung 10):
 *   - E-Mail-Postfach prüfen
 *   - Spam-Ordner prüfen
 *   - Bestätigungslink läuft nach 48 Stunden ab
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateSlug } from "@/lib/websiteForms/slug";
import { getPublicPracticeIdentityById, type PublicPracticeIdentity } from "@/lib/practice/publicIdentity";
import { PublicPracticeFooter } from "@/components/practice/PublicPracticeFooter";

export function SubmittedContent({ practice }: { practice: PublicPracticeIdentity }) {
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
      <PublicPracticeFooter practice={practice} />
    </main>
  );
}

export default async function SubmittedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const validation = validateSlug(slug);
  if (!validation.ok) notFound();
  const form = await prisma.practiceQuestionnaireForm.findUnique({
    where: { slug: validation.slug },
    select: { owner_practice_id: true },
  });
  if (!form?.owner_practice_id) notFound();
  const practice = await getPublicPracticeIdentityById(form.owner_practice_id);
  if (!practice || !practice.is_approved) notFound();
  return <SubmittedContent practice={practice} />;
}
