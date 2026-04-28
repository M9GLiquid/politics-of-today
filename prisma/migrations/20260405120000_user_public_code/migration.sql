-- Custom: SQLite backfill unique publicCode per user.
-- publicCode and its unique index already exist in prior migrations.
UPDATE "User"
SET "publicCode" = 'P-' || lower(hex(randomblob(8)))
WHERE "publicCode" IS NULL;
