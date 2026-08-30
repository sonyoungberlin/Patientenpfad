import { renderToStaticMarkup } from "react-dom/server";
import { PersonalLinkNotice } from "@/components/PersonalLinkNotice";

describe("PersonalLinkNotice", () => {
  it("zeigt den persönlichen Link-Hinweis ohne Identitätsfelder", () => {
    const html = renderToStaticMarkup(
      <PersonalLinkNotice>
        <button data-questionnaire-submit>Absenden</button>
      </PersonalLinkNotice>,
    );

    expect(html).toContain("Persönlicher Fragebogenlink");
    expect(html).toContain("Fragebogen öffnen");
    expect(html).toContain("zeitlich begrenzt");
    expect(html).not.toContain("Geburtsdatum");
    expect(html).not.toContain("Nachname");
    expect(html).not.toContain("data-questionnaire-submit");
  });

  it("rendert die englische Variante ohne Identitätsfelder", () => {
    const html = renderToStaticMarkup(
      <PersonalLinkNotice language="en">
        <div>Questionnaire</div>
      </PersonalLinkNotice>,
    );

    expect(html).toContain("Personal questionnaire link");
    expect(html).toContain("Open questionnaire");
    expect(html).not.toContain("Date of birth");
    expect(html).not.toContain("last name");
  });
});