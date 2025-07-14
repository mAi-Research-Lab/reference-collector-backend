import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";

export class UpdateCollectionDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    libraryId: string

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    parentId: string | null;

    @ApiProperty({ example: 'Collection Name' })
    @IsString()
    name: string

    @ApiPropertyOptional({ example: 'Collection Description' })
    @IsString()
    description: string | null;

    @ApiPropertyOptional({ example: 'Collection Color' })
    @IsString()
    color: string | null;

    @ApiPropertyOptional({ example: 1 })
    @IsNumber()
    sortOrder: number | null;

    @ApiPropertyOptional({ example: false })
    @IsNumber()
    isDeleted: boolean
}