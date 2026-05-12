import { redirect } from "next/navigation";
import { requireInquiriesAccessFromCookies } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

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
    select: { status: true, owner_account_id: true, is_template: true },
  });

  if (!session || session.owner_account_id !== account.id || session.is_template) {
    redirect("/inquiries");
  }

  if (session.status === "CONFIRMED") {
    redirect(`/inquiries/${id}/m3`);
  }

  redirect(`/inquiries/${id}/m2`);
}
