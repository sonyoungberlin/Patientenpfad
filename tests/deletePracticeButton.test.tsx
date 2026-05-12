jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { DeletePracticeButton } from "@/app/admin/practices/[id]/DeletePracticeButton";

describe("DeletePracticeButton", () => {
  it("rendert den roten Delete-Button", () => {
    const html = renderToStaticMarkup(
      <DeletePracticeButton practiceId="p-1" practiceName="Praxis Eins" />,
    );

    expect(html).toContain("Praxis endgültig löschen");
    expect(html).toContain('data-delete-practice-toggle="p-1"');
  });
});