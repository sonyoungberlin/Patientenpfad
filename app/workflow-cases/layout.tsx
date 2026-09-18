import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireWorkflowAccessFromCookies } from "@/lib/authz";
import { toAppShellAccount } from "@/lib/appShellAccount";
import AppShell from "@/components/AppShell";

export default async function WorkflowCasesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const account = await requireWorkflowAccessFromCookies();
  if (!account) {
    redirect("/dashboard");
  }
  return (
    <>
      <AppShell account={toAppShellAccount(account)} />
      {children}
    </>
  );
}
