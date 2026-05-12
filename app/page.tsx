import { redirect } from "next/navigation";
import HomePageClient from "@/app/HomePageClient";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { isInboxOnlyAccount } from "@/lib/authz";

export default async function HomePage() {
  const account = await getSessionAccountFromCookies();
  if (account && account.is_approved && isInboxOnlyAccount(account)) {
    redirect("/questionnaires");
  }

  return <HomePageClient />;
}
