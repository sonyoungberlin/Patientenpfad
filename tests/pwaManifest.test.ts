import { existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "@/app/manifest";

describe("Web App Manifest", () => {
  it("beschreibt teamwork.contact als installierbare Online-App", () => {
    const value = manifest();

    expect(value).toMatchObject({
      name: "teamwork.contact",
      short_name: "teamwork.contact",
      lang: "de",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0b1d36",
    });
  });

  it("referenziert alle erforderlichen PNG-Icons", () => {
    const icons = manifest().icons ?? [];

    expect(icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );

    for (const icon of icons) {
      expect(icon.type).toBe("image/png");
      expect(existsSync(join(process.cwd(), "public", icon.src))).toBe(true);
    }
  });
});