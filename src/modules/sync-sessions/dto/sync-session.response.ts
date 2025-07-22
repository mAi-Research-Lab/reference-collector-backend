import { ApiProperty } from "@nestjs/swagger";
import { SyncSessionStatus, SyncType } from "generated/prisma";
import { ConflictData } from "../interfaces/conflict-data";

export class SyncSessionResponse {
    @ApiProperty({
        description: 'Unique session identifier',
        example: 'sync_session_123e4567-e89b-12d3-a456-426614174000'
    })
    id: string;

    @ApiProperty({
        description: 'User who initiated the sync',
        example: 'user_123e4567-e89b-12d3-a456-426614174000'
    })
    userId: string;

    @ApiProperty({
        description: 'Office document being synced',
        example: 'doc_123e4567-e89b-12d3-a456-426614174000'
    })
    officeDocumentId: string;

    @ApiProperty({
        description: 'Platform where sync originated',
        example: 'word'
    })
    platformType: string;

    @ApiProperty({
        description: 'Type of sync performed',
        example: 'incremental'
    })
    syncType: SyncType;

    @ApiProperty({
        description: 'Sync configuration and progress data',
        example: {
            lastSyncTimestamp: '2025-07-21T10:30:00Z',
            currentStep: 'completed',
            totalSteps: 5,
            processedItems: 18
        }
    })
    syncData: any;

    @ApiProperty({
        description: 'List of conflicts encountered during sync',
        type: 'array',
        example: [
            {
                id: 'conflict_1642781234567',
                type: 'citation_format',
                field: 'author_display',
                status: 'resolved',
                resolved: 'Smith, John',
                resolutionMethod: 'manual-resolution'
            }
        ]
    })
    conflicts: ConflictData[];

    @ApiProperty({
        description: 'Strategy used for conflict resolution',
        example: 'last-writer-wins'
    })
    resolutionStrategy: string;

    @ApiProperty({
        description: 'Number of items successfully synced',
        example: 18
    })
    itemsSynced: number;

    @ApiProperty({
        description: 'Number of errors encountered',
        example: 1
    })
    errorsCount: number;

    @ApiProperty({
        description: 'When sync session was started',
        example: '2025-07-21T10:30:00Z'
    })
    startedAt: Date;

    @ApiProperty({
        description: 'When sync session was completed',
        required: false,
        example: '2025-07-21T10:32:34Z'
    })
    completedAt?: Date | null;

    @ApiProperty({
        description: 'Current status of sync session',
        enum: ['pending', 'running', 'completed', 'failed'],
        example: 'completed'
    })
    status: SyncSessionStatus;

    @ApiProperty({
        description: 'Office document details',
        required: false,
        example: {
            id: 'doc_123e4567-e89b-12d3-a456-426614174000',
            title: 'My Research Paper.docx',
            documentType: 'word'
        }
    })
    officeDocument?: {
        id: string;
        title: string;
        documentType: string;
    };
}