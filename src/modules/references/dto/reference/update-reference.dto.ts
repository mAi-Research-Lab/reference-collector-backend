import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsInt, IsArray, IsUUID, Min, Max } from "class-validator";

export class UpdateReferenceDto {
    @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsOptional()
    @IsString()
    collectionId?: string

    @ApiPropertyOptional({ example: 'journal', description: 'Type of reference (journal, book, conference, etc.)' })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiPropertyOptional({ example: 'Updated Machine Learning in Healthcare: A Comprehensive Review' })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({
        example: [
            { "name": "John Doe", "affiliation": "MIT" },
            { "name": "Jane Smith", "affiliation": "Harvard" }
        ],
        description: 'Array of author objects'
    })
    @IsOptional()
    authors?: any;

    @ApiPropertyOptional({
        example: [
            { "name": "Robert Johnson", "affiliation": "Stanford" }
        ],
        description: 'Array of editor objects'
    })
    @IsOptional()
    editors?: any;

    @ApiPropertyOptional({ example: 'Nature Medicine' })
    @IsString()
    @IsOptional()
    publication?: string;

    @ApiPropertyOptional({ example: 'Nature Publishing Group' })
    @IsString()
    @IsOptional()
    publisher?: string;

    @ApiPropertyOptional({ example: 2024 })
    @IsInt()
    @Min(1000)
    @Max(new Date().getFullYear() + 10)
    @IsOptional()
    year?: number;

    @ApiPropertyOptional({ example: '30' })
    @IsString()
    @IsOptional()
    volume?: string;

    @ApiPropertyOptional({ example: '5' })
    @IsString()
    @IsOptional()
    issue?: string;

    @ApiPropertyOptional({ example: '500-512' })
    @IsString()
    @IsOptional()
    pages?: string;

    @ApiPropertyOptional({ example: '10.1038/s41591-023-02394-1' })
    @IsString()
    @IsOptional()
    doi?: string;

    @ApiPropertyOptional({ example: '978-3-16-148410-1' })
    @IsString()
    @IsOptional()
    isbn?: string;

    @ApiPropertyOptional({ example: '1078-8957' })
    @IsString()
    @IsOptional()
    issn?: string;

    @ApiPropertyOptional({ example: 'https://www.nature.com/articles/s41591-023-02394-1' })
    @IsString()
    @IsOptional()
    url?: string;

    @ApiPropertyOptional({
        example: 'Updated abstract: This comprehensive review examines the current state and future prospects...',
        description: 'Abstract of the reference'
    })
    @IsString()
    @IsOptional()
    abstractText?: string;

    @ApiPropertyOptional({ example: 'English' })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional({
        example: {
            "keywords": ["machine learning", "healthcare", "AI", "updated"],
            "impact_factor": 88.5,
            "open_access": true,
            "updated": true
        },
        description: 'Additional metadata as JSON object'
    })
    @IsOptional()
    metadata?: any;

    @ApiPropertyOptional({
        example: ['machine-learning', 'healthcare', 'artificial-intelligence', 'updated'],
        description: 'Array of tags'
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    tags?: string[];

    @ApiPropertyOptional({
        example: 'Updated notes: Important paper for research project. Follow up completed.',
        description: 'Personal notes about the reference'
    })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional({ example: 150, description: 'Updated number of citations' })
    @IsInt()
    @Min(0)
    @IsOptional()
    citationCount?: number;

    @ApiPropertyOptional({
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d',
        description: 'User ID who modified this reference'
    })
    @IsString()
    @IsUUID()
    @IsOptional()
    modifiedBy?: string;
}