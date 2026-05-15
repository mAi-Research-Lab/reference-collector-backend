CREATE TYPE "DocumentTypes" AS ENUM ('notebook', 'document');

ALTER TABLE "documents" ADD COLUMN "document_type" "DocumentTypes" NOT NULL DEFAULT 'notebook';
