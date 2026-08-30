export const LEGAL_PROFILE_FIELD_NAMES = [
  "official_practice_name",
  "contract_party_name",
  "representative_name",
  "legal_form",
  "street",
  "house_number",
  "postal_code",
  "city",
  "country",
  "official_email",
  "phone",
  "official_imprint_url",
  "official_privacy_url",
  "medical_chamber",
  "professional_title",
  "professional_title_country",
  "supervisory_authority",
  "statutory_health_association",
  "professional_rules_label",
  "professional_rules_url",
  "register_type",
  "register_court",
  "register_number",
  "vat_id",
  "additional_legal_information",
] as const;

export type LegalProfileFieldName = (typeof LEGAL_PROFILE_FIELD_NAMES)[number];
export type LegalProfileValues = Record<LegalProfileFieldName, string | null> & {
  official_practice_name: string;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  country: string;
  official_email: string;
  phone: string;
};

const REQUIRED_FIELDS: LegalProfileFieldName[] = [
  "official_practice_name",
  "street",
  "house_number",
  "postal_code",
  "city",
  "country",
  "official_email",
  "phone",
];

const COMPLETE_PROFILE_FIELDS: Array<[LegalProfileFieldName, string]> = [
  ["official_practice_name", "Praxisname"],
  ["street", "Straße"],
  ["house_number", "Hausnummer"],
  ["postal_code", "PLZ"],
  ["city", "Ort"],
  ["country", "Land"],
  ["official_email", "offizielle E-Mail-Adresse"],
  ["phone", "Telefonnummer"],
  ["official_imprint_url", "Impressums-URL"],
  ["official_privacy_url", "Datenschutz-URL"],
];

function readValue(input: Record<string, unknown>, field: LegalProfileFieldName): string | null {
  const value = input[field];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function validateLegalProfileInput(input: Record<string, unknown>):
  | { ok: true; value: LegalProfileValues }
  | { ok: false; error: string } {
  const values = Object.fromEntries(
    LEGAL_PROFILE_FIELD_NAMES.map((field) => [field, readValue(input, field)]),
  ) as Record<LegalProfileFieldName, string | null>;

  for (const field of REQUIRED_FIELDS) {
    if (!values[field]) {
      return { ok: false, error: `Pflichtfeld fehlt: ${field}` };
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.official_email!)) {
    return { ok: false, error: "Offizielle E-Mail-Adresse ist ungültig." };
  }
  for (const field of ["official_imprint_url", "official_privacy_url"] as const) {
    if (!values[field]) continue;
    try {
      const url = new URL(values[field]!);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    } catch {
      return { ok: false, error: `${field} ist keine gültige HTTP(S)-URL.` };
    }
  }
  if (values.professional_rules_url) {
    try {
      const url = new URL(values.professional_rules_url);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    } catch {
      return { ok: false, error: "Link zu berufsrechtlichen Regelungen ist ungültig." };
    }
  }

  return { ok: true, value: values as LegalProfileValues };
}

export function validateCompleteLegalProfileInput(
  input: Record<string, unknown> | null | undefined,
): { ok: true; value: LegalProfileValues } | { ok: false; error: string } {
  const rawInput = input ?? {};
  const missing = COMPLETE_PROFILE_FIELDS
    .filter(([field]) => !readValue(rawInput, field))
    .map(([, label]) => label);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Praxisprofil unvollständig. Fehlende Pflichtfelder: ${missing.join(", ")}.`,
    };
  }

  const validation = validateLegalProfileInput(rawInput);
  if (!validation.ok) return validation;
  return validation;
}

export function changedLegalProfileFields(
  previous: Partial<Record<LegalProfileFieldName, string | null>> | null,
  next: LegalProfileValues,
): LegalProfileFieldName[] {
  return LEGAL_PROFILE_FIELD_NAMES.filter(
    (field) => (previous?.[field] ?? null) !== next[field],
  );
}