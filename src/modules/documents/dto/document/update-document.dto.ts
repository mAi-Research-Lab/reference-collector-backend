import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { CitationStyle } from "../../enums/citation.enum";

export class UpdateDocumentDto {
    @ApiProperty({ example: 'Document Title' })
    @IsOptional()
    title: string

    @ApiProperty({ example: 'Document Title' })
    @IsOptional()
    content: string

    @ApiProperty()
    @IsOptional()
    contentDelta: object

    @ApiProperty({ example: CitationStyle.APA })
    @IsOptional()

    citationStyle: CitationStyle

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    @IsOptional()
    templateId?: string

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    version?: number

    @ApiPropertyOptional({ example: 'document', enum: ['notebook', 'document'] })
    @IsOptional()
    @IsIn(['notebook', 'document'])
    documentType?: 'notebook' | 'document'
}