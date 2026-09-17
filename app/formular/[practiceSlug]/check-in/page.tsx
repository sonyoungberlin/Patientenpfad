import { notFound } from "next/navigation";
import { getPublicPracticeIdentityBySlug, publicPracticeName } from "@/lib/practice/publicIdentity";
import { isPracticeActive } from "@/lib/practice/lifecycle";
import { validateSlug } from "@/lib/websiteForms/slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicCheckInPage({ params }: { params: Promise<{ practiceSlug: string }> }) {
  const { practiceSlug } = await params;
  const validation = validateSlug(practiceSlug);
  if (!validation.ok) notFound();
  const practice = await getPublicPracticeIdentityBySlug(validation.slug);
  if (!practice || !isPracticeActive(practice) || !practice.patient_communication_enabled) notFound();

  return (
    <main>
      <h1>Check-in bei {publicPracticeName(practice)}</h1>
      <form method="post" action={`/public-check-in/start/${validation.slug}`}>
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-10000px" }} />
        <button type="submit" className="btn-primary">Check-in starten</button>
      </form>
    </main>
  );
}