import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";
import { LibraryTypes, LibraryVisibility } from "generated/prisma";

export class UpdateLibrariesDto {
    @ApiProperty({ example: 'Library Name' })
    @IsOptional()
    name?: string

    @ApiPropertyOptional()
    @IsOptional()
    description?: string

    // @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    // @IsOptional()
    // institutionId?: string

    @ApiProperty({ example: 'Library Type' })
    @IsOptional()
    type: LibraryTypes

    @ApiProperty({ example: 'Library visibility' })
    @IsOptional()
    visibility: LibraryVisibility

    @ApiProperty({example: 500000})
    @IsOptional()
    storageUsed?: number

    @ApiProperty({example: 500000})
    @IsOptional()
    maxStorage?: number

    @ApiProperty({example: 500000})
    @IsOptional()
    itemCount?: number

    @ApiProperty({example: false})
    @IsOptional()
    isDeleted?: boolean
}