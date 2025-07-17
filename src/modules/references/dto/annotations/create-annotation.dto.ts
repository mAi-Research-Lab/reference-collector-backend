import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsObject, IsString } from "class-validator";
import { AnnotationsType } from "generated/prisma";

export class CreateAnnotationDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    @IsNotEmpty()
    userId: string

    @ApiProperty({ example: AnnotationsType.drawing })
    @IsEnum(AnnotationsType)
    type: AnnotationsType

    @ApiProperty({ example: 'Annotation content' })
    @IsString()
    @IsNotEmpty()
    content: string

    @ApiProperty({
        example: {
            page: 1,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            coordinates: [],
            selection: { start: 0, end: 0, text: '' },
            rotation: 0,
            scale: 0
        }
    })
    @IsNotEmpty()
    @IsObject()
    positionData: Record<string, any>

    @ApiPropertyOptional({example:'#ff0000'})
    @IsString()
    color?: string

    @ApiProperty({example: ['tag1', 'tag2']})
    @IsString({each: true})
    tags: string[]
}