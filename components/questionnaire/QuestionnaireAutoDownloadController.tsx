"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateQuestionnaireAutoDeviceId } from "@/lib/questionnaire/autoDownloadDeviceClient";
import { downloadFileResponse } from "@/lib/questionnaire/downloadFileResponse";

const STATUS_ENDPOINT = "/api/practice/questionnaire-auto-download";
const NEXT_ENDPOINT = "/api/questionnaire/auto-download/next";
const POLL_INTERVAL_MS = 10_000;
const MAX_DOWNLOADS_PER_CYCLE = 10;

export default function QuestionnaireAutoDownloadController({
  sessionId,
}: {
  sessionId?: string;
}) {
  const { refresh } = useRouter();
  const inFlight = useRef(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let disposed = false;
    let interval: number | null = null;
    let visibilityListenerAttached = false;
    let deviceId: string;
    try {
      deviceId = getOrCreateQuestionnaireAutoDeviceId();
    } catch {
      return;
    }

    const headers = { "X-Questionnaire-Auto-Device": deviceId };

    function stopPolling() {
      if (interval !== null) {
        window.clearInterval(interval);
        interval = null;
      }
      if (visibilityListenerAttached) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        visibilityListenerAttached = false;
      }
    }

    async function runCycle(): Promise<boolean> {
      if (disposed || inFlight.current) return true;
      inFlight.current = true;
      try {
        const statusResponse = await fetch(STATUS_ENDPOINT, { headers });
        if (!statusResponse.ok) return true;
        const status = (await statusResponse.json()) as {
          mode: "BROWSER" | "WINDOWS";
          enabled: boolean;
          isCurrentDevice: boolean;
        };
        if (status.mode === "WINDOWS") {
          setActive(false);
          setError(false);
          stopPolling();
          return false;
        }
        const isActive = status.enabled && status.isCurrentDevice;
        if (disposed) return false;
        setActive(isActive);
        if (!isActive) {
          setError(false);
          return true;
        }

        setError(false);
        for (let index = 0; index < MAX_DOWNLOADS_PER_CYCLE; index += 1) {
          const nextEndpoint = sessionId
            ? `${NEXT_ENDPOINT}?${new URLSearchParams({ sessionId })}`
            : NEXT_ENDPOINT;
          const response = await fetch(nextEndpoint, { headers });
          if (response.status === 204) break;
          if (response.status === 403) {
            setActive(false);
            break;
          }
          const contentType = response.headers.get("content-type") ?? "";
          if (!response.ok || (
            !contentType.includes("application/pdf") &&
            !contentType.includes("application/xml") &&
            !contentType.includes("application/octet-stream")
          )) {
            throw new Error("auto_download_failed");
          }
          await downloadFileResponse(response, "Fragebogen");
        }
        if (!disposed) refresh();
        return true;
      } catch {
        if (!disposed) setError(true);
        return true;
      } finally {
        inFlight.current = false;
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void runCycle();
    };

    void runCycle().then((shouldPoll) => {
      if (disposed || !shouldPoll) return;
      interval = window.setInterval(() => void runCycle(), POLL_INTERVAL_MS);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      visibilityListenerAttached = true;
    });

    return () => {
      disposed = true;
      stopPolling();
    };
  }, [refresh, sessionId]);

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