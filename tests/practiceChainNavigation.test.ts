import {
  getNavigationSectionForPath,
  getVisibleNavigationSections,
} from "@/lib/navigation";

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
  it.each(["OWNER", "ADMIN"] as const)("ordnet %s dem Verwaltungsbereich zu", (role) => {
    const sections = getVisibleNavigationSections(account(role));
    const management = sections.find((section) => section.id === "practice-management");

    expect(management?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "practice-cases",
        href: "/workflow-cases/internal-protocol/new",
      }),
      expect.objectContaining({
        id: "practice-case-chains-management",
        href: "/practice/chains",
      }),
    ]));
    expect(getNavigationSectionForPath(sections, "/practice/chains")?.id).toBe(
      "practice-management",
    );
    expect(sections.flatMap((section) => section.items).some((entry) => entry.id === "practice-case-chains-runner")).toBe(false);
    expect(sections.flatMap((section) => section.items).some((entry) => entry.id === "practice-library")).toBe(false);
  });

  it("ordnet USER dem Arbeitsprozesse-Runner zu", () => {
    const sections = getVisibleNavigationSections(account("USER"));
    const workflow = sections.find((section) => section.id === "workflow-path");

    expect(workflow?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "practice-case-chains-runner",
        href: "/practice/chains",
      }),
      expect.objectContaining({
        id: "practice-library",
        href: "/practice/library",
      }),
    ]));
    expect(getNavigationSectionForPath(sections, "/practice/chains")?.id).toBe(
      "workflow-path",
    );
    expect(getNavigationSectionForPath(sections, "/practice/library/entry-1")?.id).toBe(
      "workflow-path",
    );
    expect(sections.some((section) => section.id === "practice-management")).toBe(false);
    expect(sections.flatMap((section) => section.items).some((entry) => entry.id === "practice-cases")).toBe(false);
    expect(sections.flatMap((section) => section.items).some((entry) => entry.href === "/workflow-cases/internal-protocol/new")).toBe(false);
  });
});