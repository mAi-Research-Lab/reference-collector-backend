/*
  Warnings:

  - The `tags` column on the `references` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `document_id` on the `Citation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Citation" DROP COLUMN "document_id",
ADD COLUMN     "document_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "office_documents" ADD COLUMN     "citation_style" TEXT,
ADD COLUMN     "style_id" UUID;

-- AlterTable
ALTER TABLE "references" DROP COLUMN "tags",
ADD COLUMN     "tags" JSONB;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "office_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_documents" ADD CONSTRAINT "office_documents_style_id_fkey" FOREIGN KEY ("style_id") REFERENCES "CitationStyle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
