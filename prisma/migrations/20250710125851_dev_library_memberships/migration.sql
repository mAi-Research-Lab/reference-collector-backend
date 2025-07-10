-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'editor', 'viewer', 'member');

-- CreateTable
CREATE TABLE "library_memberships" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'member',
    "permissions" JSONB,
    "invited_by" UUID,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "library_memberships_library_id_user_id_key" ON "library_memberships"("library_id", "user_id");

-- AddForeignKey
ALTER TABLE "library_memberships" ADD CONSTRAINT "library_memberships_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "Libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_memberships" ADD CONSTRAINT "library_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_memberships" ADD CONSTRAINT "library_memberships_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
