import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateCollectionDto {
    @ApiProperty({ example: 'Collection Name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'Collection Description' })
    @IsString()
    description: string | null;

    @ApiPropertyOptional({ example: 'Collection Color' })
    @IsString()
    color: string | null;

    @ApiPropertyOptional({ example: 1 })
    @IsNumber()
    sortOrder: number | null;
}

// export class CreateSubCollection extends CreateCollectionDto {
//     @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
//     parentId: string | null;
// }

export interface CreateCollectionData extends CreateCollectionDto {
    libraryId: string;
}