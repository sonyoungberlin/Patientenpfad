-- AddColumn: office_cases_enabled auf Account
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "office_cases_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AddColumn: office_cases_enabled auf Practice
ALTER TABLE "Practice" ADD COLUMN IF NOT EXISTS "office_cases_enabled" BOOLEAN NOT NULL DEFAULT false;
