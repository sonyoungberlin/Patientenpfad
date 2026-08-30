import { renderToStaticMarkup } from "react-dom/server";
import { PublicPracticeFooter } from "@/components/practice/PublicPracticeFooter";

const profile = (name: string, street: string) => ({
  id: `legal-${name}`,
  practice_id: `practice-${name}`,
  official_practice_name: name,
  contract_party_name: null,
  representative_name: null,
  legal_form: null,
  street,
  house_number: "1",
  postal_code: "12345",
  city: "Musterstadt",
  country: "Deutschland",
  official_email: `${name.toLowerCase()}@example.test`,
  phone: "030 123456",
  official_imprint_url: `https://${name.toLowerCase().replaceAll(" ", "-")}.example/impressum`,
  official_privacy_url: `https://${name.toLowerCase().replaceAll(" ", "-")}.example/datenschutz`,
  medical_chamber: null,
  professional_title: null,
  professional_title_country: null,
  supervisory_authority: null,
  statutory_health_association: null,
  professional_rules_label: null,
  professional_rules_url: null,
  register_type: null,
  register_court: null,
  register_number: null,
  vat_id: null,
  additional_legal_information: null,
  created_at: new Date(),
  updated_at: new Date(),
});

const practice = (id: string, slug: string, name: string, street: string) => ({
  id,
  slug: `technical-${slug}`,
  public_slug: slug,
  name,
  public_name: name,
  is_approved: true,
  disabled_at: null,
  patient_communication_enabled: true,
  website_forms_enabled: true,
  office_cases_enabled: true,
  message_signature: null,
  legal_profile: profile(name, street),
});

describe("öffentliche Praxisidentität", () => {
  it("zeigt für Praxis A ausschließlich Profil und Links von Praxis A", () => {
    const html = renderToStaticMarkup(
      <PublicPracticeFooter practice={practice("p-a", "praxis-a", "Praxis A", "A-Straße")} />,
    );
    expect(html).toContain("Praxis A");
    expect(html).toContain("A-Straße");
    expect(html).toContain('https://praxis-a.example/impressum');
    expect(html).toContain('https://praxis-a.example/datenschutz');
    expect(html).not.toContain("Praxis B");
  });

  it("zeigt für Praxis B ausschließlich Profil und Links von Praxis B", () => {
    const html = renderToStaticMarkup(
      <PublicPracticeFooter practice={practice("p-b", "praxis-b", "Praxis B", "B-Straße")} />,
    );
    expect(html).toContain("Praxis B");
    expect(html).toContain("B-Straße");
    expect(html).toContain('https://praxis-b.example/impressum');
    expect(html).not.toContain("Praxis A");
  });
});