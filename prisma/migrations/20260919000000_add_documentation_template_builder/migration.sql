CREATE TABLE "PracticeDocumentationTemplate" (
	"id" TEXT NOT NULL,
	"practice_id" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"is_active" BOOLEAN NOT NULL DEFAULT true,
	"block_layout" JSONB NOT NULL,
	"output_format" TEXT,
	"document_title_option" TEXT,
	"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "PracticeDocumentationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PracticeDocumentationTemplate_practice_id_is_active_created_at_idx"
ON "PracticeDocumentationTemplate"("practice_id", "is_active", "created_at");

ALTER TABLE "PracticeDocumentationTemplate"
ADD CONSTRAINT "PracticeDocumentationTemplate_practice_id_fkey"
FOREIGN KEY ("practice_id") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;