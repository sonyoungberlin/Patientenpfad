import { readKioskResponseError } from "@/components/practice/QuestionnaireKioskDeviceSettings";

describe("QuestionnaireKioskDeviceSettings response handling", () => {
  it.each([
    [201, JSON.stringify({ ok: true }), { ok: true }],
    [200, "", {}],
    [400, JSON.stringify({ error: "Ungültige Eingabe." }), { error: "Ungültige Eingabe." }],
    [403, JSON.stringify({ error: "Keine Berechtigung." }), { error: "Keine Berechtigung." }],
    [500, "", {}],
    [500, "kein JSON", {}],
  ])("parses status %s without throwing", async (status, body, expected) => {
    await expect(readKioskResponseError(new Response(body, { status }))).resolves.toEqual(expected);
  });
});