import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsInt, IsObject, IsOptional, Min } from "class-validator";
import { ConflictData } from "../interfaces/conflict-data";

export class UpdateSyncProgressDto {
    @ApiProperty({
        description: 'Number of items successfully synced',
        minimum: 0,
        example: 15
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    itemsSynced?: number;

    @ApiProperty({
        description: 'Number of errors encountered during sync',
        minimum: 0,
        example: 2
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    errorsCount?: number;

    @ApiProperty({
        description: 'Current sync progress data',
        example: {
            currentStep: 'processing_citations',
            totalSteps: 5,
            processedCitations: 12,
            totalCitations: 20,
            errors: [
                {
                    type: 'missing_reference',
                    referenceId: 'ref_123',
                    message: 'Reference not found in library'
                }
            ]
        }
    })
    @IsOptional()
    @IsObject()
    syncData?: any;

    @ApiProperty({
        description: 'List of conflicts detected during sync',
        type: 'array',
        required: false,
        example: [
            {
                id: 'conflict_1642781234567',
                type: 'citation_format',
                field: 'author_display',
                wordVersion: 'Smith, J.',
                webVersion: 'Smith, John',
                timestamp: {
                    word: '2025-07-21T10:30:00Z',
                    web: '2025-07-21T10:35:00Z'
                },
                status: 'pending'
            }
        ]
    })
    @IsOptional()
    @IsArray()
    conflicts?: ConflictData[];
}