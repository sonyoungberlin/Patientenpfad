/**
 * Tests für app/admin/accounts/DeleteAccountButton.tsx.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { DeleteAccountButton } from "@/app/admin/accounts/DeleteAccountButton";

describe("DeleteAccountButton", () => {
  it("rendert den Delete-Button mit korrektem Label", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountButton email="user@example.com" />,
    );

    expect(html).toContain("Endgültig löschen");
    expect(html).toContain('data-delete-account-toggle="user@example.com"');
  });
});