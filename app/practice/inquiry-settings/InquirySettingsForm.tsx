"use client";

import { useEffect, useState } from "react";
import { PILOT_PRACTICE_INQUIRY_CONFIG as PILOT } from "@/lib/inquiries/practiceConfig";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export interface InquirySettingsInitial {
  inqBookingCalendarName: string;
  inqFindingsReviewCode: string;
  inqChronicControlCode: string;
  inqCheckupSecondCode: string;
  inqDoctorOrderCode: string;
  inqDigitalReqTimeMin: string;
  inqDigitalReqTimeMax: string;
  inqDigitalReqTimeUnit: string;
  inqUploadPlatformName: string;
  inqUploadPlatformAccountLabel: string;
  inqOpenConsultationDays: string;
  inqOpenConsultationHours: string;
  inqOpenConsultationCapLimited: boolean;
  inqVideoSupportContact: string;
  inqInfoText1: string;
  inqInfoText2: string;
  inqInfoText3: string;
}

type FormState = InquirySettingsInitial;

// ---------------------------------------------------------------------------
// Konstanten
// ---------------------------------------------------------------------------

const STRING_MAX = 200;
const INFO_MAX = 300;

// ---------------------------------------------------------------------------
// Hilfkomponenten
// ---------------------------------------------------------------------------

function FieldGroup({
  children,
  legend,
}: {
  children: React.ReactNode;
  legend: string;
}) {
  return (
    <fieldset
      style={{
        border: "1px solid var(--border, #ddd)",
        borderRadius: "6px",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
      }}
    >
      <legend
        style={{
          fontWeight: 700,
          fontSize: "0.95rem",
          padding: "0 0.4rem",
        }}
      >
        {legend}
      </legend>
      <div style={{ display: "grid", gap: "0.9rem", marginTop: "0.5rem" }}>
        {children}
      </div>
    </fieldset>
  );
}

function TextField({
  id,
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "0.3rem" }}>
      <label htmlFor={id} style={{ fontWeight: 600, fontSize: "0.88rem" }}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength ?? STRING_MAX}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", maxWidth: "32rem" }}
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "0.3rem" }}>
      <label htmlFor={id} style={{ fontWeight: 600, fontSize: "0.88rem" }}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={1}
        max={999}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "8rem" }}
      />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (v: string) => void;
}) {
  const max = maxLength ?? INFO_MAX;
  const remaining = max - value.length;
  return (
    <div style={{ display: "grid", gap: "0.3rem" }}>
      <label htmlFor={id} style={{ fontWeight: 600, fontSize: "0.88rem" }}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        maxLength={max}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          maxWidth: "42rem",
          resize: "vertical",
          fontFamily: "inherit",
          fontSize: "0.9rem",
          lineHeight: 1.5,
        }}
      />
      <p
        className="text-muted"
        style={{ fontSize: "0.78rem", margin: 0, textAlign: "right", maxWidth: "42rem" }}
      >
        {remaining} / {max} Zeichen verbleibend
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hauptformular
// ---------------------------------------------------------------------------

export default function InquirySettingsForm({
  initial,
}: {
  initial: InquirySettingsInitial;
}) {
  const [values, setValues] = useState<FormState>(initial);
  const [saved, setSaved] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setValues(initial);
    setSaved(initial);
  }, [initial]);

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    setIsError(false);

    try {
      const body: Record<string, unknown> = {
        inqBookingCalendarName: values.inqBookingCalendarName,
        inqFindingsReviewCode: values.inqFindingsReviewCode,
        inqChronicControlCode: values.inqChronicControlCode,
        inqCheckupSecondCode: values.inqCheckupSecondCode,
        inqDoctorOrderCode: values.inqDoctorOrderCode,
        inqDigitalReqTimeUnit: values.inqDigitalReqTimeUnit,
        inqUploadPlatformName: values.inqUploadPlatformName,
        inqUploadPlatformAccountLabel: values.inqUploadPlatformAccountLabel,
        inqOpenConsultationDays: values.inqOpenConsultationDays,
        inqOpenConsultationHours: values.inqOpenConsultationHours,
        inqOpenConsultationCapLimited: values.inqOpenConsultationCapLimited,
        inqVideoSupportContact: values.inqVideoSupportContact,
        inqInfoText1: values.inqInfoText1,
        inqInfoText2: values.inqInfoText2,
        inqInfoText3: values.inqInfoText3,
      };

      // Ganzzahlfelder: nur senden wenn nicht leer
      if (values.inqDigitalReqTimeMin.trim() !== "") {
        body.inqDigitalReqTimeMin = values.inqDigitalReqTimeMin;
      } else {
        body.inqDigitalReqTimeMin = "";
      }
      if (values.inqDigitalReqTimeMax.trim() !== "") {
        body.inqDigitalReqTimeMax = values.inqDigitalReqTimeMax;
      } else {
        body.inqDigitalReqTimeMax = "";
      }

      const res = await fetch("/api/practice/inquiry-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.ok) {
        const trimmed: FormState = {
          inqBookingCalendarName: values.inqBookingCalendarName.trim(),
          inqFindingsReviewCode: values.inqFindingsReviewCode.trim(),
          inqChronicControlCode: values.inqChronicControlCode.trim(),
          inqCheckupSecondCode: values.inqCheckupSecondCode.trim(),
          inqDoctorOrderCode: values.inqDoctorOrderCode.trim(),
          inqDigitalReqTimeMin: values.inqDigitalReqTimeMin.trim(),
          inqDigitalReqTimeMax: values.inqDigitalReqTimeMax.trim(),
          inqDigitalReqTimeUnit: values.inqDigitalReqTimeUnit.trim(),
          inqUploadPlatformName: values.inqUploadPlatformName.trim(),
          inqUploadPlatformAccountLabel:
            values.inqUploadPlatformAccountLabel.trim(),
          inqOpenConsultationDays: values.inqOpenConsultationDays.trim(),
          inqOpenConsultationHours: values.inqOpenConsultationHours.trim(),
          inqOpenConsultationCapLimited: values.inqOpenConsultationCapLimited,
          inqVideoSupportContact: values.inqVideoSupportContact.trim(),
          inqInfoText1: values.inqInfoText1.trim(),
          inqInfoText2: values.inqInfoText2.trim(),
          inqInfoText3: values.inqInfoText3.trim(),
        };
        setSaved(trimmed);
        setValues(trimmed);
        setFeedback("Gespeichert");
        setTimeout(() => setFeedback(null), 2500);
      } else {
        setIsError(true);
        setFeedback(
          typeof data.error === "string"
            ? data.error
            : "Fehler beim Speichern.",
        );
      }
    } catch {
      setIsError(true);
      setFeedback("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: "56rem" }}>
      {/* ---- 1. Buchungskalender ----------------------------------------- */}
      <FieldGroup legend="Buchungskalender">
        <TextField
          id="inqBookingCalendarName"
          label="Kalender-Name"
          value={values.inqBookingCalendarName}
          placeholder={PILOT.bookingCalendarName}
          onChange={(v) => set("inqBookingCalendarName", v)}
        />
        <TextField
          id="inqFindingsReviewCode"
          label="Buchungscode Befundbesprechung"
          value={values.inqFindingsReviewCode}
          placeholder={PILOT.findingsReviewBookingCode}
          onChange={(v) => set("inqFindingsReviewCode", v)}
        />
        <TextField
          id="inqChronicControlCode"
          label="Buchungscode Chroniker-Kontrolle"
          value={values.inqChronicControlCode}
          placeholder={PILOT.chronicControlBookingCode}
          onChange={(v) => set("inqChronicControlCode", v)}
        />
        <TextField
          id="inqCheckupSecondCode"
          label="Buchungscode Check-Up (2. Termin)"
          value={values.inqCheckupSecondCode}
          placeholder={PILOT.checkupSecondBookingCode}
          onChange={(v) => set("inqCheckupSecondCode", v)}
        />
        <TextField
          id="inqDoctorOrderCode"
          label="Buchungscode Ärztliche Anordnung"
          value={values.inqDoctorOrderCode}
          placeholder={PILOT.doctorOrderBookingCode}
          onChange={(v) => set("inqDoctorOrderCode", v)}
        />
      </FieldGroup>

      {/* ---- 2. Digitale Anfrage / Bearbeitungszeit ---------------------- */}
      <FieldGroup legend="Digitale Anfrage – Bearbeitungszeit">
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <NumberField
            id="inqDigitalReqTimeMin"
            label="Minimum"
            value={values.inqDigitalReqTimeMin}
            placeholder={String(PILOT.digitalRequestProcessingTimeMin)}
            onChange={(v) => set("inqDigitalReqTimeMin", v)}
          />
          <NumberField
            id="inqDigitalReqTimeMax"
            label="Maximum"
            value={values.inqDigitalReqTimeMax}
            placeholder={String(PILOT.digitalRequestProcessingTimeMax)}
            onChange={(v) => set("inqDigitalReqTimeMax", v)}
          />
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <label
              htmlFor="inqDigitalReqTimeUnit"
              style={{ fontWeight: 600, fontSize: "0.88rem" }}
            >
              Einheit
            </label>
            <select
              id="inqDigitalReqTimeUnit"
              value={values.inqDigitalReqTimeUnit}
              onChange={(e) => set("inqDigitalReqTimeUnit", e.target.value)}
            >
              <option value="">
                — Standard ({PILOT.digitalRequestProcessingTimeUnit}) —
              </option>
              <option value="Stunden">Stunden</option>
              <option value="Werktage">Werktage</option>
            </select>
          </div>
        </div>
      </FieldGroup>

      {/* ---- 3. Upload-Plattform ----------------------------------------- */}
      <FieldGroup legend="Upload-Plattform">
        <TextField
          id="inqUploadPlatformName"
          label="Plattform-Name"
          value={values.inqUploadPlatformName}
          placeholder={PILOT.uploadPlatformName}
          onChange={(v) => set("inqUploadPlatformName", v)}
        />
        <TextField
          id="inqUploadPlatformAccountLabel"
          label="Account-Bezeichnung"
          value={values.inqUploadPlatformAccountLabel}
          placeholder={PILOT.uploadPlatformAccountLabel}
          onChange={(v) => set("inqUploadPlatformAccountLabel", v)}
        />
      </FieldGroup>

      {/* ---- 4. Offene Sprechstunde -------------------------------------- */}
      <FieldGroup legend="Offene Sprechstunde">
        <TextField
          id="inqOpenConsultationDays"
          label="Tage"
          value={values.inqOpenConsultationDays}
          placeholder={PILOT.openConsultationDays}
          onChange={(v) => set("inqOpenConsultationDays", v)}
        />
        <TextField
          id="inqOpenConsultationHours"
          label="Uhrzeiten"
          value={values.inqOpenConsultationHours}
          placeholder={PILOT.openConsultationHours}
          onChange={(v) => set("inqOpenConsultationHours", v)}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <input
            id="inqOpenConsultationCapLimited"
            type="checkbox"
            checked={values.inqOpenConsultationCapLimited}
            onChange={(e) =>
              set("inqOpenConsultationCapLimited", e.target.checked)
            }
          />
          <label
            htmlFor="inqOpenConsultationCapLimited"
            style={{ fontSize: "0.88rem" }}
          >
            Kapazitätshinweis anzeigen (begrenzte Aufnahme)
          </label>
        </div>
      </FieldGroup>

      {/* ---- 5. Video-Support -------------------------------------------- */}
      <FieldGroup legend="Video-Support / Technik">
        <TextField
          id="inqVideoSupportContact"
          label="Video-Support-Kontakt"
          value={values.inqVideoSupportContact}
          placeholder={PILOT.videoSupportContact}
          onChange={(v) => set("inqVideoSupportContact", v)}
        />
      </FieldGroup>

      {/* ---- 6. Praxis-Info-Texte (M3) ---------------------------------- */}
      <FieldGroup legend="Zusätzliche Praxisinformationen (M3)">
        <p style={{ fontSize: "0.83rem", color: "var(--muted, #666)", margin: 0 }}>
          Optionale Freitext-Bausteine, die in M3 als zuschaltbare Abschnitte
          erscheinen. Zeilenumbrüche und einfache Listen mit „-" sind erlaubt.
          Leer = deaktiviert.
        </p>
        <TextAreaField
          id="inqInfoText1"
          label="Info 1"
          value={values.inqInfoText1}
          onChange={(v) => set("inqInfoText1", v)}
        />
        <TextAreaField
          id="inqInfoText2"
          label="Info 2"
          value={values.inqInfoText2}
          onChange={(v) => set("inqInfoText2", v)}
        />
        <TextAreaField
          id="inqInfoText3"
          label="Info 3"
          value={values.inqInfoText3}
          onChange={(v) => set("inqInfoText3", v)}
        />
      </FieldGroup>

      {/* ---- Speicher-Zeile --------------------------------------------- */}
      <div
        style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}
      >
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
          className="btn-primary"
        >
          {saving ? "Speichern …" : "Speichern"}
        </button>
        {feedback && (
          <p
            role={isError ? "alert" : "status"}
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: isError ? "var(--error, #a00)" : "var(--success, #0a6)",
            }}
          >
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
