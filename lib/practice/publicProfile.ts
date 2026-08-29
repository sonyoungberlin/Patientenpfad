import { validateSlug } from "@/lib/websiteForms/slug";

export const PUBLIC_NAME_MIN_LENGTH = 3;
export const PUBLIC_NAME_MAX_LENGTH = 120;
export const PUBLIC_SLUG_MAX_LENGTH = 40;

export function normalizePublicPracticeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, PUBLIC_SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function validatePublicPracticeName(
  value: unknown,
): { ok: true; publicName: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: "Öffentlicher Praxisname ist erforderlich." };
  }

  const publicName = value.trim();
  if (publicName.length < PUBLIC_NAME_MIN_LENGTH) {
    return {
      ok: false,
      error: `Öffentlicher Praxisname muss mindestens ${PUBLIC_NAME_MIN_LENGTH} Zeichen lang sein.`,
    };
  }
  if (publicName.length > PUBLIC_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Öffentlicher Praxisname darf höchstens ${PUBLIC_NAME_MAX_LENGTH} Zeichen lang sein.`,
    };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicName)) {
    return { ok: false, error: "Bitte einen Praxisnamen statt einer E-Mail-Adresse angeben." };
  }
  const slugValidation = validateSlug(normalizePublicPracticeSlug(publicName));
  if (!slugValidation.ok) {
    return { ok: false, error: "Aus diesem Praxisnamen kann keine gültige URL erzeugt werden." };
  }

  return { ok: true, publicName };
}

function withSuffix(base: string, suffix: number | null): string {
  const ending = suffix === null ? "" : `-${suffix}`;
  const maxBaseLength = PUBLIC_SLUG_MAX_LENGTH - ending.length;
  return `${base.slice(0, maxBaseLength).replace(/-+$/g, "")}${ending}`;
}

export async function generateAvailablePublicSlug(
  publicName: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = normalizePublicPracticeSlug(publicName);
  if (!base) {
    throw new Error("Aus diesem Praxisnamen kann keine gültige URL erzeugt werden.");
  }

  for (let index = 1; index <= 1000; index += 1) {
    const candidate = withSuffix(base, index === 1 ? null : index);
    if (validateSlug(candidate).ok && !(await isTaken(candidate))) return candidate;
  }

  throw new Error("Kein freier öffentlicher Praxis-Slug verfügbar.");
}

type PracticeSlugWhere = { public_slug: string } | { slug: string };

export async function resolvePracticeByPublicOrLegacySlug<T>(
  slug: string,
  findUnique: (where: PracticeSlugWhere) => Promise<T | null>,
): Promise<T | null> {
  return (
    (await findUnique({ public_slug: slug })) ??
    findUnique({ slug })
  );
}