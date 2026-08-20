import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { canAccessWorkflowCases } from "@/lib/authz";
import { requirePracticeId } from "@/lib/practiceCatalog/scope";
import { publishToCatalog } from "@/lib/practiceCatalog/publish";

export async function POST(req: NextRequest) {
  const account = await getSessionAccount(req);
  if (!account) {
    return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!account.is_approved) {
    return NextResponse.json({ ok: false, error: "Account nicht freigeschaltet." }, { status: 403 });
  }
  if (!canAccessWorkflowCases(account)) {
    return NextResponse.json({ ok: false, error: "Arbeitsprozesse nicht freigeschaltet." }, { status: 403 });
  }

  let practiceId: string;
  try {
    practiceId = requirePracticeId(account);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Kein Praxiskontext vorhanden." },
      { status: 403 },
    );
  }

  let body: { sessionId?: unknown; title?: unknown; description?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  if (typeof body.sessionId !== "string" || body.sessionId.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "sessionId fehlt." }, { status: 400 });
  }
  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "Titel fehlt." }, { status: 400 });
  }

  try {
    const result = await publishToCatalog({
      sessionId: body.sessionId.trim(),
      title: body.title.trim(),
      description:
        typeof body.description === "string" ? body.description.trim() : undefined,
      practiceId,
      accountId: account.id,
    });

    if (result.alreadyPublished) {
      return NextResponse.json({ ok: true, id: result.id, alreadyPublished: true });
    }
    return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    const message =
      err instanceof Error ? err.message : "Interner Fehler.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: statusCode ?? 500 },
    );
  }
}
