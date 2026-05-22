import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserStatusDto {
    @ApiProperty()
    @IsBoolean()
    isActive: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    emailVerified?: boolean;
}
