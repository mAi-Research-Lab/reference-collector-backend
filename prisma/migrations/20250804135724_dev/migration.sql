/*
  Warnings:

  - Added the required column `collection_id` to the `references` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "references" ADD COLUMN     "collection_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
