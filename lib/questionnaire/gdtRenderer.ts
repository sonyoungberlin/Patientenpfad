import iconv from "iconv-lite";
import { normalizeXComfortPatientReference } from "./patientReference";

const ENCODING = "cp850";
const CRLF = "\r\n";

export type QuestionnaireGdtInput = {
  patientReference: string;
  documentationText: string;
};

function encodeCp850(value: string): Buffer {
  const bytes = iconv.encode(value, ENCODING);
  if (iconv.decode(bytes, ENCODING) !== value) {
    throw new Error("Text enthält Zeichen außerhalb von CP850.");
  }
  return bytes;
}

function buildLine(fieldId: string, value: string): Buffer {
  const payload = `${fieldId}${value}`;
  const payloadBytes = encodeCp850(payload);
  const lineLength = 3 + payloadBytes.length + 2;
  if (lineLength > 999) throw new Error(`GDT-Zeile ${fieldId} ist zu lang.`);
  return encodeCp850(`${String(lineLength).padStart(3, "0")}${payload}${CRLF}`);
}

export function buildQuestionnaireGdtBytes(input: QuestionnaireGdtInput): Uint8Array {
  const patientReference = normalizeXComfortPatientReference(input.patientReference);
  if (!patientReference) throw new Error("Ungültige x.comfort-Patientennummer.");

  const documentationText = input.documentationText.trim();
  if (!documentationText) throw new Error("GDT-Dokumentationstext fehlt.");
  encodeCp850(documentationText);

  const buildParts = (totalLength: string) => [
    buildLine("8000", "6310"),
    buildLine("8100", totalLength),
    buildLine("9218", "02.10"),
    buildLine("3000", patientReference),
    buildLine("8402", "ALL00"),
    buildLine("6227", documentationText),
  ];

  const placeholderParts = buildParts("00000");
  const totalLength = placeholderParts.reduce((sum, part) => sum + part.length, 0);
  if (totalLength > 99999) throw new Error("GDT-Datensatz ist zu lang.");

  const finalBytes = Buffer.concat(buildParts(String(totalLength).padStart(5, "0")));
  if (finalBytes.length !== totalLength) {
    throw new Error("GDT-Gesamtlänge konnte nicht stabil berechnet werden.");
  }
  return new Uint8Array(finalBytes);
}