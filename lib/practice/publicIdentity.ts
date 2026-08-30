import { prisma } from "@/lib/prisma";
import { resolvePracticeByPublicOrLegacySlug } from "./publicProfile";

export const PUBLIC_IDENTITY_SELECT = {
  id: true,
  slug: true,
  public_slug: true,
  name: true,
  public_name: true,
  is_approved: true,
  disabled_at: true,
  patient_communication_enabled: true,
  website_forms_enabled: true,
  office_cases_enabled: true,
  legal_profile: true,
  message_signature: true,
} as const;

export async function getPublicPracticeIdentityById(practiceId: string) {
  return prisma.practice.findUnique({
    where: { id: practiceId },
    select: PUBLIC_IDENTITY_SELECT,
  });
}

export async function getPublicPracticeIdentityBySlug(slug: string) {
  return resolvePracticeByPublicOrLegacySlug(slug, (where) =>
    prisma.practice.findUnique({ where, select: PUBLIC_IDENTITY_SELECT }),
  );
}

export type PublicPracticeIdentity = NonNullable<
  Awaited<ReturnType<typeof getPublicPracticeIdentityById>>
>;

export function publicPracticeSlug(practice: PublicPracticeIdentity): string {
  return practice.public_slug ?? practice.slug;
}

export function publicPracticeName(practice: PublicPracticeIdentity): string {
  return (
    practice.legal_profile?.official_practice_name ??
    practice.public_name ??
    practice.name
  );
}