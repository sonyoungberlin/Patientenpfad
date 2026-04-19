import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail: unknown = (body as Record<string, unknown>).email;

    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Ungültige E-Mail-Adresse." },
        { status: 400 },
      );
    }

    const existing = await prisma.account.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Diese E-Mail-Adresse ist bereits registriert." },
        { status: 409 },
      );
    }

    console.log("[auth/register] creating account", { email });
    await prisma.account.create({
      data: { email, is_approved: false },
    });
    console.log("[auth/register] account created successfully", { email });

    return NextResponse.json({
      ok: true,
      message: "Registrierung erfolgreich. Ihr Zugang wird manuell freigeschaltet.",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[auth/register] FEHLER bei Registrierung:", detail, err);
    return NextResponse.json(
      { ok: false, error: `Registrierung fehlgeschlagen: ${detail}` },
      { status: 500 },
    );
  }
}
