-- CreateTable
CREATE TABLE "PatientQuestionnaireSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "owner_account_id" TEXT,
    "patient_reference" TEXT,
    "inquiry_session_id" TEXT,
    "selected_block_ids" JSONB NOT NULL,
    "deduplicated_questions" JSONB NOT NULL,
    "answers" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMP(3),
    "birth_date_hash" TEXT,

    CONSTRAINT "PatientQuestionnaireSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientQuestionnaireSession_token_key" ON "PatientQuestionnaireSession"("token");

-- AddForeignKey
ALTER TABLE "PatientQuestionnaireSession" ADD CONSTRAINT "PatientQuestionnaireSession_owner_account_id_fkey" FOREIGN KEY ("owner_account_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
