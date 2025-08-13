import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { UserType } from "generated/prisma";

export class UserPreferencesDto {
    @ApiPropertyOptional({ description: 'User language preference', example: 'en' })
    @IsOptional()
    @IsString()
    language?: string;

    @ApiPropertyOptional({ description: 'Theme preference', example: 'dark' })
    @IsOptional()
    @IsString()
    theme?: string;

    @ApiPropertyOptional({ description: 'Email notifications enabled', example: true })
    @IsOptional()
    notifications?: boolean;

    @ApiPropertyOptional({ description: 'Timezone', example: 'Europe/Istanbul' })
    @IsOptional()
    @IsString()
    timezone?: string;
}

export class CreateUserDto {
    @ApiProperty()
    @IsEmail()
    @IsNotEmpty()
    email: string

    @ApiProperty()
    @IsNotEmpty()
    password: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    fullName: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    fieldOfStudy: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    orcidId: string

    // @ApiProperty({
    //     description: 'Subscription plan',
    //     example: 'FREE',
    //     enum: ['FREE', 'PREMIUM', 'ENTERPRISE']
    // })
    // @IsNotEmpty()
    // @IsString()
    // subscriptionPlan: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    avatarUrl: string

    @ApiPropertyOptional({
        description: 'User preferences',
        type: UserPreferencesDto,
        example: {
            language: 'en',
            theme: 'dark',
            notifications: true,
            timezone: 'Europe/Istanbul'
        }
    })
    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => UserPreferencesDto)
    preferences?: UserPreferencesDto;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @IsEnum(UserType)
    userType: UserType
}