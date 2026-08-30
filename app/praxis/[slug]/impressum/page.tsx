import { notFound } from "next/navigation";
import { validateSlug } from "@/lib/websiteForms/slug";
import { getPublicPracticeIdentityBySlug, publicPracticeName } from "@/lib/practice/publicIdentity";
import { PracticeLegalProfileDetails } from "@/components/practice/PracticeLegalProfileDetails";
import { PublicPracticeFooter } from "@/components/practice/PublicPracticeFooter";

export const dynamic = "force-dynamic";

export default async function PracticeImprintPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const validation = validateSlug(slug);
  if (!validation.ok) notFound();
  const practice = await getPublicPracticeIdentityBySlug(validation.slug);
  if (!practice) notFound();

  return (
    <main className="static-page">
      <h1>Impressum · {publicPracticeName(practice)}</h1>
      {practice.legal_profile ? (
        <PracticeLegalProfileDetails profile={practice.legal_profile} />
      ) : (
        <p>Für diese Praxis ist noch kein öffentliches offizielles Profil hinterlegt.</p>
      )}
      <PublicPracticeFooter practice={practice} />
    </main>
  );
}