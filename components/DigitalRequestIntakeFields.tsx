"use client";

import { useState } from "react";
import { DIGITAL_REQUEST_TOPICS } from "@/lib/digitalRequests/topics";

export function DigitalRequestIntakeFields() {
  const [patientRelationship, setPatientRelationship] = useState("");
  const [requestIntent, setRequestIntent] = useState("");

  return (
    <>
      <div
        style={{ marginBottom: "1.75rem" }}
        role="group"
        aria-labelledby="patient-relationship-label"
      >
        <p id="patient-relationship-label" style={{ marginBottom: "0.75rem", fontWeight: 500 }}>
          Sind Sie bereits Patient/in unserer Praxis? <span aria-hidden="true">*</span>
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer", fontWeight: 400 }}>
            <input
              type="radio"
              name="patient_relationship"
              value="existing_patient"
              required
              checked={patientRelationship === "existing_patient"}
              onChange={(event) => setPatientRelationship(event.target.value)}
              style={{ marginTop: "0.2rem", flexShrink: 0, width: "1rem", height: "1rem" }}
            />
            <span>Ja, ich bin bereits Patient/in.</span>
          </label>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer", fontWeight: 400 }}>
            <input
              type="radio"
              name="patient_relationship"
              value="new_patient"
              checked={patientRelationship === "new_patient"}
              onChange={(event) => setPatientRelationship(event.target.value)}
              style={{ marginTop: "0.2rem", flexShrink: 0, width: "1rem", height: "1rem" }}
            />
            <span>Nein, ich bin neu in der Praxis.</span>
          </label>
        </div>
      </div>

      {patientRelationship && (
        <div
          style={{ marginBottom: "1.75rem" }}
          role="group"
          aria-labelledby="request-intent-label"
          data-testid="request-intent"
        >
          <p id="request-intent-label" style={{ marginBottom: "0.75rem", fontWeight: 500 }}>
            Was möchten Sie tun? <span aria-hidden="true">*</span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer", fontWeight: 400 }}>
              <input
                type="radio"
                name="request_intent"
                value="existing_appointment"
                required
                checked={requestIntent === "existing_appointment"}
                onChange={(event) => setRequestIntent(event.target.value)}
                style={{ marginTop: "0.2rem", flexShrink: 0, width: "1rem", height: "1rem" }}
              />
              <span>Einen Termin vereinbaren.</span>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer", fontWeight: 400 }}>
              <input
                type="radio"
                name="request_intent"
                value="digital_request"
                checked={requestIntent === "digital_request"}
                onChange={(event) => setRequestIntent(event.target.value)}
                style={{ marginTop: "0.2rem", flexShrink: 0, width: "1rem", height: "1rem" }}
              />
              <span>Eine digitale Anfrage senden.</span>
            </label>
          </div>
        </div>
      )}

      {requestIntent === "existing_appointment" && (
        <div style={{ marginBottom: "2rem" }} data-testid="appointment-fields">
          <label htmlFor="concern_text" style={{ display: "block", marginBottom: "0.25rem" }}>
            Worum geht es bei Ihrem Termin? <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="concern_text"
            name="concern_text"
            required
            maxLength={500}
            rows={5}
            style={{ display: "block", width: "100%", fontFamily: "inherit", fontSize: "1rem", lineHeight: "1.5", padding: "0.5rem 0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--input-background)", resize: "vertical" }}
          />
        </div>
      )}

      {requestIntent === "digital_request" && (
        <div style={{ marginBottom: "2rem" }} role="group" aria-labelledby="topics-label" data-testid="topic-checkboxes">
          <p id="topics-label" style={{ marginBottom: "0.75rem", fontWeight: 500 }}>
            Anliegen <span aria-hidden="true">*</span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {(Object.entries(DIGITAL_REQUEST_TOPICS) as [string, string][]).map(([value, label], index) => (
              <label key={value} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer", fontWeight: 400 }}>
                <input
                  type="checkbox"
                  name="requested_topic"
                  value={value}
                  required={index === 0}
                  style={{ marginTop: "0.2rem", flexShrink: 0, width: "1rem", height: "1rem" }}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
