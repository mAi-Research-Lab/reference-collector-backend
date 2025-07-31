import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export interface ProxyConfig {
    host: string;
    port: number;
    auth?: {
        username: string;
        password: string;
    };
}

export interface ContentTypeResult {
    isValidPdf: boolean;
    contentType: string;
    contentLength?: number;
    error?: string;
}

export class DownloadOptionsDto {
    @ApiProperty({
        description: 'Reference ID to download PDF for'
    })
    @IsString()
    referenceId: string;

    @ApiPropertyOptional({
        description: 'Preferred source to download from'
    })
    @IsOptional()
    @IsString()
    preferredSource?: string;

    @ApiPropertyOptional({
        description: 'Whether to overwrite existing PDF',
        default: false
    })
    @IsOptional()
    @IsBoolean()
    overwrite?: boolean;

    @ApiPropertyOptional({
        description: 'Maximum file size in MB',
        example: 50,
        default: 50
    })
    @IsOptional()
    @IsNumber()
    maxFileSize?: number;

    @ApiPropertyOptional({
        description: 'Download timeout in seconds',
        example: 120,
        default: 120
    })
    @IsOptional()
    @IsNumber()
    timeout?: number;

    @ApiPropertyOptional({
        description: 'Whether to validate PDF after download',
        default: true
    })
    @IsOptional()
    @IsBoolean()
    validatePdf?: boolean;

    @ApiPropertyOptional({
        description: 'Target directory to download PDF to'
    })
    @IsOptional()
    @IsString()
    targetDirectory?: string;

    @ApiPropertyOptional({
        description: 'Whether to use proxy',
        default: false
    })
    @IsOptional()
    @IsBoolean()
    useProxy?: boolean;

    @ApiPropertyOptional({
        description: 'Proxy configuration'
    })
    @IsOptional()
    proxyConfig?: ProxyConfig;
}

export class PdfValidationResultDto {
    @ApiProperty({
        description: 'Whether PDF is valid'
    })
    isValid: boolean;

    @ApiProperty({
        description: 'File size in bytes'
    })
    fileSize: number;

    @ApiPropertyOptional({
        description: 'Number of pages'
    })
    pageCount?: number;

    @ApiProperty({
        description: 'Whether PDF contains extractable text'
    })
    hasText: boolean;

    @ApiProperty({
        description: 'PDF quality assessment',
        enum: ['low', 'medium', 'high']
    })
    quality: 'low' | 'medium' | 'high';

    @ApiPropertyOptional({
        description: 'Validation errors if any',
        type: [String]
    })
    errors?: string[];
}

export class DownloadResultDto {
    @ApiProperty({
        description: 'Whether download was successful'
    })
    success: boolean;

    @ApiPropertyOptional({
        description: 'Downloaded file path'
    })
    filePath?: string;

    @ApiPropertyOptional({
        description: 'File size in bytes'
    })
    fileSize?: number;

    @ApiPropertyOptional({
        description: 'Content type'
    })
    contentType?: string;

    @ApiPropertyOptional({
        description: 'Download time in milliseconds'
    })
    downloadTime?: number;

    @ApiPropertyOptional({
        description: 'Error message if download failed'
    })
    error?: string;

    @ApiProperty({
        description: 'Source used for download'
    })
    source: string;

    @ApiPropertyOptional({
        description: 'PDF validation result'
    })
    validation?: PdfValidationResultDto;
}

