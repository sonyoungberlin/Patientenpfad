"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import CopyPublicLinkButton from "@/components/websiteForms/CopyPublicLinkButton";

export default function PublicPatientCheckInLink({ link }: { link: string }) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(link, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
    }).then((url) => {
      if (active) setQrCodeUrl(url);
    }).catch(() => {
      if (active) setQrCodeUrl(null);
    });
    return () => {
      active = false;
    };
  }, [link]);

  return (
    <section style={{ marginTop: "2.5rem" }} data-testid="patient-check-in-link-section">
      <h2>Patienten-Check-in — Öffentlicher Link &amp; QR-Code</h2>
      <p style={{ marginBottom: "0.75rem" }}>
        Öffentlicher Check-in für Patient:innen ohne Termin. Patient:innen können
        den QR-Code mit dem eigenen Smartphone scannen und den Check-in dort
        ausfüllen.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          readOnly
          value={link}
          style={{ flexGrow: 1, minWidth: "16rem", fontFamily: "monospace" }}
          aria-label="Öffentlicher Patienten-Check-in-Link"
          data-testid="patient-check-in-link-input"
        />
        <CopyPublicLinkButton link={link} />
        <a href={link} target="_blank" rel="noopener noreferrer">
          Check-in öffnen
        </a>
      </div>
      {qrCodeUrl ? (
        <div style={{ marginTop: "1rem" }} data-testid="patient-check-in-qr">
          <img
            src={qrCodeUrl}
            alt="QR-Code für den öffentlichen Patienten-Check-in"
            width={280}
            height={280}
          />
          <div>
            <a
              href={qrCodeUrl}
              download="patienten-check-in-qr.png"
              data-testid="patient-check-in-qr-download"
            >
              QR-Code herunterladen
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
