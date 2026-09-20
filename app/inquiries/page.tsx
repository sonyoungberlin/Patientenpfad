import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireInquiriesAccessFromCookies } from "@/lib/authz";
import { canManageInquiryTemplates } from "@/lib/inquiries/practiceScope";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import InquiryListClient, { type InquiryListItem } from "./InquiryListClient";

const MAX_TEMPLATES = 50;

export default async function InquiriesPage() {
  const account = await requireInquiriesAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  // Übersicht zeigt ausschließlich Vorlagen (is_template=true).
  // Reguläre Arbeits-Sessions tauchen hier bewusst nicht auf, damit die
  // Liste nicht mit einmaligen Nachrichten zugemüllt wird.
  const currentPracticeId = account.current_practice?.id;
  const templates = currentPracticeId
    ? await prisma.inquirySession.findMany({
        where: { owner_practice_id: currentPracticeId, is_template: true },
        orderBy: { createdAt: "desc" },
        take: MAX_TEMPLATES,
        select: {
          id: true,
          createdAt: true,
          template_name: true,
          selected_inquiry_ids: true,
        },
      })
    : [];

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
      <InquiryListClient
        templates={items}
        canManageTemplates={canManageInquiryTemplates(account)}
      />
    </main>
  );
}
