-- DropForeignKey
ALTER TABLE "public"."Citation" DROP CONSTRAINT "Citation_document_id_fkey";

-- AlterTable
ALTER TABLE "Citation" ALTER COLUMN "document_id" SET DATA TYPE TEXT;
