import {
  containsInternalQuestionnaireLink,
  TextSmoothingError,
  smoothTextWithOpenAI,
} from "@/lib/server/textSmoothing";

describe("interne Fragebogenlinks", () => {
  it.each([
    "Bitte öffnen: https://example.test/q/550e8400-e29b-41d4-a716-446655440000",
    "Link: /q/550e8400-e29b-41d4-a716-446655440000",
    "https://example.test/m2-link/550e8400-e29b-41d4-a716-446655440000",
  ])("erkennt und blockiert %s", async (text) => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    expect(containsInternalQuestionnaireLink(text)).toBe(true);
    await expect(smoothTextWithOpenAI({ text })).rejects.toMatchObject({
      code: "internal_link_detected",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("erlaubt normale Praxislinks", () => {
    expect(
      containsInternalQuestionnaireLink(
        "Termin unter https://example.test/termine buchen.",
      ),
    ).toBe(false);
  });
});

describe("textSmoothing helper", () => {
  const ORIG_API_KEY = process.env.OPENAI_API_KEY;
  const ORIG_MODEL = process.env.OPENAI_MODEL;
  const ORIG_FETCH = global.fetch;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "test-model";
  });

  afterEach(() => {
    global.fetch = ORIG_FETCH;
    if (ORIG_API_KEY === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = ORIG_API_KEY;

    if (ORIG_MODEL === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = ORIG_MODEL;
  });

  it("nutzt output_text direkt", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: "Geglätteter Text." }),
    }) as unknown as typeof fetch;

    const result = await smoothTextWithOpenAI({
      text: "Rohtext.",
      context: "inquiry_patient_message",
    });

    expect(result).toBe("Geglätteter Text.");
  });

  it("nutzt output.content mit output_text-Part", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            content: [
              { type: "output_text", text: "Teil 1." },
              { type: "output_text", text: "Teil 2." },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await smoothTextWithOpenAI({
      text: "Rohtext.",
      context: "case_patient_todo",
    });

    expect(result).toBe("Teil 1.\nTeil 2.");
  });

  it("wirft Fehler bei leerer Provider-Antwort", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(
      smoothTextWithOpenAI({ text: "Rohtext." }),
    ).rejects.toMatchObject({
      name: "TextSmoothingError",
      code: "invalid_response",
    } as Partial<TextSmoothingError>);
  });

  it("sendet vereinfachte Systemprompt-Regeln", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: "Für die hausärztliche Versorgung." }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await smoothTextWithOpenAI({
      text: "Für die hausärztliche Versorgung.",
      context: "inquiry_patient_message",
    });

    const fetchCallBody = fetchMock.mock.calls[0]?.[1]?.body;
    const payload = typeof fetchCallBody === "string" ? JSON.parse(fetchCallBody) : null;
    const systemText = payload?.input?.[0]?.content?.[0]?.text as string;

    expect(systemText).toContain("Überarbeite die folgende Praxisnachricht sprachlich.");
    expect(systemText).toContain("WICHTIG");
    expect(systemText).toContain("* keine Listen");
    expect(systemText).toContain("* keine Markdown-Formatierung");
  });

  it("wirft Fehler bei Umlaut-Umschreibung (z. B. Für -> Fuer)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: "Fuer die hausaerztliche Versorgung.",
      }),
    }) as unknown as typeof fetch;

    await expect(
      smoothTextWithOpenAI({
        text: "Für die hausärztliche Versorgung.",
        context: "inquiry_patient_message",
      }),
    ).rejects.toMatchObject({
      name: "TextSmoothingError",
      code: "invalid_response",
    } as Partial<TextSmoothingError>);
  });
});
