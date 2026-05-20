-- Phase B Schritt 5: sent_at-Zeitstempel für erfolgreichen Mailversand.
ALTER TABLE "DigitalRequest" ADD COLUMN "sent_at" TIMESTAMP(3);
