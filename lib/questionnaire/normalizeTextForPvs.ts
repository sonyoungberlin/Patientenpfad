const PVS_TEXT_REPLACEMENTS: Readonly<Record<string, string>> = {
  "?": "",
  "\u2013": "-", // En dash
  "\u2014": "-", // Em dash
  "\u2026": "...", // Ellipsis
  "\u201c": '"', // Left double quotation mark
  "\u201d": '"', // Right double quotation mark
  "\u201e": '"', // Double low-9 quotation mark
  "\u201f": '"', // Double high-reversed-9 quotation mark
  "\u00ab": '"', // Left-pointing double angle quotation mark
  "\u00bb": '"', // Right-pointing double angle quotation mark
  "\u2018": "'", // Left single quotation mark
  "\u2019": "'", // Right single quotation mark
  "\u201a": "'", // Single low-9 quotation mark
  "\u201b": "'", // Single high-reversed-9 quotation mark
  "\u00a0": " ", // No-break space
  "\u202f": " ", // Narrow no-break space
  "\u2022": "-", // Bullet
};

/** Replaces only known PVS-incompatible typography; all other characters stay unchanged. */
export function normalizeTextForPvs(text: string): string {
  return [...text].map((character) => PVS_TEXT_REPLACEMENTS[character] ?? character).join("");
}