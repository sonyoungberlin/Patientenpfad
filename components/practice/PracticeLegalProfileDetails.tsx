type LegalProfile = {
  official_practice_name: string;
  contract_party_name: string | null;
  representative_name: string | null;
  legal_form: string | null;
  street: string;
  house_number: string;
  postal_code: string;
  city: string;
  country: string;
  official_email: string;
  phone: string;
  official_imprint_url?: string | null;
  official_privacy_url?: string | null;
  medical_chamber: string | null;
  professional_title: string | null;
  professional_title_country: string | null;
  supervisory_authority: string | null;
  statutory_health_association: string | null;
  professional_rules_label: string | null;
  professional_rules_url: string | null;
  register_type: string | null;
  register_court: string | null;
  register_number: string | null;
  vat_id: string | null;
  additional_legal_information: string | null;
};

const OPTIONAL_ROWS: Array<[keyof LegalProfile, string]> = [
  ["contract_party_name", "Rechtsträger / Vertragspartei"],
  ["representative_name", "Vertretungsberechtigte Person"],
  ["legal_form", "Rechtsform"],
  ["medical_chamber", "Ärztekammer"],
  ["professional_title", "Berufsbezeichnung"],
  ["professional_title_country", "Staat der Verleihung"],
  ["supervisory_authority", "Aufsichtsbehörde"],
  ["statutory_health_association", "Kassenärztliche Vereinigung"],
  ["professional_rules_label", "Berufsrechtliche Regelungen"],
  ["register_type", "Registerart"],
  ["register_court", "Registergericht"],
  ["register_number", "Registernummer"],
  ["vat_id", "Umsatzsteuer-ID"],
  ["additional_legal_information", "Weitere Angaben"],
];

export function PracticeLegalProfileDetails({ profile }: { profile: LegalProfile }) {
  return (
    <dl>
      <dt>Offizieller Praxisname</dt><dd>{profile.official_practice_name}</dd>
      <dt>Anschrift</dt><dd>{profile.street} {profile.house_number}, {profile.postal_code} {profile.city}, {profile.country}</dd>
      <dt>E-Mail</dt><dd>{profile.official_email}</dd>
      <dt>Telefon</dt><dd>{profile.phone}</dd>
      {profile.official_imprint_url && <><dt>Offizielles Impressum</dt><dd><a href={profile.official_imprint_url}>{profile.official_imprint_url}</a></dd></>}
      {profile.official_privacy_url && <><dt>Offizielle Datenschutzerklärung</dt><dd><a href={profile.official_privacy_url}>{profile.official_privacy_url}</a></dd></>}
      {OPTIONAL_ROWS.map(([field, label]) => {
        const value = profile[field];
        if (!value) return null;
        if (field === "professional_rules_label" && profile.professional_rules_url) {
          return <div key={field}><dt>{label}</dt><dd><a href={profile.professional_rules_url}>{value}</a></dd></div>;
        }
        return <div key={field}><dt>{label}</dt><dd>{value}</dd></div>;
      })}
    </dl>
  );
}