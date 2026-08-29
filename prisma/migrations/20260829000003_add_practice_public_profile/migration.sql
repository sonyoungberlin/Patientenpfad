ALTER TABLE "Practice"
  ADD COLUMN "public_name" TEXT,
  ADD COLUMN "public_slug" TEXT;

CREATE UNIQUE INDEX "Practice_public_slug_key" ON "Practice"("public_slug");