import { NextRequest, NextResponse } from "next/server";
import { PracticeRole } from "@prisma/client";
import { requirePracticeRole } from "@/lib/authz";
import {
  createPracticeDocumentationBlock,
  validatePracticeDocumentationBlock,
} from "@/lib/practice/documentationBlocks";

const WRITE_ROLES = [PracticeRole.OWNER, PracticeRole.ADMIN];

export async function POST(req: NextRequest) {
  const auth = await requirePracticeRole(req, WRITE_ROLES);
  if (auth.error) return auth.error;
  const practice = auth.account.current_practice;
  if (!practice) {
    return NextResponse.json({ ok: false, error: "Kein Praxiszugriff." }, { status: 403 });
  }

  const validation = validatePracticeDocumentationBlock(
    await req.json().catch(() => null),
  );
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const block = await createPracticeDocumentationBlock(
    practice.id,
    validation.value,
  );
  return NextResponse.json({ ok: true, block }, { status: 201 });
}