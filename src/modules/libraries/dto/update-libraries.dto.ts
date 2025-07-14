import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsNumber, IsString } from "class-validator";
import { LibraryTypes, LibraryVisibility } from "generated/prisma";

export class UpdateLibrariesDto {
    @ApiProperty({ example: 'Library Name' })
    @IsString()
    name?: string

    @ApiPropertyOptional()
    @IsString()
    description?: string

    @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    institutionId?: string

    @ApiProperty({ example: 'Library Type' })
    @IsEnum(LibraryTypes)
    type: LibraryTypes

    @ApiProperty({ example: 'Library visibility' })
    @IsEnum(LibraryVisibility)
    visibility: LibraryVisibility

    @ApiProperty({example: 500000})
    @IsNumber()
    storageUsed?: number

    @ApiProperty({example: 500000})
    @IsNumber()
    maxStorage?: number

    @ApiProperty({example: 500000})
    @IsNumber()
    itemCount?: number

    @ApiProperty({example: false})
    @IsBoolean()
    isDeleted?: boolean
}