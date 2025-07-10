-- CreateTable
CREATE TABLE "library_invitations" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "library_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'member',
    "permissions" JSONB,
    "invited_by" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "is_expired" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "library_invitations_token_key" ON "library_invitations"("token");

-- AddForeignKey
ALTER TABLE "library_invitations" ADD CONSTRAINT "library_invitations_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "Libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_invitations" ADD CONSTRAINT "library_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
