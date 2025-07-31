import { IsOptional, IsString, IsArray, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PdfSourceType } from '../interfaces/pdf-source.interface';
import { Type } from 'class-transformer';
import { DownloadOptionsDto } from './download-options.dto';

export class PdfSearchDto {
    @ApiPropertyOptional({
        description: 'DOI of the reference',
        example: '10.1038/nature12373'
    })
    @IsOptional()
    @IsString()
    doi?: string;

    @ApiPropertyOptional({
        description: 'Title of the reference',
        example: 'Machine Learning in Healthcare'
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({
        description: 'Authors of the reference',
        type: [String],
        example: ['Smith, John', 'Doe, Jane']
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    authors?: string[];

    @ApiPropertyOptional({
        description: 'Journal name',
        example: 'Nature Medicine'
    })
    @IsOptional()
    @IsString()
    journal?: string;

    @ApiPropertyOptional({
        description: 'Publication year',
        example: 2023
    })
    @IsOptional()
    @IsNumber()
    year?: number;

    @ApiPropertyOptional({
        description: 'PubMed ID',
        example: '12345678'
    })
    @IsOptional()
    @IsString()
    pmid?: string;

    @ApiPropertyOptional({
        description: 'ISBN for books',
        example: '978-0-123456-78-9'
    })
    @IsOptional()
    @IsString()
    isbn?: string;

    @ApiPropertyOptional({
        description: 'Source types to search',
        enum: PdfSourceType,
        isArray: true
    })
    @IsOptional()
    @IsArray()
    @IsEnum(PdfSourceType, { each: true })
    sourceTypes?: PdfSourceType[];

    @ApiPropertyOptional({
        description: 'Maximum number of results to return',
        example: 10,
        default: 10
    })
    @IsOptional()
    @IsNumber()
    maxResults?: number;

    @ApiPropertyOptional({
        description: 'Search timeout in seconds',
        example: 30,
        default: 30
    })
    @IsOptional()
    @IsNumber()
    timeout?: number;
}

export class DownloadRequestDto {
    @ApiProperty({ type: PdfSearchDto })
    @ValidateNested()
    @Type(() => PdfSearchDto)
    query: PdfSearchDto;

    @ApiProperty({ type: DownloadOptionsDto })
    @ValidateNested()
    @Type(() => DownloadOptionsDto)
    options: DownloadOptionsDto;
}

