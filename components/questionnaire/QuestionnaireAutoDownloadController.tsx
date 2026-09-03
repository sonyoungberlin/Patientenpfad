"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateQuestionnaireAutoDeviceId } from "@/lib/questionnaire/autoDownloadDeviceClient";

const STATUS_ENDPOINT = "/api/practice/questionnaire-auto-download";
const NEXT_ENDPOINT = "/api/questionnaire/auto-download/next";
const POLL_INTERVAL_MS = 10_000;
const MAX_DOWNLOADS_PER_CYCLE = 10;

function filenameFromContentDisposition(value: string | null): string {
  return value?.match(/filename="([^"]+)"/i)?.[1] ?? "Fragebogen.pdf";
}

export default function QuestionnaireAutoDownloadController() {
  const { refresh } = useRouter();
  const inFlight = useRef(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let disposed = false;
    let deviceId: string;
    try {
      deviceId = getOrCreateQuestionnaireAutoDeviceId();
    } catch {
      return;
    }

    const headers = { "X-Questionnaire-Auto-Device": deviceId };

    async function downloadPdf(response: Response) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filenameFromContentDisposition(
        response.headers.get("content-disposition"),
      );
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    }

    async function runCycle() {
      if (disposed || inFlight.current) return;
      inFlight.current = true;
      try {
        const statusResponse = await fetch(STATUS_ENDPOINT, { headers });
        if (!statusResponse.ok) return;
        const status = (await statusResponse.json()) as {
          enabled: boolean;
          isCurrentDevice: boolean;
        };
        const isActive = status.enabled && status.isCurrentDevice;
        if (disposed) return;
        setActive(isActive);
        if (!isActive) {
          setError(false);
          return;
        }

        setError(false);
        for (let index = 0; index < MAX_DOWNLOADS_PER_CYCLE; index += 1) {
          const response = await fetch(NEXT_ENDPOINT, { headers });
          if (response.status === 204) break;
          if (response.status === 403) {
            setActive(false);
            break;
          }
          if (
            !response.ok ||
            !response.headers.get("content-type")?.includes("application/pdf")
          ) {
            throw new Error("auto_download_failed");
          }
          await downloadPdf(response);
        }
        if (!disposed) refresh();
      } catch {
        if (!disposed) setError(true);
      } finally {
        inFlight.current = false;
      }
    }

    void runCycle();
    const interval = window.setInterval(() => void runCycle(), POLL_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void runCycle();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  if (!active) return null;
  return (
    <div className="text-small" style={{ marginBottom: "1rem" }}>
      <span>Automatischer PDF-Download aktiv</span>
      {error && (
        <p role="alert" style={{ color: "var(--danger-fg, #b91c1c)" }}>
          Automatischer Download fehlgeschlagen. PDF kann weiterhin manuell
          heruntergeladen werden.
        </p>
      )}
    </div>
  );
}