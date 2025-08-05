-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'inactive', 'trial');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('admin', 'individual', 'institutional', 'institutional_admin');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('MONTHLY', 'YEARLY', 'INSTITUTIONAL');

-- CreateEnum
CREATE TYPE "LibraryTypes" AS ENUM ('personal', 'shared', 'group', 'institutional', 'project', 'template');

-- CreateEnum
CREATE TYPE "LibraryVisibility" AS ENUM ('private', 'members_only', 'public');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'editor', 'viewer', 'member');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('s3', 'local');

-- CreateEnum
CREATE TYPE "AnnotationsType" AS ENUM ('highlight', 'note', 'strikethrough', 'underline', 'drawing', 'text', 'link');

-- CreateEnum
CREATE TYPE "CollaboratorRoles" AS ENUM ('owner', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "Platforms" AS ENUM ('word', 'google_docs', 'libreoffice');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'syncing', 'synced', 'error');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('manual', 'automatic', 'real_time');

-- CreateEnum
CREATE TYPE "SyncSessionStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ShareType" AS ENUM ('direct', 'link', 'public', 'institutional');

-- CreateEnum
CREATE TYPE "ShareScope" AS ENUM ('library', 'collection', 'reference');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('none', 'read', 'comment', 'edit', 'admin');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "user_type" "UserType" NOT NULL DEFAULT 'individual',
    "institution_id" UUID,
    "field_of_study" TEXT,
    "orcid_id" TEXT,
    "subscription_plan" "SubscriptionPlan",
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'inactive',
    "avatar_url" TEXT,
    "preferences" JSONB,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "subscription_plan" "SubscriptionPlan",
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'inactive',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "libraries" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "owner_id" UUID,
    "type" "LibraryTypes" NOT NULL DEFAULT 'personal',
    "visibility" "LibraryVisibility" NOT NULL DEFAULT 'private',
    "institution_id" UUID,
    "settings" JSONB,
    "storage_used" BIGINT NOT NULL DEFAULT 0,
    "max_storage" BIGINT NOT NULL DEFAULT 0,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "libraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "default_library_type" "LibraryTypes" NOT NULL DEFAULT 'personal',
    "default_visibility" "LibraryVisibility" NOT NULL DEFAULT 'private',
    "collections" JSONB,
    "default_settings" JSONB,
    "metadata" JSONB,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_ratings" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_ratings_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Collections" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "sort_order" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "reference_id" UUID NOT NULL,
    "sort_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "references" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" JSONB,
    "editors" JSONB,
    "publication" TEXT,
    "publisher" TEXT,
    "year" INTEGER,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,
    "doi" TEXT,
    "isbn" TEXT,
    "issn" TEXT,
    "url" TEXT,
    "abstract_text" TEXT,
    "language" TEXT,
    "metadata" JSONB,
    "tags" TEXT[],
    "notes" TEXT,
    "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_modified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" UUID NOT NULL,
    "modified_by" UUID,
    "citation_count" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Files" (
    "id" UUID NOT NULL,
    "reference_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "mime_type" TEXT,
    "storage_path" TEXT NOT NULL,
    "storage_provider" "StorageProvider" NOT NULL DEFAULT 'local',
    "version" INTEGER DEFAULT 1,
    "checksum" TEXT,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Files_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "collaboration_sessions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "participants" JSONB NOT NULL DEFAULT '[]',
    "operation_log" JSONB NOT NULL DEFAULT '[]',
    "current_state" JSONB NOT NULL DEFAULT '{}',
    "conflict_resolution" JSONB NOT NULL DEFAULT '{}',
    "session_data" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_documents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "document_path" TEXT NOT NULL,
    "document_name" TEXT NOT NULL,
    "document_hash" TEXT NOT NULL,
    "platform" "Platforms" NOT NULL DEFAULT 'word',
    "platform_document_id" TEXT,
    "citation_mapping" JSONB NOT NULL DEFAULT '{}',
    "library_links" JSONB NOT NULL DEFAULT '{}',
    "last_sync" TIMESTAMP(3),
    "word_processor_type" TEXT NOT NULL DEFAULT 'microsoft-word',
    "version_info" JSONB NOT NULL DEFAULT '{}',
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "office_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "office_document_id" UUID NOT NULL,
    "platform_type" TEXT NOT NULL,
    "sync_type" "SyncType" NOT NULL,
    "sync_data" JSONB NOT NULL DEFAULT '{}',
    "conflicts" JSONB NOT NULL DEFAULT '[]',
    "resolution_strategy" TEXT NOT NULL DEFAULT 'last-writer-wins',
    "items_synced" INTEGER NOT NULL DEFAULT 0,
    "errors_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" "SyncSessionStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "sync_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extension_captures" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "raw_metadata" JSONB NOT NULL,
    "processed_metadata" JSONB,
    "capture_method" TEXT NOT NULL,
    "browser_info" JSONB NOT NULL,
    "translator_used" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "reference_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extension_captures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advanced_shares" (
    "id" UUID NOT NULL,
    "shareType" "ShareType" NOT NULL,
    "scope" "ShareScope" NOT NULL,
    "resource_id" UUID NOT NULL,
    "resource_name" TEXT NOT NULL,
    "recipient_email" TEXT,
    "recipient_user_id" UUID,
    "access_level" "AccessLevel" NOT NULL,
    "granular_permissions" JSONB,
    "link_settings" JSONB,
    "share_url" TEXT,
    "short_url" TEXT,
    "qr_code" TEXT,
    "created_by" UUID NOT NULL,
    "message" TEXT,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_accessed_at" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "max_uses" INTEGER,
    "current_uses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advanced_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_access_logs" (
    "id" UUID NOT NULL,
    "share_id" UUID NOT NULL,
    "user_id" UUID,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaboration_logs" (
    "id" UUID NOT NULL,
    "share_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "details" JSONB,
    "comment" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_collaboration_settings" (
    "id" UUID NOT NULL,
    "library_id" UUID NOT NULL,
    "allow_comments" BOOLEAN NOT NULL DEFAULT true,
    "allow_suggestions" BOOLEAN NOT NULL DEFAULT true,
    "require_approval" BOOLEAN NOT NULL DEFAULT false,
    "notify_on_changes" BOOLEAN NOT NULL DEFAULT true,
    "default_access_level" "AccessLevel" NOT NULL DEFAULT 'read',
    "default_expiration_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_collaboration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_name_key" ON "Institution"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_domain_key" ON "Institution"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "template_ratings_template_id_user_id_key" ON "template_ratings"("template_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "library_memberships_library_id_user_id_key" ON "library_memberships"("library_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "library_invitations_token_key" ON "library_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Collections_name_key" ON "Collections"("name");

-- CreateIndex
CREATE UNIQUE INDEX "collection_items_collection_id_reference_id_key" ON "collection_items"("collection_id", "reference_id");

-- CreateIndex
CREATE INDEX "document_deltas_document_id_version_idx" ON "document_deltas"("document_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCollaborators_document_id_user_id_key" ON "DocumentCollaborators"("document_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "library_collaboration_settings_library_id_key" ON "library_collaboration_settings"("library_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libraries" ADD CONSTRAINT "libraries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libraries" ADD CONSTRAINT "libraries_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_templates" ADD CONSTRAINT "library_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_ratings" ADD CONSTRAINT "template_ratings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "library_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_ratings" ADD CONSTRAINT "template_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_memberships" ADD CONSTRAINT "library_memberships_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_memberships" ADD CONSTRAINT "library_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_memberships" ADD CONSTRAINT "library_memberships_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_invitations" ADD CONSTRAINT "library_invitations_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_invitations" ADD CONSTRAINT "library_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collections" ADD CONSTRAINT "Collections_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collections" ADD CONSTRAINT "Collections_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Files" ADD CONSTRAINT "Files_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Files" ADD CONSTRAINT "Files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotations" ADD CONSTRAINT "Annotations_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "Files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotations" ADD CONSTRAINT "Annotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "collaboration_sessions" ADD CONSTRAINT "collaboration_sessions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_documents" ADD CONSTRAINT "office_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_sessions" ADD CONSTRAINT "sync_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_sessions" ADD CONSTRAINT "sync_sessions_office_document_id_fkey" FOREIGN KEY ("office_document_id") REFERENCES "office_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_captures" ADD CONSTRAINT "extension_captures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extension_captures" ADD CONSTRAINT "extension_captures_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advanced_shares" ADD CONSTRAINT "advanced_shares_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advanced_shares" ADD CONSTRAINT "advanced_shares_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_access_logs" ADD CONSTRAINT "share_access_logs_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "advanced_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_access_logs" ADD CONSTRAINT "share_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_logs" ADD CONSTRAINT "collaboration_logs_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "advanced_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_logs" ADD CONSTRAINT "collaboration_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_collaboration_settings" ADD CONSTRAINT "library_collaboration_settings_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
