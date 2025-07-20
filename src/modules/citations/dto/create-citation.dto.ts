import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateCitationDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    @IsNotEmpty()
    documentId: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    @IsNotEmpty()
    referenceId: string;

    @ApiPropertyOptional({ 
        example: { paragraph: 5, line: 12, character_position: 245 }
    })
    @IsOptional()
    @IsObject()
    locationData?: any;

    @ApiPropertyOptional({ example: '45-47' })
    @IsOptional()
    @IsString()
    pageNumbers?: string;

    @ApiPropertyOptional({ example: 'see also' })
    @IsOptional()
    @IsString()
    prefix?: string;

    @ApiPropertyOptional({ example: 'for more details' })
    @IsOptional()
    @IsString()
    suffix?: string;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    suppressAuthor?: boolean;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    suppressDate?: boolean;

    @ApiPropertyOptional({ 
        example: { font_style: 'italic', show_doi: false }
    })
    @IsOptional()
    @IsObject()
    styleOverride?: any;
}