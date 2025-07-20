import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateCitationDto {
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