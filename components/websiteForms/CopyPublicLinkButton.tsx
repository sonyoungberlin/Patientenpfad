"use client";

/**
 * Phase 3b: Kleiner Client-Knopf zum Kopieren des öffentlichen Formular-
 * Links in die Zwischenablage. Bewusst minimal — der Link wird zusätzlich
 * als reiner Text/`<input readOnly>` neben dem Knopf gerendert, sodass die
 * Funktionalität auch ohne JavaScript besteht.
 */

import { useState } from "react";

export default function CopyPublicLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kopieren nicht möglich.");
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
      <button type="button" onClick={copy} style={{ fontSize: "0.875rem" }}>
        Link kopieren
      </button>
      {copied && <span style={{ fontSize: "0.875rem" }}>Kopiert.</span>}
      {error && (
        <span className="text-muted" style={{ fontSize: "0.875rem" }}>
          {error}
        </span>
      )}
    </span>
  );
}
