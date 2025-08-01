import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsObject, IsEnum, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LibraryTypes, LibraryVisibility } from 'generated/prisma';

export enum TemplateCategory {
    ACADEMIC = 'academic',
    RESEARCH = 'research',
    PERSONAL = 'personal',
    BUSINESS = 'business',
    EDUCATION = 'education',
    MEDICAL = 'medical',
    LEGAL = 'legal',
    CUSTOM = 'custom'
}

export class CollectionTemplateDto {
    @ApiProperty({ example: 'Primary Sources' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'Collection for primary research sources' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: '#FF5733' })
    @IsOptional()
    @IsString()
    color?: string;

    @ApiPropertyOptional({ example: 'book' })
    @IsOptional()
    @IsString()
    icon?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CollectionTemplateDto)
    subCollections?: CollectionTemplateDto[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class LibrarySettingsTemplateDto {
    @ApiPropertyOptional({ example: 'APA' })
    @IsOptional()
    @IsString()
    defaultCitationStyle?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    autoGenerateCitations?: boolean;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    enableDuplicateDetection?: boolean;

    @ApiPropertyOptional({ example: 0.8 })
    @IsOptional()
    duplicateThreshold?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    autoEnhanceMetadata?: boolean;

    @ApiPropertyOptional({ example: ['crossref', 'pubmed'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    metadataSources?: string[];

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    enableFullTextSearch?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    customFields?: Record<string, any>;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    exportSettings?: Record<string, any>;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    collaborationSettings?: Record<string, any>;
}

export class CreateLibraryTemplateDto {
    @ApiProperty({ example: 'Academic Research Template' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'Template for academic research projects with predefined collections' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: TemplateCategory, example: TemplateCategory.ACADEMIC })
    @IsEnum(TemplateCategory)
    category: TemplateCategory;

    @ApiPropertyOptional({ example: ['research', 'academic', 'university'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiProperty({ enum: LibraryTypes, example: LibraryTypes.personal })
    @IsEnum(LibraryTypes)
    defaultLibraryType: LibraryTypes;

    @ApiProperty({ enum: LibraryVisibility, example: LibraryVisibility.private })
    @IsEnum(LibraryVisibility)
    defaultVisibility: LibraryVisibility;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CollectionTemplateDto)
    collections?: CollectionTemplateDto[];

    @ApiPropertyOptional()
    @IsOptional()
    @ValidateNested()
    @Type(() => LibrarySettingsTemplateDto)
    defaultSettings?: LibrarySettingsTemplateDto;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isPublic?: boolean;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isOfficial?: boolean;
}

export class UpdateLibraryTemplateDto {
    @ApiPropertyOptional({ example: 'Updated Academic Research Template' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'Updated template description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ enum: TemplateCategory })
    @IsOptional()
    @IsEnum(TemplateCategory)
    category?: TemplateCategory;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({ enum: LibraryTypes })
    @IsOptional()
    @IsEnum(LibraryTypes)
    defaultLibraryType?: LibraryTypes;

    @ApiPropertyOptional({ enum: LibraryVisibility })
    @IsOptional()
    @IsEnum(LibraryVisibility)
    defaultVisibility?: LibraryVisibility;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CollectionTemplateDto)
    collections?: CollectionTemplateDto[];

    @ApiPropertyOptional()
    @IsOptional()
    @ValidateNested()
    @Type(() => LibrarySettingsTemplateDto)
    defaultSettings?: LibrarySettingsTemplateDto;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isPublic?: boolean;
}

export class CreateLibraryFromTemplateDto {
    @ApiProperty({ example: 'My Research Library' })
    @IsString()
    libraryName: string;

    @ApiPropertyOptional({ example: 'My personal research library based on academic template' })
    @IsOptional()
    @IsString()
    libraryDescription?: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    @IsString()
    templateId: string;

    @ApiPropertyOptional({ enum: LibraryTypes })
    @IsOptional()
    @IsEnum(LibraryTypes)
    overrideLibraryType?: LibraryTypes;

    @ApiPropertyOptional({ enum: LibraryVisibility })
    @IsOptional()
    @IsEnum(LibraryVisibility)
    overrideVisibility?: LibraryVisibility;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    customSettings?: Record<string, any>;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    includeCollections?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    selectedCollections?: string[];
}
