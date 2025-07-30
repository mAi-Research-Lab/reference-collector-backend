
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AccessLevel, PdfSourceType } from "../interfaces/pdf-source.interface";

export class PdfResultDto {
    @ApiProperty({
        description: 'Whether PDF was found'
    })
    found: boolean;

    @ApiProperty({
        description: 'Array of PDF results',
    })
    results: PdfResultItemDto[];

    @ApiProperty({
        description: 'Total number of sources searched'
    })
    totalSources: number;

    @ApiProperty({
        description: 'Search time in milliseconds'
    })
    searchTime: number;

    @ApiPropertyOptional({
        description: 'Search errors if any',
        type: [String]
    })
    errors?: string[];
}

export class PdfResultItemDto {
    @ApiProperty({
        description: 'Source name',
        example: 'PubMed Central'
    })
    source: string;

    @ApiProperty({
        description: 'Source type',
        enum: PdfSourceType
    })
    sourceType: PdfSourceType;

    @ApiProperty({
        description: 'PDF download URL'
    })
    url: string;

    @ApiProperty({
        description: 'Confidence score (0-1)',
        example: 0.95
    })
    confidence: number;

    @ApiProperty({
        description: 'Access level required',
        enum: AccessLevel
    })
    accessLevel: AccessLevel;

    @ApiPropertyOptional({
        description: 'File size in bytes'
    })
    fileSize?: number;

    @ApiPropertyOptional({
        description: 'Content type'
    })
    contentType?: string;

    @ApiPropertyOptional({
        description: 'Last verification date'
    })
    lastVerified?: Date;

    @ApiPropertyOptional({
        description: 'Additional metadata'
    })
    metadata?: {
        title?: string;
        filename?: string;
        pages?: number;
        quality?: 'low' | 'medium' | 'high';
    };
}