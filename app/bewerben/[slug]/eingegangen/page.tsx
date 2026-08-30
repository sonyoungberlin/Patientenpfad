import { notFound } from "next/navigation";
import { validateSlug } from "@/lib/websiteForms/slug";
import { getPublicPracticeIdentityBySlug } from "@/lib/practice/publicIdentity";
import { PublicPracticeFooter } from "@/components/practice/PublicPracticeFooter";

export default async function BewerbenEingegangePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const validation = validateSlug(slug);
  if (!validation.ok) notFound();
  const practice = await getPublicPracticeIdentityBySlug(validation.slug);
  if (!practice || !practice.is_approved || !practice.office_cases_enabled) notFound();
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold">Bewerbung eingegangen</h1>
      <p className="text-sm text-gray-700">
        Vielen Dank für Ihre Bewerbung. Die Praxis prüft Ihre Angaben und
        meldet sich bei Ihnen.
      </p>
      <PublicPracticeFooter practice={practice} />
    </main>
  );
}
