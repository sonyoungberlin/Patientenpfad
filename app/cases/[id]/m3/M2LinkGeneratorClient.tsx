"use client";

import { useState } from "react";

export function M2LinkGeneratorClient({ caseId }: { caseId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generateLink() {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch(`/api/cases/${caseId}/m2-link`, {
        method: "POST",
      });
      const data = (await response.json()) as { link?: string };

      if (!response.ok || typeof data.link !== "string" || data.link.length === 0) {
        setLink(null);
        setError("Link konnte nicht erzeugt werden.");
        return;
      }

      setLink(data.link);
    } catch {
      setLink(null);
      setError("Link konnte nicht erzeugt werden.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Link konnte nicht in die Zwischenablage kopiert werden.");
    }
  }

  return (
    <section
      data-m2-link-generator
      style={{
        marginTop: "2rem",
        borderTop: "1px solid #ddd",
        paddingTop: "1.5rem",
      }}
    >
      <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
        M2-Link für Patient
      </h2>
      <button
        type="button"
        data-generate-m2-link
        onClick={() => void generateLink()}
        disabled={loading}
      >
        {loading ? "Wird erzeugt…" : "M2-Link erzeugen"}
      </button>
      {error ? (
        <p role="alert" aria-live="polite" style={{ color: "red", marginTop: "0.5rem" }}>
          {error}
        </p>
      ) : null}
      {link ? (
        <div style={{ marginTop: "0.75rem" }}>
          <code
            data-m2-generated-link
            style={{
              display: "block",
              wordBreak: "break-all",
              background: "#f5f5f5",
              padding: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            {link}
          </code>
          <button type="button" data-copy-m2-link onClick={() => void copyLink()}>
            {copied ? "Kopiert ✓" : "Link kopieren"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
