import { NextRequest, NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import {
  approveAccount,
  deleteAccount,
  revokeAccount,
  enableInquiryAssistant,
  disableInquiryAssistant,
  enablePatientCommunication,
  disablePatientCommunication,
  enableWebsiteForms,
  disableWebsiteForms,
  enableOfficeCases,
  disableOfficeCases,
} from "@/lib/adminActions";
import { prisma } from "@/lib/prisma";

async function requireAdmin(req: NextRequest) {
  const account = await getSessionAccount(req);
  if (!account) {
    return {
      account: null,
      error: NextResponse.json({ ok: false, error: "Nicht eingeloggt." }, { status: 401 }),
    };
  }
  if (!account.is_admin) {
    return {
      account: null,
      error: NextResponse.json({ ok: false, error: "Kein Admin-Zugriff." }, { status: 403 }),
    };
  }
  return { account, error: null };
}

/**
 * GET /api/admin/accounts – Liste aller Accounts (nur Admin).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      email: true,
      is_approved: true,
      is_admin: true,
      inquiry_assistant_enabled: true,
      patient_communication_enabled: true,
      website_forms_enabled: true,
      createdAt: true,
      office_cases_enabled: true,
    },
    orderBy: [{ is_approved: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, accounts });
}

/**
 * POST /api/admin/accounts – Account freischalten, sperren oder löschen (nur Admin).
 */
export async function POST(req: NextRequest) {
  const { account, error } = await requireAdmin(req);
  if (error) return error;

  const contentType = req.headers.get("content-type") ?? "";
  const isFormSubmit = contentType.includes("application/x-www-form-urlencoded");

  let email: string | null = null;
  let action: string | undefined;
  let confirmEmail: string | undefined;

  if (isFormSubmit) {
    const formData = await req.formData();
    const rawEmail = formData.get("email");
    email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;
    const rawAction = formData.get("action");
    action = typeof rawAction === "string" ? rawAction : undefined;
    const rawConfirmEmail = formData.get("confirmEmail");
    confirmEmail = typeof rawConfirmEmail === "string" ? rawConfirmEmail.trim().toLowerCase() : undefined;
  } else {
    const body = await req.json().catch(() => ({}));
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    action = body.action;
    confirmEmail = typeof body.confirmEmail === "string" ? body.confirmEmail.trim().toLowerCase() : undefined;
  }

  if (
    !email ||
    (action !== "approve" &&
      action !== "revoke" &&
      action !== "enable_inquiry" &&
      action !== "disable_inquiry" &&
      action !== "enable_patient_communication" &&
      action !== "disable_patient_communication" &&
      action !== "enable_website_forms" &&
      action !== "disable_website_forms" &&
      action !== "enable_office_cases" &&
      action !== "disable_office_cases" &&
      action !== "delete_account")
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Ungültige Parameter. Erwartet: { email, action: 'approve' | 'revoke' | 'enable_inquiry' | 'disable_inquiry' | 'enable_patient_communication' | 'disable_patient_communication' | 'enable_website_forms' | 'disable_website_forms' | 'enable_office_cases' | 'disable_office_cases' | 'delete_account' }",
      },
      { status: 400 },
    );
  }

  if (action === "delete_account") {
    if (!confirmEmail || confirmEmail !== email) {
      return NextResponse.json(
        {
          ok: false,
          deleted: false,
          code: "confirm_email_mismatch",
          error: "Bitte die E-Mail-Adresse exakt bestätigen.",
        },
        { status: 400 },
      );
    }

    if (account.email.trim().toLowerCase() === email) {
      return NextResponse.json(
        {
          ok: false,
          deleted: false,
          code: "self_delete_blocked",
          error: "Admins können ihr eigenes Konto nicht löschen.",
        },
        { status: 403 },
      );
    }

    const deleteResult = await deleteAccount(email, account.id);
    return NextResponse.json(deleteResult, { status: deleteResult.status });
  }

  let result: { ok: boolean; message: string };
  if (action === "approve") result = await approveAccount(email);
  else if (action === "revoke") result = await revokeAccount(email);
  else if (action === "enable_inquiry") result = await enableInquiryAssistant(email);
  else if (action === "disable_inquiry") result = await disableInquiryAssistant(email);
  else if (action === "enable_patient_communication") result = await enablePatientCommunication(email);
  else if (action === "disable_patient_communication") result = await disablePatientCommunication(email);
  else if (action === "enable_website_forms") result = await enableWebsiteForms(email);
  else if (action === "disable_website_forms") result = await disableWebsiteForms(email);
  else if (action === "enable_office_cases") result = await enableOfficeCases(email);
  else result = await disableOfficeCases(email);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 404 });
  }

  if (isFormSubmit) {
    const origin = new URL(req.url).origin;
    return Response.redirect(`${origin}/admin/accounts`, 303);
  }

  return NextResponse.json({ ok: true, message: result.message });
}
