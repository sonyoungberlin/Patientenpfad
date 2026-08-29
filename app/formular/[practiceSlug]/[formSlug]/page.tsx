import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateSlug } from "@/lib/websiteForms/slug";
import { renderPublicFormPage } from "@/app/p/PublicFormContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicPracticeFormPage({
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
    select: { id: true },
  });
  if (!practice) notFound();

  const ownedForm = await prisma.practiceQuestionnaireForm.findFirst({
    where: {
      slug: formValidation.slug,
      owner_practice_id: practice.id,
    },
    select: { id: true },
  });
  if (!ownedForm) notFound();

  return renderPublicFormPage(
    formValidation.slug,
    `/formular/${practiceValidation.slug}/${formValidation.slug}/eingereicht`,
  );
}