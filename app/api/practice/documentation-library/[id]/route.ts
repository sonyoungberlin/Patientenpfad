import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";
import { requirePracticeRole } from "@/lib/authz";
import {
  updatePracticeDocumentationBlock,
  validatePracticeDocumentationBlock,
} from "@/lib/practice/documentationBlocks";

const WRITE_ROLES = [PracticeRole.OWNER, PracticeRole.ADMIN];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePracticeRole(req, WRITE_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) {
    return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const input = body && typeof body === "object" && !Array.isArray(body) &&
    (body as Record<string, unknown>).isActive === false
    ? { isActive: false as const }
    : validatePracticeDocumentationBlock(body);
  if ("ok" in input && !input.ok) {
    return NextResponse.json({ ok: false, error: input.error }, { status: 400 });
  }

  const updated = await updatePracticeDocumentationBlock(
    practice.id,
    (await params).id,
    "ok" in input ? input.value : input,
  );
  if (updated === "not_found") {
    return NextResponse.json({ ok: false, error: "Dokumentationsbaustein nicht gefunden." }, { status: 404 });
  }
  if (updated === "in_use") {
    return NextResponse.json({ ok: false, error: "Der Baustein wird von einer aktiven Vorlage verwendet." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}