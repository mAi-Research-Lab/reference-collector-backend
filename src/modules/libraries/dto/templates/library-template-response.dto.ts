import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LibraryTypes, LibraryVisibility } from 'generated/prisma';
import { TemplateCategory, CollectionTemplateDto, LibrarySettingsTemplateDto } from './library-template.dto';

export class LibraryTemplateResponseDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    id: string;

    @ApiProperty({ example: 'Academic Research Template' })
    name: string;

    @ApiPropertyOptional({ example: 'Template for academic research projects' })
    description?: string;

    @ApiProperty({ enum: TemplateCategory, example: TemplateCategory.ACADEMIC })
    category: TemplateCategory;

    @ApiPropertyOptional({ example: ['research', 'academic', 'university'] })
    tags?: string[];

    @ApiProperty({ enum: LibraryTypes, example: LibraryTypes.personal })
    defaultLibraryType: LibraryTypes;

    @ApiProperty({ enum: LibraryVisibility, example: LibraryVisibility.private })
    defaultVisibility: LibraryVisibility;

    @ApiPropertyOptional()
    collections?: CollectionTemplateDto[];

    @ApiPropertyOptional()
    defaultSettings?: LibrarySettingsTemplateDto;

    @ApiPropertyOptional()
    metadata?: Record<string, any>;

    @ApiProperty({ example: true })
    isPublic: boolean;

    @ApiProperty({ example: false })
    isOfficial: boolean;

    @ApiProperty({ example: 0 })
    usageCount: number;

    @ApiProperty({ example: 4.5 })
    averageRating: number;

    @ApiProperty({ example: 10 })
    ratingCount: number;

    @ApiPropertyOptional({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    createdBy?: string;

    @ApiPropertyOptional({ example: 'John Doe' })
    createdByName?: string;

    @ApiProperty({ example: '2023-12-01T10:00:00Z' })
    createdAt: string;

    @ApiProperty({ example: '2023-12-01T10:00:00Z' })
    updatedAt: string;
}

export class TemplateUsageStatsDto {
    @ApiProperty({ example: 150 })
    totalUsage: number;

    @ApiProperty({ example: 25 })
    monthlyUsage: number;

    @ApiProperty({ example: 8 })
    weeklyUsage: number;

    @ApiProperty({ example: 2 })
    dailyUsage: number;

    @ApiProperty({ example: 4.2 })
    averageRating: number;

    @ApiProperty({ example: 45 })
    totalRatings: number;

    @ApiProperty()
    usageByCategory: Record<string, number>;

    @ApiProperty()
    popularCollections: string[];

    @ApiProperty()
    recentUsage: Array<{
        date: string;
        count: number;
    }>;
}

export class CreateLibraryFromTemplateResponseDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    libraryId: string;

    @ApiProperty({ example: 'My Research Library' })
    libraryName: string;

    @ApiProperty({ example: 5 })
    collectionsCreated: number;

    @ApiProperty({ example: ['Primary Sources', 'Secondary Sources', 'Literature Review'] })
    collectionNames: string[];

    @ApiProperty({ example: true })
    settingsApplied: boolean;

    @ApiProperty({ example: 'Academic Research Template' })
    templateUsed: string;

    @ApiProperty({ example: '2023-12-01T10:00:00Z' })
    createdAt: string;
}

export class TemplateSearchResultDto {
    @ApiProperty()
    templates: LibraryTemplateResponseDto[];

    @ApiProperty({ example: 25 })
    totalCount: number;

    @ApiProperty({ example: 1 })
    currentPage: number;

    @ApiProperty({ example: 10 })
    pageSize: number;

    @ApiProperty({ example: 3 })
    totalPages: number;

    @ApiProperty()
    facets: {
        categories: Record<string, number>;
        tags: Record<string, number>;
        libraryTypes: Record<string, number>;
        isOfficial: Record<string, number>;
    };
}

export class TemplateRatingDto {
    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    templateId: string;

    @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
    rating: number;

    @ApiPropertyOptional({ example: 'Great template for academic research!' })
    comment?: string;

    @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
    userId: string;

    @ApiProperty({ example: 'John Doe' })
    userName: string;

    @ApiProperty({ example: '2023-12-01T10:00:00Z' })
    createdAt: string;
}

export class TemplateRecommendationDto {
    @ApiProperty()
    recommended: LibraryTemplateResponseDto[];

    @ApiProperty()
    trending: LibraryTemplateResponseDto[];

    @ApiProperty()
    popular: LibraryTemplateResponseDto[];

    @ApiProperty()
    recentlyUsed: LibraryTemplateResponseDto[];

    @ApiProperty()
    basedOnYourLibraries: LibraryTemplateResponseDto[];
}
