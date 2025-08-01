import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsEnum, IsBoolean } from 'class-validator';

export enum MatchType {
    EXACT = 'exact',
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low'
}

export class DuplicateMatchDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    referenceId: string;

    @ApiProperty({ example: 'Machine Learning in Healthcare' })
    @IsString()
    title: string;

    @ApiProperty({ example: 0.95, description: 'Similarity score between 0 and 1' })
    @IsNumber()
    similarity: number;

    @ApiProperty({ enum: MatchType, example: MatchType.HIGH })
    @IsEnum(MatchType)
    matchType: MatchType;

    @ApiProperty({ 
        example: ['doi', 'title', 'authors'],
        description: 'Fields that matched between references'
    })
    @IsArray()
    @IsString({ each: true })
    matchFields: string[];

    @ApiPropertyOptional({ example: '10.1000/182' })
    @IsOptional()
    @IsString()
    doi?: string;

    @ApiPropertyOptional({ example: '978-0123456789' })
    @IsOptional()
    @IsString()
    isbn?: string;

    @ApiPropertyOptional({ example: 2023 })
    @IsOptional()
    @IsNumber()
    year?: number;

    @ApiProperty({ example: '2023-07-21T19:00:13.388Z' })
    @IsString()
    createdAt: string;
}

export class DuplicateDetectionResultDto {
    @ApiProperty({ example: true, description: 'Whether duplicates were found' })
    @IsBoolean()
    isDuplicate: boolean;

    @ApiProperty({ 
        type: [DuplicateMatchDto],
        description: 'Array of potential duplicate matches'
    })
    @IsArray()
    matches: DuplicateMatchDto[];

    @ApiProperty({ 
        example: 0.95,
        description: 'Confidence score of the best match'
    })
    @IsNumber()
    confidence: number;
}

export class CheckDuplicateDto {
    @ApiProperty({ example: 'journal' })
    @IsString()
    type: string;

    @ApiProperty({ example: 'Machine Learning in Healthcare: A Comprehensive Review' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ example: '10.1000/182' })
    @IsOptional()
    @IsString()
    doi?: string;

    @ApiPropertyOptional({ example: '978-0123456789' })
    @IsOptional()
    @IsString()
    isbn?: string;

    @ApiPropertyOptional({ 
        example: [
            { "name": "John Doe", "affiliation": "MIT" },
            { "name": "Jane Smith", "affiliation": "Harvard" }
        ]
    })
    @IsOptional()
    authors?: any;

    @ApiPropertyOptional({ example: 2023 })
    @IsOptional()
    @IsNumber()
    year?: number;

    @ApiPropertyOptional({ example: 'Nature Medicine' })
    @IsOptional()
    @IsString()
    publication?: string;
}

export class DuplicateGroupDto {
    @ApiProperty({ example: 'group_1' })
    @IsString()
    groupId: string;

    @ApiProperty({ 
        type: [DuplicateMatchDto],
        description: 'References in this duplicate group'
    })
    @IsArray()
    references: DuplicateMatchDto[];

    @ApiProperty({ 
        example: 0.92,
        description: 'Average similarity within the group'
    })
    @IsNumber()
    averageSimilarity: number;
}

export class LibraryDuplicatesDto {
    @ApiProperty({ 
        type: [DuplicateGroupDto],
        description: 'Groups of duplicate references'
    })
    @IsArray()
    duplicateGroups: DuplicateGroupDto[];

    @ApiProperty({ example: 5, description: 'Total number of duplicate groups' })
    @IsNumber()
    totalGroups: number;

    @ApiProperty({ example: 12, description: 'Total number of duplicate references' })
    @IsNumber()
    totalDuplicates: number;
}

export class MergeDuplicatesDto {
    @ApiProperty({ 
        example: ['14e56bb0-ed2f-4567-bb07-a3b2649ed80d', '24e56bb0-ed2f-4567-bb07-a3b2649ed80e'],
        description: 'Array of reference IDs to merge'
    })
    @IsArray()
    @IsString({ each: true })
    referenceIds: string[];

    @ApiProperty({ 
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d',
        description: 'ID of the reference to keep as master'
    })
    @IsString()
    masterReferenceId: string;

    @ApiPropertyOptional({ 
        example: ['tags', 'notes'],
        description: 'Fields to merge from duplicate references'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    fieldsToMerge?: string[];
}

export class MergeResultDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    masterReferenceId: string;

    @ApiProperty({ 
        example: ['24e56bb0-ed2f-4567-bb07-a3b2649ed80e', '34e56bb0-ed2f-4567-bb07-a3b2649ed80f'],
        description: 'IDs of references that were merged and deleted'
    })
    @IsArray()
    @IsString({ each: true })
    mergedReferenceIds: string[];

    @ApiProperty({ example: 'References merged successfully' })
    @IsString()
    message: string;
}
