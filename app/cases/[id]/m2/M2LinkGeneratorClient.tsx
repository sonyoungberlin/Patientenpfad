"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { buildCaseM3Path } from "@/lib/flow/caseNavigation";

const MESSAGE_INTRO =
  "Liebe Patientin, lieber Patient,\n" +
  "für die Vorbereitung Ihres nächsten Termins bitten wir Sie, den folgenden Fragebogen auszufüllen:";

export function buildMessageText(generatedLink: string, signature: string): string {
  const parts = [MESSAGE_INTRO, generatedLink];
  if (signature.trim()) parts.push(signature.trim());
  return parts.join("\n\n");
}

export function M2LinkGeneratorClient({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [messageText, setMessageText] = useState<string>("");
  const [signature, setSignature] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    fetch("/api/practice/signature")
      .then((r) => r.json())
      .then((data: { ok?: boolean; signature?: string }) => {
        if (data.ok) {
          setSignature(data.signature ?? "");
        }
      })
      .catch(() => {});
  }, []);

  // Rebuild message whenever the link or signature changes so that a
  // late-loading signature is always included in the draft.
  useEffect(() => {
    if (link) {
      setMessageText(buildMessageText(link, signature));
    }
  }, [link, signature]);

  async function generateLink() {
    setLoading(true);
    setError(null);
    setCopied(false);
    setCopiedMessage(false);

    try {
      const response = await fetch(`/api/cases/${caseId}/m2-link`, {
        method: "POST",
      });
      const data = (await response.json()) as { link?: string };

      const generatedLink = typeof data.link === "string" ? data.link : "";

      if (!response.ok || !generatedLink) {
        setLink(null);
        setMessageText("");
        setError("Link konnte nicht erzeugt werden.");
        return;
      }

      setLink(generatedLink);
    } catch {
      setLink(null);
      setMessageText("");
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

  async function copyMessage() {
    if (!messageText) return;
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedMessage(true);
    } catch {
      setError("Nachricht konnte nicht in die Zwischenablage kopiert werden.");
    }
  }

  return (
    <section
      data-m2-link-generator
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        flex: "1 1 320px",
        minWidth: 0,
      }}
    >
      <button
        type="button"
        data-generate-m2-link
        onClick={() => void generateLink()}
        disabled={loading}
        style={{ alignSelf: "flex-start" }}
      >
        {loading ? "Wird erzeugt…" : "Fragebogen-Link für Patient erzeugen"}
      </button>
      {error ? (
        <p className="text-error" role="alert" aria-live="polite" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}
      {link ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <code
            data-m2-generated-link
            style={{
              display: "block",
              wordBreak: "break-all",
              background: "var(--input-background)",
              padding: "0.5rem 0.75rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            {link}
          </code>
          <textarea
            data-m2-message-preview
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            rows={6}
            style={{ width: "100%", resize: "vertical" }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button type="button" data-copy-m2-link onClick={() => void copyLink()}>
              {copied ? "Kopiert ✓" : "Link kopieren"}
            </button>
            <button type="button" data-copy-m2-message onClick={() => void copyMessage()}>
              {copiedMessage ? "Kopiert ✓" : "Nachricht kopieren"}
            </button>
            <button
              type="button"
              className="btn-primary"
              data-goto-m3
              onClick={() => router.push(buildCaseM3Path(caseId))}
            >
              Weiter zur ärztlichen Checkliste →
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
