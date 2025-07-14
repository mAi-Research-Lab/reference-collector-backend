-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Libraries" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" UUID,
    "type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "settings" JSONB,
    "storage_used" BIGINT NOT NULL DEFAULT 0,
    "max_storage" BIGINT NOT NULL,
    "item_count" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Libraries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Libraries" ADD CONSTRAINT "Libraries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
