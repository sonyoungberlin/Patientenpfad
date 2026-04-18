-- CreateTable: Account
CREATE TABLE "Account" (
    "id"          TEXT        NOT NULL,
    "email"       TEXT        NOT NULL,
    "is_approved" BOOLEAN     NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateTable: Session
CREATE TABLE "Session" (
    "id"         TEXT         NOT NULL,
    "token"      TEXT         NOT NULL,
    "account_id" TEXT         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- AddForeignKey: Session → Account
ALTER TABLE "Session"
    ADD CONSTRAINT "Session_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "Account"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: CaseSession – optional owner link
ALTER TABLE "CaseSession"
    ADD COLUMN IF NOT EXISTS "owner_account_id" TEXT;

-- AddForeignKey: CaseSession → Account (nullable, SET NULL on delete)
ALTER TABLE "CaseSession"
    ADD CONSTRAINT "CaseSession_owner_account_id_fkey"
    FOREIGN KEY ("owner_account_id") REFERENCES "Account"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
