/**
 * Status-Anzeige-Logik für Patienten-Fragebogen-Sessions.
 *
 * Zentralisiert die Ableitung des sichtbaren Status (inkl. „abgelaufen") und
 * die Badge-Optik. Bisher waren beide Aspekte inline in
 * `app/admin/questionnaires/page.tsx` implementiert; diese Datei extrahiert
 * sie 1:1, ohne Verhaltensänderung.
 */

export type DisplayStatus = "pending" | "completed" | "expired" | (string & {});

export const STATUS_LABELS: Record<string, string> = {
  pending: "Ausstehend",
  completed: "Eingegangen",
  expired: "Abgelaufen",
};

/**
 * Leitet den anzuzeigenden Status einer Session ab.
 *
 * Ein `pending`-Eintrag, dessen `token_expires_at` in der Vergangenheit liegt,
 * wird als `expired` dargestellt. Andere Status werden unverändert übernommen.
 */
export function deriveDisplayStatus(session: {
  status: string;
  token_expires_at: Date | null;
}): DisplayStatus {
  if (
    session.status === "pending" &&
    session.token_expires_at !== null &&
    session.token_expires_at < new Date()
  ) {
    return "expired";
  }
  return session.status;
}

/**
 * Liefert das Inline-Style-Objekt für das Status-Badge. Werte und CSS-Variablen
 * sind 1:1 aus der bisherigen Inline-Logik in `app/admin/questionnaires/page.tsx`
 * übernommen, damit sich das Markup nicht verändert.
 */
export function getStatusBadgeStyle(displayStatus: string): {
  padding: string;
  borderRadius: string;
  fontSize: string;
  fontWeight: number;
  background: string;
  color: string;
} {
  return {
    padding: "0.15rem 0.5rem",
    borderRadius: "var(--radius)",
    fontSize: "0.8rem",
    fontWeight: 600,
    background:
      displayStatus === "completed"
        ? "var(--success-bg, #dcfce7)"
        : displayStatus === "expired"
          ? "var(--muted, #f1f5f9)"
          : "var(--warning-bg, #fef9c3)",
    color:
      displayStatus === "completed"
        ? "var(--success-fg, #166534)"
        : displayStatus === "expired"
          ? "var(--muted-fg, #64748b)"
          : "var(--warning-fg, #854d0e)",
  };
}
