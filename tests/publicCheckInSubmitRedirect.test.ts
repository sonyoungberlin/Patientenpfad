import fs from "fs";
import path from "path";

describe("public check-in submit redirect contract", () => {
  it("reicht den Parent-Pfad nur für Public-Handoffs durch und ersetzt danach die URL", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app/q/[token]/page.tsx"), "utf8");
    const client = fs.readFileSync(path.join(process.cwd(), "app/q/[token]/QuestionnaireFormClient.tsx"), "utf8");
    expect(page).toContain('session.source === "public_check_in"');
    expect(page).toContain('`/public-check-in/${session.id}`');
    expect(client).toContain("if (publicHandoffPath)");
    expect(client).toContain("window.location.replace(publicHandoffPath)");
  });
});