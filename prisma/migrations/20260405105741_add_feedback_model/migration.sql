-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('bug', 'suggestion');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "app_version" TEXT,
    "os_info" TEXT,
    "image_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "FeedbackStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
