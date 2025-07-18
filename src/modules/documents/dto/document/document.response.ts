import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CitationStyle } from "../../enums/citation.enum";
import { ContentDeltaDto } from "./content-delta.dto";

export class DocumentResponse {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string

    @ApiProperty({ example: 'Document Title' })
    title: string
    
    @ApiProperty({ example: 'Document Title' })
    content: string

    @ApiProperty()
    contentDelta: ContentDeltaDto | null

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    createdBy: string

    @ApiProperty({example: CitationStyle.APA})
    citationStyle: CitationStyle

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    templateId: string

    @ApiPropertyOptional({ example: 1 })
    wordCount: number

    @ApiPropertyOptional({ example: 1 })
    charCount: number

    @ApiPropertyOptional({ example: 1 })
    version?: number

    @ApiProperty({ example: true })
    isPublished: boolean

    @ApiProperty({ example: true })
    isDeleted: boolean

    @ApiProperty({example: '2022-01-01T00:00:00.000Z'})
    publishedAt: Date

    @ApiProperty({example: '2022-01-01T00:00:00.000Z'})
    createdAt: Date

    @ApiProperty({example: '2022-01-01T00:00:00.000Z'})
    updatedAt: Date
}