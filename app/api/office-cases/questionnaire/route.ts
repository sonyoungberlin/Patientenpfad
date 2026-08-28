import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireOfficeQuestionnaireAccess } from "@/lib/authz";
import { OFFICE_BLOCK_CATALOG } from "@/lib/questionnaire/officeBlockCatalog";
import { getCreateOwnershipData } from "@/lib/questionnaire/practiceScope";
import { createQuestionnaireSession } from "@/lib/questionnaire/createSession";

const IS_DEV = process.env.NODE_ENV === "development";

export async function POST(req: NextRequest) {
  try {
    const { account, error } = await requireOfficeQuestionnaireAccess(req);
    if (error) return error;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, error: "Ungültiges JSON." }, { status: 400 });
    }

    const rawBlockIds = body.selected_block_ids;
    if (
      !Array.isArray(rawBlockIds) ||
      rawBlockIds.length === 0 ||
      !rawBlockIds.every((id) => typeof id === "string")
    ) {
      return NextResponse.json(
        { ok: false, error: "selected_block_ids muss ein nicht-leeres Array von Strings sein." },
        { status: 400 },
      );
    }

    // Validierung ausschließlich gegen OFFICE_BLOCK_CATALOG
    const selectedBlockIds = (rawBlockIds as string[]).filter(
      (id) => id in OFFICE_BLOCK_CATALOG,
    );
    if (selectedBlockIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Keine gültigen Office-Block-IDs angegeben." },
        { status: 400 },
      );
    }

    const recipientReference =
      typeof body.recipient_reference === "string" && body.recipient_reference.trim() !== ""
        ? body.recipient_reference.trim()
        : null;
    if (!recipientReference) {
      return NextResponse.json(
        { ok: false, error: "Empfängerreferenz ist erforderlich." },
        { status: 400 },
      );
    }

    const ownership = getCreateOwnershipData(account);
    const fwdHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
    const origin = fwdHost ? `${fwdProto}://${fwdHost}` : req.nextUrl.origin;

    const { tokenLink: link } = await createQuestionnaireSession({
      selectedBlockIds,
      patientReference: recipientReference,
      patientLanguage: "de",
      ownerAccountId: ownership.owner_account_id,
      ownerPracticeId: ownership.owner_practice_id ?? null,
      origin,
      context: "office",
    });

    return NextResponse.json({ ok: true, link });
  } catch (err) {
    console.error("office-questionnaire create failed", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { ok: false, error: "Fragebogen konnte nicht erstellt werden.", prismaCode: err.code },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Fragebogen konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
