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
});
