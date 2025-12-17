import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsInt, IsUUID, Min, Max } from "class-validator";
import { JsonValue } from "generated/prisma/runtime/library";

export class CreateReferenceDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsOptional()
    @IsString()
    collectionId?: string

    @ApiProperty({ example: 'journal', description: 'Type of reference (journal, book, conference, etc.)' })
    @IsString()
    type?: string;

    @ApiProperty({ example: 'Machine Learning in Healthcare: A Comprehensive Review' })
    @IsString()
    @IsNotEmpty()
    title: string;

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

    @ApiPropertyOptional({ example: 2023 })
    @IsInt()
    @Min(1000)
    @Max(new Date().getFullYear() + 10)
    @IsOptional()
    year?: number;

    @ApiPropertyOptional({ example: '29' })
    @IsString()
    @IsOptional()
    volume?: string;

    @ApiPropertyOptional({ example: '4' })
    @IsString()
    @IsOptional()
    issue?: string;

    @ApiPropertyOptional({ example: '456-467' })
    @IsString()
    @IsOptional()
    pages?: string;

    @ApiPropertyOptional({ example: '10.1038/s41591-023-02394-0' })
    @IsString()
    @IsOptional()
    doi?: string;

    @ApiPropertyOptional({ example: '978-3-16-148410-0' })
    @IsString()
    @IsOptional()
    isbn?: string;

    @ApiPropertyOptional({ example: '1078-8956' })
    @IsString()
    @IsOptional()
    issn?: string;

    @ApiPropertyOptional({ example: 'https://www.nature.com/articles/s41591-023-02394-0' })
    @IsString()
    @IsOptional()
    url?: string;

    @ApiPropertyOptional({
        example: 'This comprehensive review examines the current state and future prospects of machine learning applications in healthcare...',
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
            "keywords": ["machine learning", "healthcare", "AI"],
            "impact_factor": 87.241,
            "open_access": true
        },
        description: 'Additional metadata as JSON object'
    })
    @IsOptional()
    metadata?: any;

    @ApiPropertyOptional({
        example: [
            { name: 'machine-learning', color: '#ff0000' },
            { name: 'healthcare', color: '#00ff00' },],
        description: 'Array of tags'
    })
    @IsOptional()
    tags?: JsonValue;

    @ApiPropertyOptional({
        example: 'Important paper for research project. Follow up with author.',
        description: 'Personal notes about the reference'
    })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    @IsNotEmpty()
    @IsUUID()
    addedBy: string;

    @ApiPropertyOptional({ example: 145, description: 'Number of citations' })
    @IsInt()
    @Min(0)
    @IsOptional()
    citationCount?: number;
}