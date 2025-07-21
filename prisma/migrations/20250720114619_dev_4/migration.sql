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

-- AddForeignKey
ALTER TABLE "collaboration_sessions" ADD CONSTRAINT "collaboration_sessions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
