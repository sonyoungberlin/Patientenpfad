/**
 * Compliance-View pro Office-Checkpoint.
 *
 * Aggregiert die im Checkpoint-Template referenzierten IDs (legalRefs,
 * authorityKeys, requiredEvidenceKeys, optionalEvidenceKeys) und resolved sie
 * gegen die statischen Registries (legalSources, authorities, evidenceCatalog)
 * zu serialisierbaren Display-Records.
 *
 * Grundsaetze:
 * - Reiner Server-Mapper, keine Snapshot-Persistenz, keine API.
 * - Unbekannte IDs werden defensiv uebersprungen (Backwards-Compat fuer
 *   Snapshots/Templates, deren IDs spaeter aus den Registries entfernt werden).
 * - Keine Sonderbehandlung fuer Legacy-Pauschalquellen (z. B. BMV_AE, BDSG,
 *   BERUFSO_AERZTE_BERLIN). Vorhandene `note`-Felder werden 1:1 mitgegeben;
 *   die UI darf sie klein darstellen, aber nicht hervorheben.
 */

import {
  getOfficeCheckpointCatalog,
  type OfficeTopicId,
} from "@/lib/office/checkpointCatalog";
import {
  getLegalSource,
  isLegalSourceId,
  type LegalJurisdiction,
} from "@/lib/office/legalSources";
import {
  getAuthority,
  isAuthorityId,
  type AuthorityKind,
  type AuthorityScope,
} from "@/lib/office/authorities";
import {
  getEvidence,
  isEvidenceId,
} from "@/lib/office/evidenceCatalog";

export type LegalSourceView = {
  id: string;
  title: string;
  paragraph?: string;
  shortName: string;
  jurisdiction: LegalJurisdiction;
  sourceUrl?: string;
  note?: string;
};

export type AuthorityView = {
  id: string;
  name: string;
  kind: AuthorityKind;
  scope: AuthorityScope;
  sourceUrl?: string;
  note?: string;
};

export type EvidenceView = {
  id: string;
  label: string;
  category: string;
  formatHint?: string;
  retentionHint?: string;
  note?: string;
};

export type CheckpointComplianceView = {
  legalSources: LegalSourceView[];
  authorities: AuthorityView[];
  requiredEvidences: EvidenceView[];
  optionalEvidences: EvidenceView[];
};

export function getEmptyCompliance(): CheckpointComplianceView {
  return {
    legalSources: [],
    authorities: [],
    requiredEvidences: [],
    optionalEvidences: [],
  };
}

export function isComplianceEmpty(view: CheckpointComplianceView): boolean {
  return (
    view.legalSources.length === 0 &&
    view.authorities.length === 0 &&
    view.requiredEvidences.length === 0 &&
    view.optionalEvidences.length === 0
  );
}

function toLegalSourceView(id: string): LegalSourceView | null {
  if (!isLegalSourceId(id)) return null;
  const entry = getLegalSource(id);
  return {
    id: entry.id,
    title: entry.title,
    paragraph: entry.paragraph,
    shortName: entry.shortName,
    jurisdiction: entry.jurisdiction,
    sourceUrl: entry.sourceUrl,
    note: entry.note,
  };
}

function toAuthorityView(id: string): AuthorityView | null {
  if (!isAuthorityId(id)) return null;
  const entry = getAuthority(id);
  return {
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    scope: entry.scope,
    sourceUrl: entry.sourceUrl,
    note: entry.note,
  };
}

function toEvidenceView(id: string): EvidenceView | null {
  if (!isEvidenceId(id)) return null;
  const entry = getEvidence(id);
  return {
    id: entry.id,
    label: entry.label,
    category: entry.category,
    formatHint: entry.formatHint,
    retentionHint: entry.retentionHint,
    note: entry.note,
  };
}

function mapIds<T>(
  ids: readonly string[] | undefined,
  mapper: (id: string) => T | null,
): T[] {
  if (!ids || ids.length === 0) return [];
  const out: T[] = [];
  for (const id of ids) {
    const mapped = mapper(id);
    if (mapped) out.push(mapped);
  }
  return out;
}

/**
 * Liefert eine Map von Checkpoint-ID zu Compliance-View fuer das gegebene Topic.
 * Topics ohne Catalog liefern eine leere Map.
 */
export function buildCheckpointComplianceMap(
  topicId: OfficeTopicId,
): Record<string, CheckpointComplianceView> {
  const catalog = getOfficeCheckpointCatalog(topicId);
  const result: Record<string, CheckpointComplianceView> = {};
  for (const cp of catalog) {
    result[cp.id] = {
      legalSources: mapIds(cp.legalRefs, toLegalSourceView),
      authorities: mapIds(cp.authorityKeys, toAuthorityView),
      requiredEvidences: mapIds(cp.requiredEvidenceKeys, toEvidenceView),
      optionalEvidences: mapIds(cp.optionalEvidenceKeys, toEvidenceView),
    };
  }
  return result;
}
