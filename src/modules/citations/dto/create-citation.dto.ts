// dto/create-citation.dto.ts - Style ID ekle
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCitationDto {
    @ApiProperty({ description: 'Document ID' })
    @IsString()
    documentId: string;

    @ApiProperty({ description: 'Reference ID' })
    @IsString()
    referenceId: string;

    @ApiProperty({ description: 'Citation style ID', required: false })
    @IsOptional()
    @IsString()
    styleId?: string;

    @ApiProperty({ description: 'Page numbers', required: false })
    @IsOptional()
    @IsString()
    pageNumbers?: string;

    @ApiProperty({ description: 'Citation prefix', required: false })
    @IsOptional()
    @IsString()
    prefix?: string;

    @ApiProperty({ description: 'Citation suffix', required: false })
    @IsOptional()
    @IsString()
    suffix?: string;

    @ApiProperty({ description: 'Suppress author name', required: false })
    @IsOptional()
    @IsBoolean()
    suppressAuthor?: boolean;

    @ApiProperty({ description: 'Suppress date', required: false })
    @IsOptional()
    @IsBoolean()
    suppressDate?: boolean;

    @ApiProperty({ description: 'Sort order', required: false })
    @IsOptional()
    @IsNumber()
    sortOrder?: number;

    @ApiProperty({ description: 'Word field ID', required: false })
    @IsOptional()
    @IsString()
    fieldId?: string;
}