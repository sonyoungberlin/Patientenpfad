-- Add case_quota to Practice
-- null = unbegrenzt; 0 = keine neuen Fälle erlaubt; n > 0 = max. n Fälle.
ALTER TABLE "Practice" ADD COLUMN "case_quota" INTEGER;
