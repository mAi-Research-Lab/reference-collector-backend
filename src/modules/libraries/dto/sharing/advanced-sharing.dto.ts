import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
    IsString, 
    IsEmail, 
    IsEnum, 
    IsOptional, 
    IsBoolean, 
    IsObject, 
    IsArray, 
    IsDateString,
    ValidateNested,
    IsNumber,
    Min,
    Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { MembershipRole } from 'generated/prisma';

export enum ShareScope {
    LIBRARY = 'library',
    COLLECTION = 'collection',
    REFERENCE = 'reference'
}

export enum AccessLevel {
    NONE = 'none',
    READ = 'read',
    COMMENT = 'comment',
    EDIT = 'edit',
    ADMIN = 'admin'
}

export enum ShareType {
    DIRECT = 'direct',
    LINK = 'link',
    PUBLIC = 'public',
    INSTITUTIONAL = 'institutional'
}

export class GranularPermissionDto {
    @ApiProperty({ enum: ShareScope })
    @IsEnum(ShareScope)
    scope: ShareScope;

    @ApiProperty()
    @IsString()
    resourceId: string;

    @ApiProperty({ enum: AccessLevel })
    @IsEnum(AccessLevel)
    accessLevel: AccessLevel;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    canDownload?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    canExport?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    canShare?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    canComment?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    downloadLimit?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}

export class ShareLinkSettingsDto {
    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    requirePassword?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    password?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxUses?: number;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    allowAnonymous?: boolean;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    requireSignup?: boolean;
}

export class CreateAdvancedShareDto {
    @ApiProperty({ enum: ShareType })
    @IsEnum(ShareType)
    shareType: ShareType;

    @ApiProperty({ enum: ShareScope })
    @IsEnum(ShareScope)
    scope: ShareScope;

    @ApiProperty()
    @IsString()
    resourceId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    recipientEmail?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    recipientUserId?: string;

    @ApiProperty({ enum: AccessLevel })
    @IsEnum(AccessLevel)
    accessLevel: AccessLevel;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GranularPermissionDto)
    granularPermissions?: GranularPermissionDto[];

    @ApiPropertyOptional()
    @IsOptional()
    @ValidateNested()
    @Type(() => ShareLinkSettingsDto)
    linkSettings?: ShareLinkSettingsDto;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    message?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    notifyRecipient?: boolean;
}

export class UpdateSharePermissionsDto {
    @ApiProperty({ enum: AccessLevel })
    @IsEnum(AccessLevel)
    accessLevel: AccessLevel;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GranularPermissionDto)
    granularPermissions?: GranularPermissionDto[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class BulkShareDto {
    @ApiProperty()
    @IsArray()
    @IsString({ each: true })
    resourceIds: string[];

    @ApiProperty({ enum: ShareScope })
    @IsEnum(ShareScope)
    scope: ShareScope;

    @ApiProperty()
    @IsArray()
    @IsEmail({}, { each: true })
    recipientEmails: string[];

    @ApiProperty({ enum: AccessLevel })
    @IsEnum(AccessLevel)
    accessLevel: AccessLevel;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    message?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}

export class ShareAnalyticsQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ enum: ShareScope })
    @IsOptional()
    @IsEnum(ShareScope)
    scope?: ShareScope;

    @ApiPropertyOptional({ enum: ShareType })
    @IsOptional()
    @IsEnum(ShareType)
    shareType?: ShareType;
}

export class CollaborationSettingsDto {
    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    allowComments?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    allowSuggestions?: boolean;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    requireApproval?: boolean;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    notifyOnChanges?: boolean;

    @ApiPropertyOptional({ default: 'edit' })
    @IsOptional()
    @IsEnum(AccessLevel)
    defaultAccessLevel?: AccessLevel;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(365)
    defaultExpirationDays?: number;
}
