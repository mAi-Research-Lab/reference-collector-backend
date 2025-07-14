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
    "modified_by" UUID NOT NULL,
    "citation_count" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "search_vector" tsvector,

    CONSTRAINT "references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collections_name_key" ON "Collections"("name");

-- CreateIndex
CREATE UNIQUE INDEX "collection_items_collection_id_reference_id_key" ON "collection_items"("collection_id", "reference_id");

-- AddForeignKey
ALTER TABLE "Collections" ADD CONSTRAINT "Collections_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "Libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collections" ADD CONSTRAINT "Collections_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "references"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "Libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
