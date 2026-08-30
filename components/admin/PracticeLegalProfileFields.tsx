import type { LegalProfileFieldName } from "@/lib/practice/legalProfile";

type Values = Partial<Record<LegalProfileFieldName, string | null>>;

const FIELDS: Array<{
  name: LegalProfileFieldName;
  label: string;
  required?: boolean;
  type?: "email" | "url" | "text";
}> = [
  { name: "official_practice_name", label: "Offizieller Praxisname", required: true },
  { name: "contract_party_name", label: "Rechtsträger / Vertragspartei" },
  { name: "representative_name", label: "Praxisinhaber / vertretungsberechtigte Person" },
  { name: "legal_form", label: "Rechtsform" },
  { name: "street", label: "Straße", required: true },
  { name: "house_number", label: "Hausnummer", required: true },
  { name: "postal_code", label: "PLZ", required: true },
  { name: "city", label: "Ort", required: true },
  { name: "country", label: "Land", required: true },
  { name: "official_email", label: "Offizielle E-Mail-Adresse", required: true, type: "email" },
  { name: "phone", label: "Telefon", required: true },
  { name: "official_imprint_url", label: "Offizielle Impressums-URL", type: "url" },
  { name: "official_privacy_url", label: "Offizielle Datenschutz-URL", type: "url" },
  { name: "medical_chamber", label: "Zuständige Ärztekammer" },
  { name: "professional_title", label: "Gesetzliche Berufsbezeichnung" },
  { name: "professional_title_country", label: "Staat der Verleihung" },
  { name: "supervisory_authority", label: "Zuständige Aufsichtsbehörde" },
  { name: "statutory_health_association", label: "Kassenärztliche Vereinigung" },
  { name: "professional_rules_label", label: "Berufsrechtliche Regelungen / Bezeichnung" },
  { name: "professional_rules_url", label: "Link zu berufsrechtlichen Regelungen", type: "url" },
  { name: "register_type", label: "Registerart" },
  { name: "register_court", label: "Registergericht" },
  { name: "register_number", label: "Registernummer" },
  { name: "vat_id", label: "Umsatzsteuer-ID" },
  { name: "additional_legal_information", label: "Weitere Impressumsangaben" },
];

export function PracticeLegalProfileFields({ values = {} }: { values?: Values }) {
  return (
    <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
      {FIELDS.map((field) => (
        <label key={field.name}>
          {field.label}{field.required ? " *" : ""}
          <input
            name={field.name}
            type={field.type ?? "text"}
            required={field.required}
            defaultValue={values[field.name] ?? (field.name === "country" ? "Deutschland" : "")}
            maxLength={field.name === "additional_legal_information" ? 1000 : 255}
            style={{ display: "block", width: "100%" }}
          />
        </label>
      ))}
    </div>
  );
}