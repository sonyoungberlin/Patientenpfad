import { getVisibleNavigationSections } from "@/lib/navigation";

function account(role: "OWNER" | "ADMIN" | "USER") {
  return {
    id: "account-1",
    email: "praxis@example.com",
    is_approved: true,
    is_admin: false,
    inquiry_assistant_enabled: false,
    patient_communication_enabled: false,
    website_forms_enabled: false,
    office_cases_enabled: false,
    arbeitsprozesse_enabled: true,
    current_practice: { id: "practice-1" },
    memberships: [{ practice_id: "practice-1", role }],
  };
}

describe("Praxisfall-Ketten-Navigation", () => {
  it.each(["OWNER", "ADMIN", "USER"] as const)("zeigt %s den sichtbaren Einstieg", (role) => {
    const item = getVisibleNavigationSections(account(role))
      .flatMap((section) => section.items)
      .find((entry) => entry.id === "practice-case-chains");
    expect(item).toEqual(expect.objectContaining({ href: "/practice/chains" }));
  });
});