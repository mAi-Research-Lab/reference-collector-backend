import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateCitationDto {

    @ApiPropertyOptional({ description: 'Citation ID', example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    styleId: string;

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
        example: { font_style: 'italic' }
    })
    @IsOptional()
    @IsObject()
    styleOverride?: any;
}