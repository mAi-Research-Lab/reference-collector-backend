/*
  Warnings:

  - You are about to drop the column `password_hash` on the `EmailVerification` table. All the data in the column will be lost.
  - You are about to drop the column `postalCode` on the `Institution` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `PasswordReset` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `EmailVerification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postal_code` to the `Institution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `PasswordReset` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmailVerification" DROP COLUMN "password_hash",
ADD COLUMN     "user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Institution" DROP COLUMN "postalCode",
ADD COLUMN     "postal_code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PasswordReset" DROP COLUMN "password_hash",
ADD COLUMN     "user_id" UUID NOT NULL;
