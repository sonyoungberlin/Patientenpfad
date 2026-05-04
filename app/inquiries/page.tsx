import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import InquiryListClient, { type InquiryListItem } from "./InquiryListClient";

const MAX_TEMPLATES = 50;

export default async function InquiriesPage() {
  const account = await getSessionAccountFromCookies();
  if (
    !account ||
    !account.is_approved ||
    (!account.inquiry_assistant_enabled && !account.is_admin)
  ) {
    redirect("/");
  }

  // Übersicht zeigt ausschließlich Vorlagen (is_template=true).
  // Reguläre Arbeits-Sessions tauchen hier bewusst nicht auf, damit die
  // Liste nicht mit einmaligen Nachrichten zugemüllt wird.
  const templates = await prisma.inquirySession.findMany({
    where: { owner_account_id: account.id, is_template: true },
    orderBy: { createdAt: "desc" },
    take: MAX_TEMPLATES,
    select: {
      id: true,
      createdAt: true,
      template_name: true,
      selected_inquiry_ids: true,
    },
  });

  const items: InquiryListItem[] = templates.map((t) => {
    const ids = Array.isArray(t.selected_inquiry_ids)
      ? (t.selected_inquiry_ids as string[])
      : [];
    const labels = ids
      .map((inquiryId) => INQUIRY_PROFILE_CATALOG_V2[inquiryId]?.label ?? inquiryId)
      .join(", ");
    return {
      id: t.id,
      templateName: t.template_name ?? "Unbenannte Vorlage",
      labels,
      dateLabel: t.createdAt.toLocaleDateString("de-DE"),
    };
  });

  return (
    <main>
      <h1>Vorlagen</h1>
      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
        Hier erscheinen ausschließlich gespeicherte Vorlagen. Einmalige
        Nachrichten werden nicht dauerhaft abgelegt.
      </p>
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
          Neue Nachricht
        </Link>
      </div>
      <InquiryListClient templates={items} />
    </main>
  );
}
