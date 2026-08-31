import { redirect } from "next/navigation";
import HomePageClient from "@/app/HomePageClient";
import { getSessionAccountFromCookies } from "@/lib/auth";

export default async function NewCasePage() {
  const account = await getSessionAccountFromCookies();
  if (!account || !account.is_approved) {
    redirect("/");
  }

  return <HomePageClient />;
}
