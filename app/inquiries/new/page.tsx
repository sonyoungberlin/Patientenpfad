import { redirect } from "next/navigation";
import { requireInquiriesAccessFromCookies } from "@/lib/authz";
import { INQUIRY_PROFILE_CATALOG_V2 } from "@/lib/inquiries/inquiryProfileCatalog";
import { M1_PROFILE_GROUPS } from "@/lib/inquiries/m1ProfileGroups";
import InquiryNewClient from "./InquiryNewClient";

export default async function InquiryNewPage() {
  const account = await requireInquiriesAccessFromCookies();
  if (!account) {
    redirect("/");
  }

  // Profil-Map für schnellen Zugriff
  const profileMap: Record<string, { id: string; label: string }> = {};
  for (const p of Object.values(INQUIRY_PROFILE_CATALOG_V2)) {
    profileMap[p.id] = { id: p.id, label: p.label };
  }

  // Gruppen mit aufgelösten Profilen befüllen (unbekannte IDs überspringen)
  const groups = M1_PROFILE_GROUPS.map((g) => ({
    label: g.label,
    profiles: g.profileIds
      .map((id) => profileMap[id])
      .filter((p): p is { id: string; label: string } => p !== undefined),
  })).filter((g) => g.profiles.length > 0);

  return (
    <main>
      <h1>Neue Anfrage</h1>
      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>
        Welche Anliegen liegen vor? Mehrfachauswahl möglich.
      </p>
      <InquiryNewClient groups={groups} />
    </main>
  );
}
