import {
  TextSmoothingError,
  smoothTextWithOpenAI,
} from "@/lib/server/textSmoothing";

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

    expect(systemText).toContain("Du bist ein Sprachassistent für Praxisnachrichten.");
    expect(systemText).toContain("Deine Aufgabe ist ausschließlich, den vorhandenen Text sprachlich zu glätten.");
    expect(systemText).toContain("Keine Listen, keine Markdown-Ausgabe.");
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
