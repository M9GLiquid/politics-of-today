-- Custom: SQLite backfill unique publicCode per user
ALTER TABLE "User" ADD COLUMN "publicCode" TEXT;

UPDATE "User" SET "publicCode" = 'P-' || lower(hex(randomblob(8))) WHERE "publicCode" IS NULL;

CREATE UNIQUE INDEX "User_publicCode_key" ON "User"("publicCode");
