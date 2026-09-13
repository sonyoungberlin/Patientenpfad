import { createHash } from "crypto";
import { QuestionnaireArtifactType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createAutoDownloadDeviceSecret,
  hashAutoDownloadDeviceSecret,
  matchesAutoDownloadDeviceSecret,
} from "./credentials";
import type { AutoDownloadDeviceIdentity } from "./auth";
import type {
  AutoDownloadArtifactType,
  BuiltAutoDownloadArtifact,
} from "@/lib/questionnaire/autoDownloadArtifactSelector";

export const AUTO_DOWNLOAD_LEASE_DURATION_MS = 5 * 60 * 1000;
export const AUTO_DOWNLOAD_DELIVERY_ID_HEADER = "X-Auto-Download-Delivery-Id";
export const AUTO_DOWNLOAD_LEASE_TOKEN_HEADER = "X-Auto-Download-Lease-Token";
export const AUTO_DOWNLOAD_CONTENT_SHA256_HEADER = "X-Content-SHA256";
export const AUTO_DOWNLOAD_ARTIFACT_TYPE_HEADER = "X-Auto-Download-Artifact-Type";

export type LeasedAutoDownloadArtifact = BuiltAutoDownloadArtifact & {
  deliveryId: string;
  leaseToken: string;
  contentSha256: string;
  leaseExpiresAt: Date;
};

function sessionClaimIsOpen(artifactType: AutoDownloadArtifactType) {
  if (artifactType === "PDF") return { auto_pdf_download_claimed_at: null };
  if (artifactType === "XML") return { auto_xml_download_claimed_at: null };
  return { gdt_download_claimed_at: null };
}

function sessionClaimIsSet(artifactType: AutoDownloadArtifactType) {
  if (artifactType === "PDF") {
    return { auto_pdf_download_claimed_at: { not: null } };
  }
  if (artifactType === "XML") {
    return { auto_xml_download_claimed_at: { not: null } };
  }
  return { gdt_download_claimed_at: { not: null } };
}

function sessionClaimData(artifactType: QuestionnaireArtifactType, acknowledgedAt: Date) {
  if (artifactType === QuestionnaireArtifactType.PDF) {
    return { auto_pdf_download_claimed_at: acknowledgedAt };
  }
  if (artifactType === QuestionnaireArtifactType.XML) {
    return { auto_xml_download_claimed_at: acknowledgedAt };
  }
  return { gdt_download_claimed_at: acknowledgedAt };
}

export async function acquireAutoDownloadArtifactLease(
  candidate: BuiltAutoDownloadArtifact,
  device: AutoDownloadDeviceIdentity,
  now = new Date(),
): Promise<LeasedAutoDownloadArtifact | null> {
  const contentSha256 = createHash("sha256")
    .update(candidate.artifact.bytes)
    .digest("hex");
  const leaseToken = createAutoDownloadDeviceSecret();
  const leaseTokenHash = hashAutoDownloadDeviceSecret(leaseToken);
  const leaseExpiresAt = new Date(now.getTime() + AUTO_DOWNLOAD_LEASE_DURATION_MS);

  const delivery = await prisma.questionnaireArtifactDelivery.upsert({
    where: {
      session_id_artifact_type: {
        session_id: candidate.sessionId,
        artifact_type: candidate.artifactType,
      },
    },
    create: {
      session_id: candidate.sessionId,
      artifact_type: candidate.artifactType,
    },
    update: {},
    select: { id: true },
  });

  const leased = await prisma.questionnaireArtifactDelivery.updateMany({
    where: {
      id: delivery.id,
      acknowledged_at: null,
      OR: [
        { lease_expires_at: null },
        { lease_expires_at: { lte: now } },
      ],
      session: {
        is: {
          owner_practice_id: device.practiceId,
          deleted_at: null,
          status: "completed",
          ...sessionClaimIsOpen(candidate.artifactType),
        },
      },
    },
    data: {
      device_id: device.deviceId,
      lease_token_hash: leaseTokenHash,
      lease_expires_at: leaseExpiresAt,
      attempt_count: { increment: 1 },
      content_sha256: contentSha256,
    },
  });
  if (leased.count !== 1) return null;

  return {
    ...candidate,
    deliveryId: delivery.id,
    leaseToken,
    contentSha256,
    leaseExpiresAt,
  };
}

export type AcknowledgeAutoDownloadDeliveryResult =
  | { ok: true; alreadyAcknowledged: boolean }
  | { ok: false; reason: "not_found" | "invalid_lease" | "expired_lease" };

export async function acknowledgeAutoDownloadDelivery(
  deliveryId: string,
  leaseToken: string,
  device: AutoDownloadDeviceIdentity,
  now = new Date(),
): Promise<AcknowledgeAutoDownloadDeliveryResult> {
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.questionnaireArtifactDelivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        session_id: true,
        artifact_type: true,
        device_id: true,
        lease_token_hash: true,
        lease_expires_at: true,
        acknowledged_at: true,
        session: { select: { owner_practice_id: true } },
      },
    });
    if (
      !delivery ||
      delivery.device_id !== device.deviceId ||
      delivery.session.owner_practice_id !== device.practiceId
    ) {
      return { ok: false, reason: "not_found" };
    }
    if (
      !delivery.lease_token_hash ||
      !matchesAutoDownloadDeviceSecret(leaseToken, delivery.lease_token_hash)
    ) {
      return { ok: false, reason: "invalid_lease" };
    }
    if (delivery.acknowledged_at) {
      return { ok: true, alreadyAcknowledged: true };
    }
    if (!delivery.lease_expires_at || delivery.lease_expires_at <= now) {
      return { ok: false, reason: "expired_lease" };
    }

    const acknowledged = await tx.questionnaireArtifactDelivery.updateMany({
      where: {
        id: delivery.id,
        device_id: device.deviceId,
        lease_token_hash: delivery.lease_token_hash,
        acknowledged_at: null,
        lease_expires_at: { gt: now },
      },
      data: { acknowledged_at: now },
    });
    if (acknowledged.count !== 1) {
      const current = await tx.questionnaireArtifactDelivery.findUnique({
        where: { id: delivery.id },
        select: { acknowledged_at: true },
      });
      if (current?.acknowledged_at) {
        return { ok: true, alreadyAcknowledged: true };
      }
      return { ok: false, reason: "invalid_lease" };
    }

    const claimed = await tx.patientQuestionnaireSession.updateMany({
      where: {
        id: delivery.session_id,
        owner_practice_id: device.practiceId,
        ...sessionClaimIsOpen(delivery.artifact_type),
      },
      data: sessionClaimData(delivery.artifact_type, now),
    });
    if (claimed.count !== 1) {
      const alreadyClaimed = await tx.patientQuestionnaireSession.findFirst({
        where: {
          id: delivery.session_id,
          owner_practice_id: device.practiceId,
          ...sessionClaimIsSet(delivery.artifact_type),
        },
        select: { id: true },
      });
      if (!alreadyClaimed) {
        throw new Error("auto_download_delivery_session_claim_failed");
      }
    }

    return { ok: true, alreadyAcknowledged: false };
  });
}
