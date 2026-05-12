import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { isInboxOnlyAccount } from "@/lib/authz";
import AppShell from "@/components/AppShell";

export default async function OfficeCasesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const account = await getSessionAccountFromCookies();
  if (account && isInboxOnlyAccount(account)) {
    redirect("/questionnaires");
  }

  return (
    <>
      <AppShell />
      {children}
    </>
  );
}
