-- CreateEnum
CREATE TYPE "AnnotationsType" AS ENUM ('highlight', 'note', 'strikethrough', 'underline', 'drawing', 'text', 'link');

-- CreateTable
CREATE TABLE "Annotations" (
    "id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "AnnotationsType" NOT NULL DEFAULT 'note',
    "content" TEXT NOT NULL,
    "position_data" JSONB NOT NULL,
    "color" TEXT DEFAULT '#ffffff',
    "tags" TEXT[],
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Annotations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Annotations" ADD CONSTRAINT "Annotations_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "Files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotations" ADD CONSTRAINT "Annotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
