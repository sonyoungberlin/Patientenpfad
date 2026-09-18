import type { ReactNode } from "react";
import { getSessionAccountFromCookies } from "@/lib/auth";
import { toAppShellAccount } from "@/lib/appShellAccount";
import AppShell from "@/components/AppShell";

export default async function QuestionnairesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const account = await getSessionAccountFromCookies();
  return (
    <>
      <AppShell account={toAppShellAccount(account)} />
      {children}
    </>
  );
}
