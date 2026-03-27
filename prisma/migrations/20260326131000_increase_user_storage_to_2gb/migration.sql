-- Increase user max storage to 2GB (2 * 1024^3 bytes)
-- - Update default
-- - Migrate existing users that are still on the old 200MB quota

ALTER TABLE "User"
    ALTER COLUMN "max_storage" SET DEFAULT 2147483648;

UPDATE "User"
SET "max_storage" = 2147483648
WHERE "max_storage" = 209715200;

