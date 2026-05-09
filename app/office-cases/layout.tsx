import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";

export default function OfficeCasesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <AppShell />
      {children}
    </>
  );
}
