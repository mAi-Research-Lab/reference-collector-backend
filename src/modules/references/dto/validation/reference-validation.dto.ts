import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsBoolean } from 'class-validator';

export class ValidationResultDto {
    @ApiProperty({ example: true, description: 'Whether the field is valid' })
    @IsBoolean()
    isValid: boolean;

    @ApiProperty({ example: 'doi', description: 'Field that was validated' })
    @IsString()
    field: string;

    @ApiProperty({ example: '10.1000/182', description: 'Value that was validated' })
    @IsString()
    value: string;

    @ApiPropertyOptional({ example: 'Invalid DOI format', description: 'Error message if validation failed' })
    @IsOptional()
    @IsString()
    error?: string;

    @ApiPropertyOptional({ example: 'Use format: 10.xxxx/xxxxxx', description: 'Suggestion for fixing the error' })
    @IsOptional()
    @IsString()
    suggestion?: string;

    @ApiPropertyOptional({ description: 'Additional metadata from validation' })
    @IsOptional()
    metadata?: any;
}

export class ComprehensiveValidationResultDto {
    @ApiProperty({ example: true, description: 'Whether all validations passed' })
    @IsBoolean()
    isValid: boolean;

    @ApiProperty({ 
        type: [ValidationResultDto],
        description: 'Individual validation results for each field'
    })
    @IsArray()
    results: ValidationResultDto[];

    @ApiProperty({ example: 85, description: 'Validation score from 0-100' })
    @IsNumber()
    score: number;

    @ApiProperty({ 
        example: ['Invalid DOI format', 'Missing abstract'],
        description: 'Warning messages'
    })
    @IsArray()
    @IsString({ each: true })
    warnings: string[];

    @ApiProperty({ 
        example: ['Consider adding a DOI', 'Add tags for better organization'],
        description: 'Suggestions for improvement'
    })
    @IsArray()
    @IsString({ each: true })
    suggestions: string[];
}

export class ValidateReferenceDto {
    @ApiPropertyOptional({ example: 'journal' })
    @IsOptional()
    @IsString()
    type?: string;

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

    @ApiPropertyOptional({ example: '1234-5678' })
    @IsOptional()
    @IsString()
    issn?: string;

    @ApiPropertyOptional({ example: 'https://example.com/paper.pdf' })
    @IsOptional()
    @IsString()
    url?: string;

    @ApiPropertyOptional({ example: 2023 })
    @IsOptional()
    @IsNumber()
    year?: number;

    @ApiPropertyOptional({ 
        example: [
            { "name": "John Doe", "affiliation": "MIT" },
            { "name": "Jane Smith", "affiliation": "Harvard" }
        ]
    })
    @IsOptional()
    authors?: any;

    @ApiPropertyOptional({ example: 'Nature Medicine' })
    @IsOptional()
    @IsString()
    publication?: string;

    @ApiPropertyOptional({ example: 'This paper presents a comprehensive review...' })
    @IsOptional()
    @IsString()
    abstractText?: string;

    @ApiPropertyOptional({ 
        example: ['machine-learning', 'healthcare'],
        description: 'Array of tags'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
}

export class ValidateFieldDto {
    @ApiProperty({ 
        example: 'doi',
        enum: ['doi', 'isbn', 'issn', 'url', 'year', 'title', 'authors'],
        description: 'Field type to validate'
    })
    @IsString()
    fieldType: 'doi' | 'isbn' | 'issn' | 'url' | 'year' | 'title' | 'authors';

    @ApiProperty({ example: '10.1000/182', description: 'Value to validate' })
    @IsString()
    value: string;
}

export class BatchValidationDto {
    @ApiProperty({ 
        type: [ValidateReferenceDto],
        description: 'Array of references to validate'
    })
    @IsArray()
    references: ValidateReferenceDto[];

    @ApiPropertyOptional({ 
        example: ['doi', 'isbn', 'title'],
        description: 'Specific fields to validate (if not provided, validates all fields)'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    fieldsToValidate?: string[];

    @ApiPropertyOptional({ 
        example: true,
        description: 'Whether to stop on first error or continue validating all references'
    })
    @IsOptional()
    @IsBoolean()
    stopOnError?: boolean;
}

export class BatchValidationResultDto {
    @ApiProperty({ example: 5, description: 'Total number of references validated' })
    @IsNumber()
    totalReferences: number;

    @ApiProperty({ example: 3, description: 'Number of valid references' })
    @IsNumber()
    validReferences: number;

    @ApiProperty({ example: 2, description: 'Number of invalid references' })
    @IsNumber()
    invalidReferences: number;

    @ApiProperty({ 
        type: [ComprehensiveValidationResultDto],
        description: 'Validation results for each reference'
    })
    @IsArray()
    results: ComprehensiveValidationResultDto[];

    @ApiProperty({ example: 75, description: 'Overall validation score' })
    @IsNumber()
    overallScore: number;

    @ApiProperty({ 
        example: ['3 references have invalid DOIs', '2 references missing abstracts'],
        description: 'Summary of common issues'
    })
    @IsArray()
    @IsString({ each: true })
    summary: string[];
}

export class ValidationStatsDto {
    @ApiProperty({ example: 'doi', description: 'Field name' })
    @IsString()
    field: string;

    @ApiProperty({ example: 85, description: 'Validation success rate percentage' })
    @IsNumber()
    successRate: number;

    @ApiProperty({ example: 120, description: 'Total validations performed' })
    @IsNumber()
    totalValidations: number;

    @ApiProperty({ example: 102, description: 'Successful validations' })
    @IsNumber()
    successfulValidations: number;

    @ApiProperty({ 
        example: ['Invalid format', 'Not found in database'],
        description: 'Common error types'
    })
    @IsArray()
    @IsString({ each: true })
    commonErrors: string[];
}
