-- CreateEnum
CREATE TYPE "IntroGuideStatus" AS ENUM ('not_started', 'completed', 'skipped');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "intro_guide_status" "IntroGuideStatus" NOT NULL DEFAULT 'not_started';
