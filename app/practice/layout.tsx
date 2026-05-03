import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";

export default function PracticeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppShell />
      {children}
    </>
  );
}
