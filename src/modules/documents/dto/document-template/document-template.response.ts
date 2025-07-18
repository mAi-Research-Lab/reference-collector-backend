import { ApiProperty } from "@nestjs/swagger";
import { Category } from "../../enums/style.enums";
import { StyleConfig } from "../../interfaces/style.interface";

export class DocumentTemplateResponseDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string

    @ApiProperty({ example: 'Document Template Name' })
    name: string

    @ApiProperty({ example: 'Document Template Description' })
    description: string

    @ApiProperty({ example: 'Document Template Content' })
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
    styleConfig: StyleConfig | null;

    @ApiProperty({ example: 'Document Template Category' })
    category: Category 

    @ApiProperty({ example: false })
    isPublic?: boolean

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    createdBy: string

    @ApiProperty({ example: '2024-01-15T10:30:00Z' })
    createdAt: Date

    @ApiProperty({ example: '2024-01-15T10:30:00Z' })
    updatedAt: Date
}