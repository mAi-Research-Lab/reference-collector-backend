import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class UpdateReferenceDto {
    @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsOptional()
    collectionId?: string

    @ApiPropertyOptional({ example: 'journal', description: 'Type of reference (journal, book, conference, etc.)' })
    @IsOptional()
    type?: string;

    @ApiPropertyOptional({ example: 'Updated Machine Learning in Healthcare: A Comprehensive Review' })
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
    @IsOptional()
    publication?: string;

    @ApiPropertyOptional({ example: 'Nature Publishing Group' })
    @IsOptional()
    publisher?: string;

    @ApiPropertyOptional({ example: 2024 })
    @IsOptional()
    year?: number;

    @ApiPropertyOptional({ example: '30' })
    @IsOptional()
    volume?: string;

    @ApiPropertyOptional({ example: '5' })
    @IsOptional()
    issue?: string;

    @ApiPropertyOptional({ example: '500-512' })
    @IsOptional()
    pages?: string;

    @ApiPropertyOptional({ example: '10.1038/s41591-023-02394-1' })
    @IsOptional()
    doi?: string;

    @ApiPropertyOptional({ example: '978-3-16-148410-1' })
    @IsOptional()
    isbn?: string;

    @ApiPropertyOptional({ example: '1078-8957' })
    @IsOptional()
    issn?: string;

    @ApiPropertyOptional({ example: 'https://www.nature.com/articles/s41591-023-02394-1' })
    @IsOptional()
    url?: string;

    @ApiPropertyOptional({
        example: 'Updated abstract: This comprehensive review examines the current state and future prospects...',
        description: 'Abstract of the reference'
    })
    @IsOptional()
    abstractText?: string;

    @ApiPropertyOptional({ example: 'English' })
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
    @IsOptional()
    tags?: string[];

    @ApiPropertyOptional({
        example: 'Updated notes: Important paper for research project. Follow up completed.',
        description: 'Personal notes about the reference'
    })
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional({ example: 150, description: 'Updated number of citations' })
    @IsOptional()
    citationCount?: number;

    @ApiPropertyOptional({
        example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d',
        description: 'User ID who modified this reference'
    })
    @IsOptional()
    modifiedBy?: string;
}