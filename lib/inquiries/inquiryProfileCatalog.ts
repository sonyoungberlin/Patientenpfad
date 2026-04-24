import { InquiryType, type InquiryProfile } from "@/lib/inquiries/types";

/**
 * Statischer Profil-Katalog für den Anfrage-Assistenten.
 *
 * Jeder Eintrag definiert die Kernantwort und die geordnete Checkpoint-Liste
 * für einen Anfragetyp. Profile sind unveränderlich – bestehende Sessions
 * verwenden immer einen eingefrorenen Snapshot des Profils.
 */
export const INQUIRY_PROFILE_CATALOGUE: Record<InquiryType, InquiryProfile> = {
  [InquiryType.FSME_IMPFUNG]: {
    type: InquiryType.FSME_IMPFUNG,
    label: "FSME-Impfung",
    coreAnswer:
      "Vielen Dank für Ihre Anfrage. Ein Termin zur FSME-Impfung kann bei uns gebucht werden.",
    checkpointIds: ["IC01", "IC02", "IC03", "IC04", "IC05"],
  },
};
