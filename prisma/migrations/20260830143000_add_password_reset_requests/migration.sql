CREATE TABLE "PasswordResetRequest" (
  "id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordResetRateLimit" (
  "id" TEXT NOT NULL,
  "key_hash" TEXT NOT NULL,
  "key_type" TEXT NOT NULL,
  "window_started_at" TIMESTAMP(3) NOT NULL,
  "request_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PasswordResetRateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetRequest_token_hash_key" ON "PasswordResetRequest"("token_hash");
CREATE INDEX "PasswordResetRequest_account_id_created_at_idx" ON "PasswordResetRequest"("account_id", "created_at");
CREATE INDEX "PasswordResetRequest_expires_at_idx" ON "PasswordResetRequest"("expires_at");
CREATE UNIQUE INDEX "PasswordResetRateLimit_key_hash_key_type_key" ON "PasswordResetRateLimit"("key_hash", "key_type");
CREATE INDEX "PasswordResetRateLimit_updated_at_idx" ON "PasswordResetRateLimit"("updated_at");

ALTER TABLE "PasswordResetRequest"
  ADD CONSTRAINT "PasswordResetRequest_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Account"
SET "password_reset_token" = NULL, "password_reset_expires" = NULL
WHERE "password_reset_token" IS NOT NULL OR "password_reset_expires" IS NOT NULL;