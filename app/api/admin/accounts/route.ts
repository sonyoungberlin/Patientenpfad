import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { approveAccount, revokeAccount, enableInquiryAssistant, disableInquiryAssistant } from "@/lib/adminActions";
import { prisma } from "@/lib/prisma";

async function requireAdmin(req: NextRequest) {
  const account = await getSessionAccount(req);
  if (!account) return { account: null, error: NextResponse.json({ ok: false, error: "Nicht eingeloggt." }, { status: 401 }) };
  if (!account.is_admin) return { account: null, error: NextResponse.json({ ok: false, error: "Kein Admin-Zugriff." }, { status: 403 }) };
  return { account, error: null };
}

/**
 * GET /api/admin/accounts – Liste aller Accounts (nur Admin).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const accounts = await prisma.account.findMany({
    select: { id: true, email: true, is_approved: true, is_admin: true, inquiry_assistant_enabled: true, createdAt: true },
    orderBy: [{ is_approved: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, accounts });
}

/**
 * POST /api/admin/accounts – Account freischalten oder sperren (nur Admin).
 *
 * Unterstützt zwei Content-Types:
 *   - application/json:                  { email, action }  → JSON-Antwort
 *   - application/x-www-form-urlencoded: form-Felder email + action → Redirect zu /admin/accounts
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const contentType = req.headers.get("content-type") ?? "";
  const isFormSubmit = contentType.includes("application/x-www-form-urlencoded");

  let email: string | null = null;
  let action: string | undefined;

  if (isFormSubmit) {
    const formData = await req.formData();
    const rawEmail = formData.get("email");
    email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;
    const rawAction = formData.get("action");
    action = typeof rawAction === "string" ? rawAction : undefined;
  } else {
    const body = await req.json().catch(() => ({}));
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    action = body.action;
  }

  if (!email || (action !== "approve" && action !== "revoke" && action !== "enable_inquiry" && action !== "disable_inquiry")) {
    return NextResponse.json(
      { ok: false, error: "Ungültige Parameter. Erwartet: { email, action: 'approve' | 'revoke' | 'enable_inquiry' | 'disable_inquiry' }" },
      { status: 400 },
    );
  }

  let result;
  if (action === "approve") result = await approveAccount(email);
  else if (action === "revoke") result = await revokeAccount(email);
  else if (action === "enable_inquiry") result = await enableInquiryAssistant(email);
  else result = await disableInquiryAssistant(email);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 404 });
  }

  if (isFormSubmit) {
    const origin = new URL(req.url).origin;
    return Response.redirect(`${origin}/admin/accounts`, 303);
  }

  return NextResponse.json({ ok: true, message: result.message });
}
