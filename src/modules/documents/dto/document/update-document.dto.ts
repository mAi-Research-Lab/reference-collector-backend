import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { CitationStyle } from "../../enums/citation.enum";

export class UpdateDocumentDto {
    @ApiProperty({ example: 'Document Title' })
    title: string
    
    @ApiProperty({ example: 'Document Title' })
    content: string

    @ApiProperty()
    contentDelta: object

    @ApiProperty({example: CitationStyle.APA})
    @IsNotEmpty()
    citationStyle: CitationStyle

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    @IsNotEmpty()
    templateId: string

    @ApiPropertyOptional({ example: 1 })
    version?: number
}