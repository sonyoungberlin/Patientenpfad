import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import InquiryListClient, { type InquiryListItem } from "./InquiryListClient";

const MAX_INQUIRIES = 50;

export default async function InquiriesPage() {
  const account = await getSessionAccountFromCookies();
  if (
    !account ||
    !account.is_approved ||
    (!account.inquiry_assistant_enabled && !account.is_admin)
  ) {
    redirect("/");
  }

  const sessions = await prisma.inquirySession.findMany({
    where: { owner_account_id: account.id },
    orderBy: { createdAt: "desc" },
    take: MAX_INQUIRIES,
    select: { id: true, createdAt: true, status: true, selected_inquiry_ids: true },
  });

  const items: InquiryListItem[] = sessions.map((s) => {
    const ids = Array.isArray(s.selected_inquiry_ids)
      ? (s.selected_inquiry_ids as string[])
      : [];
    const labels = ids
      .map((inquiryId) => INQUIRY_PROFILE_CATALOG_V2[inquiryId]?.label ?? inquiryId)
      .join(", ");
    return {
      id: s.id,
      labels,
      dateLabel: s.createdAt.toLocaleDateString("de-DE"),
      statusLabel: s.status === "CONFIRMED" ? "Bestätigt" : "Offen",
    };
  });

  return (
    <main>
      <h1>Anfragen</h1>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/inquiries/new"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "0.5rem 1.25rem",
            textDecoration: "none",
            color: "var(--foreground)",
            background: "var(--background)",
            fontWeight: 500,
          }}
        >
          Neue Anfrage
        </Link>
      </div>
      <InquiryListClient sessions={items} />
    </main>
  );
}
