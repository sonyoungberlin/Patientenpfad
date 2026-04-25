import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import InquiryDemoClient from "./InquiryDemoClient";

/**
 * Serverseitig geschützte Route für den Anfrage-Assistenten.
 * Zugriff nur für Accounts mit inquiry_assistant_enabled oder Admins.
 * Direkter URL-Aufruf ohne Berechtigung wird zur Startseite weitergeleitet.
 */
export default async function InquiryDemoPage() {
  const account = await getSessionAccountFromCookies();

  if (!account || !account.is_approved) {
    redirect("/");
  }

  if (!account.inquiry_assistant_enabled && !account.is_admin) {
    redirect("/");
  }

  return <InquiryDemoClient />;
}
