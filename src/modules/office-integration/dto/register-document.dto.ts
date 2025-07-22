import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { Platforms } from 'generated/prisma';

export class RegisterDocumentDto {
    @ApiProperty({
        example: 'C:/Users/john/Documents/MyArticle.docx',
        description: 'Full path to the document file'
    })
    @IsString()
    @IsNotEmpty()
    documentPath: string;

    @ApiProperty({
        example: 'MyArticle.docx',
        description: 'Document filename'
    })
    @IsString()
    @IsNotEmpty()
    documentName: string;

    @ApiProperty({
        example: 'sha256:abc123...',
        description: 'Document hash for change detection'
    })
    @IsString()
    @IsNotEmpty()
    documentHash: string;

    @ApiProperty({
        enum: Platforms,
        example: Platforms.word,
        description: 'Platform where document is being edited'
    })
    @IsEnum(Platforms)
    platform: Platforms;

    @ApiProperty({
        example: 'doc-id-from-google-drive',
        description: 'Platform-specific document identifier',
        required: false
    })
    @IsOptional()
    @IsString()
    platformDocumentId?: string;

    @ApiProperty({
        example: { primaryLibrary: 'lib-uuid-123' },
        description: 'Connected library information'
    })
    @IsOptional()
    @IsObject()
    libraryLinks?: any;

    @ApiProperty({
        example: 'Microsoft Word 365',
        description: 'Word processor type and version'
    })
    @IsOptional()
    @IsString()
    wordProcessorType?: string;

    @ApiProperty({
        example: { version: '16.0', buildNumber: '12345' },
        description: 'Version information of the platform'
    })
    @IsOptional()
    @IsObject()
    versionInfo?: any;
}