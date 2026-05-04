-- AlterTable: Vorlagen-Felder additiv ergänzen.
-- Bestandsdaten bleiben unverändert (is_template = false, template_name = NULL).
ALTER TABLE "InquirySession"
  ADD COLUMN "is_template" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "template_name" TEXT;

-- Index zur effizienten Filterung der Vorlagenliste je Account.
CREATE INDEX "InquirySession_owner_account_id_is_template_idx"
  ON "InquirySession"("owner_account_id", "is_template");
