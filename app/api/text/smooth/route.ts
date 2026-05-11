import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import {
  TextSmoothingError,
  smoothTextWithOpenAI,
  type TextSmoothingContext,
} from "@/lib/server/textSmoothing";

const MAX_TEXT_LENGTH = 8000;

type RequestBody = {
  text?: unknown;
  context?: unknown;
};

const ALLOWED_CONTEXTS = new Set<TextSmoothingContext>([
  "inquiry_patient_message",
  "case_patient_todo",
]);

export async function POST(req: NextRequest) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      return NextResponse.json(
        { ok: false, error: "Nicht angemeldet." },
        { status: 401 },
      );
    }
    if (!account.is_approved) {
      return NextResponse.json(
        { ok: false, error: "Account nicht freigeschaltet." },
        { status: 403 },
      );
    }

    const body = (await req.json().catch(() => null)) as RequestBody | null;
    const rawText = body?.text;
    const rawContext = body?.context;

    if (typeof rawText !== "string") {
      return NextResponse.json(
        { ok: false, error: "Text muss ein String sein." },
        { status: 400 },
      );
    }

    const text = rawText.trim();
    if (text.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Text darf nicht leer sein." },
        { status: 400 },
      );
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { ok: false, error: "Text ist zu lang." },
        { status: 400 },
      );
    }

    if (
      rawContext !== undefined &&
      (typeof rawContext !== "string" ||
        !ALLOWED_CONTEXTS.has(rawContext as TextSmoothingContext))
    ) {
      return NextResponse.json(
        { ok: false, error: "Ungültiger Kontext." },
        { status: 400 },
      );
    }

    const smoothedText = await smoothTextWithOpenAI({
      text,
      context: rawContext as TextSmoothingContext | undefined,
    });

    return NextResponse.json({ ok: true, smoothedText });
  } catch (err) {
    if (err instanceof TextSmoothingError) {
      if (err.code === "missing_api_key") {
        return NextResponse.json(
          { ok: false, error: "Textglättung ist nicht konfiguriert.", code: "missing_api_key" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { ok: false, error: "Text konnte nicht geglättet werden.", code: err.code },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Text konnte nicht geglättet werden.", code: "unknown_error" },
      { status: 500 },
    );
  }
}
