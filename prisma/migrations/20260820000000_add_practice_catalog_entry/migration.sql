-- CreateTable
CREATE TABLE "PracticeCatalogEntry" (
    "id" TEXT NOT NULL,
    "catalog_case_id" TEXT NOT NULL,
    "practice_id" TEXT NOT NULL,
    "source_session_id" TEXT,
    "source_case_profile_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "snapshot" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "is_current_version" BOOLEAN NOT NULL DEFAULT true,
    "is_catalog_active" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeCatalogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeCatalogEntry_source_session_id_key" ON "PracticeCatalogEntry"("source_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeCatalogEntry_catalog_case_id_version_key" ON "PracticeCatalogEntry"("catalog_case_id", "version");

-- CreateIndex
CREATE INDEX "PracticeCatalogEntry_practice_id_active_idx" ON "PracticeCatalogEntry"("practice_id", "is_catalog_active", "is_current_version");

-- CreateIndex
CREATE INDEX "PracticeCatalogEntry_source_session_id_idx" ON "PracticeCatalogEntry"("source_session_id");

-- AddForeignKey
ALTER TABLE "PracticeCatalogEntry" ADD CONSTRAINT "PracticeCatalogEntry_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "Practice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeCatalogEntry" ADD CONSTRAINT "PracticeCatalogEntry_source_session_id_fkey" FOREIGN KEY ("source_session_id") REFERENCES "WorkflowSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: source_catalog_entry_id auf WorkflowSession
ALTER TABLE "WorkflowSession" ADD COLUMN "source_catalog_entry_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowSession_source_catalog_entry_id_key" ON "WorkflowSession"("source_catalog_entry_id");

-- AddForeignKey
ALTER TABLE "WorkflowSession" ADD CONSTRAINT "WorkflowSession_source_catalog_entry_id_fkey" FOREIGN KEY ("source_catalog_entry_id") REFERENCES "PracticeCatalogEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
