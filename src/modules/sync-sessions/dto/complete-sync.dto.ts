import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";
import { SyncSessionStatus } from "generated/prisma";

export class CompleteSyncDto {
    @ApiProperty({
        description: 'Final status of the sync session',
        enum: ['completed', 'failed'],
        example: 'completed'
    })
    @IsEnum(SyncSessionStatus)
    @IsIn(['completed', 'failed'])
    status: SyncSessionStatus;

    @ApiProperty({
        description: 'Error message if sync failed',
        required: false,
        example: 'Network connection lost during bibliography sync'
    })
    @IsOptional()
    @IsString()
    errorMessage?: string;

    @ApiProperty({
        description: 'Total number of items synced successfully',
        minimum: 0,
        example: 18
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    finalItemsSynced?: number;

    @ApiProperty({
        description: 'Total number of errors encountered',
        minimum: 0,
        example: 1
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    finalErrorsCount?: number;

    @ApiProperty({
        description: 'Final sync session data and statistics',
        example: {
            duration: '00:02:34',
            citationsAdded: 8,
            citationsUpdated: 7,
            citationsDeleted: 0,
            bibliographyUpdated: true,
            conflictsResolved: 2,
            conflictsPending: 0
        }
    })
    @IsOptional()
    @IsObject()
    finalSyncData?: any;
}