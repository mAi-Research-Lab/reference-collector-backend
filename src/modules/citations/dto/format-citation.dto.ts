import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class FormatCitationDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    @IsNotEmpty()
    referenceId: string;

    @ApiPropertyOptional({example:false})
    @IsOptional()
    suppressAuthor?: boolean

    @ApiPropertyOptional({example:false})
    @IsOptional()
    suppressDate?: boolean

    @ApiPropertyOptional({example:"45-47"})
    @IsOptional()
    pageNumbers?: string

    @ApiPropertyOptional({example:"see also"})
    @IsOptional()
    prefix?: string

    @ApiPropertyOptional({example:"for more details"})
    @IsOptional()
    suffix?: string

}