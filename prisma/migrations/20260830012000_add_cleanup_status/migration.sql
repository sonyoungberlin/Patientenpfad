CREATE TABLE "CleanupStatus" (
  "id" TEXT NOT NULL,
  "last_started_at" TIMESTAMP(3),
  "last_succeeded_at" TIMESTAMP(3),
  "last_failed_at" TIMESTAMP(3),
  "last_error_code" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CleanupStatus_pkey" PRIMARY KEY ("id")
);