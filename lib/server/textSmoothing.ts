export type TextSmoothingContext =
  | "inquiry_patient_message"
  | "case_patient_todo";

type SmoothTextArgs = {
  text: string;
  context?: TextSmoothingContext;
};

export class TextSmoothingError extends Error {
  code: "missing_api_key" | "provider_error" | "invalid_response";

  constructor(
    code: "missing_api_key" | "provider_error" | "invalid_response",
    message: string,
  ) {
    super(message);
    this.name = "TextSmoothingError";
    this.code = code;
  }
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";

function buildSystemInstruction(context?: TextSmoothingContext): string {
  const contextHint =
    context === "inquiry_patient_message"
      ? "Kontext: finaler Patientennachrichtentext aus der Patientenkommunikation."
      : context === "case_patient_todo"
        ? "Kontext: Patientenhinweis-/To-do-Nachricht aus einem Patientenfall."
        : "Kontext: Patientennachricht.";

  return [
    "Überarbeite die folgende Praxisnachricht sprachlich.",
    contextHint,
    "WICHTIG",
    "* Inhalt exakt beibehalten",
    "* nichts hinzufügen",
    "* nichts entfernen",
    "* keine medizinischen Ergänzungen",
    "* keine neuen Empfehlungen",
    "* keine Markdown-Formatierung",
    "* keine Listen",
    "* nur den finalen Nachrichtentext ausgeben",
    "* Handlungsanweisungen, nächste Schritte oder organisatorische Aktionen als eigenen Absatz erhalten und nicht mit erklärenden Absätzen verschmelzen (z. B. Termin vereinbaren, Fragebogen ausfüllen, Unterlagen hochladen, digitale Anfrage stellen)",
    "ZIEL",
    "* natürlicher",
    "* klarer",
    "* professionell",
    "* kürzere Sätze",
    "* zusammenhängende Aussagen dürfen verbunden werden",
    "* vorlagenartige Formulierungen reduzieren",
    "LINKS",
    "* niemals anklickbar darstellen",
    "* keine Hyperlinks",
  ].join("\n");
}

function transliterateWord(word: string): string {
  return word
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("Ä", "Ae")
    .replaceAll("Ö", "Oe")
    .replaceAll("Ü", "Ue")
    .replaceAll("ß", "ss");
}

function hasDisallowedTransliteration(input: string, output: string): boolean {
  const words = input.match(/[A-Za-zÄÖÜäöüß]+/g) ?? [];
  for (const word of words) {
    if (!/[ÄÖÜäöüß]/.test(word)) continue;
    const transliterated = transliterateWord(word);
    if (transliterated === word) continue;

    if (output.includes(transliterated) && !output.includes(word)) {
      return true;
    }
  }
  return false;
}

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const asRecord = payload as Record<string, unknown>;
  if (typeof asRecord.output_text === "string") {
    const direct = asRecord.output_text.trim();
    return direct.length > 0 ? direct : null;
  }

  const output = asRecord.output;
  if (!Array.isArray(output)) return null;

  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const itemRecord = item as Record<string, unknown>;
    const content = itemRecord.content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const partRecord = part as Record<string, unknown>;
      if (partRecord.type === "output_text" && typeof partRecord.text === "string") {
        const txt = partRecord.text.trim();
        if (txt.length > 0) chunks.push(txt);
      }
    }
  }

  if (chunks.length === 0) return null;
  return chunks.join("\n").trim();
}

export async function smoothTextWithOpenAI({
  text,
  context,
}: SmoothTextArgs): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new TextSmoothingError(
      "missing_api_key",
      "OPENAI_API_KEY fehlt.",
    );
  }

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: buildSystemInstruction(context),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text,
            },
          ],
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new TextSmoothingError(
      "provider_error",
      "Provider-Fehler bei Textglättung.",
    );
  }

  const json = (await response.json()) as unknown;
  const smoothed = extractOutputText(json);

  if (!smoothed) {
    throw new TextSmoothingError(
      "invalid_response",
      "Ungültige Provider-Antwort.",
    );
  }

  if (hasDisallowedTransliteration(text, smoothed)) {
    throw new TextSmoothingError(
      "invalid_response",
      "Ungültige Provider-Antwort (Sonderzeichen verändert).",
    );
  }

  return smoothed;
}
