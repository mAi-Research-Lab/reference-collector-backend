import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";

export class SyncConflictDto {
    @ApiProperty({
        description: 'Type of conflict detected',
        example: 'citation_format',
        enum: ['citation_format', 'metadata_update', 'bibliography_order', 'reference_deletion', 'style_change']
    })
    @IsString()
    conflictType: string;

    @ApiProperty({
        description: 'Specific field where conflict occurred',
        example: 'author_display'
    })
    @IsString()
    field: string;

    @ApiProperty({
        description: 'Version of data from Word/Office platform',
        example: {
            authors: ['Smith, J.', 'Doe, A.'],
            title: 'Machine Learning in Medicine',
            year: 2023
        }
    })
    @IsOptional()
    wordVersion?: any;

    @ApiProperty({
        description: 'Version of data from web platform',
        example: {
            authors: ['Smith, John', 'Doe, Alice'],
            title: 'Machine Learning Applications in Healthcare',
            year: 2023
        }
    })
    @IsOptional()
    webVersion?: any;

    @ApiProperty({
        description: 'Additional metadata about the conflict',
        example: {
            timestamp: '2025-07-21T10:35:00Z',
            platform: 'word',
            userId: 'user_123',
            documentSection: 'page_3_paragraph_2'
        }
    })
    @IsOptional()
    @IsObject()
    metadata?: {
        timestamp?: string;
        platform?: string;
        userId?: string;
        documentSection?: string;
    };
}