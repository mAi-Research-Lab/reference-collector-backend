import { IsEnum, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportFormat } from '../enums/export-format.enum';
import { CitationStyle } from '../../documents/enums/citation.enum';

// ===== REQUEST DTO'LARI =====

export class ExportOptionsDto {
    @ApiPropertyOptional({
        description: 'Citation style for formatted exports',
        enum: CitationStyle,
        default: CitationStyle.APA
    })
    @IsOptional()
    @IsEnum(CitationStyle)
    citationStyle?: CitationStyle;

    @ApiPropertyOptional({
        description: 'Custom title for the bibliography',
        example: 'My Research Bibliography'
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({
        description: 'Custom filename for the export',
        example: 'my_references'
    })
    @IsOptional()
    @IsString()
    filename?: string;

    @ApiPropertyOptional({
        description: 'Custom CSS for HTML export'
    })
    @IsOptional()
    @IsString()
    customCss?: string;
}

export class SingleExportDto {
    @ApiProperty({
        description: 'Export format',
        enum: ExportFormat,
        example: ExportFormat.BIBTEX
    })
    @IsEnum(ExportFormat)
    format: ExportFormat;

    @ApiProperty({
        description: 'Array of reference IDs to export',
        type: [String],
        example: ['uuid-1', 'uuid-2', 'uuid-3']
    })
    @IsArray()
    @IsString({ each: true })
    referenceIds: string[];

    @ApiPropertyOptional({
        description: 'Export options',
        type: ExportOptionsDto
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => ExportOptionsDto)
    options?: ExportOptionsDto;
}

export class MultipleExportDto {
    @ApiProperty({
        description: 'Export formats',
        enum: ExportFormat,
        isArray: true,
        example: [ExportFormat.BIBTEX, ExportFormat.RIS, ExportFormat.HTML]
    })
    @IsArray()
    @IsEnum(ExportFormat, { each: true })
    formats: ExportFormat[];

    @ApiProperty({
        description: 'Array of reference IDs to export',
        type: [String],
        example: ['uuid-1', 'uuid-2', 'uuid-3']
    })
    @IsArray()
    @IsString({ each: true })
    referenceIds: string[];

    @ApiPropertyOptional({
        description: 'Export options',
        type: ExportOptionsDto
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => ExportOptionsDto)
    options?: ExportOptionsDto;
}

export class ReferenceIdsDto {
    @ApiProperty({
        description: 'Array of reference IDs',
        type: [String],
        example: ['uuid-1', 'uuid-2', 'uuid-3']
    })
    @IsArray()
    @IsString({ each: true })
    referenceIds: string[];
}

// ===== RESPONSE DTO'LARI =====

export class ExportResultDto {
    @ApiProperty({
        description: 'Exported content'
    })
    content: string;

    @ApiProperty({
        description: 'Generated filename'
    })
    filename: string;

    @ApiProperty({
        description: 'MIME type of the exported file'
    })
    mimeType: string;

    @ApiProperty({
        description: 'File size in bytes'
    })
    size: number;

    @ApiProperty({
        description: 'Export format used',
        enum: ExportFormat
    })
    format: ExportFormat;

    @ApiProperty({
        description: 'Export timestamp'
    })
    exportedAt: Date;

    @ApiProperty({
        description: 'Number of references exported'
    })
    totalReferences: number;

    @ApiProperty({
        description: 'Whether content is base64 encoded'
    })
    isBase64: boolean;
}

export class MultipleExportResultDto {
    @ApiProperty({
        description: 'Export results for each format',
        type: [ExportResultDto]
    })
    results: ExportResultDto[];

    @ApiProperty({
        description: 'Overall export statistics'
    })
    statistics: {
        totalFormats: number;
        successfulExports: number;
        failedExports: number;
        totalReferences: number;
    };
}

export class ExportStatisticsDto {
    @ApiProperty({
        description: 'Total number of references'
    })
    totalReferences: number;

    @ApiProperty({
        description: 'References grouped by type',
        example: { journal: 15, book: 8, website: 3 }
    })
    byType: Record<string, number>;

    @ApiProperty({
        description: 'References grouped by year',
        example: { 2023: 10, 2022: 8, 2021: 7 }
    })
    byYear: Record<number, number>;

    @ApiProperty({
        description: 'Number of references with DOI'
    })
    withDoi: number;

    @ApiProperty({
        description: 'Number of references with abstract'
    })
    withAbstract: number;
}

export class ExportValidationDto {
    @ApiProperty({
        description: 'Whether the export data is valid'
    })
    isValid: boolean;

    @ApiProperty({
        description: 'Validation warnings',
        type: [String],
        example: ['Reference 1: Missing authors', 'Reference 3: Missing publication year']
    })
    warnings: string[];

    @ApiProperty({
        description: 'Validation errors',
        type: [String],
        example: ['Reference 2: Missing title']
    })
    errors: string[];
}

export class ExportPreviewDto {
    @ApiProperty({
        description: 'Preview of the exported content'
    })
    preview: string;

    @ApiProperty({
        description: 'Total number of references'
    })
    totalReferences: number;
}

export class SupportedFormatDto {
    @ApiProperty({
        description: 'Format identifier',
        enum: ExportFormat
    })
    format: ExportFormat;

    @ApiProperty({
        description: 'Human-readable format name',
        example: 'BibTeX'
    })
    name: string;

    @ApiProperty({
        description: 'Format description',
        example: 'Academic citation format for LaTeX documents'
    })
    description: string;
}

export class SupportedCitationStyleDto {
    @ApiProperty({
        description: 'Style identifier',
        enum: CitationStyle
    })
    style: CitationStyle;

    @ApiProperty({
        description: 'Human-readable style name',
        example: 'APA (American Psychological Association)'
    })
    name: string;
}

// ===== GENERIC RESPONSE WRAPPER =====

export class ExportResponseDto<T> {
    @ApiProperty({
        description: 'Operation success status'
    })
    success: boolean;

    @ApiProperty({
        description: 'Response message'
    })
    message: string;

    @ApiProperty({
        description: 'Response data'
    })
    data: T;
}

// ===== SPECIFIC RESPONSE TYPES =====

export class SingleExportResponseDto extends ExportResponseDto<ExportResultDto> { }

export class MultipleExportResponseDto extends ExportResponseDto<MultipleExportResultDto> { }

export class ExportStatisticsResponseDto extends ExportResponseDto<ExportStatisticsDto> { }

export class ExportValidationResponseDto extends ExportResponseDto<ExportValidationDto> { }

export class ExportPreviewResponseDto extends ExportResponseDto<ExportPreviewDto> { }

export class SupportedFormatsResponseDto extends ExportResponseDto<SupportedFormatDto[]> { }

export class SupportedCitationStylesResponseDto extends ExportResponseDto<SupportedCitationStyleDto[]> { }

// ===== ERROR RESPONSE DTO =====

export class ExportErrorResponseDto {
    @ApiProperty({
        description: 'Operation success status',
        example: false
    })
    success: boolean;

    @ApiProperty({
        description: 'Error message',
        example: 'Export failed: No references provided for export'
    })
    message: string;

    @ApiProperty({
        description: 'HTTP status code',
        example: 400
    })
    statusCode: number;

    @ApiProperty({
        description: 'Error timestamp',
        example: '2024-01-15T10:30:00.000Z'
    })
    timestamp: string;

    @ApiProperty({
        description: 'Request path',
        example: '/export/references'
    })
    path: string;
}