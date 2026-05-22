import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AddMessageDto {
    @ApiProperty()
    @IsString()
    @MinLength(1)
    content: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isInternal?: boolean;
}
