import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionAccount } from "@/lib/auth";
import { sanitizePrefillForMode } from "@/lib/logic/m2Questions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await getSessionAccount(req);
    if (!account) {
      return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
    }
    if (!account.is_approved) {
      return NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 });
    }

    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Malformed JSON body" },
        { status: 400 },
      );
    }

    if (
      !body?.prefill ||
      typeof body.prefill !== "object" ||
      Array.isArray(body.prefill)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    // Optionaler Modus für nicht-asynchrone M2-Wege:
    // - "mfa"          → MFA-Vorbereitung (Default, rückwärtskompatibel)
    // - "conversation" → Patientengespräch in der Praxis (Patientenfragen-Katalog)
    // Andere Werte werden ignoriert und auf "mfa" zurückgesetzt.
    const preparationMode: "mfa" | "conversation" =
      body?.mode === "conversation" ? "conversation" : "mfa";

    // Strikte Mode-Sanitisierung: Es werden ausschließlich Antworten
    // akzeptiert, deren IDs zum Katalog des aktiven Vorbereitungswegs gehören.
    // Damit kann `ctx_prefill` strukturell nie mehr eine Mischung aus
    // MFA- und Patientenantworten enthalten.
    const sanitizedPrefill = sanitizePrefillForMode(
      body.prefill,
      preparationMode,
    );

    const session = await prisma.caseSession.findUnique({
      where: { id },
      select: { owner_account_id: true, m2_status: true },
    });

    if (!session || session.owner_account_id !== account.id) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    // Konsistenz: Wird über einen nicht-asynchronen Weg (MFA / Gespräch)
    // gespeichert, darf der Fall nicht weiter auf einen Patientenrücklauf
    // warten. Ein eventuell ausstehender Token wird invalidiert.
    const data: Prisma.CaseSessionUpdateInput = {
      ctx_prefill: sanitizedPrefill as unknown as Prisma.InputJsonValue,
      preparation_mode: preparationMode,
    };

    if (session.m2_status === "waiting_for_patient") {
      data.m2_status = "none";
      data.m2_token = null;
      data.m2_token_expires_at = null;
    }

    await prisma.caseSession.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      console.error("[cases/[id]/m2/prefill]", {
        name: err.name,
        message: err.message,
      });
    } else {
      console.error("[cases/[id]/m2/prefill]", "UnknownError");
    }
    return NextResponse.json(
      { ok: false, error: "Failed to save prefill" },
      { status: 500 },
    );
  }
}
