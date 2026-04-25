import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import InquiryNewClient from "./InquiryNewClient";

export default async function InquiryNewPage() {
  const account = await getSessionAccountFromCookies();
  if (
    !account ||
    !account.is_approved ||
    (!account.inquiry_assistant_enabled && !account.is_admin)
  ) {
    redirect("/");
  }

  const profiles = Object.values(INQUIRY_PROFILE_CATALOG_V2).map((p) => ({
    id: p.id,
    label: p.label,
  }));

  return (
    <main>
      <h1>Neue Anfrage</h1>
      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
        Welche Anliegen liegen vor? Mehrfachauswahl möglich.
      </p>
      <InquiryNewClient profiles={profiles} />
    </main>
  );
}
