import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class UpdateCollectionDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsOptional()
    parentId: string | null;

    @ApiProperty({ example: 'Collection Name' })
    @IsOptional()
    name: string

    @ApiPropertyOptional({ example: 'Collection Description' })
    @IsOptional()
    description: string | null;

    @ApiPropertyOptional({ example: 'Collection Color' })
    @IsOptional()
    color: string | null;
}