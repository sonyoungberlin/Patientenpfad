import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail: unknown = (body as Record<string, unknown>).email;
    const rawName: unknown = (body as Record<string, unknown>).name;

    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;
    const name =
      typeof rawName === "string" ? rawName.trim() : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Ungültige E-Mail-Adresse." },
        { status: 400 },
      );
    }

    if (!name || name.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Bitte geben Sie Ihren Namen ein." },
        { status: 400 },
      );
    }

    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Diese E-Mail-Adresse ist bereits registriert." },
        { status: 409 },
      );
    }

    console.log("[auth/register] creating account", { email, name });
    await prisma.account.create({
      data: { email, name, is_approved: false },
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
