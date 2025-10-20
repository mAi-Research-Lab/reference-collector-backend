import { ApiProperty } from "@nestjs/swagger";
import { JsonValue } from "generated/prisma/runtime/library";
import { ReferencesResponse } from "src/modules/references/dto/reference/references.response";

export class CitationResponse {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d', required: false })
    documentId?: string | null;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    referenceId: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    fieldId?: string | null;

    @ApiProperty({ example: '(Smith, 2023, p. 45)' })
    citationText: string;

    @ApiProperty({ example: '45-47' })
    pageNumbers?: string | null;

    @ApiProperty({ example: 'see also' })
    prefix?: string | null;

    @ApiProperty({ example: 'for more details' })
    suffix?: string | null;

    @ApiProperty({ example: false })
    suppressAuthor: boolean;

    @ApiProperty({ example: false })
    suppressDate: boolean;

    @ApiProperty({ example: { paragraph: 5, line: 12 } })
    locationData?: JsonValue | null;

    @ApiProperty({ example: { font_style: 'italic' } })
    styleOverride?: JsonValue | null;

    @ApiProperty({ example: 1 })
    sortOrder: number;

    @ApiProperty({ example: '2022-01-01T00:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ example: '2022-01-01T00:00:00.000Z' })
    updatedAt: Date;
}

export class CitationResponseWithReferences extends CitationResponse {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    reference: ReferencesResponse
}