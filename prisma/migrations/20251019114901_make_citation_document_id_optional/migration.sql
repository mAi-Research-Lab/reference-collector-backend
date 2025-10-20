-- DropForeignKey
ALTER TABLE "public"."Citation" DROP CONSTRAINT "Citation_document_id_fkey";

-- AlterTable
ALTER TABLE "Citation" ALTER COLUMN "document_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "office_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
