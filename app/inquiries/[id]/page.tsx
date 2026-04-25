import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function InquiryRoutingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const account = await getSessionAccountFromCookies();
  if (
    !account ||
    !account.is_approved ||
    (!account.inquiry_assistant_enabled && !account.is_admin)
  ) {
    redirect("/");
  }

  const { id } = await params;
  const session = await prisma.inquirySession.findUnique({
    where: { id },
    select: { status: true, owner_account_id: true },
  });

  if (!session || session.owner_account_id !== account.id) {
    redirect("/inquiries");
  }

  if (session.status === "CONFIRMED") {
    redirect(`/inquiries/${id}/m3`);
  }

  redirect(`/inquiries/${id}/m2`);
}
