import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum QuoteParaphraseType {
    QUOTE = 'quote',
    PARAPHRASE = 'paraphrase'
}

export class ReferenceDataDto {
    @ApiPropertyOptional({ example: ['John Doe', 'Jane Smith'] })
    @IsOptional()
    @IsArray()
    authors?: string | string[];

    @ApiPropertyOptional({ example: 'Research Paper Title' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ example: 2023 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    year?: number;

    @ApiPropertyOptional({ example: 'Journal Name' })
    @IsOptional()
    @IsString()
    publication?: string;

    @ApiPropertyOptional({ example: '10.1234/example' })
    @IsOptional()
    @IsString()
    doi?: string;

    @ApiPropertyOptional({ example: '1-10' })
    @IsOptional()
    @IsString()
    pages?: string;

    @ApiPropertyOptional({ example: '42' })
    @IsOptional()
    @IsString()
    volume?: string;
}

export class QuoteParaphraseDto {
    @ApiProperty({ enum: QuoteParaphraseType, example: 'quote' })
    @IsEnum(QuoteParaphraseType)
    @IsNotEmpty()
    type: QuoteParaphraseType;

    @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsOptional()
    @IsString()
    referenceId?: string;

    @ApiPropertyOptional({ description: 'Reference data when referenceId is not available (e.g., from Semantic Scholar)' })
    @IsOptional()
    @IsObject()
    @Type(() => ReferenceDataDto)
    referenceData?: ReferenceDataDto;

    @ApiProperty({ example: 'This is the selected text from the PDF.' })
    @IsString()
    @IsNotEmpty()
    selectedText: string;

    @ApiPropertyOptional({ example: 42 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    pageNumber?: number;

    @ApiPropertyOptional({ example: 'apa' })
    @IsOptional()
    @IsString()
    styleId?: string;
}

export class QuoteParaphraseResponse {
    @ApiProperty({ example: 'This is the final text (quote or paraphrase).' })
    content: string;

    @ApiProperty({ example: '(Smith, 2023, p. 42)' })
    citation: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    referenceId: string;
}

