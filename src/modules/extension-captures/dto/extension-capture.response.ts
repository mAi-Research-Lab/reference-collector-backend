import { ApiProperty } from "@nestjs/swagger";

export class ExtensionCaptureResponse {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    userId: string;

    @ApiProperty({ example: 'https://www.nature.com/articles/s41586-023-12345-6' })
    url: string;

    @ApiProperty({ example: 'Machine learning advances in climate prediction' })
    title: string;

    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    referenceId?: string | null; // Created reference ID if successful

    @ApiProperty({ example: 'Failed to extract authors' })
    errorMessage?: string | null;

    @ApiProperty({ example: 'zotero-translator' })
    translatorUsed: string | null;

    @ApiProperty({ example: '2023-12-01T10:30:00.000Z' })
    createdAt: Date;
}