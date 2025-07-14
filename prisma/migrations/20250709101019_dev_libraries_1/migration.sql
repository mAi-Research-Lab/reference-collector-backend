/*
  Warnings:

  - The `type` column on the `Libraries` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `visibility` column on the `Libraries` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "LibraryTypes" AS ENUM ('personal', 'shared', 'group', 'institutional', 'project', 'template');

-- CreateEnum
CREATE TYPE "LibraryVisibility" AS ENUM ('private', 'members_only', 'public');

-- AlterTable
ALTER TABLE "Libraries" ADD COLUMN     "institution_id" UUID,
ALTER COLUMN "description" SET DEFAULT '',
DROP COLUMN "type",
ADD COLUMN     "type" "LibraryTypes" NOT NULL DEFAULT 'personal',
DROP COLUMN "visibility",
ADD COLUMN     "visibility" "LibraryVisibility" NOT NULL DEFAULT 'private',
ALTER COLUMN "max_storage" SET DEFAULT 0,
ALTER COLUMN "item_count" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Libraries" ADD CONSTRAINT "Libraries_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
