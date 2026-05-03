/**
 * Phase 3c: Öffentliche Formularseite `/p/[slug]`.
 *
 * Rein lesend. Ziel ist die Validierung von Slug-Routing,
 * Mandantenzuordnung und Formular-Rendering. Es gibt **keinen**
 * Submit-Endpoint, **keine** Speicherung von Antworten, **keinen**
 * Mailversand und **keinen** Eintrag in `/questionnaires`.
 *
 * Sichtbarkeits-Cascade — alle negativen Fälle ergeben einheitlich
 * `notFound()` (404), nie 403, damit weder Slug-Existenz noch
 * Account-Status enumerierbar sind:
 *   1. Slug-Format ungültig (siehe `validateSlug`)
 *   2. Slug existiert nicht
 *   3. Formular ist nicht aktiv
 *   4. Owner-Account ist nicht freigegeben (`is_approved = false`)
 *   5. Owner-Account hat Patientenkommunikation deaktiviert
 *      (`patient_communication_enabled = false`)
 *   6. Owner-Account hat Website-Forms-Feature deaktiviert
 *      (`website_forms_enabled = false`)
 *
 * `dynamic = "force-dynamic"` + `revalidate = 0`, damit deaktivierte
 * Formulare nicht aus dem Full Route Cache ausgeliefert werden — analog
 * zum Token-Flow `app/q/[token]/page.tsx`.
 */

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { validateSlug } from "@/lib/websiteForms/slug";
import { buildQuestionnaireQuestions } from "@/lib/questionnaire/buildQuestionnaireQuestions";
import { getEffectivePracticeFlags } from "@/lib/websiteForms/practiceScope";
import { PublicFormView } from "./PublicFormView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // 1. Slug-Format vor dem DB-Roundtrip prüfen.
  const validation = validateSlug(slug);
  if (!validation.ok) {
    notFound();
  }

  // 2./3./4./5./6. Formular + Owner-Flags in einem Query laden.
  // P3a: Practice-Flags überstimmen Account-Flags. Wenn das Form ein
  // `owner_practice_id` hat, ist die Practice die Quelle der Wahrheit.
  const form = await prisma.practiceQuestionnaireForm.findUnique({
    where: { slug: validation.slug },
    select: {
      title: true,
      intro_text: true,
      is_active: true,
      selected_block_ids: true,
      owner_practice_id: true,
      owner_practice: {
        select: {
          is_approved: true,
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

  if (!form) {
    notFound();
  }

  if (!form.is_active) {
    notFound();
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
  const questions = buildQuestionnaireQuestions(selectedBlockIds);

  return (
    <PublicFormView
      slug={validation.slug}
      title={form.title}
      introText={form.intro_text}
      questions={questions}
    />
  );
}
