"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildSelfCheckInQrPayload } from "@/lib/selfCheckInQr";

export function SelfCheckInQrCode({ reference }: { reference: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const payload = buildSelfCheckInQrPayload(reference);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(payload, { errorCorrectionLevel: "M", margin: 2, width: 280 })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [payload]);

  if (!dataUrl) return null;

  return (
    <section
      data-self-check-in-qr
      aria-label="Self-Check-in"
      style={{
        margin: "1.5rem 0",
        padding: "1rem",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        textAlign: "center",
      }}
    >
      <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>Self-Check-in</h2>
      <img src={dataUrl} alt="QR-Code für Self-Check-in" width={280} height={280} />
      <p data-self-check-in-reference style={{ margin: "0.5rem 0 0" }}>
        {payload}
      </p>
      <a
        href={dataUrl}
        download="self-check-in-qr.png"
        style={{ display: "inline-block", marginTop: "0.75rem" }}
        data-self-check-in-qr-download
      >
        QR-Code speichern
      </a>
    </section>
  );
}