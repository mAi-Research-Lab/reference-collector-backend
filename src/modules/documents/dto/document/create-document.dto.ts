import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { CitationStyle } from "../../enums/citation.enum";
import { ContentDeltaDto } from "./content-delta.dto";
import { Type } from "class-transformer";

export class CreateDocumentDto {
    @ApiProperty({ example: 'Document Title' })
    @IsString()
    @IsNotEmpty()
    title: string

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    @IsNotEmpty()
    libraryId: string

    @ApiProperty({ example: 'Document Title' })
    @IsString()
    @IsNotEmpty()
    content: string

    @ApiProperty({
        description: 'User preferences',
        type: ContentDeltaDto,
        example: {
            ops: [
                {
                    retain: 1,
                    attributes: {
                        bold: true
                    },
                },
                {
                    insert: 'Hello World',
                    attributes: {
                        bold: true
                    },
                }
            ],
            timestamp: '2022-01-01T00:00:00.000Z',
            version: 1
        }
    })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => ContentDeltaDto)
    contentDelta: ContentDeltaDto

    @ApiProperty({ example: CitationStyle.APA })
    @IsNotEmpty()
    citationStyle: CitationStyle

    @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    templateId?: string

    @ApiPropertyOptional({ example: 1 })
    version?: number
}