import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { UserPreferencesDto } from "./create-user.dto";
import { Type } from "class-transformer";

export class UpdateUserDto {
    @ApiPropertyOptional({
        type: String,
        description: 'Full name of the user',
        example: 'John Doe'
    })
    @IsOptional()
    @IsString()
    fullName?: string

    @ApiPropertyOptional({
        type: String,
        description: 'Institution name',
        example: 'Sabancı University',
        nullable: true
    })
    @IsOptional()
    @IsString()
    institutionId?: string | null 

    @ApiPropertyOptional({
        type: String,
        description: 'Field of study',
        example: 'Computer Science',
        nullable: true
    })
    @IsOptional()
    @IsString()
    fieldOfStudy?: string | null 

    @ApiPropertyOptional({
        type: String,
        description: 'ORCID ID',
        example: '0000-0000-0000-0000',
        nullable: true
    })
    @IsOptional()
    @IsString()
    orcidId?: string | null 

    @ApiPropertyOptional({
        type: String,
        description: 'Subscription plan',
        example: 'MONTHLY',
        nullable: true
    })
    @IsOptional()
    @IsString()
    subscriptionPlan?: string | null 

    @ApiPropertyOptional({
        type: String,
        description: 'Avatar URL',
        example: 'https://example.com/avatar.jpg',
        nullable: true
    })
    @IsOptional()
    @IsString()
    avatarUrl?: string | null

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

    @ApiPropertyOptional({
        type: Boolean,
        description: 'Email verification status',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    emailVerified?: boolean

    @ApiPropertyOptional({example: 0})
    storageUsed?: bigint
}