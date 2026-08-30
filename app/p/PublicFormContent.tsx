import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateSlug } from "@/lib/websiteForms/slug";
import { buildFrozenBlocks } from "@/lib/questionnaire/frozenBlocks";
import type { ConditionalRule } from "@/lib/questionnaire/conditionalLogic";
import { getEffectivePracticeFlags } from "@/lib/websiteForms/practiceScope";
import {
  localizeQuestion,
  normalizeQuestionnaireLanguage,
} from "@/lib/questionnaire/i18n";
import { PublicFormView } from "./[slug]/PublicFormView";
import { PUBLIC_IDENTITY_SELECT } from "@/lib/practice/publicIdentity";
import { PRACTICE_SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/practice/lifecycle";

export async function renderPublicFormPage(
  slug: string,
  successPath?: string,
) {
  const validation = validateSlug(slug);
  if (!validation.ok) notFound();

  const form = await prisma.practiceQuestionnaireForm.findUnique({
    where: { slug: validation.slug },
    select: {
      title: true,
      intro_text: true,
      is_active: true,
      selected_block_ids: true,
      patient_language: true,
      owner_practice_id: true,
      owner_practice: {
        select: {
          ...PUBLIC_IDENTITY_SELECT,
          patient_communication_enabled: true,
          website_forms_enabled: true,
        },
      },
      owner_account: {
        select: {
          is_approved: true,
          patient_communication_enabled: true,
          website_forms_enabled: true,
        },
      },
    },
  });

  if (!form || !form.is_active) notFound();

  if (form.owner_practice?.disabled_at != null) {
    return <main><p>{PRACTICE_SERVICE_UNAVAILABLE_MESSAGE}</p></main>;
  }

  const flags = getEffectivePracticeFlags(form);
  if (
    !flags ||
    !flags.is_approved ||
    !flags.patient_communication_enabled ||
    !flags.website_forms_enabled
  ) {
    notFound();
  }

  const selectedBlockIds = Array.isArray(form.selected_block_ids)
    ? (form.selected_block_ids as string[])
    : [];
  const language = normalizeQuestionnaireLanguage(form.patient_language);
  const frozenBlocks = buildFrozenBlocks(selectedBlockIds);
  const questions = frozenBlocks.flatMap((block) =>
    block.questions.map((question) => localizeQuestion(question, language)),
  );
  const conditionalRules: ConditionalRule[] = frozenBlocks.flatMap(
    (block) => block.conditionalRules,
  );
  const publicPractice = form.owner_practice;

  return (
    <>
      <PublicFormView
        slug={validation.slug}
        title={form.title}
        introText={form.intro_text}
        practiceSignature={form.owner_practice?.message_signature ?? null}
        questions={questions}
        language={language}
        conditionalRules={conditionalRules}
        successPath={successPath}
        practice={publicPractice}
      />
    </>
  );
}