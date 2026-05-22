import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProformaInvoiceDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    invoiceNumber?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    invoiceDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    customerName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    customerAddress?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    serviceName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    servicePeriod?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    unitPrice?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    kdvRate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    totalAmount?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    signatureName?: string;
}
