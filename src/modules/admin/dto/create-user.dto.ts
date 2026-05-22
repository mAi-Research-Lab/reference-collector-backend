import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from 'generated/prisma';
import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MinLength,
} from 'class-validator';

export class AdminCreateUserDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ minLength: 6 })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ enum: UserType, example: UserType.individual })
    @IsEnum(UserType)
    userType: UserType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    institutionId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    fieldOfStudy?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    orcidId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    emailVerified?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
