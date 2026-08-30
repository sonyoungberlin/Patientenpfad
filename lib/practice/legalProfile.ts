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

export function changedLegalProfileFields(
  previous: Partial<Record<LegalProfileFieldName, string | null>> | null,
  next: LegalProfileValues,
): LegalProfileFieldName[] {
  return LEGAL_PROFILE_FIELD_NAMES.filter(
    (field) => (previous?.[field] ?? null) !== next[field],
  );
}