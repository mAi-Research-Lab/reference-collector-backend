import { ApiProperty } from '@nestjs/swagger';
import { Platforms, SyncStatus } from 'generated/prisma';
import { JsonValue } from 'generated/prisma/runtime/library';

export class OfficeDocumentResponse {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    userId: string;

    @ApiProperty({ example: 'C:/Users/john/Documents/MyArticle.docx' })
    documentPath: string;

    @ApiProperty({ example: 'MyArticle.docx' })
    documentName: string;

    @ApiProperty({ example: 'sha256:abc123...' })
    documentHash: string;

    @ApiProperty({ enum: Platforms, example: Platforms.word })
    platform: Platforms;

    @ApiProperty({ example: 'doc-id-from-google-drive' })
    platformDocumentId?: string | null;

    @ApiProperty({
        example: {
            'citation-1': 'ref-uuid-1',
            'citation-2': 'ref-uuid-2'
        }
    })
    citationMapping: JsonValue;

    @ApiProperty({
        example: {
            primaryLibrary: 'lib-uuid-123',
            secondaryLibraries: ['lib-uuid-456']
        }
    })
    libraryLinks: JsonValue;

    @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
    lastSync?: Date | null;

    @ApiProperty({ example: 'Microsoft Word 365' })
    wordProcessorType: string;

    @ApiProperty({
        example: {
            version: '16.0',
            buildNumber: '12345'
        }
    })
    versionInfo: JsonValue;

    @ApiProperty({ enum: SyncStatus, example: SyncStatus.synced })
    syncStatus: SyncStatus;

    @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
    createdAt: Date;

    @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
    updatedAt: Date;
}