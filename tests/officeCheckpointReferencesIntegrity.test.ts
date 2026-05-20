import {
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_KV_BILLING,
  OFFICE_TOPIC_PLAUSIBILITY_BILLING,
  OFFICE_TOPIC_HONORAR_NOTICE_REVIEW,
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_SEAT_APPROVAL,
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  OFFICE_TOPIC_CME_GENERAL_MEDICINE,
  OFFICE_TOPIC_MFA_HIRING,
  OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
  OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE,
  OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
  OFFICE_TOPIC_EXTENDED_OPENING_HOURS,
  OFFICE_TOPIC_REPORTING_DUTIES,
  OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
  OFFICE_TOPIC_WORKTIME_CHANGE,
  OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE,
  OFFICE_TOPIC_VACATION_TEAM_COORDINATION,
  OFFICE_TOPIC_RESPONSIBILITY_COORDINATION,
  buildInitialSnapshotForTopic,
  getOfficeCheckpointCatalog,
  listOfficeTopics,
} from "@/lib/office/checkpointCatalog";
import { isLegalSourceId } from "@/lib/office/legalSources";
import { isAuthorityId } from "@/lib/office/authorities";
import { isEvidenceId } from "@/lib/office/evidenceCatalog";

const EXPECTED_TOPIC_IDS = [
  OFFICE_TOPIC_HIRING_REPLACEMENT,
  OFFICE_TOPIC_KV_BILLING,
  OFFICE_TOPIC_PLAUSIBILITY_BILLING,
  OFFICE_TOPIC_HONORAR_NOTICE_REVIEW,
  OFFICE_TOPIC_REGRESS,
  OFFICE_TOPIC_CLOSURE_COVERAGE,
  OFFICE_TOPIC_SEAT_APPROVAL,
  OFFICE_TOPIC_APPLICATION_MANAGEMENT,
  OFFICE_TOPIC_CONTINUING_EDUCATION,
  OFFICE_TOPIC_CME_GENERAL_MEDICINE,
  OFFICE_TOPIC_MFA_HIRING,
  OFFICE_TOPIC_MINOR_MFA_APPRENTICE_HIRING,
  OFFICE_TOPIC_MEDICAL_DEVICE_PURCHASE,
  OFFICE_TOPIC_DATA_PROTECTION_INCIDENT,
  OFFICE_TOPIC_EXTENDED_OPENING_HOURS,
  OFFICE_TOPIC_REPORTING_DUTIES,
  OFFICE_TOPIC_PHYSICIAN_EXIT_ORGANIZATION,
  OFFICE_TOPIC_WORKTIME_CHANGE,
  OFFICE_TOPIC_DIGITAL_SYSTEM_CHANGE,
  OFFICE_TOPIC_VACATION_TEAM_COORDINATION,
  OFFICE_TOPIC_RESPONSIBILITY_COORDINATION,
] as const;

describe("Office-Checkpoint Referenz-Integritaet gegen Registries", () => {
  it("alle 21 Topic-IDs sind unveraendert vorhanden", () => {
    const actualIds = listOfficeTopics().map((topic) => topic.id);
    expect(actualIds).toEqual([...EXPECTED_TOPIC_IDS]);
  });

  it("alle legalRefs verweisen auf bekannte LegalSourceIds", () => {
    for (const topic of listOfficeTopics()) {
      for (const cp of getOfficeCheckpointCatalog(topic.id)) {
        for (const ref of cp.legalRefs ?? []) {
          if (!isLegalSourceId(ref)) {
            throw new Error(
              `Topic ${topic.id} / Checkpoint ${cp.id}: unbekannte LegalSourceId ${ref}`,
            );
          }
        }
      }
    }
  });

  it("alle authorityKeys verweisen auf bekannte AuthorityIds", () => {
    for (const topic of listOfficeTopics()) {
      for (const cp of getOfficeCheckpointCatalog(topic.id)) {
        for (const ref of cp.authorityKeys ?? []) {
          if (!isAuthorityId(ref)) {
            throw new Error(
              `Topic ${topic.id} / Checkpoint ${cp.id}: unbekannte AuthorityId ${ref}`,
            );
          }
        }
      }
    }
  });

  it("alle requiredEvidenceKeys/optionalEvidenceKeys verweisen auf bekannte EvidenceIds", () => {
    for (const topic of listOfficeTopics()) {
      for (const cp of getOfficeCheckpointCatalog(topic.id)) {
        for (const ref of cp.requiredEvidenceKeys ?? []) {
          if (!isEvidenceId(ref)) {
            throw new Error(
              `Topic ${topic.id} / Checkpoint ${cp.id}: unbekannte (required) EvidenceId ${ref}`,
            );
          }
        }
        for (const ref of cp.optionalEvidenceKeys ?? []) {
          if (!isEvidenceId(ref)) {
            throw new Error(
              `Topic ${topic.id} / Checkpoint ${cp.id}: unbekannte (optional) EvidenceId ${ref}`,
            );
          }
        }
      }
    }
  });

  it("buildInitialSnapshotForTopic bleibt fuer alle Topics aufrufbar", () => {
    for (const topic of listOfficeTopics()) {
      const snapshot = buildInitialSnapshotForTopic(topic.id);
      expect(snapshot).toBeDefined();
    }
  });
});
