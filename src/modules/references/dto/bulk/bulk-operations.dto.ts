import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export enum BulkOperationType {
    DELETE = 'delete',
    MOVE = 'move',
    ADD_TAGS = 'add_tags',
    REMOVE_TAGS = 'remove_tags',
    UPDATE_COLLECTION = 'update_collection',
    EXPORT = 'export'
}

export class BulkOperationDto {
    @ApiProperty({ 
        example: ['14e56bb0-ed2f-4567-bb07-a3b2649ed80d', '24e56bb0-ed2f-4567-bb07-a3b2649ed80e'],
        description: 'Array of reference IDs to operate on'
    })
    @IsArray()
    @IsString({ each: true })
    referenceIds: string[];

    @ApiProperty({ 
        enum: BulkOperationType,
        example: BulkOperationType.ADD_TAGS,
        description: 'Type of bulk operation to perform'
    })
    @IsEnum(BulkOperationType)
    operation: BulkOperationType;

    @ApiPropertyOptional({ 
        example: ['machine-learning', 'healthcare'],
        description: 'Tags to add or remove (for tag operations)'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({ 
        example: '34e56bb0-ed2f-4567-bb07-a3b2649ed80f',
        description: 'Target library ID (for move operations)'
    })
    @IsOptional()
    @IsString()
    targetLibraryId?: string;

    @ApiPropertyOptional({ 
        example: '44e56bb0-ed2f-4567-bb07-a3b2649ed80g',
        description: 'Target collection ID (for collection operations)'
    })
    @IsOptional()
    @IsString()
    targetCollectionId?: string;

    @ApiPropertyOptional({ 
        example: 'bibtex',
        description: 'Export format (for export operations)'
    })
    @IsOptional()
    @IsString()
    exportFormat?: string;

    @ApiPropertyOptional({ 
        example: false,
        description: 'Whether to perform a dry run (preview changes without applying)'
    })
    @IsOptional()
    @IsBoolean()
    dryRun?: boolean;
}

export class BulkDeleteDto {
    @ApiProperty({ 
        example: ['14e56bb0-ed2f-4567-bb07-a3b2649ed80d', '24e56bb0-ed2f-4567-bb07-a3b2649ed80e'],
        description: 'Array of reference IDs to delete'
    })
    @IsArray()
    @IsString({ each: true })
    referenceIds: string[];

    @ApiPropertyOptional({ 
        example: false,
        description: 'Whether to permanently delete (true) or soft delete (false)'
    })
    @IsOptional()
    @IsBoolean()
    permanent?: boolean;
}

export class BulkMoveDto {
    @ApiProperty({ 
        example: ['14e56bb0-ed2f-4567-bb07-a3b2649ed80d', '24e56bb0-ed2f-4567-bb07-a3b2649ed80e'],
        description: 'Array of reference IDs to move'
    })
    @IsArray()
    @IsString({ each: true })
    referenceIds: string[];

    @ApiProperty({ 
        example: '34e56bb0-ed2f-4567-bb07-a3b2649ed80f',
        description: 'Target library ID'
    })
    @IsString()
    targetLibraryId: string;

    @ApiPropertyOptional({ 
        example: '44e56bb0-ed2f-4567-bb07-a3b2649ed80g',
        description: 'Target collection ID within the library'
    })
    @IsOptional()
    @IsString()
    targetCollectionId?: string;
}

export class BulkTagDto {
    @ApiProperty({ 
        example: ['14e56bb0-ed2f-4567-bb07-a3b2649ed80d', '24e56bb0-ed2f-4567-bb07-a3b2649ed80e'],
        description: 'Array of reference IDs to tag'
    })
    @IsArray()
    @IsString({ each: true })
    referenceIds: string[];

    @ApiProperty({ 
        example: ['machine-learning', 'healthcare', 'research'],
        description: 'Tags to add or remove'
    })
    @IsArray()
    @IsString({ each: true })
    tags: string[];

    @ApiProperty({ 
        example: 'add',
        enum: ['add', 'remove', 'replace'],
        description: 'Tag operation type'
    })
    @IsEnum(['add', 'remove', 'replace'])
    action: 'add' | 'remove' | 'replace';
}

export class BulkOperationResultDto {
    @ApiProperty({ example: 'delete', description: 'Operation that was performed' })
    @IsString()
    operation: string;

    @ApiProperty({ example: 5, description: 'Number of references processed' })
    processedCount: number;

    @ApiProperty({ example: 5, description: 'Number of successful operations' })
    successCount: number;

    @ApiProperty({ example: 0, description: 'Number of failed operations' })
    failureCount: number;

    @ApiProperty({ 
        example: ['14e56bb0-ed2f-4567-bb07-a3b2649ed80d'],
        description: 'IDs of successfully processed references'
    })
    @IsArray()
    @IsString({ each: true })
    successfulIds: string[];

    @ApiProperty({ 
        example: [],
        description: 'IDs and error messages for failed operations'
    })
    @IsArray()
    failures: Array<{ id: string; error: string }>;

    @ApiProperty({ example: 'Bulk operation completed successfully' })
    @IsString()
    message: string;

    @ApiPropertyOptional({ 
        example: { exportUrl: '/downloads/references.bib' },
        description: 'Additional operation-specific data'
    })
    @IsOptional()
    additionalData?: any;
}

export class BulkExportDto {
    @ApiProperty({ 
        example: ['14e56bb0-ed2f-4567-bb07-a3b2649ed80d', '24e56bb0-ed2f-4567-bb07-a3b2649ed80e'],
        description: 'Array of reference IDs to export'
    })
    @IsArray()
    @IsString({ each: true })
    referenceIds: string[];

    @ApiProperty({ 
        example: 'bibtex',
        enum: ['bibtex', 'ris', 'endnote', 'json', 'csv'],
        description: 'Export format'
    })
    @IsEnum(['bibtex', 'ris', 'endnote', 'json', 'csv'])
    format: 'bibtex' | 'ris' | 'endnote' | 'json' | 'csv';

    @ApiPropertyOptional({ 
        example: 'my_references',
        description: 'Custom filename for the export'
    })
    @IsOptional()
    @IsString()
    filename?: string;

    @ApiPropertyOptional({ 
        example: true,
        description: 'Include attached files in export'
    })
    @IsOptional()
    @IsBoolean()
    includeFiles?: boolean;
}
