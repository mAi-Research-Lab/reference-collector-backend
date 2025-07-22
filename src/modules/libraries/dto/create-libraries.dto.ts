import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { LibraryTypes, LibraryVisibility } from "generated/prisma";

export class CreateLibrariesDto {
    @ApiProperty({ example: 'Library Name' })
    @IsString()
    @IsNotEmpty()
    name: string

    @ApiPropertyOptional()
    @IsString()
    description?: string

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    @IsNotEmpty()
    ownerId: string

    @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsOptional()
    institutionId?: string

    @ApiProperty({example:'Library Type'})
    @IsEnum(LibraryTypes)
    @IsNotEmpty()
    type: LibraryTypes

    @ApiProperty({example:'Library visibility'})
    @IsEnum(LibraryVisibility)
    @IsNotEmpty()
    visibility: LibraryVisibility

    
}