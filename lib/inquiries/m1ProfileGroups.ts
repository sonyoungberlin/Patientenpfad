/**
 * UI-Gruppierung der Anliegen-Profile für die M1-Auswahlliste.
 *
 * Diese Konstante dient ausschließlich der visuellen Darstellung (Accordion-Blöcke).
 * Sie hat keinen Einfluss auf Profil-IDs, Session-Logik, M2 oder M3.
 */
export interface M1ProfileGroup {
  /** Anzeigetitel der Gruppe */
  label: string;
  /** Geordnete Liste der Profil-IDs in dieser Gruppe */
  profileIds: readonly string[];
}

export const M1_PROFILE_GROUPS: readonly M1ProfileGroup[] = [
  {
    label: "Dokumente & Ergebnisse",
    profileIds: ["AU", "PRESCRIPTION", "HEILMITTELVERORDNUNG", "REFERRAL", "HOSPITAL_ADMISSION", "MEDICAL_DOCUMENTS"],
  },
  {
    label: "Termine & persönliche Vorstellung",
    profileIds: [
      "APPOINTMENT",
      "ACUTE_CARE",
      "LAB",
      "SAMPLE_COLLECTION",
      "IMMUNIZATION",
    ],
  },
  {
    label: "Organisation, Technik & Sonstiges",
    profileIds: ["BILLING", "TECH_SUPPORT", "ONBOARDING"],
  },
] as const;
