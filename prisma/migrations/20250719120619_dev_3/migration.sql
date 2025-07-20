-- CreateEnum
CREATE TYPE "CollaboratorRoles" AS ENUM ('owner', 'editor', 'viewer');

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "current_version" INTEGER NOT NULL DEFAULT 0,
    "content_delta" JSONB NOT NULL,
    "library_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "citation_style" TEXT NOT NULL,
    "template_id" UUID,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "char_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "style_config" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTemplates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_deltas" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "ops" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_deltas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentCollaborators" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "CollaboratorRoles" NOT NULL DEFAULT 'viewer',
    "permissions" JSONB,
    "invited_by" UUID,
    "accepted_at" TIMESTAMP(3),
    "last_accessed" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentCollaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "reference_id" UUID NOT NULL,
    "location_data" JSONB,
    "citation_text" TEXT NOT NULL,
    "page_numbers" TEXT,
    "prefix" TEXT,
    "suffix" TEXT,
    "suppress_author" BOOLEAN NOT NULL DEFAULT false,
    "suppress_date" BOOLEAN NOT NULL DEFAULT false,
    "style_override" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitationStyle" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "description" TEXT,
    "csl_content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CitationStyle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_deltas_document_id_version_idx" ON "document_deltas"("document_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCollaborators_document_id_user_id_key" ON "DocumentCollaborators"("document_id", "user_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "Libraries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "DocumentTemplates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_deltas" ADD CONSTRAINT "document_deltas_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_deltas" ADD CONSTRAINT "document_deltas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCollaborators" ADD CONSTRAINT "DocumentCollaborators_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCollaborators" ADD CONSTRAINT "DocumentCollaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCollaborators" ADD CONSTRAINT "DocumentCollaborators_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
