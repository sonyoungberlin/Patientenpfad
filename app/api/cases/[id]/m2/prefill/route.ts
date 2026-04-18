import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    const session = await prisma.caseSession.findUnique({ where: { id } });

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    await prisma.caseSession.update({
      where: { id },
      data: {
        ctx_prefill: body.prefill as Record<string, string>,
      },
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
