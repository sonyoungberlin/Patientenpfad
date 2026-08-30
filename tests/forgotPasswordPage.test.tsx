import { renderToStaticMarkup } from "react-dom/server";
import ForgotPasswordPage from "@/app/account/forgot-password/page";

describe("ForgotPasswordPage", () => {
  it("rendert E-Mail-Formular und neutralen Linktext erst nach Absenden", () => {
    const markup = renderToStaticMarkup(<ForgotPasswordPage />);
    expect(markup).toContain("Passwort vergessen?");
    expect(markup).toContain('data-forgot-password-form="true"');
    expect(markup).not.toContain("Wenn für diese E-Mail-Adresse");
  });
});
