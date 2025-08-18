import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsEnum } from 'class-validator';

export enum IdentifierType {
    DOI = 'doi',
    ISBN = 'isbn',
    PMID = 'pmid',
    ARXIV = 'arxiv',
    ADS_BIBCODE = 'ads_bibcode',
    URL = 'url'
}

export class QuickImportDto {
    @ApiProperty({
        example: '10.1038/s41591-023-02394-0',
        description: 'The identifier to import (DOI, ISBN, PMID, arXiv ID, ADS Bibcode, or URL)'
    })
    @IsString()
    identifier: string;

    @ApiPropertyOptional({
        enum: IdentifierType,
        example: IdentifierType.DOI,
        description: 'Type of identifier (auto-detected if not provided)'
    })
    @IsOptional()
    @IsEnum(IdentifierType)
    identifierType?: IdentifierType;

    @ApiPropertyOptional({
        example: '34e56bb0-ed2f-4567-bb07-a3b2649ed80f',
        description: 'Collection ID to add the reference to'
    })
    @IsOptional()
    @IsString()
    collectionId?: string;

    @ApiPropertyOptional({
        example: ['machine-learning', 'healthcare'],
        description: 'Tags to add to the imported reference'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({
        example: 'Imported from quick import feature',
        description: 'Notes to add to the imported reference'
    })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({
        example: true,
        description: 'Whether to check for duplicates before importing'
    })
    @IsOptional()
    @IsBoolean()
    checkDuplicates?: boolean;

    @ApiPropertyOptional({
        example: false,
        description: 'Whether to overwrite existing reference if duplicate is found'
    })
    @IsOptional()
    @IsBoolean()
    overwriteIfDuplicate?: boolean;
}

export class QuickImportResultDto {
    @ApiProperty({ example: true, description: 'Whether the import was successful' })
    @IsBoolean()
    success: boolean;

    @ApiProperty({ example: 'doi', description: 'Type of identifier that was used' })
    @IsString()
    identifierType: string;

    @ApiProperty({ example: '10.1038/s41591-023-02394-0', description: 'The identifier that was processed' })
    @IsString()
    identifier: string;

    @ApiProperty({ example: 'crossref', description: 'Source used to fetch metadata' })
    @IsString()
    source: string;

    @ApiPropertyOptional({ description: 'The created reference data' })
    @IsOptional()
    reference?: any;

    @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsOptional()
    @IsString()
    referenceId?: string;

    @ApiProperty({ example: 0.95, description: 'Confidence score of the import (0-1)' })
    confidence: number;

    @ApiProperty({
        example: ['title', 'authors', 'year', 'publication'],
        description: 'Fields that were imported'
    })
    @IsArray()
    @IsString({ each: true })
    importedFields: string[];

    @ApiProperty({
        example: [],
        description: 'Warning messages during import'
    })
    @IsArray()
    @IsString({ each: true })
    warnings: string[];

    @ApiPropertyOptional({ example: 'No errors' })
    @IsOptional()
    @IsString()
    error?: string;

    @ApiPropertyOptional({
        example: { duplicate: false, existingReferenceId: null },
        description: 'Duplicate check results'
    })
    @IsOptional()
    duplicateInfo?: {
        duplicate: boolean;
        existingReferenceId?: string;
        similarity?: number;
    };
}

export class BatchQuickImportDto {
    @ApiProperty({
        example: [
            '10.1038/s41591-023-02394-0',
            '978-0123456789',
            'arXiv:2301.12345',
            '2023Sci...379..123S'
        ],
        description: 'Array of identifiers to import'
    })
    @IsArray()
    @IsString({ each: true })
    identifiers: string[];

    @ApiPropertyOptional({
        example: '34e56bb0-ed2f-4567-bb07-a3b2649ed80f',
        description: 'Collection ID to add all references to'
    })
    @IsOptional()
    @IsString()
    collectionId?: string;

    @ApiPropertyOptional({
        example: ['batch-import', 'research'],
        description: 'Tags to add to all imported references'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    commonTags?: string[];

    @ApiPropertyOptional({
        example: true,
        description: 'Whether to check for duplicates before importing'
    })
    @IsOptional()
    @IsBoolean()
    checkDuplicates?: boolean;

    @ApiPropertyOptional({
        example: false,
        description: 'Whether to continue on errors or stop at first failure'
    })
    @IsOptional()
    @IsBoolean()
    continueOnError?: boolean;

    @ApiPropertyOptional({
        example: 10,
        description: 'Maximum number of concurrent imports'
    })
    @IsOptional()
    maxConcurrent?: number;
}

export class BatchQuickImportResultDto {
    @ApiProperty({ example: 4, description: 'Total number of identifiers processed' })
    totalProcessed: number;

    @ApiProperty({ example: 3, description: 'Number of successful imports' })
    successfulImports: number;

    @ApiProperty({ example: 1, description: 'Number of failed imports' })
    failedImports: number;

    @ApiProperty({ example: 0, description: 'Number of duplicates found' })
    duplicatesFound: number;

    @ApiProperty({
        type: [QuickImportResultDto],
        description: 'Individual import results'
    })
    @IsArray()
    results: QuickImportResultDto[];

    @ApiProperty({ example: 0.75, description: 'Overall success rate' })
    successRate: number;

    @ApiProperty({
        example: ['3 references imported successfully', '1 reference failed due to invalid DOI'],
        description: 'Summary of batch operation'
    })
    @IsArray()
    @IsString({ each: true })
    summary: string[];

    @ApiProperty({ example: 1500, description: 'Total processing time in milliseconds' })
    processingTime: number;
}

export class IdentifierValidationDto {
    @ApiProperty({ example: true, description: 'Whether the identifier is valid' })
    @IsBoolean()
    isValid: boolean;

    @ApiProperty({ example: 'doi', description: 'Detected identifier type' })
    @IsString()
    detectedType: string;

    @ApiProperty({ example: '10.1038/s41591-023-02394-0', description: 'Normalized identifier' })
    @IsString()
    normalizedIdentifier: string;

    @ApiPropertyOptional({ example: 'crossref', description: 'Best source for this identifier type' })
    @IsOptional()
    @IsString()
    recommendedSource?: string;

    @ApiPropertyOptional({ example: 'Invalid DOI format' })
    @IsOptional()
    @IsString()
    error?: string;

    @ApiPropertyOptional({
        example: { title: 'Machine Learning in Healthcare', authors: ['John Doe'] },
        description: 'Preview of available metadata'
    })
    @IsOptional()
    metadataPreview?: any;
}

export class SearchImportDto {
    @ApiProperty({ example: 'Machine Learning in Healthcare', description: 'Title to search for' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ example: 'John Doe', description: 'Author name to help narrow search' })
    @IsOptional()
    @IsString()
    author?: string;

    @ApiPropertyOptional({ example: 2023, description: 'Publication year' })
    @IsOptional()
    year?: number;

    @ApiPropertyOptional({ example: 'Nature Medicine', description: 'Journal/publication name' })
    @IsOptional()
    @IsString()
    journal?: string;

    @ApiPropertyOptional({
        example: true,
        description: 'Whether to automatically import the best match'
    })
    @IsOptional()
    @IsBoolean()
    autoImport?: boolean;

    @ApiPropertyOptional({
        example: 0.8,
        description: 'Minimum confidence threshold for auto-import'
    })
    @IsOptional()
    confidenceThreshold?: number;
}