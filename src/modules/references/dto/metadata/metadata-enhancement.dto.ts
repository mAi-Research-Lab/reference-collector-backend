import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';

export enum MetadataSource {
    CROSSREF = 'crossref',
    PUBMED = 'pubmed',
    ARXIV = 'arxiv',
    OPENLIBRARY = 'openlibrary'
}

export class MetadataSourceDto {
    @ApiProperty({ example: 'crossref', description: 'Source name' })
    @IsString()
    name: string;

    @ApiProperty({ example: 1, description: 'Priority order (1 = highest)' })
    @IsNumber()
    priority: number;

    @ApiProperty({ example: true, description: 'Whether source is currently available' })
    @IsBoolean()
    isAvailable: boolean;
}

export class EnhancementResultDto {
    @ApiProperty({ example: true, description: 'Whether enhancement was successful' })
    @IsBoolean()
    success: boolean;

    @ApiProperty({ example: 'crossref', description: 'Source used for enhancement' })
    @IsString()
    source: string;

    @ApiProperty({ 
        example: ['abstractText', 'doi', 'year'],
        description: 'Fields that were enhanced'
    })
    @IsArray()
    @IsString({ each: true })
    fieldsEnhanced: string[];

    @ApiProperty({ description: 'Original reference data' })
    originalData: any;

    @ApiProperty({ description: 'Enhanced reference data' })
    enhancedData: any;

    @ApiProperty({ example: 0.85, description: 'Confidence score (0-1)' })
    @IsNumber()
    confidence: number;

    @ApiProperty({ 
        example: ['Could not find abstract'],
        description: 'Warning messages'
    })
    @IsArray()
    @IsString({ each: true })
    warnings: string[];
}

export class EnhanceReferenceDto {
    @ApiProperty({ 
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d',
        description: 'Reference ID to enhance'
    })
    @IsString()
    referenceId: string;

    @ApiPropertyOptional({ 
        example: ['crossref', 'pubmed'],
        enum: MetadataSource,
        isArray: true,
        description: 'Preferred metadata sources in order'
    })
    @IsOptional()
    @IsArray()
    @IsEnum(MetadataSource, { each: true })
    sources?: MetadataSource[];

    @ApiPropertyOptional({ 
        example: ['abstractText', 'doi', 'year'],
        description: 'Specific fields to enhance'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    fields?: string[];

    @ApiPropertyOptional({ 
        example: false,
        description: 'Whether to overwrite existing field values'
    })
    @IsOptional()
    @IsBoolean()
    overwriteExisting?: boolean;

    @ApiPropertyOptional({ 
        example: 0.7,
        description: 'Minimum confidence threshold (0-1)'
    })
    @IsOptional()
    @IsNumber()
    confidenceThreshold?: number;
}

export class BatchEnhanceDto {
    @ApiProperty({ 
        example: ['14e56bb0-ed2f-4567-bb07-a3b2649ed80d', '24e56bb0-ed2f-4567-bb07-a3b2649ed80e'],
        description: 'Array of reference IDs to enhance'
    })
    @IsArray()
    @IsString({ each: true })
    referenceIds: string[];

    @ApiPropertyOptional({ 
        example: ['crossref', 'pubmed'],
        enum: MetadataSource,
        isArray: true,
        description: 'Preferred metadata sources in order'
    })
    @IsOptional()
    @IsArray()
    @IsEnum(MetadataSource, { each: true })
    sources?: MetadataSource[];

    @ApiPropertyOptional({ 
        example: ['abstractText', 'doi', 'year'],
        description: 'Specific fields to enhance'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    fields?: string[];

    @ApiPropertyOptional({ 
        example: false,
        description: 'Whether to overwrite existing field values'
    })
    @IsOptional()
    @IsBoolean()
    overwriteExisting?: boolean;

    @ApiPropertyOptional({ 
        example: 0.7,
        description: 'Minimum confidence threshold (0-1)'
    })
    @IsOptional()
    @IsNumber()
    confidenceThreshold?: number;

    @ApiPropertyOptional({ 
        example: true,
        description: 'Whether to automatically save enhanced data'
    })
    @IsOptional()
    @IsBoolean()
    autoSave?: boolean;
}

export class BatchEnhancementResultDto {
    @ApiProperty({ example: 5, description: 'Total references processed' })
    @IsNumber()
    totalProcessed: number;

    @ApiProperty({ example: 3, description: 'Successfully enhanced references' })
    @IsNumber()
    successfulEnhancements: number;

    @ApiProperty({ example: 2, description: 'Failed enhancements' })
    @IsNumber()
    failedEnhancements: number;

    @ApiProperty({ 
        type: [EnhancementResultDto],
        description: 'Individual enhancement results'
    })
    @IsArray()
    results: EnhancementResultDto[];

    @ApiProperty({ example: 0.75, description: 'Overall success rate' })
    @IsNumber()
    successRate: number;

    @ApiProperty({ 
        example: ['3 references enhanced from CrossRef', '2 references had no available metadata'],
        description: 'Summary of batch operation'
    })
    @IsArray()
    @IsString({ each: true })
    summary: string[];
}

export class EnhanceByQueryDto {
    @ApiPropertyOptional({ example: 'Machine Learning in Healthcare' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ example: '10.1000/182' })
    @IsOptional()
    @IsString()
    doi?: string;

    @ApiPropertyOptional({ example: '978-0123456789' })
    @IsOptional()
    @IsString()
    isbn?: string;

    @ApiPropertyOptional({ 
        example: [{ name: 'John Doe' }],
        description: 'Author information'
    })
    @IsOptional()
    authors?: any;

    @ApiPropertyOptional({ 
        example: ['crossref', 'pubmed'],
        enum: MetadataSource,
        isArray: true,
        description: 'Preferred metadata sources'
    })
    @IsOptional()
    @IsArray()
    @IsEnum(MetadataSource, { each: true })
    sources?: MetadataSource[];

    @ApiPropertyOptional({ 
        example: 0.7,
        description: 'Minimum confidence threshold'
    })
    @IsOptional()
    @IsNumber()
    confidenceThreshold?: number;
}

export class AutoEnhanceLibraryDto {
    @ApiProperty({ 
        example: '34e56bb0-ed2f-4567-bb07-a3b2649ed80f',
        description: 'Library ID to auto-enhance'
    })
    @IsString()
    libraryId: string;

    @ApiPropertyOptional({ 
        example: ['abstractText', 'doi'],
        description: 'Only enhance these specific fields'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    fieldsToEnhance?: string[];

    @ApiPropertyOptional({ 
        example: false,
        description: 'Whether to overwrite existing values'
    })
    @IsOptional()
    @IsBoolean()
    overwriteExisting?: boolean;

    @ApiPropertyOptional({ 
        example: 100,
        description: 'Maximum number of references to process'
    })
    @IsOptional()
    @IsNumber()
    maxReferences?: number;

    @ApiPropertyOptional({ 
        example: true,
        description: 'Whether to perform a dry run (preview only)'
    })
    @IsOptional()
    @IsBoolean()
    dryRun?: boolean;
}

export class SourceAvailabilityDto {
    @ApiProperty({ example: 'crossref', description: 'Source name' })
    @IsString()
    source: string;

    @ApiProperty({ example: true, description: 'Whether source is available' })
    @IsBoolean()
    isAvailable: boolean;

    @ApiProperty({ example: 250, description: 'Response time in milliseconds' })
    @IsNumber()
    responseTime: number;

    @ApiPropertyOptional({ example: 'API rate limit exceeded' })
    @IsOptional()
    @IsString()
    error?: string;

    @ApiProperty({ example: '2023-12-01T10:00:00Z', description: 'Last checked timestamp' })
    @IsString()
    lastChecked: string;
}

export class EnhancementStatsDto {
    @ApiProperty({ example: 'crossref', description: 'Source name' })
    @IsString()
    source: string;

    @ApiProperty({ example: 150, description: 'Total enhancements attempted' })
    @IsNumber()
    totalAttempts: number;

    @ApiProperty({ example: 120, description: 'Successful enhancements' })
    @IsNumber()
    successfulEnhancements: number;

    @ApiProperty({ example: 0.8, description: 'Success rate (0-1)' })
    @IsNumber()
    successRate: number;

    @ApiProperty({ example: 0.85, description: 'Average confidence score' })
    @IsNumber()
    averageConfidence: number;

    @ApiProperty({ 
        example: ['abstractText', 'doi', 'year'],
        description: 'Most commonly enhanced fields'
    })
    @IsArray()
    @IsString({ each: true })
    commonFields: string[];
}
