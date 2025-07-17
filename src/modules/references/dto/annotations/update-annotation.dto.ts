import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AnnotationsType } from "generated/prisma";


export class UpdateAnnotationDto {
    @ApiProperty({ example: AnnotationsType.drawing })
    type: AnnotationsType

    @ApiProperty({ example: 'Annotation content' })
    content: string

    @ApiProperty({
        example: {
            page: 1,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            coordinates: [],
            selection: {
                start: 0,
                end: 0,
                text: ''
            },
            rotation: 0,
            scale: 0
        }
    })
    positionData: any

    @ApiPropertyOptional({example:'#ff0000'})
    color?: string

    @ApiProperty({example: ['tag1', 'tag2']})
    tags: string[]

    @ApiPropertyOptional({example: true})
    isShared?: boolean
}