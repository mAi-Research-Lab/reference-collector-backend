import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";
import { Category } from "../../enums/style.enums";
import { StyleConfig } from "../../interfaces/style.interface";

export class UpdateDocumentTemplateDto {
    @ApiProperty({ example: 'Document Template Name' })
    @IsString()
    name: string

    @ApiProperty({ example: 'Document Template Description' })
    @IsString()
    description?: string

    @ApiProperty({ example: 'Document Template Content' })
    @IsString()
    content: string

    @ApiProperty({
        example: {
            page: {
                size: 'A4',
                orientation: 'portrait',
                margins: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0
                }
            },
            typography: {
                font_family: 'Arial',
                font_size: 12,
                line_height: 1.5,
                text_color: '#000000'
            },
            headings: {
                h1: {
                    font_size: 24,
                    font_weight: 'bold',
                    margin_top: 0,
                    margin_bottom: 0,
                    alignment: 'left'
                },
                h2: {
                    font_size: 20,
                    font_weight: 'bold',
                    margin_top: 0,
                    margin_bottom: 0,
                    alignment: 'left'
                },
                h3: {
                    font_size: 16,
                    font_weight: 'bold',
                    margin_top: 0,
                    margin_bottom: 0,
                    alignment: 'left'
                }
            },
            paragraph: {},
            lists: {},
            citations: {},
            header_footer: {}
        }
    })
    @IsObject()
    styleConfig: StyleConfig;

    @ApiProperty({ example: 'Document Template Category' })
    @IsString()
    @IsOptional()
    category?: Category

    @ApiProperty({ example: false })
    @IsOptional()
    isPublic?: boolean
}