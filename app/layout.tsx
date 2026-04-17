import type { ReactNode } from "react";

export const metadata = {
  title: "Projektgrundgeruest",
  description: "Neutrales technisches Startgeruest",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
