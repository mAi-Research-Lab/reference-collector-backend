import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { 
    CreateLibraryTemplateDto, 
    UpdateLibraryTemplateDto, 
    CreateLibraryFromTemplateDto,
    TemplateCategory 
} from '../dto/templates/library-template.dto';
import { 
    LibraryTemplateResponseDto, 
    TemplateUsageStatsDto, 
    CreateLibraryFromTemplateResponseDto,
    TemplateSearchResultDto,
    TemplateRecommendationDto
} from '../dto/templates/library-template-response.dto';
import { CustomHttpException } from 'src/common/exceptions/custom-http-exception';
import { LIBRARY_MESSAGES } from '../constants/library.messages';
import { LibraryTypes, LibraryVisibility } from 'generated/prisma';

@Injectable()
export class LibraryTemplateService {
    private templates: Map<string, any> = new Map();

    constructor(
        private readonly prisma: PrismaService
    ) {
        // Initialize with some default templates
        this.initializeDefaultTemplates();
    }

    private initializeDefaultTemplates(): void {
        const academicTemplate = {
            id: 'template_academic_001',
            name: 'Academic Research Template',
            description: 'Perfect for academic research projects with predefined collections for sources, literature review, and methodology',
            category: TemplateCategory.ACADEMIC,
            tags: ['research', 'academic', 'university', 'thesis'],
            defaultLibraryType: LibraryTypes.personal,
            defaultVisibility: LibraryVisibility.private,
            collections: [
                {
                    name: 'Primary Sources',
                    description: 'Original research materials and primary documents',
                    color: '#FF6B6B',
                    icon: 'book-open'
                },
                {
                    name: 'Secondary Sources',
                    description: 'Academic papers, books, and scholarly articles',
                    color: '#4ECDC4',
                    icon: 'library'
                },
                {
                    name: 'Literature Review',
                    description: 'Sources for literature review section',
                    color: '#45B7D1',
                    icon: 'search'
                },
                {
                    name: 'Methodology',
                    description: 'Research methods and methodology references',
                    color: '#96CEB4',
                    icon: 'cog'
                }
            ],
            defaultSettings: {
                defaultCitationStyle: 'APA',
                autoGenerateCitations: true,
                enableDuplicateDetection: true,
                duplicateThreshold: 0.8,
                autoEnhanceMetadata: true,
                metadataSources: ['crossref', 'pubmed'],
                enableFullTextSearch: true
            },
            isPublic: true,
            isOfficial: true,
            usageCount: 245,
            averageRating: 4.7,
            ratingCount: 89,
            createdBy: 'system',
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01')
        };

        this.templates.set(academicTemplate.id, academicTemplate);
    }

    async createTemplate(
        userId: string,
        data: CreateLibraryTemplateDto
    ): Promise<LibraryTemplateResponseDto> {
        const template = {
            id: `template_${Date.now()}`,
            name: data.name,
            description: data.description,
            category: data.category,
            tags: data.tags,
            defaultLibraryType: data.defaultLibraryType,
            defaultVisibility: data.defaultVisibility,
            collections: data.collections,
            defaultSettings: data.defaultSettings,
            metadata: data.metadata,
            isPublic: data.isPublic || false,
            isOfficial: data.isOfficial || false,
            usageCount: 0,
            averageRating: 0,
            ratingCount: 0,
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.templates.set(template.id, template);
        return this.formatTemplateResponse(template);
    }

    async getAllTemplates(
        page: number = 1,
        limit: number = 20,
        category?: TemplateCategory,
        isOfficial?: boolean,
        search?: string
    ): Promise<TemplateSearchResultDto> {
        let allTemplates = Array.from(this.templates.values());

        // Apply filters
        if (category) {
            allTemplates = allTemplates.filter(t => t.category === category);
        }

        if (isOfficial !== undefined) {
            allTemplates = allTemplates.filter(t => t.isOfficial === isOfficial);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            allTemplates = allTemplates.filter(t =>
                t.name.toLowerCase().includes(searchLower) ||
                t.description?.toLowerCase().includes(searchLower) ||
                t.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
            );
        }

        // Sort templates
        allTemplates.sort((a, b) => {
            if (a.isOfficial !== b.isOfficial) return b.isOfficial ? 1 : -1;
            if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
            if (a.averageRating !== b.averageRating) return b.averageRating - a.averageRating;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Pagination
        const skip = (page - 1) * limit;
        const paginatedTemplates = allTemplates.slice(skip, skip + limit);

        const facets = this.getTemplateFacets();

        return {
            templates: paginatedTemplates.map(template => this.formatTemplateResponse(template)),
            totalCount: allTemplates.length,
            currentPage: page,
            pageSize: limit,
            totalPages: Math.ceil(allTemplates.length / limit),
            facets
        };
    }

    async getTemplateById(templateId: string): Promise<LibraryTemplateResponseDto> {
        const template = this.templates.get(templateId);

        if (!template) {
            throw new CustomHttpException(
                'Template not found',
                404,
                'TEMPLATE_NOT_FOUND'
            );
        }

        return this.formatTemplateResponse(template);
    }

    async updateTemplate(
        templateId: string,
        userId: string,
        data: UpdateLibraryTemplateDto
    ): Promise<LibraryTemplateResponseDto> {
        const template = this.templates.get(templateId);

        if (!template) {
            throw new CustomHttpException(
                'Template not found',
                404,
                'TEMPLATE_NOT_FOUND'
            );
        }

        // Check if user has permission to update
        if (template.createdBy !== userId && !template.isOfficial) {
            throw new CustomHttpException(
                'You do not have permission to update this template',
                403,
                'TEMPLATE_UPDATE_FORBIDDEN'
            );
        }

        const updatedTemplate = {
            ...template,
            ...data,
            updatedAt: new Date()
        };

        this.templates.set(templateId, updatedTemplate);
        return this.formatTemplateResponse(updatedTemplate);
    }

    async deleteTemplate(templateId: string, userId: string): Promise<{ message: string }> {
        const template = this.templates.get(templateId);

        if (!template) {
            throw new CustomHttpException(
                'Template not found',
                404,
                'TEMPLATE_NOT_FOUND'
            );
        }

        // Check if user has permission to delete
        if (template.createdBy !== userId && !template.isOfficial) {
            throw new CustomHttpException(
                'You do not have permission to delete this template',
                403,
                'TEMPLATE_DELETE_FORBIDDEN'
            );
        }

        // Remove from memory (soft delete simulation)
        this.templates.delete(templateId);
        return { message: 'Template deleted successfully' };
    }

    async createLibraryFromTemplate(
        userId: string,
        data: CreateLibraryFromTemplateDto
    ): Promise<CreateLibraryFromTemplateResponseDto> {
        const template = await this.getTemplateById(data.templateId);

        // Mock library creation - in real implementation, this would use LibrariesService
        const libraryId = `library_${Date.now()}`;
        const collectionsCreated: string[] = [];

        if (data.includeCollections !== false && template.collections) {
            for (const collectionTemplate of template.collections) {
                // Skip if specific collections are selected and this one isn't included
                if (data.selectedCollections &&
                    !data.selectedCollections.includes(collectionTemplate.name)) {
                    continue;
                }

                collectionsCreated.push(collectionTemplate.name);
            }
        }

        // Update template usage count
        const templateData = this.templates.get(template.id);
        if (templateData) {
            templateData.usageCount += 1;
            this.templates.set(template.id, templateData);
        }

        return {
            libraryId,
            libraryName: data.libraryName,
            collectionsCreated: collectionsCreated.length,
            collectionNames: collectionsCreated,
            settingsApplied: !!template.defaultSettings,
            templateUsed: template.name,
            createdAt: new Date().toISOString()
        };
    }

    async getTemplateUsageStats(templateId: string): Promise<TemplateUsageStatsDto> {
        const template = await this.getTemplateById(templateId);

        // Mock usage statistics
        const recentUsage = this.generateUsageChart([], 30);

        return {
            totalUsage: template.usageCount,
            monthlyUsage: Math.floor(template.usageCount * 0.3),
            weeklyUsage: Math.floor(template.usageCount * 0.1),
            dailyUsage: Math.floor(template.usageCount * 0.02),
            averageRating: template.averageRating,
            totalRatings: template.ratingCount,
            usageByCategory: { [template.category]: template.usageCount },
            popularCollections: template.collections?.map((c: any) => c.name) || [],
            recentUsage
        };
    }

    async getRecommendations(userId: string): Promise<TemplateRecommendationDto> {
        const allTemplates = Array.from(this.templates.values());

        // Get popular templates (by usage count)
        const popular = allTemplates
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 5);

        // Get trending templates (by rating)
        const trending = allTemplates
            .sort((a, b) => b.averageRating - a.averageRating)
            .slice(0, 5);

        // Get official templates
        const recommended = allTemplates
            .filter(t => t.isOfficial)
            .slice(0, 5);

        return {
            recommended: recommended.map(t => this.formatTemplateResponse(t)),
            trending: trending.map(t => this.formatTemplateResponse(t)),
            popular: popular.map(t => this.formatTemplateResponse(t)),
            recentlyUsed: [],
            basedOnYourLibraries: []
        };
    }



    private getTemplateFacets(): any {
        const allTemplates = Array.from(this.templates.values());

        const categories: Record<string, number> = {};
        const libraryTypes: Record<string, number> = {};
        const isOfficial: Record<string, number> = { 'true': 0, 'false': 0 };
        const tags: Record<string, number> = {};

        allTemplates.forEach(template => {
            // Count categories
            categories[template.category] = (categories[template.category] || 0) + 1;

            // Count library types
            libraryTypes[template.defaultLibraryType] = (libraryTypes[template.defaultLibraryType] || 0) + 1;

            // Count official vs community
            const officialKey = template.isOfficial.toString();
            isOfficial[officialKey] = (isOfficial[officialKey] || 0) + 1;

            // Count tags
            if (template.tags) {
                template.tags.forEach((tag: string) => {
                    tags[tag] = (tags[tag] || 0) + 1;
                });
            }
        });

        return {
            categories,
            tags,
            libraryTypes,
            isOfficial
        };
    }

    private generateUsageChart(libraries: any[], days: number): Array<{ date: string; count: number }> {
        const chart: Array<{ date: string; count: number }> = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const count = libraries.filter(lib =>
                lib.createdAt && lib.createdAt.toISOString().split('T')[0] === dateStr
            ).length;

            chart.push({ date: dateStr, count });
        }

        return chart;
    }

    private formatTemplateResponse(template: any): LibraryTemplateResponseDto {
        return {
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            tags: template.tags || [],
            defaultLibraryType: template.defaultLibraryType,
            defaultVisibility: template.defaultVisibility,
            collections: template.collections,
            defaultSettings: template.defaultSettings,
            metadata: template.metadata,
            isPublic: template.isPublic,
            isOfficial: template.isOfficial,
            usageCount: template.usageCount,
            averageRating: template.averageRating,
            ratingCount: template.ratingCount,
            createdBy: template.createdBy,
            createdByName: template.createdBy === 'system' ? 'System' : 'Unknown User',
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString()
        };
    }
}
