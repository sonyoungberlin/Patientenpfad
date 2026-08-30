import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateSlug } from "@/lib/websiteForms/slug";
import { getPublicPracticeIdentityById } from "@/lib/practice/publicIdentity";
import { SubmittedContent } from "@/app/p/[slug]/eingereicht/page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicPracticeFormSubmittedPage({
  params,
}: {
  params: Promise<{ practiceSlug: string; formSlug: string }>;
}) {
  const { practiceSlug, formSlug } = await params;
  const practiceValidation = validateSlug(practiceSlug);
  const formValidation = validateSlug(formSlug);
  if (!practiceValidation.ok || !formValidation.ok) notFound();
  const practice = await prisma.practice.findUnique({
    where: { public_slug: practiceValidation.slug },
    select: { id: true, is_approved: true, disabled_at: true },
  });
  if (!practice?.is_approved || practice.disabled_at != null) notFound();
  const form = await prisma.practiceQuestionnaireForm.findFirst({
    where: { slug: formValidation.slug, owner_practice_id: practice.id },
    select: { id: true },
  });
  if (!form) notFound();
  const identity = await getPublicPracticeIdentityById(practice.id);
  if (!identity) notFound();
  return <SubmittedContent practice={identity} />;
}