-- DropForeignKey
ALTER TABLE "references" DROP CONSTRAINT "references_modified_by_fkey";

-- AlterTable
ALTER TABLE "references" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "modified_by" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
