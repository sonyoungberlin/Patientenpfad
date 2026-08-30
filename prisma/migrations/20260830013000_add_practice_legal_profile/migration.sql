CREATE TABLE "PracticeLegalProfile" (
  "id" TEXT NOT NULL,
  "practice_id" TEXT NOT NULL,
  "official_practice_name" TEXT NOT NULL,
  "contract_party_name" TEXT,
  "representative_name" TEXT,
  "legal_form" TEXT,
  "street" TEXT NOT NULL,
  "house_number" TEXT NOT NULL,
  "postal_code" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'Deutschland',
  "official_email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "medical_chamber" TEXT,
  "professional_title" TEXT,
  "professional_title_country" TEXT,
  "supervisory_authority" TEXT,
  "statutory_health_association" TEXT,
  "professional_rules_label" TEXT,
  "professional_rules_url" TEXT,
  "register_type" TEXT,
  "register_court" TEXT,
  "register_number" TEXT,
  "vat_id" TEXT,
  "additional_legal_information" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PracticeLegalProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeLegalProfileAudit" (
  "id" TEXT NOT NULL,
  "practice_id" TEXT NOT NULL,
  "changed_by_admin_account_id" TEXT NOT NULL,
  "changed_fields" JSONB NOT NULL,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PracticeLegalProfileAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeLegalProfile_practice_id_key"
  ON "PracticeLegalProfile"("practice_id");
CREATE INDEX "PracticeLegalProfileAudit_practice_id_changed_at_idx"
  ON "PracticeLegalProfileAudit"("practice_id", "changed_at");
CREATE INDEX "PracticeLegalProfileAudit_changed_by_admin_account_id_idx"
  ON "PracticeLegalProfileAudit"("changed_by_admin_account_id");

ALTER TABLE "PracticeLegalProfile"
  ADD CONSTRAINT "PracticeLegalProfile_practice_id_fkey"
  FOREIGN KEY ("practice_id") REFERENCES "Practice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeLegalProfileAudit"
  ADD CONSTRAINT "PracticeLegalProfileAudit_practice_id_fkey"
  FOREIGN KEY ("practice_id") REFERENCES "Practice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
