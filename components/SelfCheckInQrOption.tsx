"use client";

import { useId } from "react";

type Props = {
  reference: string | null | undefined;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function SelfCheckInQrOption({
  reference,
  checked,
  onChange,
  disabled = false,
}: Props) {
  const inputId = useId();
  const referenceMissing = !reference?.trim();
  const isDisabled = disabled || referenceMissing;

  return (
    <div data-self-check-in-qr-option>
      <label
        htmlFor={inputId}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.65 : 1,
        }}
      >
        <input
          id={inputId}
          type="checkbox"
          checked={checked && !referenceMissing}
          disabled={isDisabled}
          onChange={(event) => onChange(event.target.checked)}
          data-self-check-in-qr
        />
        <span>QR-Code für Self-Check-in mitsenden</span>
      </label>
      {referenceMissing ? (
        <p className="text-muted text-small" style={{ margin: "0.35rem 0 0 1.5rem" }}>
          Patientennummer / Referenz erforderlich
        </p>
      ) : null}
    </div>
  );
}