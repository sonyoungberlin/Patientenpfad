import { redirect } from "next/navigation";
import { requireInquiriesAccessFromCookies } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { canAccessInquirySession } from "@/lib/inquiries/practiceScope";

export default async function InquiryRoutingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await requireInquiriesAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  const { id } = await params;
  const session = await prisma.inquirySession.findUnique({
    where: { id },
    select: { status: true, owner_account_id: true, owner_practice_id: true, is_template: true },
  });

  if (!session || !canAccessInquirySession(account, session) || session.is_template) {
    redirect("/inquiries");
  }

  if (session.status === "CONFIRMED") {
    redirect(`/inquiries/${id}/m3`);
  }

  redirect(`/inquiries/${id}/m2`);
}
